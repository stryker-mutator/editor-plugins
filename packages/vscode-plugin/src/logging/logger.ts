import vscode from 'vscode';

export class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor(channelName: string) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  /**
   * Log an informational message.
   * @param message The message to log.
   */
  info(message: string, ...labels: string[]): void {
    this.log('', message, ...labels);
  }

  /**
   * Log a warning message.
   * @param message The message to log.
   */
  warn(message: string, ...labels: string[]): void {
    this.log('WARN', message, ...labels);
    this.outputChannel.show(true);
  }

  /**
   * Log an error message.
   * @param message The message to log.
   */
  error(message: string, ...labels: string[]): void {
    this.log('ERROR', message, ...labels);
    this.outputChannel.show(true);
  }
  /**
   * Log a message with a custom log level.
   * @param level The log level (e.g., INFO, WARN, ERROR). Optional.
   * @param message The message to log.
   * @param label An optional label to identify the source of the log message.
   */
  private log(level: string, message: string, ...labels: string[]): void {
    const levelPart = level ? `[${level}] ` : '';
    const labelPart =
      labels && labels.length > 0
        ? labels.map((label) => `[${label}]`).join(' ') + ' '
        : '';
    this.outputChannel.appendLine(`${labelPart}${levelPart}${message}`);
  }

  /**
   * Clear the log output.
   */
  clear(): void {
    this.outputChannel.clear();
  }
}
