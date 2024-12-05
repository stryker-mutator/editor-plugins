import { Injector, tokens } from 'typed-inject';
import * as vscode from 'vscode';
import { BaseContext } from './di/context';
import { commonTokens } from './di/tokens';

export interface SetupWorkspaceFolderContext extends BaseContext {
  [commonTokens.workspaceFolder]: vscode.WorkspaceFolder;
}

export class WorkspaceFolder {
  public static readonly inject = tokens(commonTokens.workspaceFolder);
  constructor(
    private readonly injector: Injector<SetupWorkspaceFolderContext>
  ) {}

  init() {

  }

  public getWorkspaceFolder(): vscode.WorkspaceFolder {
    return this.injector.resolve(commonTokens.workspaceFolder);
  }

  dispose() {
    
  }
}
