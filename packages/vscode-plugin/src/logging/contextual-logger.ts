import { commonTokens } from '../di/index.ts';
import { Logger } from './index.ts';

export class ContextualLogger {
  #logger: Logger;
  #label: string;

  public static readonly inject = [
    commonTokens.logger,
    commonTokens.loggerContext,
  ] as const;
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

  dispose(): void {
    this.#logger.dispose();
  }
}
