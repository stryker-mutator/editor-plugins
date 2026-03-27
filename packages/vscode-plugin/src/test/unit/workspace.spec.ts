import { expect } from 'chai';
import sinon from 'sinon';
import vscode from 'vscode';

import { ContextualLogger } from '../../logging/contextual-logger.ts';
import { Workspace } from '../../workspace.ts';
import { WorkspaceFolder } from '../../workspace-folder.ts';
import * as factory from '../factory.ts';

describe(Workspace.name, () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('init', () => {
    it('initializes all workspace folders', async () => {
      const loggerMock = sinon.createStubInstance(ContextualLogger);
      const workspaceFolderRuntimeMock =
        sinon.createStubInstance(WorkspaceFolder);

      const workspaceFolder = {
        uri: vscode.Uri.file('/workspace'),
        name: 'workspace',
        index: 0,
      } as vscode.WorkspaceFolder;

      (
        workspaceFolderRuntimeMock as {
          workspaceFolder: vscode.WorkspaceFolder;
        }
      ).workspaceFolder = workspaceFolder;
      workspaceFolderRuntimeMock.init.resolves();

      const injectorMock = factory.injector();
      injectorMock.injectClass
        .withArgs(ContextualLogger)
        .returns(loggerMock as unknown as ContextualLogger)
        .withArgs(WorkspaceFolder)
        .returns(workspaceFolderRuntimeMock as unknown as WorkspaceFolder);

      sandbox
        .stub(vscode.workspace, 'workspaceFolders')
        .value([workspaceFolder]);

      const context = {
        subscriptions: [],
      } as unknown as vscode.ExtensionContext;

      const sut = new Workspace(context, () => injectorMock as never);
      await sut.init();

      expect(workspaceFolderRuntimeMock.init.calledOnce).to.be.true;
    });

    it('logs info when no workspace is opened', async () => {
      const loggerMock = sinon.createStubInstance(ContextualLogger);

      const injectorMock = factory.injector();
      injectorMock.injectClass
        .withArgs(ContextualLogger)
        .returns(loggerMock as unknown as ContextualLogger);

      sandbox.stub(vscode.workspace, 'workspaceFolders').value([]);

      const context = {
        subscriptions: [],
      } as unknown as vscode.ExtensionContext;

      const sut = new Workspace(context, () => injectorMock as never);
      await sut.init();

      expect(loggerMock.info.calledWith('No workspace (folder) is opened')).to
        .be.true;
    });
  });

  describe('runMutationTestsForFile', () => {
    it('routes file-scoped mutation run to owning workspace folder', async () => {
      const loggerMock = sinon.createStubInstance(ContextualLogger);
      const workspaceFolderRuntimeMock =
        sinon.createStubInstance(WorkspaceFolder);

      const workspaceFolder = {
        uri: vscode.Uri.file('/workspace'),
        name: 'workspace',
        index: 0,
      } as vscode.WorkspaceFolder;

      (
        workspaceFolderRuntimeMock as {
          workspaceFolder: vscode.WorkspaceFolder;
        }
      ).workspaceFolder = workspaceFolder;

      workspaceFolderRuntimeMock.init.resolves();

      const injectorMock = factory.injector();
      injectorMock.injectClass
        .withArgs(ContextualLogger)
        .returns(loggerMock as unknown as ContextualLogger)
        .withArgs(WorkspaceFolder)
        .returns(workspaceFolderRuntimeMock as unknown as WorkspaceFolder);

      sandbox
        .stub(vscode.workspace, 'workspaceFolders')
        .value([workspaceFolder]);

      const context = {
        subscriptions: [],
      } as unknown as vscode.ExtensionContext;

      const sut = new Workspace(context, () => injectorMock as never);
      await sut.init();

      const fileUri = vscode.Uri.file('/workspace/src/file.ts');
      sandbox
        .stub(vscode.workspace, 'getWorkspaceFolder')
        .returns(workspaceFolder);

      await sut.runMutationTestsForFile(fileUri);

      expect(
        workspaceFolderRuntimeMock.runMutationTestsForFile.calledOnceWithExactly(
          fileUri,
        ),
      ).to.be.true;
    });

    it('logs warning when no workspace folder owns the file URI', async () => {
      const loggerMock = sinon.createStubInstance(ContextualLogger);

      const injectorMock = factory.injector();
      injectorMock.injectClass
        .withArgs(ContextualLogger)
        .returns(loggerMock as unknown as ContextualLogger);

      const context = {
        subscriptions: [],
      } as unknown as vscode.ExtensionContext;

      const sut = new Workspace(context, () => injectorMock as never);

      const fileUri = vscode.Uri.file('/outside/file.ts');
      sandbox.stub(vscode.workspace, 'getWorkspaceFolder').returns(undefined);

      await sut.runMutationTestsForFile(fileUri);

      expect(
        loggerMock.warn.calledWith(
          `No workspace folder found for file: ${fileUri.fsPath}. Skipping file-scoped mutation test run.`,
        ),
      ).to.be.true;
    });

    it('logs warning when workspace folder is not initialized', async () => {
      const loggerMock = sinon.createStubInstance(ContextualLogger);

      const workspaceFolder = {
        uri: vscode.Uri.file('/workspace'),
        name: 'workspace',
        index: 0,
      } as vscode.WorkspaceFolder;

      const injectorMock = factory.injector();
      injectorMock.injectClass
        .withArgs(ContextualLogger)
        .returns(loggerMock as unknown as ContextualLogger);

      sandbox.stub(vscode.workspace, 'workspaceFolders').value([]);

      const context = {
        subscriptions: [],
      } as unknown as vscode.ExtensionContext;

      const sut = new Workspace(context, () => injectorMock as never);

      const fileUri = vscode.Uri.file('/workspace/src/file.ts');
      sandbox
        .stub(vscode.workspace, 'getWorkspaceFolder')
        .returns(workspaceFolder);

      await sut.runMutationTestsForFile(fileUri);

      expect(
        loggerMock.warn.calledWith(
          `Workspace folder is not initialized for file: ${fileUri.fsPath}. Skipping file-scoped mutation test run.`,
        ),
      ).to.be.true;
    });

    it('routes to correct workspace folder when multiple folders exist', async () => {
      const loggerMock = sinon.createStubInstance(ContextualLogger);
      const workspaceFolderRuntime1Mock =
        sinon.createStubInstance(WorkspaceFolder);
      const workspaceFolderRuntime2Mock =
        sinon.createStubInstance(WorkspaceFolder);

      const workspaceFolder1 = {
        uri: vscode.Uri.file('/workspace1'),
        name: 'workspace1',
        index: 0,
      } as vscode.WorkspaceFolder;

      const workspaceFolder2 = {
        uri: vscode.Uri.file('/workspace2'),
        name: 'workspace2',
        index: 1,
      } as vscode.WorkspaceFolder;

      (
        workspaceFolderRuntime1Mock as {
          workspaceFolder: vscode.WorkspaceFolder;
        }
      ).workspaceFolder = workspaceFolder1;
      (
        workspaceFolderRuntime2Mock as {
          workspaceFolder: vscode.WorkspaceFolder;
        }
      ).workspaceFolder = workspaceFolder2;

      workspaceFolderRuntime1Mock.init.resolves();
      workspaceFolderRuntime2Mock.init.resolves();

      const injectorMock = factory.injector();
      const injectClassStub = injectorMock.injectClass;
      injectClassStub
        .withArgs(ContextualLogger)
        .returns(loggerMock as unknown as ContextualLogger);
      injectClassStub
        .withArgs(WorkspaceFolder)
        .onFirstCall()
        .returns(workspaceFolderRuntime1Mock as unknown as WorkspaceFolder)
        .onSecondCall()
        .returns(workspaceFolderRuntime2Mock as unknown as WorkspaceFolder);

      sandbox
        .stub(vscode.workspace, 'workspaceFolders')
        .value([workspaceFolder1, workspaceFolder2]);

      const context = {
        subscriptions: [],
      } as unknown as vscode.ExtensionContext;

      const sut = new Workspace(context, () => injectorMock as never);
      await sut.init();

      const fileUri = vscode.Uri.file('/workspace2/src/file.ts');
      sandbox
        .stub(vscode.workspace, 'getWorkspaceFolder')
        .returns(workspaceFolder2);

      await sut.runMutationTestsForFile(fileUri);

      expect(workspaceFolderRuntime1Mock.runMutationTestsForFile.called).to.be
        .false;
      expect(
        workspaceFolderRuntime2Mock.runMutationTestsForFile.calledOnceWithExactly(
          fileUri,
        ),
      ).to.be.true;
    });
  });

  describe('reload', () => {
    it('reloads all workspace folders', async () => {
      const loggerMock = sinon.createStubInstance(ContextualLogger);
      const workspaceFolderRuntimeMock =
        sinon.createStubInstance(WorkspaceFolder);

      const workspaceFolder = {
        uri: vscode.Uri.file('/workspace'),
        name: 'workspace',
        index: 0,
      } as vscode.WorkspaceFolder;

      (
        workspaceFolderRuntimeMock as {
          workspaceFolder: vscode.WorkspaceFolder;
        }
      ).workspaceFolder = workspaceFolder;
      workspaceFolderRuntimeMock.init.resolves();
      workspaceFolderRuntimeMock.dispose.resolves();

      const injectorMock = factory.injector();
      injectorMock.injectClass
        .withArgs(ContextualLogger)
        .returns(loggerMock as unknown as ContextualLogger)
        .withArgs(WorkspaceFolder)
        .returns(workspaceFolderRuntimeMock as unknown as WorkspaceFolder);

      sandbox
        .stub(vscode.workspace, 'workspaceFolders')
        .value([workspaceFolder]);

      const context = {
        subscriptions: [],
      } as unknown as vscode.ExtensionContext;

      const sut = new Workspace(context, () => injectorMock as never);
      await sut.init();

      await sut.reload();

      expect(workspaceFolderRuntimeMock.dispose.calledOnce).to.be.true;
      expect(workspaceFolderRuntimeMock.init.calledTwice).to.be.true;
    });
  });

  describe('dispose', () => {
    it('disposes all workspace folders', async () => {
      const loggerMock = sinon.createStubInstance(ContextualLogger);
      const workspaceFolderRuntimeMock =
        sinon.createStubInstance(WorkspaceFolder);

      const workspaceFolder = {
        uri: vscode.Uri.file('/workspace'),
        name: 'workspace',
        index: 0,
      } as vscode.WorkspaceFolder;

      (
        workspaceFolderRuntimeMock as {
          workspaceFolder: vscode.WorkspaceFolder;
        }
      ).workspaceFolder = workspaceFolder;
      workspaceFolderRuntimeMock.init.resolves();
      workspaceFolderRuntimeMock.dispose.resolves();

      const injectorMock = factory.injector();
      injectorMock.injectClass
        .withArgs(ContextualLogger)
        .returns(loggerMock as unknown as ContextualLogger)
        .withArgs(WorkspaceFolder)
        .returns(workspaceFolderRuntimeMock as unknown as WorkspaceFolder);

      sandbox
        .stub(vscode.workspace, 'workspaceFolders')
        .value([workspaceFolder]);

      const context = {
        subscriptions: [],
      } as unknown as vscode.ExtensionContext;

      const sut = new Workspace(context, () => injectorMock as never);
      await sut.init();

      await sut.dispose();

      expect(workspaceFolderRuntimeMock.dispose.calledOnce).to.be.true;
      expect(loggerMock.dispose.calledOnce).to.be.true;
    });
  });
});
