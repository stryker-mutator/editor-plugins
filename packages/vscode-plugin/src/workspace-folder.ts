import { type Injector } from 'typed-inject';
import vscode from 'vscode';
import { type BaseContext, commonTokens } from './di/index.ts';
import { Configuration, Settings } from './config/index.ts';
import { ContextualLogger } from './logging/index.ts';
import { MutationServer, TestRunner } from './index.ts';
import { MutationTestParams } from 'mutation-server-protocol';
import { provideTestController, TestExplorer } from './test-explorer.ts';
import { FileSystemWatcher } from './file-system-watcher.ts';
import fs from 'fs';
import { pathUtils } from './utils/path-utils.ts';
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
    const enabled = Configuration.getSetting<boolean>(
      Settings.enable,
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

    const serverWorkspaceDirectory = Configuration.getSetting<string>(
      Settings.CurrentWorkingDirectory,
      this.workspaceFolder,
    ) as string;

    this.#testExplorer = this.injector
      .provideFactory(commonTokens.testController, provideTestController)
      .provideValue(commonTokens.mutationServer, this.mutationServer)
      .provideValue(
        commonTokens.serverWorkspaceDirectory,
        serverWorkspaceDirectory,
      )
      .provideClass(commonTokens.testRunner, TestRunner)
      .injectClass(TestExplorer);
    this.#fileSystemWatcher = this.injector.injectClass(FileSystemWatcher);
    this.#fileSystemWatcher.onFilesChanged(async (uris) => {
      // if uri is directory. add / to the end of the uri
      const fileRanges = uris.map((uri) => {
        const filePath = fs.lstatSync(uri.fsPath).isDirectory()
          ? `${uri.fsPath}/`
          : uri.fsPath;
        return { path: filePath };
      });
      const mutationTestParams: MutationTestParams = {
        files: fileRanges,
      };
      const discoverResult = await this.mutationServer.discover(mutationTestParams);
      this.#testExplorer!.processDiscoverResult(
        discoverResult,
        serverWorkspaceDirectory,
      );
    });
    this.#fileSystemWatcher.onFilesDeleted(async (uris) => {
      this.#testExplorer!.processFileDeletions(uris);
    });
    // Initial discovery of mutants
    const discoverResult = await this.mutationServer.discover({});
    this.#testExplorer.processDiscoverResult(
      discoverResult,
      serverWorkspaceDirectory,
    );
  }
  /**
   * Scans for StrykerJs configuration and prompts the user to configure the workspace settings if found.
   */
  async promptUserToConfigureSettings(): Promise<void> {
    this.logger.info(
      `Checking for StrykerJS configuration in workspace folder: ${this.workspaceFolder.uri.fsPath}`,
    );
    const configFiles = await this.findStrykerConfigFiles();
    if (configFiles.length === 0) {
      this.logger.info('No Stryker configuration files found.');
      return;
    }
    this.logger.info(
      `Found Stryker configuration files: ${configFiles.map((f) => f.path).join(', ')}`,
    );
    if (!(await this.promptEnableStrykerSupport())) {
      this.logger.info(
        'User disabled the Stryker Mutator extension for this workspace folder.',
      );
      await Configuration.updateSettingIfChanged(
        Settings.enable,
        false,
        this.workspaceFolder,
      );
      return;
    }
    const defaultConfigFilePath = vscode.workspace.asRelativePath(
      configFiles[0],
      false,
    );
    const configFilePath = await this.promptConfigFilePath(
      defaultConfigFilePath,
    );
    const strykerBinaryPath = await this.promptStrykerBinaryPath();
    await Configuration.updateSettingIfChanged(
      Settings.ServerPath,
      strykerBinaryPath,
      this.workspaceFolder,
    );
    await Configuration.updateSettingIfChanged(
      Settings.ConfigFilePath,
      configFilePath,
      this.workspaceFolder,
    );
    await Configuration.updateSettingIfChanged(
      Settings.ServerArgs,
      ['runServer'],
      this.workspaceFolder,
    );
    await Configuration.updateSettingIfChanged(
      Settings.enable,
      true,
      this.workspaceFolder,
    );
  }
  private async findStrykerConfigFiles(): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles(
      new vscode.RelativePattern(
        this.workspaceFolder,
        '{stryker.conf.js,stryker.conf.json,stryker.conf.ts,stryker.config.js,stryker.config.json,stryker.config.ts}',
      ),
      '**/node_modules/**',
    );
  }
  private async promptEnableStrykerSupport(): Promise<boolean> {
    this.logger.info(
      `Prompting user to enable StrykerJS support for workspace folder: ${this.workspaceFolder.uri.path}`,
    );
    const enable = await vscode.window.showInformationMessage(
      `Do you want to enable the Stryker Mutator extension for workspace folder ${this.workspaceFolder.name}?`,
      'Yes',
      'No',
    );
    return enable === 'Yes';
  }
  private async promptConfigFilePath(
    defaultPath: string,
  ): Promise<string | undefined> {
    return vscode.window.showInputBox({
      prompt: `Enter the path to your Stryker configuration file (relative to workspace folder or absolute path).`,
      value: defaultPath,
      title: 'Stryker Mutator Configuration File Path',
      ignoreFocusOut: true,
      validateInput: (input) => {
        if (!pathUtils.fileExists(input, this.workspaceFolder)) {
          return 'The specified file does not exist. Please provide a valid path.';
        }
        return null;
      },
    });
  }
  private async promptStrykerBinaryPath(): Promise<string | undefined> {
    return vscode.window.showInputBox({
      prompt: `Please enter the path to your Stryker binary (relative to workspace folder or absolute path).`,
      value: 'node_modules/.bin/stryker',
      title: 'Stryker Mutator Binary Path',
      ignoreFocusOut: true,
      validateInput: (input) => {
        if (!pathUtils.fileExists(input, this.workspaceFolder)) {
          return 'The specified binary does not exist. Please provide a valid path.';
        }
        return null;
      },
    });
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
