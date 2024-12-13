import { createInjector } from 'typed-inject';
import * as vscode from 'vscode';
import { Workspace } from './index';

export async function activate(context: vscode.ExtensionContext) {
  const workspace = new Workspace(context, createInjector);
  context.subscriptions.push(vscode.Disposable.from(workspace));
}

export function deactivate() { }


