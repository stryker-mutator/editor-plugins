import type { Injector } from 'typed-inject';
import type vscode from 'vscode';

import { Configuration, Settings } from './config/index.ts';
import { type BaseContext, commonTokens } from './di/index.ts';
import { FileChangeHandler } from './file-change-handler.ts';
import { FileSystemWatcher } from './file-system-watcher.ts';
import type { MutationServer } from './index.ts';
import { TestRunner } from './index.ts';
import type { ContextualLogger } from './logging/index.ts';
import { provideTestController, TestExplorer } from './test-explorer.ts';

export interface WorkspaceFolderContext extends BaseContext {
  [commonTokens.loggerContext]: string;
  [commonTokens.contextualLogger]: ContextualLogger;
  [commonTokens.workspaceFolder]: vscode.WorkspaceFolder;
}
export class WorkspaceFolder {
  private readonly injector;
  private readonly workspaceFolder;
  private readonly mutationServer;
  private readonly logger;
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
    );

    const workspaceScopedInjector = this.injector
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
  }
  getWorkspaceFolder(): vscode.WorkspaceFolder {
    return this.workspaceFolder;
  }
  async dispose() {
    this.#fileSystemWatcher?.dispose();
    await this.#testExplorer?.dispose();
    await this.mutationServer.dispose();
    this.logger.info(
      `Disposed workspace folder: ${this.workspaceFolder.uri.fsPath}`,
    );
  }
}
