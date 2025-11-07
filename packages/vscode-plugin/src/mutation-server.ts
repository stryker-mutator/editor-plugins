import { commonTokens } from './di/index.ts';
import { JSONRPCClient } from 'json-rpc-2.0';
import { StdioTransport } from './transport/index.ts';
import {
  ConfigureParams,
  ConfigureResult,
  DiscoverParams,
  DiscoverResult,
  MutationTestParams,
  MutationTestResult,
} from 'mutation-server-protocol';
import { filter, map, Observable, merge, from, takeUntil } from 'rxjs';
import vscode from 'vscode';
import { Configuration, Settings } from './config/index.ts';
import { Constants, Process } from './index.ts';
const rpcMethods = Object.freeze({
  configure: 'configure',
  discover: 'discover',
  mutationTest: 'mutationTest',
  reportMutationTestProgressNotification: 'reportMutationTestProgress',
});
export class MutationServer {
  private readonly workspaceFolder;
  private readonly process;
  private transport: StdioTransport;
  private jsonRPCClient: JSONRPCClient;

  public static readonly inject = [
    commonTokens.workspaceFolder,
    commonTokens.process,
    commonTokens.transport,
  ] as const;

  constructor(
    workspaceFolder: vscode.WorkspaceFolder,
    process: Process,
    transport: StdioTransport,
  ) {
    this.workspaceFolder = workspaceFolder;
    this.process = process;
    this.transport = transport;

    // Setup JSON-RPC client with transport
    this.jsonRPCClient = new JSONRPCClient((jsonRPCRequest) => {
      const message = JSON.stringify(jsonRPCRequest);
      this.transport.send(message);
    });
  }

  public async init() {
    await this.process.init();
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
    return await this.jsonRPCClient.request(
      rpcMethods.configure,
      configureParams,
    );
  }
  public async discover(
    discoverParams: DiscoverParams,
  ): Promise<DiscoverResult> {
    return await this.jsonRPCClient.request(
      rpcMethods.discover,
      discoverParams,
    );
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
    this.process.dispose();
  }
}
