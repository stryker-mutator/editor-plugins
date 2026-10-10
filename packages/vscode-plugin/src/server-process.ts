import { type ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';

import { commonTokens } from './di/index.ts';
import type { ContextualLogger } from './logging/index.ts';

export class ServerProcess extends EventEmitter {
  private readonly logger;
  #process: ChildProcessWithoutNullStreams | undefined;

  static readonly inject = [
    commonTokens.workspaceFolder,
    commonTokens.contextualLogger,
  ] as const;

  constructor(
    logger: ContextualLogger,
  ) {
    super();
    this.logger = logger;
  }

  async init(cwd: string, startCommand: string, commandArgs: string[]): Promise<void> {
    const isWindows = process.platform === 'win32';

    // On Windows, wrap the path in double quotes to handle spaces and special
    // characters (e.g. parentheses) when the path is interpreted by cmd.exe
    const spawnPath = isWindows
      ? `"${startCommand}"`
      : startCommand;

    this.#process = spawn(spawnPath, commandArgs, {
      cwd,
      shell: isWindows,
    });

    this.#process.on('error', (error) => {
      this.logger.error(`Server process error: ${error.message}`);
    });

    this.#process.stdout.on('data', (data) => {
      this.emit('stdout', data);
    });
    this.#process.stderr.on('data', (data) => {
      this.emit('stderr', data);
    });

    this.#process.on('close', (code, signal) => {
      this.logger.info(
        `Server process closed with code ${code} and signal ${signal}`,
      );
    });

    this.#process.on('exit', (code, signal) => {
      if (code === 0) {
        this.logger.info('Server process exited normally with code 0');
      } else {
        this.logger.error(
          `Server process exited with code ${code} and signal ${signal}`,
        );
      }
    });
    return Promise.resolve();
  }

  write(data: string | Buffer) {
    this.#process!.stdin.write(data);
  }
  
  dispose() {
    this.#process?.removeAllListeners();
    this.#process?.kill();
  }
}
