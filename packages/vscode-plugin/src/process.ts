import { Injector } from "typed-inject";
import { commonTokens, tokens } from "./di/index";
import { Constants, SetupWorkspaceFolderContext } from "./index";
import * as vscode from 'vscode';
import { ContextualLogger } from "./logging/index";
import { Configuration, Settings } from "./config/index";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { EventEmitter } from "stream";
import { ServerLocation } from "./domain/index";

export class Process extends EventEmitter {
  #logger: ContextualLogger;
  #workspaceFolder: vscode.WorkspaceFolder;
  #process: ChildProcessWithoutNullStreams | undefined;

  public static readonly inject = tokens(commonTokens.injector, commonTokens.workspaceFolder);
  constructor(
    private readonly injector: Injector<SetupWorkspaceFolderContext>
  ) {
    super();
    this.#workspaceFolder = this.injector.resolve(commonTokens.workspaceFolder);
    this.#logger = this.injector.provideValue(commonTokens.loggerContext, this.#workspaceFolder.name).injectClass(ContextualLogger);
  }

  async init(): Promise<ServerLocation> {
    var serverPath = Configuration.getSetting<string>(Settings.ServerPath, this.#workspaceFolder);

    if (!serverPath) {
      throw new Error('Cannot start mutation server. Missing server path configuration');
    }

    var serverArgs = Configuration.getSetting<string[]>(Settings.ServerArgs, this.#workspaceFolder, []);
    var cwd = Configuration.getSetting<string>(Settings.CurrentWorkingDirectory, this.#workspaceFolder, this.#workspaceFolder.uri.fsPath);

    this.#logger.info(`Server configuration: path=${serverPath}, args=${serverArgs}, cwd=${cwd}`);

    this.#process = spawn(serverPath, serverArgs, { cwd: cwd });
    if (this.#process.pid === undefined) {
      throw new Error('Mutation server could not be started');
    }

    this.#logger.info(`Mutation server started with PID ${this.#process.pid}`);

    this.#process.stdout.on('data', (data) => this.emit('data', data.toString()));
    this.#process.stderr.on('data', (error) => this.emit('error', error.toString()));
    this.#process.on('exit', (code) => this.emit('exit', code));

    return await this.getServerLocation();
  }

  private async getServerLocation(): Promise<ServerLocation> {
    return await new Promise<ServerLocation>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Mutation server did not start within the timeout'));
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