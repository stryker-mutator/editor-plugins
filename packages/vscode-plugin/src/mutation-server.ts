import { commonTokens } from './di/index.ts';
import { ContextualLogger } from './logging/index.ts';
import { JSONRPCClient, JSONRPCErrorException } from 'json-rpc-2.0';
import { ITransport } from './transport/index.ts';
import {
  ConfigureParams,
  ConfigureResult,
  DiscoverParams,
  DiscoverResult,
  MutationTestParams,
  MutationTestResult,
} from 'mutation-server-protocol';
import { filter, map } from 'rxjs';
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
  private readonly logger;
  private readonly workspaceFolder;
  private readonly process;
  private transport: ITransport;
  private jsonRPCClient: JSONRPCClient;

  public static readonly inject = [
    commonTokens.contextualLogger,
    commonTokens.workspaceFolder,
    commonTokens.process,
    commonTokens.transport,
  ] as const;

  constructor(
    logger: ContextualLogger,
    workspaceFolder: vscode.WorkspaceFolder,
    process: Process,
    transport: ITransport,
  ) {
    this.logger = logger;
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

  public async mutationTest(
    mutationTestParams: MutationTestParams,
    onPartialResult: (partialResult: MutationTestResult) => void,
  ): Promise<MutationTestResult> {
    const subscription = this.transport.notifications
      .pipe(
        filter(
          (notification) =>
            notification.method ===
            rpcMethods.reportMutationTestProgressNotification,
        ),
        map((notification) => notification.params),
      )
      .subscribe(onPartialResult);
    try {
      const result = await this.jsonRPCClient.request(
        rpcMethods.mutationTest,
        mutationTestParams,
      );
      return result;
    } catch (e: JSONRPCErrorException | any) {
      return Promise.reject(e.message);
    } finally {
      subscription.unsubscribe();
    }
  }

  public async dispose() {
    await this.transport.dispose();
    this.process.dispose();
  }
}
