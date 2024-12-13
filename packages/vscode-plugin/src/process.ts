import { Injector } from "typed-inject";
import { commonTokens, tokens } from "./di/index";
import { SetupWorkspaceFolderContext } from "./index";
import * as vscode from 'vscode';
import { ContextualLogger } from "./logging/index";
import { Configuration, Settings } from "./config/index";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { EventEmitter } from "stream";

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

  init() {
    var serverPath = Configuration.getSetting<string>(Settings.ServerPath, this.#workspaceFolder);

    if (!serverPath) {
      this.#logger.error('Cannot start mutation server. Missing server path configuration');
      return;
    }

    var serverArgs = Configuration.getSetting<string[]>(Settings.ServerArgs, this.#workspaceFolder, []);
    var cwd = Configuration.getSetting<string>(Settings.CurrentWorkingDirectory, this.#workspaceFolder, this.#workspaceFolder.uri.fsPath);

    this.#logger.info(`Server configuration: path=${serverPath}, args=${serverArgs}, cwd=${cwd}`);

    this.#process = spawn(serverPath, serverArgs, { cwd: cwd });
    if (this.#process.pid === undefined) {
      this.#logger.error('Mutation server could not be started');
      return;
    }

    this.#logger.info(`Mutation server started with PID ${this.#process.pid}`);

    this.#process.stdout.on('data', (data) => this.emit('data', data.toString()));
    this.#process.stderr.on('data', (error) => this.emit('error', error.toString()));
    this.#process.on('exit', (code) => this.emit('exit', code));
  }

  dispose() {
    this.#process?.removeAllListeners();
    this.#process?.kill();
  }
}
