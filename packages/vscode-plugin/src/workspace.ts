import vscode from 'vscode';
import { commonTokens } from './di/tokens.ts';
import { ContextualLogger, provideLogger } from './logging/index.ts';
import {
  WorkspaceFolder,
  Constants,
  Process,
  MutationServer,
} from './index.ts';
import type { BaseContext } from './di/index.ts';
import { createInjector, type Injector } from 'typed-inject';
import { StdioTransport } from './transport/stdio-transport.ts';

export class Workspace {
  private readonly injectorFactory;
  #logger: ContextualLogger;
  #baseContextProvider: Injector<BaseContext>;
  #workspaceFolders: WorkspaceFolder[] = [];
  constructor(
    context: vscode.ExtensionContext,
    injectorFactory = createInjector,
  ) {
    this.injectorFactory = injectorFactory;
    const rootInjector = this.injectorFactory();
    this.#baseContextProvider = provideLogger(rootInjector).provideValue(
      commonTokens.context,
      context,
    );

    this.#logger = this.#baseContextProvider
      .provideValue(commonTokens.loggerContext, this.constructor.name)
      .injectClass(ContextualLogger);
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(
        async (event) => await this.onWorkspaceFoldersChanged(event),
      ),
      vscode.workspace.onDidChangeConfiguration(
        async (event) => await this.onDidChangeConfiguration(event),
      ),
    );
  }
  async init() {
    this.#logger.info('(Re)loading workspace');

    await Promise.all(
      this.#workspaceFolders.map((wf) =>
        this.removeWorkspaceFolder(wf.workspaceFolder),
      ),
    );

    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    if (workspaceFolders.length === 0) {
      this.#logger.info('No workspace (folder) is opened');
      return;
    }

    await Promise.all(
      workspaceFolders.map((folder) =>
        this.addWorkspaceFolder(folder).catch((error: any) => {
          this.#logger.error(error.message ?? error);
        }),
      ),
    );
  }
  private async removeWorkspaceFolder(folder: vscode.WorkspaceFolder) {
    const index = this.#workspaceFolders.findIndex(
      (wf) => wf.workspaceFolder === folder,
    );

    if (index !== -1) {
      await this.#workspaceFolders[index].dispose();
      this.#workspaceFolders.splice(index, 1);
      return;
    }

    this.#logger.warn(
      `Workspace folder could not be removed: ${folder.uri.fsPath}`,
    );
  }

  private async addWorkspaceFolder(folder: vscode.WorkspaceFolder) {
    if (this.workspaceFolderExists(folder)) {
      return;
    }
    const workspaceFolderInjector = this.#baseContextProvider.provideValue(
      commonTokens.workspaceFolder,
      folder,
    );

    const workspaceFolder = workspaceFolderInjector
      .provideValue(commonTokens.loggerContext, folder.name)
      .provideClass(commonTokens.contextualLogger, ContextualLogger)
      .provideClass(commonTokens.process, Process)
      .provideClass(commonTokens.transport, StdioTransport)
      .provideClass(commonTokens.mutationServer, MutationServer)
      .injectClass(WorkspaceFolder);

    this.#workspaceFolders.push(workspaceFolder);

    await workspaceFolder.init();
  }

  private workspaceFolderExists(folder: vscode.WorkspaceFolder) {
    return this.#workspaceFolders.some(
      (wf) => wf.workspaceFolder === folder,
    );
  }

  private async onWorkspaceFoldersChanged(
    event: vscode.WorkspaceFoldersChangeEvent,
  ) {
    this.#logger.info('Handling workspace folders change');
    await Promise.all(
      event.removed.map((folder) => this.removeWorkspaceFolder(folder)),
    );
    await Promise.all(
      event.added.map((folder) => this.addWorkspaceFolder(folder)),
    );
  }

  private async onDidChangeConfiguration(
    event: vscode.ConfigurationChangeEvent,
  ) {
    for (const wf of this.#workspaceFolders) {
      if (
        event.affectsConfiguration(Constants.AppName, wf.workspaceFolder)
      ) {
        this.#logger.info(
          `Configuration changed for ${wf.workspaceFolder.uri.fsPath}. Reloading workspace folder`,
        );
        await this.reloadWorkspaceFolder(wf.workspaceFolder);
      }
    }
  }

  public async reload() {
    this.#logger.info('Reloading workspace');
    await Promise.all(
      this.#workspaceFolders.map(async (folder) => {
        await this.reloadWorkspaceFolder(folder.workspaceFolder);
      }),
    );
  }

  public async runMutationTestsForFile(fileUri: vscode.Uri) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
    if (!workspaceFolder) {
      this.#logger.warn(
        `No workspace folder found for file: ${fileUri.fsPath}. Skipping file-scoped mutation test run.`,
      );
      return;
    }

    const targetWorkspaceFolder = this.#workspaceFolders.find(
      (wf) => wf.workspaceFolder === workspaceFolder,
    );

    if (!targetWorkspaceFolder) {
      this.#logger.warn(
        `Workspace folder is not initialized for file: ${fileUri.fsPath}. Skipping file-scoped mutation test run.`,
      );
      return;
    }

    await targetWorkspaceFolder.runMutationTestsForFile(fileUri);
  }

  private async reloadWorkspaceFolder(workspaceFolder: vscode.WorkspaceFolder) {
    await this.removeWorkspaceFolder(workspaceFolder);
    await this.addWorkspaceFolder(workspaceFolder);
  }

  async dispose() {
    this.#logger.info('Unloading workspace');
    await Promise.all(
      this.#workspaceFolders.map(async (folder) => await folder.dispose()),
    );
    this.#logger.dispose();
  }
}
