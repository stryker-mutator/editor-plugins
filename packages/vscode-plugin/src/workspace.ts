import * as vscode from 'vscode';
import { provideLogger } from './logging/provide-logging';
import { commonTokens } from './di/tokens';
import { ContextualLogger } from './logging/contextual-logger';
import { WorkspaceFolder } from './workspace-folder';
import { BaseContext } from './di/context';
import { createInjector, Injector } from 'typed-inject';
import { Configuration, Setting } from './config/configuration';
import { APP_NAME } from './constants';

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

  private addWorkspaceFolder(folder: vscode.WorkspaceFolder) {
    if (this.workspaceFolderExists(folder)) {
      this.#logger.warn(`Workspace folder already exists and is therefore not initialized: ${folder.uri.fsPath}`);
      return;
    }

    var mutationTestingEnabled = Configuration.getSetting<boolean>(Setting.MutationTestingEnabled, folder, true);
    if (!mutationTestingEnabled) {
      this.#logger.info(`Mutation testing is disabled for ${folder.uri.fsPath}`);
      return;
    }

    const workspaceFolderInjector = this.#baseContextProvider.provideValue(commonTokens.workspaceFolder, folder);
    const workspaceFolder = new WorkspaceFolder(workspaceFolderInjector);
    this.#workspaceFolders.push(workspaceFolder);
    this.#logger.info(`Workspace folder initialized: ${folder.uri.fsPath}`);
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
    this.#workspaceFolders.forEach((wf) => {
      if (event.affectsConfiguration(APP_NAME, wf.getWorkspaceFolder())) {
        this.#logger.info(`Configuration changed for ${wf.getWorkspaceFolder().uri.fsPath}`);
        this.#logger.info(`Reloading workspace folder: ${wf.getWorkspaceFolder().uri.fsPath}`);
        // TODO: Reload only the necessary parts
        this.removeWorkspaceFolder(wf.getWorkspaceFolder());
        this.addWorkspaceFolder(wf.getWorkspaceFolder());
        return;
      }
    });

    if(event.affectsConfiguration(APP_NAME)) {
      this.#logger.info('Configuration changed for the workspace');
      this.reload();
    }
  }

  public dispose() {
    this.#logger.info('Unloading workspace');
    this.#workspaceFolders.forEach((folder) => folder.dispose());
    this.#logger.info('Workspace unloaded');
  }
}
