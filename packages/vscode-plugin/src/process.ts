import { commonTokens } from './di/index.ts';
import {
  Constants,
  MissingServerPathError,
  CouldNotSpawnProcessError,
  ServerStartupTimeoutError,
} from './index.ts';
import vscode from 'vscode';
import { ContextualLogger } from './logging/index.ts';
import { Configuration, Settings } from './config/index.ts';
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { EventEmitter } from 'events';
import type { ServerLocation } from './domain/index.ts';
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
  async init(): Promise<ServerLocation> {
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
    const cwd = Configuration.getSettingOrDefault<string>(
      Settings.CurrentWorkingDirectory,
      this.workspaceFolder.uri.fsPath,
      this.workspaceFolder,
    );
    this.logger.info(
      `Server configuration: path=${serverPath}, args=${serverArgs}, cwd=${cwd}`,
    );
    this.#process = spawn(serverPath, serverArgs, { cwd: cwd });
    if (this.#process.pid === undefined) {
      this.logger.error('Server process could not be spawned.');
      throw new CouldNotSpawnProcessError();
    }
    this.logger.info(`Server process started with PID ${this.#process.pid}`);
    this.#process.stdout.on('data', (data) => {
      this.handleProcessOutput(data, this.logger.info, 'SERVER', 'data');
    });
    this.#process.stderr.on('data', (data) => {
      this.handleProcessOutput(data, this.logger.error, 'SERVER', 'error');
    });
    this.#process.on('exit', (code) => this.emit('exit', code));
    return await this.getServerLocation();
  }
  private async getServerLocation(): Promise<ServerLocation> {
    return await new Promise<ServerLocation>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ServerStartupTimeoutError());
      }, Constants.ServerStartupTimeoutMs);
      this.on('data', (data) => {
        try {
          const dataString: string = data.toString();
          const location: ServerLocation = JSON.parse(dataString);
          clearTimeout(timeoutId);
          resolve(location);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  private handleProcessOutput = (
    data: Buffer,
    logFn: (msg: string, ...labels: string[]) => void,
    label: string,
    emitEvent: 'data' | 'error',
  ) => {
    const dataString: string = data.toString();
    dataString.split('\n').forEach((line) => {
      if (line.trim()) {
        logFn.call(this.logger, line, label);
      }
    });
    this.emit(emitEvent, dataString);
  };
  dispose() {
    this.#process?.removeAllListeners();
    this.#process?.kill();
  }
}
