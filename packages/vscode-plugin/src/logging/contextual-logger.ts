import { commonTokens, tokens } from '../di/index';
import { Logger } from './index';

export class ContextualLogger {
  #logger: Logger;
  #label: string;

  public static readonly inject = tokens(
    commonTokens.logger,
    commonTokens.loggerContext,
  );
  constructor(logger: Logger, loggerContext: string) {
    this.#logger = logger;
    this.#label = loggerContext;
  }

  /**
   * Log an informational message with the context label.
   * @param message The message to log.
   */
  info(message: string, ...labels: string[]): void {
    this.#logger.info(message, this.#label, ...labels);
  }

  /**
   * Log a warning message with the context label.
   * @param message The message to log.
   * @param labels Additional labels to include.
   */
  warn(message: string, ...labels: string[]): void {
    this.#logger.warn(message, this.#label, ...labels);
  }

  /**
   * Log an error message with the context label.
   * @param message The message to log.
   * @param labels Additional labels to include.
   */
  error(message: string, ...labels: string[]): void {
    this.#logger.error(message, this.#label, ...labels);
  }

  /**
   * Clear the log output.
   */
  clear(): void {
    this.#logger.clear();
  }
}
