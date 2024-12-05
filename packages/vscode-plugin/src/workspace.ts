import * as vscode from 'vscode';
import { LoggerProvider, provideLogger } from './logging/provide-logging';
import { commonTokens } from './di/tokens';
import { Logger } from './logging/logger';
import { WorkspaceFolder } from './workspace-folder';
import { BaseContext } from './di/context';
import { createInjector, Injector } from 'typed-inject';

export class Workspace {
  #loggingProvider: LoggerProvider;
  #logger: Logger;
  #context: vscode.ExtensionContext;
  #baseContextProvider: Injector<BaseContext>;
  #workspaceFolders: WorkspaceFolder[] = [];

  constructor(
    context: vscode.ExtensionContext,
    private readonly injectorFactory = createInjector
  ) {
    const rootInjector = this.injectorFactory();
    this.#loggingProvider = provideLogger(rootInjector);
    this.#baseContextProvider = this.#loggingProvider.provideValue(commonTokens.context, context);
    this.#logger = this.#baseContextProvider.resolve(commonTokens.logger);
    this.#context = context;
  }

  public init() {
    this.#logger.info('Initializing workspace');

    this.#context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(this.onWorkspaceFoldersChanged.bind(this))
    );

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.#logger.info('No workspace (folder) is opened');
      return;
    }

    workspaceFolders.forEach(this.addWorkspaceFolder.bind(this));
  }

  private removeWorkspaceFolder(folder: vscode.WorkspaceFolder) {
    const index = this.#workspaceFolders.findIndex((wf) => wf.getWorkspaceFolder() === folder);
    if (index !== -1) {
      this.#workspaceFolders[index].dispose();
      this.#workspaceFolders.splice(index, 1);
    }
    this.#logger.info(`Workspace folder unloaded: ${folder.uri.fsPath}`);
  }

  private addWorkspaceFolder(folder: vscode.WorkspaceFolder) {
    const workspaceFolderInjector = this.#baseContextProvider.provideValue(commonTokens.workspaceFolder, folder);
    const workspaceFolder = new WorkspaceFolder(workspaceFolderInjector);
    this.#workspaceFolders.push(workspaceFolder);
    this.#logger.info(`Workspace folder initialized: ${folder.uri.fsPath}`);
  }

  private onWorkspaceFoldersChanged(event: vscode.WorkspaceFoldersChangeEvent) {
    this.#logger.info('Handling workspace folders change');

    event.removed.forEach(this.removeWorkspaceFolder.bind(this));
    event.added.forEach(this.addWorkspaceFolder.bind(this));
  }

  public dispose() {
    this.#logger.info('Unloading workspace');
    this.#workspaceFolders.forEach((folder) => folder.dispose());
    this.#logger.info('Workspace unloaded');
  }
}
