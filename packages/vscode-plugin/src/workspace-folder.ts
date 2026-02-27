import { type Injector } from 'typed-inject';
import vscode from 'vscode';
import { type BaseContext, commonTokens } from './di/index.ts';
import { Configuration, Settings } from './config/index.ts';
import { ContextualLogger } from './logging/index.ts';
import { MutationServer, TestRunner } from './index.ts';
import { provideTestController, TestExplorer } from './test-explorer.ts';
import { FileSystemWatcher } from './file-system-watcher.ts';
import { FileChangeHandler } from './file-change-handler.ts';
export interface WorkspaceFolderContext extends BaseContext {
  [commonTokens.loggerContext]: string;
  [commonTokens.contextualLogger]: ContextualLogger;
  [commonTokens.workspaceFolder]: vscode.WorkspaceFolder;
}
export class WorkspaceFolder {
  private readonly injector;
  readonly workspaceFolder;
  private readonly mutationServer;
  private readonly logger;
  #initialized = false;
  #fileSystemWatcher?: FileSystemWatcher;
  #testExplorer?: TestExplorer;
  static readonly inject = [
    commonTokens.injector,
    commonTokens.workspaceFolder,
    commonTokens.mutationServer,
    commonTokens.contextualLogger,
  ] as const;
  constructor(
    injector: Injector<WorkspaceFolderContext>,
    workspaceFolder: vscode.WorkspaceFolder,
    mutationServer: MutationServer,
    logger: ContextualLogger,
  ) {
    this.injector = injector;
    this.workspaceFolder = workspaceFolder;
    this.mutationServer = mutationServer;
    this.logger = logger;
  }
  async init() {
    this.#initialized = false;

    const enabled = Configuration.getSettingOrDefault<boolean>(
      Settings.enable,
      true,
      this.workspaceFolder,
    );

    if (!enabled) {
      this.logger.info("Setting 'enable' is false. Skipping initialization.");
      return;
    }

    try {
      await this.mutationServer.init();
    } catch (error) {
      this.logger.error(`Failed to initialize mutation server: ${error}`);
      return;
    }

    const serverWorkspaceDirectory = Configuration.getSettingOrDefault<string>(
      Settings.CurrentWorkingDirectory,
      '.',
      this.workspaceFolder,
    ) as string;

    let workspaceScopedInjector = this.injector
      .provideValue(commonTokens.mutationServer, this.mutationServer)
      .provideValue(
        commonTokens.serverWorkspaceDirectory,
        serverWorkspaceDirectory,
      );

    this.#testExplorer = workspaceScopedInjector
      .provideFactory(commonTokens.testController, provideTestController)
      .provideClass(commonTokens.testRunner, TestRunner)
      .injectClass(TestExplorer);

    this.#fileSystemWatcher = workspaceScopedInjector
      .provideValue(commonTokens.testExplorer, this.#testExplorer)
      .provideClass(commonTokens.fileChangeHandler, FileChangeHandler)
      .injectClass(FileSystemWatcher);
    this.#fileSystemWatcher.init();

    // Initial discovery of mutants
    const discoverResult = await this.mutationServer.discover({});
    this.#testExplorer.processDiscoverResult(
      discoverResult,
      serverWorkspaceDirectory,
    );

    this.#initialized = true;
  }

  async runMutationTestsForFile(fileUri: vscode.Uri) {
    const enabled = Configuration.getSettingOrDefault<boolean>(
      Settings.enable,
      true,
      this.workspaceFolder,
    );

    if (!enabled) {
      this.logger.error(
        `Setting 'strykerMutator.enable' is false. Skipping mutation test run for: ${fileUri.fsPath}`,
        { notify: true },
      );
      return;
    }

    if (!this.#initialized) {
      this.logger.error(
        `Workspace folder is not initialized for: ${this.workspaceFolder.uri.fsPath}. Skipping mutation test run for: ${fileUri.fsPath}`,
        { notify: true },
      );
      return;
    }

    await this.#testExplorer!.runMutationTestsForFile(fileUri);
  }

  async dispose() {
    this.#initialized = false;
    this.#fileSystemWatcher?.dispose();
    await this.#testExplorer?.dispose();
    await this.mutationServer.dispose();
    this.logger.info(
      `Disposed workspace folder: ${this.workspaceFolder.uri.fsPath}`,
    );
  }
}
