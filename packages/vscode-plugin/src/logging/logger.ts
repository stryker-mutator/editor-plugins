import * as vscode from 'vscode';

export class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor(channelName: string) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  /**
   * Log an informational message.
   * @param message The message to log.
   */
  info(message: string, label?: string): void {
    this.log('INFO', message, label);
  }

  /**
   * Log a warning message.
   * @param message The message to log.
   */
  warn(message: string, label?: string): void {
    this.log('WARN', message, label);
    this.outputChannel.show(true);
  }

  /**
   * Log an error message.
   * @param message The message to log.
   */
  error(message: string, label?: string): void {
    this.log('ERROR', message, label);
    this.outputChannel.show(true);
  }

  /**
   * Log a message with a custom log level.
   * @param level The log level (e.g., INFO, WARN, ERROR).
   * @param message The message to log.
   * @param label An optional label to identify the source of the log message.
   */
  private log(level: string, message: string, label?: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(
      `[${timestamp}] [${level}] ${label ? `[${label}] ` : ``}${message}`,
    );
  }

  /**
   * Clear the log output.
   */
  clear(): void {
    this.outputChannel.clear();
  }
}
