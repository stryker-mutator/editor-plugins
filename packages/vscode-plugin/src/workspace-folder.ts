import { Injector, tokens } from 'typed-inject';
import * as vscode from 'vscode';
import { BaseContext, commonTokens } from './di/index';
import { Configuration, Settings } from './config/index';
import { ContextualLogger } from './logging/index';
import { Process } from './index';

export interface SetupWorkspaceFolderContext extends BaseContext {
  [commonTokens.workspaceFolder]: vscode.WorkspaceFolder;
}

export class WorkspaceFolder {
  #workspaceFolder: vscode.WorkspaceFolder;
  #logger: ContextualLogger;
  #process: Process;

  public static readonly inject = tokens(commonTokens.injector, commonTokens.workspaceFolder);
  constructor(
    private readonly injector: Injector<SetupWorkspaceFolderContext>
  ) {
    this.#workspaceFolder = this.injector.resolve(commonTokens.workspaceFolder);
    this.#logger = this.injector.provideValue(commonTokens.loggerContext, this.#workspaceFolder.name).injectClass(ContextualLogger);
    this.#process = this.injector.injectClass(Process);

    this.#process.on('exit', async (code) => {
      this.#logger.error(`Mutation server process exited with code ${code}`);
      this.#logger.info('Restarting mutation server');
      this.#process.dispose();
      await this.init();
    });
  }

  async init() {
    var mutationTestingEnabled = Configuration.getSetting<boolean>(Settings.MutationTestingEnabled, this.#workspaceFolder, true);
    if (!mutationTestingEnabled) {
      this.#logger.info(`Mutation testing is disabled for ${this.#workspaceFolder.uri.fsPath}`);
      return;
    }

    const serverLocation = await this.#process.init();
  }

  public getWorkspaceFolder(): vscode.WorkspaceFolder {
    return this.#workspaceFolder;
  }

  dispose() {
    this.#process.dispose();
  }
}
