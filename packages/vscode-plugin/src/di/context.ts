import type vscode from 'vscode';

import type { Logger } from '../logging/index.ts';
import type { commonTokens } from './tokens.ts';

/**
 * The basic dependency injection context within Stryker
 */
export interface BaseContext {
  [commonTokens.logger]: Logger;
  [commonTokens.context]: vscode.ExtensionContext;
}
