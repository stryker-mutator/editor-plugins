# Mutation Server Protocol Specification

The Mutation Server Protocol (MSP) provides endpoints for IDEs to run mutation testing and report the progress.

> [!NOTE]  
> Inspired by the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/overviews/lsp/overview/)

This document describes the 0.1 version of the mutation server protocol.

## Base Protocol

The base protocol exchanges [JSON-RPC 2.0](https://www.jsonrpc.org/) messages between the client and the server via a socket connection. Each request from the client must be answered by the server with a response. The server may also send notifications to the client. The protocol is designed to be language agnostic and can be used with any programming language.

Each socket connection correlates to a single JSON-RPC request-response cycle. During this cycle notifications may be send from the server (progress reporting) to the client or from the client to the server (for cancellation purposes).

The mutation server must:

1. Provide an open socket.
2. Report the port number and (optionally) the host via standard output as the first message it writes. For example, `{"port": 1234 }`.

The client parses this message and connects to the server.

In the future, the protocol may support additional inter-process communication (IPC) methods, such as standard input/output (stdio), pipes, and sockets.

> [!TIP]
> Locations are reported as part of the messages are always 1-based. The first line in a file is 1, the first column in a line is 1.

### Example

```
Content-Length: ...\r\n
\r\n
{
	"jsonrpc": "2.0",
	"id": 1,
	"method": "discover",
	"params": {
		...
	}
}
```

The message above is a request to the server or from the server to the client. Each message contains a `Content-Length` header that specifies the length of the content part. The message is encoded as UTF-8.

### File paths

Both the `discover` and `mutationTest` methods accept file paths as an array of strings. When a path ends with `/` it indicates a directory.

Each path can specify exactly which code blocks to mutate/discover by means of a mutation range. This can be done postfixing your file with :startLine[:startColumn]-endLine[:endColumn]. Some examples:

- `"src/app.js:1-11"` \
   Discover/mutation-test test lines 1 through 11 inside app.js.
- `"src/app.js:5:4-6:4"` \
   Discover/mutation-test from line 5, column 4 through line 6 column 4 inside app.js (columns 4 are included).
- `"src/util/"` \
   Discover/mutation-test all files inside the util directory.

### Methods

The MSP defines the following methods:

- `configure`: The first method that must be called by the client to initialize the server. Can also be called subsequently to change the configuration.
- `discover`: Discovers mutants in the given glob patterns.
- `mutationTest`: The method to start a mutation test run.

#### Configure

The `configure` method is used to configure the server. The server must respond with a `ConfigureResult` message.

```ts
export interface ConfigureParams {
  /**
   * The (relative or absolute) path to mutation testing framework's config file to load.
   */
  configFilePath?: string;
}

export interface ConfigureResult {
  /**
   * The mutation testing server protocol major version that the client supports (major)
   * For example, "1"
   */
  version: string;
}
```

#### Discover

The `discover` method is used to discover mutants in the given glob patterns. The server must respond with a `DiscoverResult` message.

The `DiscoveredMutant` type is a subset of the `MutantResult` type. The `MutantResult` is the type that can be found in the [mutation testing report schema](https://github.com/stryker-mutator/mutation-testing-elements/blob/2902d56301cfdaa8ad2be59f3bca07bdf96f89b4/packages/report-schema/src/mutation-testing-report-schema.json#L37).

```ts
export interface DiscoverParams {
  /**
   * The glob patterns to files to discover mutant in, or undefined to discover mutants in the entire project.
   */
  globPatterns?: string[];
}

type DiscoveredMutant = Pick<
  schema.MutantResult,
  "id" | "location" | "description" | "mutatorName" | "replacement"
>;

export interface DiscoverResult {
  mutants: readonly DiscoveredMutant[];
}
```

#### MutationTest

The `mutationTest` method is used to start a mutation test run. The server must respond with a `MutationTestResult` message.

Whenever a partial result is in, the server is expected to send a `reportMutationTestProgress` notification with the partial result as `MutationTestResult`.

> [!NOTE]
> The MutantResult should adhere to the [mutation testing report schema](https://github.com/stryker-mutator/mutation-testing-elements/blob/2902d56301cfdaa8ad2be59f3bca07bdf96f89b4/packages/report-schema/src/mutation-testing-report-schema.json#L37)

```ts
export interface MutationTestParams {
  /**
   * The glob patterns to mutation test.
   */
  globPatterns?: string[];
}

export interface MutationTestResult {
  mutants: schema.MutantResult[];
}
```

### Error messages

TODO