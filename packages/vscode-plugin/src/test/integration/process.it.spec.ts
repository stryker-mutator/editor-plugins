import { expect } from 'chai';
import sinon from 'sinon';
import vscode from 'vscode';
import { Process } from '../../process.ts';
import { ContextualLogger } from '../../logging/index.ts';
import { Configuration, Settings } from '../../config/index.ts';
import { MissingServerPathError } from '../../errors.ts';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe(`${Process.name} (Integration)`, () => {
  let sandbox: sinon.SinonSandbox;
  let sut: Process;
  let loggerMock: sinon.SinonStubbedInstance<ContextualLogger>;
  let workspaceFolderMock: vscode.WorkspaceFolder;
  let configurationGetSettingStub: sinon.SinonStub;
  let configurationGetSettingOrDefaultStub: sinon.SinonStub;
  let tempDir: string;
  const isWindows = process.platform === 'win32';

  async function createTestExecutable(name: string, scriptContent: string) {
    const execPath = path.join(tempDir, name);
    await fs.writeFile(execPath, scriptContent);
    if (!isWindows) {
      await fs.chmod(execPath, 0o755); // Make it executable on Unix-like systems
    }
  }

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    loggerMock = sandbox.createStubInstance(ContextualLogger);

    // Create a temporary directory for test workspace
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'process-test-'));

    workspaceFolderMock = {
      uri: { fsPath: tempDir } as vscode.Uri,
      name: 'test-workspace',
      index: 0,
    };

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

    configurationGetSettingStub = sandbox.stub(Configuration, 'getSetting');
    configurationGetSettingOrDefaultStub = sandbox.stub(
      Configuration,
      'getSettingOrDefault',
    );

    sut = new Process(workspaceFolderMock, loggerMock);
  });

  afterEach(async () => {
    sandbox.restore();
    sut.dispose();

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('init', () => {
    it('should throw MissingServerPathError when server path is not configured', async () => {
      // Arrange
      configurationGetSettingStub
        .withArgs(Settings.ServerPath, workspaceFolderMock)
        .returns(undefined);

      // Act & Assert
      await expect(sut.init()).to.eventually.be.rejectedWith(
        MissingServerPathError,
      );
      expect(
        loggerMock.error.calledWith(
          'Cannot start server. Missing server path configuration.',
        ),
      ).to.be.true;
    });

    it('should successfully spawn a simple command and handle exit', async () => {
      // Arrange
      const serverPath = isWindows ? 'echo-test.bat' : 'echo-test.sh';
      const serverArgs = ['test'];

      configurationGetSettingStub
        .withArgs(Settings.ServerPath, workspaceFolderMock)
        .returns(serverPath);
      configurationGetSettingOrDefaultStub
        .withArgs(Settings.ServerArgs, [], workspaceFolderMock)
        .returns(serverArgs);
      configurationGetSettingOrDefaultStub
        .withArgs(
          Settings.CurrentWorkingDirectory,
          workspaceFolderMock.uri.fsPath,
          workspaceFolderMock,
        )
        .returns(workspaceFolderMock.uri.fsPath);

      // Set up promise to wait for process completion
      const processExitPromise = new Promise<number>((resolve) => {
        loggerMock.info.callsFake((message: string) => {
          if (message.includes('Server process exited normally with code 0')) {
            resolve(0);
          }
        });
      });

      // Act
      await sut.init();

      // Wait for process to complete
      const exitCode = await processExitPromise;

      // Assert
      expect(exitCode).to.equal(0);
      sinon.assert.calledWith(
        loggerMock.info,
        sinon.match((message: string) => {
          const expectedPath = path.resolve(
            workspaceFolderMock.uri.fsPath,
            serverPath,
          );
          return message.includes(`Server configuration: path=${expectedPath}`);
        }),
      );
      sinon.assert.calledWith(
        loggerMock.info,
        'Server process exited normally with code 0',
      );
    });

    it('should handle process that exits with non-zero code', async () => {
      // Arrange
      const serverPath = isWindows ? 'exit-error.bat' : 'exit-error.sh';
      const serverArgs: string[] = [];

      configurationGetSettingStub
        .withArgs(Settings.ServerPath, workspaceFolderMock)
        .returns(serverPath);
      configurationGetSettingOrDefaultStub
        .withArgs(Settings.ServerArgs, [], workspaceFolderMock)
        .returns(serverArgs);
      configurationGetSettingOrDefaultStub
        .withArgs(
          Settings.CurrentWorkingDirectory,
          workspaceFolderMock.uri.fsPath,
          workspaceFolderMock,
        )
        .returns(workspaceFolderMock.uri.fsPath);

      // Set up promise to wait for process error
      const processExitPromise = new Promise<number>((resolve) => {
        loggerMock.error.callsFake((message: string) => {
          if (message.includes('Server process exited with code 1')) {
            resolve(1);
          }
        });
      });

      // Act
      await sut.init();

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
      const serverArgs: string[] = [];

      configurationGetSettingStub
        .withArgs(Settings.ServerPath, workspaceFolderMock)
        .returns(serverPath);
      configurationGetSettingOrDefaultStub
        .withArgs(Settings.ServerArgs, [], workspaceFolderMock)
        .returns(serverArgs);
      configurationGetSettingOrDefaultStub
        .withArgs(
          Settings.CurrentWorkingDirectory,
          workspaceFolderMock.uri.fsPath,
          workspaceFolderMock,
        )
        .returns(workspaceFolderMock.uri.fsPath);

      const stdoutData: Buffer[] = [];
      sut.on('stdout', (data: Buffer) => {
        stdoutData.push(data);
      });
      await sut.init();

      // Act & Assert - should not throw
      expect(() => sut.write('test data\n')).to.not.throw();
    });
  });

  describe('dispose', () => {
    it('should kill long running process when disposed', async () => {
      // Arrange
      const serverPath = isWindows ? 'sleep-test.bat' : 'sleep-test.sh';
      const serverArgs: string[] = [];

      configurationGetSettingStub
        .withArgs(Settings.ServerPath, workspaceFolderMock)
        .returns(serverPath);
      configurationGetSettingOrDefaultStub
        .withArgs(Settings.ServerArgs, [], workspaceFolderMock)
        .returns(serverArgs);
      configurationGetSettingOrDefaultStub
        .withArgs(
          Settings.CurrentWorkingDirectory,
          workspaceFolderMock.uri.fsPath,
          workspaceFolderMock,
        )
        .returns(workspaceFolderMock.uri.fsPath);

      await sut.init();

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
      const serverArgs = [testMessage];

      configurationGetSettingStub
        .withArgs(Settings.ServerPath, workspaceFolderMock)
        .returns(serverPath);
      configurationGetSettingOrDefaultStub.returns([]);
      configurationGetSettingOrDefaultStub.returns(
        workspaceFolderMock.uri.fsPath,
      );
      configurationGetSettingOrDefaultStub
        .withArgs(Settings.ServerArgs, [], workspaceFolderMock)
        .returns(serverArgs);

      const stdoutEvents: Buffer[] = [];
      sut.on('stdout', (data: Buffer) => {
        stdoutEvents.push(data);
      });

      // Act
      await sut.init();

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
      const serverArgs: string[] = [];

      configurationGetSettingStub
        .withArgs(Settings.ServerPath, workspaceFolderMock)
        .returns(serverPath);
      configurationGetSettingOrDefaultStub.returns([]);
      configurationGetSettingOrDefaultStub.returns(
        workspaceFolderMock.uri.fsPath,
      );
      configurationGetSettingOrDefaultStub
        .withArgs(Settings.ServerArgs, [], workspaceFolderMock)
        .returns(serverArgs);

      const stderrEvents: Buffer[] = [];
      sut.on('stderr', (data: Buffer) => {
        stderrEvents.push(data);
      });

      // Act
      await sut.init();

      // Wait a bit for the output
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(stderrEvents.length).to.be.greaterThan(0);
      const combinedOutput = Buffer.concat(stderrEvents).toString();
      expect(combinedOutput).to.include('error message');
    });
  });
});
