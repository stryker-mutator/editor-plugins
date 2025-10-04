import { Logger } from '../logging/index.ts';
import { commonTokens } from './tokens.ts';
import vscode from 'vscode';

/**
 * The basic dependency injection context within Stryker
 */
export interface BaseContext {
  [commonTokens.logger]: Logger;
  [commonTokens.context]: vscode.ExtensionContext;
}
