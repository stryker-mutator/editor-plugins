import * as vscode from 'vscode';
import { commonTokens } from './di/tokens';
import { ContextualLogger, provideLogger } from './logging/index';
import { WorkspaceFolder, Constants, Process } from './index';
import { BaseContext } from './di/index';
import { createInjector, Injector } from 'typed-inject';

export class Workspace {
  #logger: ContextualLogger;
  #baseContextProvider: Injector<BaseContext>;
  #workspaceFolders: WorkspaceFolder[] = [];

  constructor(
    context: vscode.ExtensionContext,
    private readonly injectorFactory = createInjector,
  ) {
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
        this.removeWorkspaceFolder(wf.getWorkspaceFolder()),
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
        })
      )
    );
  }

  private async removeWorkspaceFolder(folder: vscode.WorkspaceFolder) {
    const index = this.#workspaceFolders.findIndex(
      (wf) => wf.getWorkspaceFolder() === folder,
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
      .injectClass(WorkspaceFolder);

    await workspaceFolder.init();
    this.#workspaceFolders.push(workspaceFolder);
  }

  private workspaceFolderExists(folder: vscode.WorkspaceFolder) {
    return this.#workspaceFolders.some(
      (wf) => wf.getWorkspaceFolder() === folder,
    );
  }

  private async onWorkspaceFoldersChanged(event: vscode.WorkspaceFoldersChangeEvent) {
    this.#logger.info('Handling workspace folders change');

    await Promise.all(event.removed.map((folder) => this.removeWorkspaceFolder(folder)));
    await Promise.all(event.added.map((folder) => this.addWorkspaceFolder(folder)));
  }

  private async onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent) {
    for (const wf of this.#workspaceFolders) {
      if (
        event.affectsConfiguration(Constants.AppName, wf.getWorkspaceFolder())
      ) {
        this.#logger.info(
          `Configuration changed for ${wf.getWorkspaceFolder().uri.fsPath}. Reloading workspace folder`,
        );
        await this.removeWorkspaceFolder(wf.getWorkspaceFolder());
        await this.addWorkspaceFolder(wf.getWorkspaceFolder());
      }
    };
  }

  async dispose() {
    this.#logger.info('Unloading workspace');
    await Promise.all(this.#workspaceFolders.map(async (folder) => await folder.dispose()));
  }
}
