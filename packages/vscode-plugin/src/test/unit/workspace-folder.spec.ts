import sinon from 'sinon';
import vscode from 'vscode';
import { expect } from 'chai';
import { Injector } from 'typed-inject';
import { WorkspaceFolder, WorkspaceFolderContext } from '../../workspace-folder.ts';
import * as factory from '../factory.ts';
import { MutationServer } from '../../mutation-server.ts';
import { ContextualLogger } from '../../logging/contextual-logger.ts';
import { Configuration, Settings } from '../../config/index.ts';
import { commonTokens } from '../../di/tokens.ts';
import { provideTestController, TestExplorer } from '../../test-explorer.ts';
import { FileSystemWatcher } from '../../file-system-watcher.ts';

describe(WorkspaceFolder.name, () => {
  let sandbox: sinon.SinonSandbox;
  let sut: WorkspaceFolder;
  let injectorMock: sinon.SinonStubbedInstance<Injector<WorkspaceFolderContext>>;
  let mutationServerMock: sinon.SinonStubbedInstance<MutationServer>;
  let workspaceFolderMock: sinon.SinonStubbedInstance<vscode.WorkspaceFolder>;
  let contextualLoggerMock: sinon.SinonStubbedInstance<ContextualLogger>;
  let testExplorerMock: sinon.SinonStubbedInstance<TestExplorer>;
  let fileSystemWatcherMock: sinon.SinonStubbedInstance<FileSystemWatcher>;
  let getSettingOrDefaultStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    injectorMock = factory.injector() as unknown as sinon.SinonStubbedInstance<
      Injector<WorkspaceFolderContext>
    >;
    mutationServerMock = sinon.createStubInstance(MutationServer);
    workspaceFolderMock = factory.workspaceFolder();
    contextualLoggerMock = sinon.createStubInstance(ContextualLogger);
    testExplorerMock = sinon.createStubInstance(TestExplorer);
    fileSystemWatcherMock = sinon.createStubInstance(FileSystemWatcher);

    // Create the stub once here
    getSettingOrDefaultStub = sandbox.stub(Configuration, "getSettingOrDefault");

    sut = new WorkspaceFolder(
      injectorMock as Injector<WorkspaceFolderContext>,
      workspaceFolderMock,
      mutationServerMock,
      contextualLoggerMock,
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('init', () => {
    describe('when setting "enable" is false', () => {
      beforeEach(() => {
        getSettingOrDefaultStub.withArgs(Settings.enable, true, workspaceFolderMock).returns(false);
      });

      it('should not init mutation server', async () => {
        // Act
        await sut.init();

        // Assert
        sinon.assert.notCalled(mutationServerMock.init);
      });
    });

    describe('when setting "enable" is true', () => {
      beforeEach(() => {
        getSettingOrDefaultStub.withArgs(Settings.enable, true, workspaceFolderMock).returns(true);
        getSettingOrDefaultStub
          .withArgs(Settings.CurrentWorkingDirectory, ".", workspaceFolderMock)
          .returns('/foo/bar/server');

        injectorMock.injectClass
          .withArgs(TestExplorer)
          .returns(testExplorerMock)
          .withArgs(FileSystemWatcher)
          .returns(fileSystemWatcherMock);

        fileSystemWatcherMock.init.returns();

        mutationServerMock.discover.resolves({
          files: {
            '/foo/bar/server/file1.js': { mutants: [factory.createDiscoveredMutant()] }
          }
        });
      });

      it('should init mutation server', async () => {
        // Act
        await sut.init();

        // Assert
        sinon.assert.calledOnce(mutationServerMock.init);
      });

      it('should discover for all files and process results', async () => {
        // Act
        await sut.init();

        // Assert
        expect(injectorMock.provideFactory).calledOnceWithExactly(
          commonTokens.testController,
          provideTestController
        );
        expect(injectorMock.provideValue).calledWith(
          commonTokens.mutationServer,
          mutationServerMock
        );
        expect(injectorMock.provideValue).calledWith(
          commonTokens.serverWorkspaceDirectory,
          '/foo/bar/server'
        );
        expect(mutationServerMock.discover).calledOnceWithExactly({});
        expect(
          testExplorerMock.processDiscoverResult.calledOnceWithExactly(
            {
              files: {
                '/foo/bar/server/file1.js': { mutants: [factory.createDiscoveredMutant()] }
              }
            },
            '/foo/bar/server'
          )
        ).to.be.true;
      });

      it('should init file system watcher', async () => {
        // Act
        await sut.init();

        // Assert
        expect(fileSystemWatcherMock.init.calledOnce).to.be.true;
      });
    });

    describe('when mutation server initialization fails', () => {
      beforeEach(() => {
        getSettingOrDefaultStub.withArgs(Settings.enable, true, workspaceFolderMock).returns(true);
        mutationServerMock.init.rejects(new Error('Server initialization failed'));
      });

      it('should log error and not proceed with component setup', async () => {
        // Act
        await sut.init();

        // Assert
        expect(mutationServerMock.init.calledOnce).to.be.true;
        expect(contextualLoggerMock.error.calledWith(
          'Failed to initialize mutation server: Error: Server initialization failed'
        )).to.be.true;
        
        // Should not proceed with setting up other components
        expect(injectorMock.provideFactory.called).to.be.false;
        expect(injectorMock.injectClass.called).to.be.false;
        expect(mutationServerMock.discover.called).to.be.false;
      });
    });
  });

  describe('dispose', () => {
    it('should dispose all resources when components are initialized', async () => {
      // Arrange
      getSettingOrDefaultStub.withArgs(Settings.enable, true, workspaceFolderMock).returns(true);
      getSettingOrDefaultStub
        .withArgs(Settings.CurrentWorkingDirectory, ".", workspaceFolderMock)
        .returns('/foo/bar/server');

      injectorMock.injectClass
        .withArgs(TestExplorer)
        .returns(testExplorerMock)
        .withArgs(FileSystemWatcher)
        .returns(fileSystemWatcherMock);

      fileSystemWatcherMock.init.returns();
      mutationServerMock.discover.resolves({
        files: {
          '/foo/bar/server/file1.js': { mutants: [factory.createDiscoveredMutant()] }
        }
      });

      await sut.init();

      // Act
      await sut.dispose();

      // Assert
      expect(fileSystemWatcherMock.dispose.calledOnce).to.be.true;
      expect(testExplorerMock.dispose.calledOnce).to.be.true;
      expect(mutationServerMock.dispose.calledOnce).to.be.true;
      expect(contextualLoggerMock.info.calledWith(
        `Disposed workspace folder: ${workspaceFolderMock.uri.fsPath}`
      )).to.be.true;
    });

    it('should handle disposal when components are not initialized', async () => {
      // Act (dispose without init)
      await sut.dispose();

      // Assert
      expect(mutationServerMock.dispose.calledOnce).to.be.true;
      expect(contextualLoggerMock.info.calledWith(
        `Disposed workspace folder: ${workspaceFolderMock.uri.fsPath}`
      )).to.be.true;
      // FileSystemWatcher and TestExplorer dispose should not be called since they weren't initialized
      expect(fileSystemWatcherMock.dispose.called).to.be.false;
      expect(testExplorerMock.dispose.called).to.be.false;
    });
  });
});

