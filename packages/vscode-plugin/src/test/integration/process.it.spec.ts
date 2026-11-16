import { expect } from 'chai';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import sinon from 'sinon';

import { ContextualLogger } from '../../logging/index.ts';
import { ServerProcess } from '../../server-process.ts';

describe(`${ServerProcess.name} (Integration)`, () => {
  let sandbox: sinon.SinonSandbox;
  let sut: ServerProcess;
  let loggerMock: sinon.SinonStubbedInstance<ContextualLogger>;
  let tempDir: string;
  const isWindows = process.platform === 'win32';

  async function createTestExecutable(name: string, scriptContent: string) {
    const execPath = path.join(tempDir, name);
    await fs.writeFile(execPath, scriptContent);
    if (!isWindows) {
      await fs.chmod(execPath, 0o755); // Make it executable on Unix-like systems
    }
  }

  function startServer(serverPath: string, serverArgs: string[] = []) {
    return sut.init(tempDir, path.resolve(tempDir, serverPath), serverArgs);
  }

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    loggerMock = sandbox.createStubInstance(ContextualLogger);

    // Create a temporary directory for test workspace
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'process-test-'));

    // Create test executables
    await createTestExecutable(
      isWindows ? 'echo-test.bat' : 'echo-test.sh',
      isWindows ? '@echo %*' : '#!/bin/sh\necho "$@"',
    );
    await createTestExecutable(
      isWindows ? 'exit-error.bat' : 'exit-error.sh',
      isWindows ? '@exit /b 1' : '#!/bin/sh\nexit 1',
    );
    await createTestExecutable(
      isWindows ? 'stderr-test.bat' : 'stderr-test.sh',
      isWindows
        ? '@echo error message 1>&2'
        : '#!/bin/sh\necho "error message" >&2',
    );
    await createTestExecutable(
      isWindows ? 'sleep-test.bat' : 'sleep-test.sh',
      isWindows ? '@timeout /t 10' : '#!/bin/sh\nsleep 10',
    );
    await createTestExecutable(
      isWindows ? 'cat-test.bat' : 'cat-test.sh',
      isWindows ? '@findstr /V "^$"' : '#!/bin/sh\ncat',
    );

    sut = new ServerProcess(loggerMock);
  });

  afterEach(async () => {
    sandbox.restore();
    sut.dispose();

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { force: true, recursive: true });
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe('init', () => {
    it('should successfully spawn a process with spaces in the path', async () => {
      // Arrange - create a subdirectory with spaces in the name
      const dirWithSpaces = path.join(tempDir, 'path with spaces');
      await fs.mkdir(dirWithSpaces);
      const execName = isWindows ? 'echo-spaces.bat' : 'echo-spaces.sh';
      const execPath = path.join(dirWithSpaces, execName);
      await fs.writeFile(
        execPath,
        isWindows ? '@echo spaces test' : '#!/bin/sh\necho "spaces test"',
      );
      if (!isWindows) {
        await fs.chmod(execPath, 0o755);
      }

      // Set up promise to wait for process completion
      const processExitPromise = new Promise<number>((resolve) => {
        loggerMock.info.callsFake((message: string) => {
          if (message.includes('Server process exited normally with code 0')) {
            resolve(0);
          }
        });
      });

      // Act
      await startServer(execPath);

      // Wait for process to complete
      const exitCode = await processExitPromise;

      // Assert
      expect(exitCode).to.equal(0);
    });

    it('should successfully spawn a simple command and handle exit', async () => {
      // Arrange
      const serverPath = isWindows ? 'echo-test.bat' : 'echo-test.sh';

      // Set up promise to wait for process completion
      const processExitPromise = new Promise<number>((resolve) => {
        loggerMock.info.callsFake((message: string) => {
          if (message.includes('Server process exited normally with code 0')) {
            resolve(0);
          }
        });
      });

      // Act
      await startServer(serverPath, ['test']);

      // Wait for process to complete
      const exitCode = await processExitPromise;

      // Assert
      expect(exitCode).to.equal(0);
      sinon.assert.calledWith(
        loggerMock.info,
        'Server process exited normally with code 0',
      );
    });

    it('should handle process that exits with non-zero code', async () => {
      // Arrange
      const serverPath = isWindows ? 'exit-error.bat' : 'exit-error.sh';

      // Set up promise to wait for process error
      const processExitPromise = new Promise<number>((resolve) => {
        loggerMock.error.callsFake((message: string) => {
          if (message.includes('Server process exited with code 1')) {
            resolve(1);
          }
        });
      });

      // Act
      await startServer(serverPath);

      // Wait for process to complete
      const exitCode = await processExitPromise;

      // Assert
      expect(exitCode).to.equal(1);
      sinon.assert.calledWith(
        loggerMock.error,
        sinon.match('Server process exited with code 1'),
      );
    });
  });

  describe('write', () => {
    it('should write data to process stdin when initialized', async () => {
      // Arrange
      const serverPath = isWindows ? 'cat-test.bat' : 'cat-test.sh';

      const stdoutData: Buffer[] = [];
      sut.on('stdout', (data: Buffer) => {
        stdoutData.push(data);
      });
      await startServer(serverPath);

      // Act & Assert - should not throw
      expect(() => sut.write('test data\n')).to.not.throw();
    });
  });

  describe('dispose', () => {
    it('should kill long running process when disposed', async () => {
      // Arrange
      const serverPath = isWindows ? 'sleep-test.bat' : 'sleep-test.sh';

      await startServer(serverPath);

      // Act
      sut.dispose();

      // Assert - should not throw and process should be killed
      expect(() => sut.dispose()).to.not.throw();
    });
  });

  describe('event handling', () => {
    it('should emit stdout events', async () => {
      // Arrange
      const testMessage = 'stdout test';
      const serverPath = isWindows ? 'echo-test.bat' : 'echo-test.sh';

      const stdoutEvents: Buffer[] = [];
      sut.on('stdout', (data: Buffer) => {
        stdoutEvents.push(data);
      });

      // Act
      await startServer(serverPath, [testMessage]);

      // Wait a bit for the output
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(stdoutEvents.length).to.be.greaterThan(0);
      const combinedOutput = Buffer.concat(stdoutEvents).toString();
      expect(combinedOutput).to.include(testMessage);
    });

    it('should emit stderr events for error output', async () => {
      // Arrange
      const serverPath = isWindows ? 'stderr-test.bat' : 'stderr-test.sh';

      const stderrEvents: Buffer[] = [];
      sut.on('stderr', (data: Buffer) => {
        stderrEvents.push(data);
      });

      // Act
      await startServer(serverPath);

      // Wait a bit for the output
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(stderrEvents.length).to.be.greaterThan(0);
      const combinedOutput = Buffer.concat(stderrEvents).toString();
      expect(combinedOutput).to.include('error message');
    });
  });
});
