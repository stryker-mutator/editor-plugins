import type { Injector } from 'typed-inject';
import type vscode from 'vscode';

import { Configuration, type Platform, Platforms, Settings } from './config/index.ts';
import { commonTokens } from './di/index.ts';
import { DotNetMutationServer } from './dotnet-mutation-server.ts';
import { JsMutationServer } from './js-mutation-server.ts';
import type { ContextualLogger } from './logging/index.ts';
import type { MutationServer } from './mutation-server.ts';
import type { ServerProcess } from './server-process.ts';
import type { StdioTransport } from './transport/index.ts';

export interface MutationServerContext {
  [commonTokens.workspaceFolder]: vscode.WorkspaceFolder;
  [commonTokens.contextualLogger]: ContextualLogger;
  [commonTokens.process]: ServerProcess;
  [commonTokens.transport]: StdioTransport;
}

/**
 * Selects the mutation server implementation based on the 'platform' setting.
 */
export function provideMutationServer(
  injector: Injector<MutationServerContext>,
  workspaceFolder: vscode.WorkspaceFolder,
): MutationServer {
  const platform = Configuration.getSettingOrDefault<Platform>(
    Settings.Platform,
    Platforms.Js,
    workspaceFolder,
  );

  switch (platform) {
    case Platforms.DotNet:
      return injector.injectClass(DotNetMutationServer);
    case Platforms.Js:
      return injector.injectClass(JsMutationServer);
    default:
      throw new Error(`Unsupported platform: ${String(platform)}`);
  }
}

provideMutationServer.inject = [
  commonTokens.injector,
  commonTokens.workspaceFolder,
] as const;
