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
  let testControllerMock: sinon.SinonStubbedInstance<vscode.TestController>;
  let testExplorerMock: sinon.SinonStubbedInstance<TestExplorer>;
  let fileSystemWatcherMock: sinon.SinonStubbedInstance<FileSystemWatcher>;
  let getSettingStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    injectorMock = factory.injector() as unknown as sinon.SinonStubbedInstance<
      Injector<WorkspaceFolderContext>
    >;
    mutationServerMock = sinon.createStubInstance(MutationServer);
    workspaceFolderMock = factory.workspaceFolder();
    contextualLoggerMock = sinon.createStubInstance(ContextualLogger);
    testControllerMock = factory.testController();
    testExplorerMock = sinon.createStubInstance(TestExplorer);
    fileSystemWatcherMock = sinon.createStubInstance(FileSystemWatcher);

    // Create the stub once here
    getSettingStub = sandbox.stub(Configuration, "getSetting");

    // Setup injector chaining like in the Stryker example
    injectorMock.provideFactory.returnsThis();
    injectorMock.provideValue.returnsThis();
    injectorMock.provideClass.returnsThis();
    injectorMock.injectClass.returns({} as any);

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
        getSettingStub.withArgs(Settings.enable, workspaceFolderMock).returns(false);
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
        getSettingStub.withArgs(Settings.enable, workspaceFolderMock).returns(true);
      });

      it('should init mutation server', async () => {
        // Act
        await sut.init();

        // Assert
        sinon.assert.calledOnce(mutationServerMock.init);
      });

      it('should discover for all files', async () => {
        // Arrange
        getSettingStub.withArgs(Settings.CurrentWorkingDirectory, workspaceFolderMock).returns('/foo/bar/server');

        injectorMock.injectClass
          .withArgs(TestExplorer)
          .returns(testExplorerMock)
          .withArgs(FileSystemWatcher)
          .returns(fileSystemWatcherMock);

        // Act
        await sut.init();

        // Assert
        expect(injectorMock.provideFactory).calledWithExactly(
          commonTokens.testController,
          provideTestController
        );
        expect(injectorMock.provideValue).calledWithExactly(
          commonTokens.mutationServer,
          mutationServerMock
        );
        expect(injectorMock.provideValue).calledWithExactly(
          commonTokens.serverWorkspaceDirectory,
          '/foo/bar/server'
        );
        expect(mutationServerMock.discover).calledOnce;
        expect(testExplorerMock.processDiscoverResult).calledOnce;
      });
    });
  });
});

