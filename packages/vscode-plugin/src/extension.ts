import { createInjector } from 'typed-inject';
import * as vscode from 'vscode';
import { Workspace } from './index';

let workspace: Workspace | undefined;

export async function activate(context: vscode.ExtensionContext) {
  workspace = new Workspace(context, createInjector);

  context.subscriptions.push(
    vscode.commands.registerCommand('strykerMutator.reload', async () => {
      await workspace?.reload();
    }),
  );

  await workspace.init();
}

export async function deactivate() {
  if (workspace) {
    await workspace.dispose();
    workspace = undefined;
  }
}
