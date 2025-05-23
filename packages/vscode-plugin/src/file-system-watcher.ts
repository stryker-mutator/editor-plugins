import { Constants, SetupWorkspaceFolderContext, TestExplorer } from './index';
import { commonTokens, tokens } from './di/index';
import * as vscode from 'vscode';
import { SetupTestExplorerContext } from './index';
import { Injector } from 'typed-inject';
import { Configuration, Settings } from './config';

export interface SetupFileWatcherContext extends SetupTestExplorerContext {
  [commonTokens.testExplorer]: TestExplorer;
}

export class FileSystemWatcher {
  public static readonly inject = tokens(
    commonTokens.injector,
    commonTokens.workspaceFolder,
  );
  constructor(
    private readonly injector: Injector<SetupFileWatcherContext>,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
  ) {}

  init() {
    const configuredPattern = Configuration.getSettingOrDefault<string>(
      Settings.FileSystemWatcherPattern,
      Constants.DefaultFileSystemWatcherPattern,
      this.workspaceFolder,
    );

    const relativePattern = new vscode.RelativePattern(
      this.workspaceFolder,
      configuredPattern,
    );

    const watcher = vscode.workspace.createFileSystemWatcher(relativePattern);
  }
}
