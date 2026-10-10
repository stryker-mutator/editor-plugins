import { JSONRPCClient } from 'json-rpc-2.0';
import type {
  ConfigureParams,
  ConfigureResult,
  DiscoverParams,
  DiscoverResult,
  MutationTestParams,
  MutationTestResult,
} from 'mutation-server-protocol';
import type { Observable } from 'rxjs';
import { filter, from, map, merge, takeUntil } from 'rxjs';
import type vscode from 'vscode';
import path from 'path';

import { Configuration, Settings } from './config/index.ts';
import { commonTokens } from './di/index.ts';
import type { ServerProcess } from './index.ts';
import { Constants } from './index.ts';
import type { MutationServer } from './mutation-server.ts';
import type { StdioTransport } from './transport/index.ts';
import { ContextualLogger } from './logging/contextual-logger.ts';

const rpcMethods = Object.freeze({
  configure: 'configure',
  discover: 'discover',
  mutationTest: 'mutationTest',
  reportMutationTestProgressNotification: 'reportMutationTestProgress',
});
export class DotNetMutationServer implements MutationServer {
  private readonly workspaceFolder;
  private readonly serverProcess;
  private readonly transport: StdioTransport;
  private readonly jsonRPCClient: JSONRPCClient;
  private readonly logger: ContextualLogger;

  public static readonly inject = [
    commonTokens.workspaceFolder,
    commonTokens.process,
    commonTokens.transport,
    commonTokens.contextualLogger,
  ] as const;

  constructor(
    workspaceFolder: vscode.WorkspaceFolder,
    serverProcess: ServerProcess,
    transport: StdioTransport,
    logger: ContextualLogger,
  ) {
    this.workspaceFolder = workspaceFolder;
    this.serverProcess = serverProcess;
    this.transport = transport;
    this.logger = logger;

    // Setup JSON-RPC client with transport
    this.jsonRPCClient = new JSONRPCClient((jsonRPCRequest) => {
      const message = JSON.stringify(jsonRPCRequest);
      this.transport.send(message);
    });
  }

  public async init() {
    const serverArgs = Configuration.getSettingOrDefault<string[]>(
      Settings.DotNetServerArgs,
      ['stryker', 'serve', 'stdio'],
      this.workspaceFolder,
    );

    const serverWorkingDirectory = Configuration.getSettingOrDefault<string>(
      Settings.DotNetServerWorkingDirectory,
      this.workspaceFolder.uri.fsPath,
      this.workspaceFolder,
    );

    const cwd = path.resolve(
      this.workspaceFolder.uri.fsPath,
      serverWorkingDirectory,
    );

    this.logger.info(
      `Starting dotnet mutation server with configuration: command=dotnet, args=${serverArgs}, cwd=${cwd}`,
    );

    await this.serverProcess.init(cwd, 'dotnet', serverArgs);
    await this.transport.init();

    // Handle incoming messages (responses and requests with id)
    this.transport.messages.subscribe((event) => {
      this.jsonRPCClient.receive(event);
    });

    const configResult = await this.configure();

    if (configResult.version !== Constants.SupportedMspVersion) {
      throw new Error(
        `Mismatched server version. Expected: ${Constants.SupportedMspVersion}, got: ${configResult.version}`,
      );
    }
  }

  private async configure(): Promise<ConfigureResult> {
    const configFilePath = Configuration.getSetting<string>(
      Settings.ConfigFilePath,
      this.workspaceFolder,
    );

    const configureParams: ConfigureParams = { configFilePath: configFilePath };
    return (await this.jsonRPCClient.request(
      rpcMethods.configure,
      configureParams,
    )) as ConfigureResult;
  }

  public async discover(
    discoverParams: DiscoverParams,
  ): Promise<DiscoverResult> {
    return (await this.jsonRPCClient.request(
      rpcMethods.discover,
      discoverParams,
    )) as DiscoverResult;
  }

  public mutationTest(
    mutationTestParams: MutationTestParams,
  ): Observable<MutationTestResult> {
    const finalResult$ = from(
      this.jsonRPCClient.request(
        rpcMethods.mutationTest,
        mutationTestParams,
      ) as Promise<MutationTestResult>,
    );

    const progressNotification$ = this.transport.notifications.pipe(
      filter(
        (notification) =>
          notification.method ===
          rpcMethods.reportMutationTestProgressNotification,
      ),
      map((notification) => notification.params as MutationTestResult),
      takeUntil(finalResult$),
    );

    return merge(progressNotification$, finalResult$);
  }

  public async dispose() {
    await this.transport.dispose();
    this.serverProcess.dispose();
  }
}
