import { commonTokens } from '../di/index.ts';
import type { Logger } from './index.ts';
import type { LogOptions } from './logger.ts';

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
  info(message: string, options: LogOptions = {}): void {
    this.#logger.info(message, {
      ...options,
      labels: [this.#label, ...(options.labels ?? [])],
    });
  }

  /**
   * Log a warning message with the context label.
   * @param message The message to log.
   * @param options Additional log options.
   */
  warn(message: string, options: LogOptions = {}): void {
    this.#logger.warn(message, {
      ...options,
      labels: [this.#label, ...(options.labels ?? [])],
    });
  }

  /**
   * Log an error message with the context label.
   * @param message The message to log.
   * @param options Additional log options.
   */
  error(message: string, options: LogOptions = {}): void {
    this.#logger.error(message, {
      ...options,
      labels: [this.#label, ...(options.labels ?? [])],
    });
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
