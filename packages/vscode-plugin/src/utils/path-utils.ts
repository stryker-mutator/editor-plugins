import * as fs from 'fs';
import * as nodePath from 'path';
import * as vscode from 'vscode';

export const pathUtils = {
  fileExists(path: string, workspaceFolder: vscode.WorkspaceFolder): boolean {
    let resolvedPath = this.toAbsolutePath(path, workspaceFolder);
    return fs.existsSync(resolvedPath);
  },

  toAbsolutePath(
    path: string,
    workspaceFolder: vscode.WorkspaceFolder,
  ): string {
    if (nodePath.isAbsolute(path)) {
      return path;
    }
    return nodePath.join(workspaceFolder.uri.fsPath, path);
  },
};
