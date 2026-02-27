import vscode from 'vscode';

export interface LogOptions {
  labels?: string[];
  notify?: boolean;
}

export class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor(channelName: string) {
    this.outputChannel = vscode.window.createOutputChannel(channelName, {
      log: true,
    });
  }

  /**
   * Log an informational message.
   * @param message The message to log.
   */
  info(message: string, options: LogOptions = {}): void {
    this.log('', message, options);
  }

  /**
   * Log a warning message.
   * @param message The message to log.
   */
  warn(message: string, options: LogOptions = {}): void {
    this.log('WARN', message, options);
  }

  /**
   * Log an error message.
   * @param message The message to log.
   */
  error(message: string, options: LogOptions = {}): void {
    this.log('ERROR', message, options);
  }
  /**
   * Log a message with a custom log level.
   * @param level The log level (e.g., INFO, WARN, ERROR). Optional.
   * @param message The message to log.
   * @param options Additional log options.
   */
  private log(level: string, message: string, options: LogOptions): void {
    // Strip trailing newlines from the message
    const cleanedMessage = message.replace(/\n+$/, '');
    const labels = options.labels ?? [];

    const levelPart = level ? `[${level}] ` : '';
    const labelPart =
      labels && labels.length > 0
        ? labels.map((label) => `[${label}]`).join(' ') + ' '
        : '';
    this.outputChannel.appendLine(`${labelPart}${levelPart}${cleanedMessage}`);

    if (options.notify) {
      this.notify(level, `${labelPart}${cleanedMessage}`.trim());
    }
  }

  private notify(level: string, message: string): void {
    if (level === 'ERROR') {
      void vscode.window.showErrorMessage(message);
      return;
    }

    if (level === 'WARN') {
      void vscode.window.showWarningMessage(message);
      return;
    }

    void vscode.window.showInformationMessage(message);
  }

  /**
   * Clear the log output.
   */
  clear(): void {
    this.outputChannel.clear();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
