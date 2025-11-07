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

    this.logger.info(
      `Server configuration: path=${serverPath}, args=${serverArgs}, cwd=${cwd}`,
    );

    return new Promise<void>((resolve, reject) => {
      this.#process = spawn(serverPath, serverArgs, { cwd });

      this.#process.on('error', (error) => {
        this.logger.error(`Server process error: ${error.message}`);
        reject(new CouldNotSpawnProcessError());
      });

      this.#process.stdout.on('data', (data) => {
        this.emit('stdout', data);
      });
      this.#process.stderr.on('data', (data) => {
        this.emit('stderr', data);
      });

      this.#process.on('exit', (code) => {
        if (code === 0) {
          this.logger.info('Server process exited normally with code 0');
        } else {
          this.logger.error(`Server process exited with code ${code}`);
        }
      });

      // Check if process spawned successfully
      if (this.#process.pid === undefined) {
        this.logger.error('Server process could not be spawned.');
        reject(new CouldNotSpawnProcessError());
        return;
      }

      this.logger.info(`Server process started with PID ${this.#process.pid}`);
      resolve();
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
