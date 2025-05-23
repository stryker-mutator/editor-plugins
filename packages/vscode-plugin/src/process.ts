import { Injector } from 'typed-inject';
import { commonTokens, tokens } from './di/index';
import {
  Constants,
  MissingServerPathError,
  CouldNotSpawnProcessError,
  WorkspaceFolderContext,
  ServerStartupTimeoutError,
} from './index';
import * as vscode from 'vscode';
import { ContextualLogger } from './logging/index';
import { Configuration, Settings } from './config/index';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { EventEmitter } from 'stream';
import { ServerLocation } from './domain/index';

export class Process extends EventEmitter {
  #process: ChildProcessWithoutNullStreams | undefined;

  public static readonly inject = tokens(
    commonTokens.injector,
    commonTokens.workspaceFolder,
    commonTokens.contextualLogger,
  );
  constructor(
    private readonly injector: Injector<WorkspaceFolderContext>,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
    private readonly logger: ContextualLogger,
  ) {
    super();
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

    this.logger.info(`Server started with PID ${this.#process.pid}`);

    this.#process.stdout.on('data', (data) =>
      this.emit('data', data.toString()),
    );
    this.#process.stderr.on('data', (error) =>
      this.emit('error', error.toString()),
    );
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

  dispose() {
    this.#process?.removeAllListeners();
    this.#process?.kill();
  }
}
