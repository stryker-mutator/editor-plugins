// Import CommonTokens before to ensure they are emitted by esbuild BEFORE they are used
// Fixes "[error] TypeError: Cannot read properties of undefined (reading 'logger')"
import { commonTokens } from './di/tokens.ts';

import { createInjector } from 'typed-inject';
import vscode from 'vscode';
import { Workspace } from './index.ts';
let workspace: Workspace | undefined;

export async function activate(context: vscode.ExtensionContext) {
  workspace = new Workspace(context, createInjector);
  await workspace.init();
}

export async function deactivate() {
  if (workspace) {
    await workspace.dispose();
    workspace = undefined;
  }
}
