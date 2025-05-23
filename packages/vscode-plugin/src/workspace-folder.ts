import { Injector, tokens } from 'typed-inject';
import * as vscode from 'vscode';
import { BaseContext, commonTokens } from './di/index';
import { Configuration, Settings } from './config/index';
import { ContextualLogger } from './logging/index';
import {
  Constants,
  Process,
  MutationServer,
  UnsupportedServerVersionError,
} from './index';
import { ConfigureParams } from 'mutation-server-protocol';
import { TestExplorer } from './test-explorer';
import { FileSystemWatcher } from './file-system-watcher';

export interface SetupWorkspaceFolderContext extends BaseContext {
  [commonTokens.workspaceFolder]: vscode.WorkspaceFolder;
}

export class WorkspaceFolder {
  #logger: ContextualLogger;
  #process: Process;
  #testExplorer?: TestExplorer;

  public static readonly inject = tokens(
    commonTokens.injector,
    commonTokens.workspaceFolder,
  );
  constructor(
    private readonly injector: Injector<SetupWorkspaceFolderContext>,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
  ) {
    // this.#workspaceFolder = this.injector.resolve(commonTokens.workspaceFolder);
    this.#logger = this.injector
      .provideValue(commonTokens.loggerContext, this.workspaceFolder.name)
      .injectClass(ContextualLogger);
    this.#process = this.injector.injectClass(Process);

    this.#process.on('exit', async (code) => {
      this.#logger.error(`Mutation server process exited with code ${code}`);
      this.#logger.info('Restarting mutation server');
      this.#process.dispose();
      await this.init();
    });
  }

  async init() {
    const mutationTestingEnabled = Configuration.getSettingOrDefault<boolean>(
      Settings.MutationTestingEnabled,
      true,
      this.workspaceFolder,
    );
    if (!mutationTestingEnabled) {
      this.#logger.info(
        `Mutation testing is disabled for ${this.workspaceFolder.uri.fsPath}`,
      );
      return;
    }

    const serverLocation = await this.#process.init();
    const mutationServer = this.injector
      .provideValue(commonTokens.serverLocation, serverLocation)
      .injectClass(MutationServer);

    const configureParams: ConfigureParams = {
      configFilePath: Configuration.getSetting<string>(
        Settings.ConfigFilePath,
        this.workspaceFolder,
      ),
    };

    const configureResult = await mutationServer.configure(configureParams);
    if (configureResult.version !== Constants.SupportedMspVersion) {
      this.#logger.error(
        `Unsupported mutation server version: ${configureResult.version}`,
      );
      throw new UnsupportedServerVersionError(configureResult.version);
    }

    this.#logger.info(
      `Mutation server configuration handshake completed. MSP version: ${configureResult.version}`,
    );

    // this.#testExplorer =

    const fileSystemWatcher = this.injector
      .provideValue(commonTokens.mutationServer, mutationServer)
      .provideClass(commonTokens.testExplorer, TestExplorer)
      .injectClass(FileSystemWatcher);

    fileSystemWatcher.init();
    // await this.#testExplorer.discover();

    // setupFileWatcher();
  }

  public getWorkspaceFolder(): vscode.WorkspaceFolder {
    return this.workspaceFolder;
  }

  dispose() {
    this.#process.dispose();
  }
}
