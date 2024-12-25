import * as vscode from 'vscode';
import { commonTokens } from './di/tokens';
import { ContextualLogger, provideLogger } from './logging/index';
import { WorkspaceFolder, Constants } from './index';
import { BaseContext } from './di/index';
import { createInjector, Injector } from 'typed-inject';

export class Workspace {
  #logger: ContextualLogger;
  #baseContextProvider: Injector<BaseContext>;
  #workspaceFolders: WorkspaceFolder[] = [];

  constructor(
    context: vscode.ExtensionContext,
    private readonly injectorFactory = createInjector
  ) {
    const rootInjector = this.injectorFactory();
    this.#baseContextProvider = provideLogger(rootInjector).provideValue(commonTokens.context, context);
    this.#logger = this.#baseContextProvider.provideValue(commonTokens.loggerContext, this.constructor.name).injectClass(ContextualLogger);
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(this.onWorkspaceFoldersChanged.bind(this)),
      vscode.workspace.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this))
    );
    this.reload();
  }

  private reload() {
    this.#logger.info('(Re)loading workspace');
    this.#workspaceFolders.forEach((wf) => this.removeWorkspaceFolder(wf.getWorkspaceFolder()));

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.#logger.info('No workspace (folder) is opened');
      return;
    }
    vscode.workspace.workspaceFolders?.forEach(this.addWorkspaceFolder.bind(this));
  }

  private removeWorkspaceFolder(folder: vscode.WorkspaceFolder) {
    const index = this.#workspaceFolders.findIndex((wf) => wf.getWorkspaceFolder() === folder);
    if (index !== -1) {
      this.#workspaceFolders[index].dispose();
      this.#workspaceFolders.splice(index, 1);
      this.#logger.info(`Workspace folder unloaded: ${folder.uri.fsPath}`);
      return;
    }
    this.#logger.warn(`Workspace folder could not be removed: ${folder.uri.fsPath}`);
  }

  private async addWorkspaceFolder(folder: vscode.WorkspaceFolder) {
    if (this.workspaceFolderExists(folder)) {
      this.#logger.warn(`Workspace folder already exists and is therefore not initialized: ${folder.uri.fsPath}`);
      return;
    }

    const workspaceFolderInjector = this.#baseContextProvider.provideValue(commonTokens.workspaceFolder, folder);
    const workspaceFolder = workspaceFolderInjector.injectClass(WorkspaceFolder);
    await workspaceFolder.init();
    this.#workspaceFolders.push(workspaceFolder);
  }

  private workspaceFolderExists(folder: vscode.WorkspaceFolder) {
    return this.#workspaceFolders.some((wf) => wf.getWorkspaceFolder() === folder);
  }

  private onWorkspaceFoldersChanged(event: vscode.WorkspaceFoldersChangeEvent) {
    this.#logger.info('Handling workspace folders change');

    event.removed.forEach(this.removeWorkspaceFolder.bind(this));
    event.added.forEach(this.addWorkspaceFolder.bind(this));
  }

  private onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent) {
    this.#workspaceFolders.forEach(async (wf) => {
      if (event.affectsConfiguration(Constants.AppName, wf.getWorkspaceFolder())) {
        this.#logger.info(`Configuration changed for ${wf.getWorkspaceFolder().uri.fsPath}`);
        this.#logger.info(`Reloading workspace folder: ${wf.getWorkspaceFolder().uri.fsPath}`);
        // TODO: Reload only the necessary parts
        this.removeWorkspaceFolder(wf.getWorkspaceFolder());
        await this.addWorkspaceFolder(wf.getWorkspaceFolder());
        return;
      }
    });

    if (event.affectsConfiguration(Constants.AppName)) {
      this.#logger.info('Configuration changed for the workspace');
      this.reload();
    }
  }

  public dispose() {
    this.#logger.info('Unloading workspace');
    this.#workspaceFolders.forEach((folder) => folder.dispose());
  }
}
