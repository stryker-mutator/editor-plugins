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
import { provideTestController, TestExplorer } from './test-explorer';
import { FileSystemWatcher } from './file-system-watcher';
import * as fs from 'fs';

export interface WorkspaceFolderContext extends BaseContext {
  [commonTokens.workspaceFolder]: vscode.WorkspaceFolder;
}

export class WorkspaceFolder {
  #logger: ContextualLogger;
  #fileSystemWatcher?: FileSystemWatcher;

  public static readonly inject = tokens(
    commonTokens.injector,
    commonTokens.workspaceFolder,
    commonTokens.process,
  );
  constructor(
    private readonly injector: Injector<WorkspaceFolderContext>,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
    private readonly process: Process,
  ) {
    this.#logger = this.injector
      .provideValue(commonTokens.loggerContext, this.workspaceFolder.name)
      .injectClass(ContextualLogger);

    this.process.on('exit', async (code) => {
      this.#logger.error(`Mutation server process exited with code ${code}`);
      this.#logger.info('Restarting mutation server');
      this.process.dispose();
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

    const serverLocation = await this.process.init();
    const mutationServer = this.injector
      .provideValue(commonTokens.serverLocation, serverLocation)
      .provideValue(commonTokens.loggerContext, this.workspaceFolder.name)
      .provideClass(commonTokens.contextualLogger, ContextualLogger)
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

    const testExplorer = this.injector
      .provideFactory(commonTokens.testController, provideTestController)
      .injectClass(TestExplorer);

    this.#fileSystemWatcher = this.injector.injectClass(FileSystemWatcher);

    this.#fileSystemWatcher.onFilesChanged(async (uris) => {
      // if uri is directory. add / to the end of the uri
      const files: string[] = uris.map((uri) => {
        if (fs.lstatSync(uri.fsPath).isDirectory()) {
          return `${uri.fsPath}/`;
        }
        return uri.fsPath;
      });
      const discoverResult = await mutationServer.discover({ files: files });
      testExplorer.processDiscoverResult(discoverResult);
    });

    this.#fileSystemWatcher.onFilesDeleted(async (uris) => {
      testExplorer.processFileDeletions(uris);
    });

    // Initial discovery of mutants
    const discoverResult = await mutationServer.discover({});
    testExplorer.processDiscoverResult(discoverResult);
  }

  public getWorkspaceFolder(): vscode.WorkspaceFolder {
    return this.workspaceFolder;
  }

  dispose() {
    this.#fileSystemWatcher?.dispose();
    this.process.dispose();
  }
}
