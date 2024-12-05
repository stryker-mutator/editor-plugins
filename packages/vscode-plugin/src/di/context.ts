import { Logger } from "../logging/logger";
import { commonTokens } from "./tokens";
import * as vscode from 'vscode';

/**
 * The basic dependency injection context within Stryker
 */
export interface BaseContext {
  [commonTokens.logger]: Logger;
  [commonTokens.context]: vscode.ExtensionContext
}
