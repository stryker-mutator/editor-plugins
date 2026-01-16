import { commonTokens } from './di/index.ts';
import { MissingServerPathError, CouldNotSpawnProcessError } from './index.ts';
import vscode from 'vscode';
import { ContextualLogger } from './logging/index.ts';
import { Configuration, Settings } from './config/index.ts';
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';

export class Process extends EventEmitter {
  private readonly workspaceFolder;
  private readonly logger;
  #process: ChildProcessWithoutNullStreams | undefined;
  static readonly inject = [
    commonTokens.workspaceFolder,
    commonTokens.contextualLogger,
  ] as const;
  constructor(
    workspaceFolder: vscode.WorkspaceFolder,
    logger: ContextualLogger,
  ) {
    super();
    this.workspaceFolder = workspaceFolder;
    this.logger = logger;
  }
  async init() {
    const serverPath = Configuration.getSetting<string>(
      Settings.ServerPath,
      this.workspaceFolder,
    );
    if (!serverPath) {
      this.logger.error(
        'Cannot start server. Missing server path configuration.',
      );
      throw new MissingServerPathError();
    }
    const serverArgs = Configuration.getSettingOrDefault<string[]>(
      Settings.ServerArgs,
      [],
      this.workspaceFolder,
    );
    const serverWorkingDirectory = Configuration.getSettingOrDefault<string>(
      Settings.CurrentWorkingDirectory,
      this.workspaceFolder.uri.fsPath,
      this.workspaceFolder,
    );
    const cwd = path.resolve(
      this.workspaceFolder.uri.fsPath,
      serverWorkingDirectory,
    );

    const resolvedServerPath = path.resolve(cwd, serverPath);

    const isWindows = process.platform === 'win32';

    this.logger.info(
      `Server configuration: path=${resolvedServerPath}, args=${serverArgs}, cwd=${cwd}`,
    );

    this.#process = spawn(resolvedServerPath, serverArgs, {
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
  }
  write(data: string | Buffer) {
    this.#process!.stdin.write(data);
  }
  dispose() {
    this.#process?.removeAllListeners();
    this.#process?.kill();
  }
}
