import { createInjector } from 'typed-inject';
import vscode from 'vscode';

import { Workspace } from './index.ts';

let workspace: Workspace | undefined;

export function activate(context: vscode.ExtensionContext) {
  workspace = new Workspace(context, createInjector);

  context.subscriptions.push(
    vscode.commands.registerCommand('strykerMutator.reload', async () => {
      await workspace?.reload();
    }),
    vscode.commands.registerCommand(
      'strykerMutator.runMutationForFile',
      async (uri?: vscode.Uri) => {
        // If no URI is provided, use the active text editor's document URI
        // This is used when the command is invoked from the command palette)
        const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
        if (!targetUri) {
          return;
        }
        await workspace?.runMutationTestsForFile(targetUri);
      },
    ),
  );

  void workspace.init().catch((error) => {
    console.error('Failed to initialize workspace', error);
  });
}

export async function deactivate() {
  if (workspace) {
    await workspace.dispose();
    workspace = undefined;
  }
}
