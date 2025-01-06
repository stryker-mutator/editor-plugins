import { Injector } from "typed-inject";
import { commonTokens, tokens } from "./di";
import { ServerLocation } from "./domain";
import { SetupWorkspaceFolderContext } from "./index";
import * as net from 'net';
import * as vscode from 'vscode';
import { ContextualLogger } from "./logging";
import { JSONRPCClient, JSONRPCRequest } from 'json-rpc-2.0';
import { JsonRpcEventDeserializer } from "./utils";
import { promisify } from "util";
import { ConfigureParams, ConfigureResult, DiscoverParams, DiscoverResult, MutationTestParams, MutationTestResult } from "mutation-server-protocol";
import { filter, map, Subject } from "rxjs";

const rpcMethods = Object.freeze({
  configure: 'configure',
  discover: 'discover',
  mutationTest: 'mutationTest',
  reportMutationTestProgressNotification: 'reportMutationTestProgress',
});

export interface MutationServerContext extends SetupWorkspaceFolderContext {
  [commonTokens.serverLocation]: ServerLocation;
}

export class MutationServer {
  #socket: net.Socket;
  #logger: ContextualLogger;
  #workspaceFolder: vscode.WorkspaceFolder;
  #jsonRPCClient: JSONRPCClient;
  #notifications = new Subject<JSONRPCRequest>();

  public static readonly inject = tokens(commonTokens.injector, commonTokens.serverLocation);
  constructor(private readonly injector: Injector<MutationServerContext>) {
    this.#workspaceFolder = this.injector.resolve(commonTokens.workspaceFolder);
    this.#logger = this.injector.provideValue(commonTokens.loggerContext, this.#workspaceFolder.name).injectClass(ContextualLogger);

    const serverLocation = this.injector.resolve(commonTokens.serverLocation);
    this.#socket = net.connect(serverLocation.port, serverLocation.host, () => {
      this.#logger.info('Connected to server');
    });

    this.#jsonRPCClient = new JSONRPCClient((jsonRPCRequest => {
      const content = Buffer.from(JSON.stringify(jsonRPCRequest));
      this.#socket.write(`Content-Length: ${content.byteLength}\r\n\r\n`);
      this.#socket.write(content);
    }));

    const deserializer = new JsonRpcEventDeserializer();
    this.#socket.on('data', (data) => {
      const events = deserializer.deserialize(data);
      for (const event of events) {
        if (event.id === undefined) {
          this.#notifications.next(event);
        } else {
          this.#jsonRPCClient.receive(event);
        }
      }
    });
  }

  public async configure(configureParams: ConfigureParams): Promise<ConfigureResult> {
    return await this.#jsonRPCClient.request(rpcMethods.configure, configureParams);
  }

  public async discover(discoverParams: DiscoverParams): Promise<DiscoverResult> {
    return await this.#jsonRPCClient.request(rpcMethods.discover, discoverParams);
  }

  public async mutationTest(
    mutationTestParams: MutationTestParams,
    onPartialResult: (partialResult: MutationTestResult) => void
  ): Promise<MutationTestResult> {
    const subscription = this.#notifications.pipe(
      filter(notification => notification.method === rpcMethods.reportMutationTestProgressNotification),
      map(notification => notification.params)
    ).subscribe(onPartialResult);

    try {
      const result = await this.#jsonRPCClient.request(rpcMethods.mutationTest, mutationTestParams);
      return result;
    } finally {
      subscription.unsubscribe();
    }
  }

  public async dispose() {
    await promisify(this.#socket.end.bind(this.#socket))();
  }
}
