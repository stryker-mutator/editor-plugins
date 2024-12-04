import { createInjector } from 'typed-inject';
import { Disposable, ExtensionContext } from 'vscode';
import { LoggerProvider, provideLogger } from './logging/provide-logging';
import { commonTokens } from './tokens';

export async function activate(context: ExtensionContext) {
  const extension = new Extension();
  context.subscriptions.push(Disposable.from(extension));
}

export function deactivate() {}

class Extension {
  #loggingProvider: LoggerProvider;
  
  constructor(private readonly injectorFactory = createInjector) {
    const rootInjector = this.injectorFactory();
    this.#loggingProvider = provideLogger(rootInjector);

    const logger = this.#loggingProvider.resolve(commonTokens.logger);
    logger.info('Extension activated');
  }

  dispose() {
    const logger = this.#loggingProvider.resolve(commonTokens.logger);
    logger.info('Extension deactivated');
  }
}
