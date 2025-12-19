import { expect } from 'chai';
import sinon from 'sinon';
import vscode from 'vscode';
import { Process } from '../../process.ts';
import { ContextualLogger } from '../../logging/index.ts';
import { Configuration, Settings } from '../../config/index.ts';
import {
  MissingServerPathError,
  CouldNotSpawnProcessError,
} from '../../errors.ts';
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
      const serverPath = process.platform === 'win32' ? 'cmd' : 'echo';
      const serverArgs =
        process.platform === 'win32' ? ['/c', 'echo', 'test'] : ['test'];

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
        sinon.match(`Server configuration: path=${serverPath}`),
      );
      sinon.assert.calledWith(
        loggerMock.info,
        'Server process exited normally with code 0',
      );
    });

    it('should handle process that exits with non-zero code', async () => {
      // Arrange
      const serverPath = process.platform === 'win32' ? 'cmd' : 'sh';
      const serverArgs =
        process.platform === 'win32' ? ['/c', 'exit', '1'] : ['-c', 'exit 1'];

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
      expect(loggerMock.error.calledWith('Server process exited with code 1'))
        .to.be.true;
    });
  });

  describe('write', () => {
    it('should write data to process stdin when initialized', async () => {
      // Arrange
      const serverPath = process.platform === 'win32' ? 'more' : 'cat';
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
      const serverPath = process.platform === 'win32' ? 'ping' : 'sleep';
      const serverArgs =
        process.platform === 'win32' ? ['-t', 'localhost'] : ['10'];

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
      const serverPath = process.platform === 'win32' ? 'cmd' : 'echo';
      const serverArgs =
        process.platform === 'win32'
          ? ['/c', 'echo', testMessage]
          : [testMessage];

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
      const serverPath = process.platform === 'win32' ? 'cmd' : 'sh';
      const serverArgs =
        process.platform === 'win32'
          ? ['/c', 'echo error message 1>&2']
          : ['-c', 'echo "error message" >&2'];

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
