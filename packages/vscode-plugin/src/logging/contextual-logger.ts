import { commonTokens, tokens } from '../di/tokens';
import { Logger } from './logger';

export class ContextualLogger {
  #logger: Logger;
  #label: string;

  public static readonly inject = tokens(commonTokens.logger, commonTokens.loggerContext);
  constructor(logger: Logger, loggerContext: string) {
    this.#logger = logger;
    this.#label = loggerContext;
  }

  /**
   * Log an informational message with the context label.
   * @param message The message to log.
   */
  info(message: string): void {
    this.#logger.info(message, this.#label);
  }

  /**
   * Log a warning message with the context label.
   * @param message The message to log.
   */
  warn(message: string): void {
    this.#logger.warn(message, this.#label);
  }

  /**
   * Log an error message with the context label.
   * @param message The message to log.
   */
  error(message: string): void {
    this.#logger.error(message, this.#label);
  }

  /**
   * Clear the log output.
   */
  clear(): void {
    this.#logger.clear();
  }
}
