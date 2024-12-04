import { createInjector } from 'typed-inject';
import * as vscode from 'vscode';
import { provideLogger } from './logging/provide-logging';
import { commonTokens } from './tokens';

export async function activate(context: vscode.ExtensionContext) {
  const extension = new Extension();
}

export function deactivate() {}

class Extension {
  constructor(private readonly injectorFactory = createInjector) {
    const rootInjector = this.injectorFactory();
    const loggingProvider = provideLogger(rootInjector);

    const logger = loggingProvider.resolve(commonTokens.logger);
    logger.info('Extension activated');
  }
}
