# Mutation Server Protocol Specification

The Mutation Server Protocol (MSP) provides endpoints for IDEs to run mutation testing and report the progress.

> [!NOTE]  
> Inspired by the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/overviews/lsp/overview/)

This document describes the mutation server protocol.

## Base Protocol

The base protocol exchanges [JSON-RPC 2.0](https://www.jsonrpc.org/) messages between the client and the server via a socket connection. The server must answer each request from the client with a response. The server may also send notifications to the client. The protocol is designed to be language agnostic and can be used with any programming language.

The mutation server must:

1. Open a socket to accept incoming client connections.
2. Use the port specified by the client via the `--port <port_number>` argument, if provided. If no port is specified, the server must automatically select an available port.
3. Write connection details to the standard output as the first message, in the following JSON format:

```json
{ "host": "<host_address>", "port": <port_number> }
```

> [!TIP]
> Locations are reported as part of the messages are always 1-based. The first line in a file is 1, and the first column in a line is 1.

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

The `discover` and `mutationTest` methods accept file paths as an array of strings. A path that ends with `/` indicates a directory.

Each path can specify exactly which code blocks to mutate/discover using a mutation range. This can be done by postfixing your file with `:startLine[:startColumn]-endLine[:endColumn]`. Some examples:

- `"src/app.js:1-11"` \
   Discover/mutation-test test lines 1 through 11 inside app.js.
- `"src/app.js:5:4-6:4"` \
   Discover/mutation-test from line 5, column 4 through line 6, column 4 inside app.js (column 4 is included).
- `"src/util/"` \
   Discover/mutation-test all files inside the util directory.

### Methods

The MSP defines the following methods:

- [configure](#configure): Configure the server. Editor plugins are expected to call this on startup, but it can also be called subsequently to change the configuration.
- [`discover`](#discover): Discovers mutants in the given file paths.
- [`mutationTest`](#mutationtest): The method to start a mutation test run.

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

The `discover` method is used to discover mutants in the given file paths. The server must respond with a `DiscoverResult` message.

The `DiscoveredMutant` type is a subset of the `MutantResult` type. The `MutantResult` is the type that can be found in the [mutation testing report schema](https://github.com/stryker-mutator/mutation-testing-elements/blob/2902d56301cfdaa8ad2be59f3bca07bdf96f89b4/packages/report-schema/src/mutation-testing-report-schema.json#L37).

```ts
type DiscoverParams = {
  /**
   * The files to run discovery on, or undefined to discover all files in the current project.
   * A file ending with a `/` indicates a directory. Each path can specify exactly which code blocks to mutate/discover using a mutation range.
   * This can be done by postfixing your file with `:startLine[:startColumn]-endLine[:endColumn]`.
   */
  files?: string[];
};

type DiscoverResult = {
  files: DiscoveredFiles;
};

type DiscoveredFiles = Record<string, DiscoveredFile>;

type DiscoveredFile = {
  mutants: DiscoveredMutant[];
};

type DiscoveredMutant = {
  id: string;
  location: Location;
  description?: string;
  mutatorName: string;
  replacement?: string;
};

type Location = {
  start: Position;
  end: Position;
};

type Position = {
  line: number;
  column: number;
};
```

#### MutationTest

The `mutationTest` method starts a mutation test run. The server must respond with a `MutationTestResult` message.

Whenever a partial result is in, the server is expected to send a `reportMutationTestProgress` notification with the partial result as `MutationTestResult`.

> [!NOTE]
> The MutantResult should adhere to the [mutation testing report schema](https://github.com/stryker-mutator/mutation-testing-elements/blob/2902d56301cfdaa8ad2be59f3bca07bdf96f89b4/packages/report-schema/src/mutation-testing-report-schema.json#L37)

```ts
type MutationTestParams = {
  /**
   * The files to run mutation testing on, or undefined to run mutation testing on all files in the current project.
   * A file ending with a `/` indicates a directory. Each path can specify exactly which code blocks to mutate/discover using a mutation range.
   * This can be done by postfixing your file with `:startLine[:startColumn]-endLine[:endColumn]`.
   */
  files?: string[];
};

type MutationTestResult = {
  files: MutantResultFiles;
};

type MutantResultFiles = Record<string, MutantResultFile>;

type MutantResultFile = {
  mutants: MutantResult[];
};

type MutantResult = DiscoveredMutant & {
  coveredBy?: string[];
  duration?: number;
  killedBy?: string[];
  static?: boolean;
  status: MutantStatus;
  statusReason?: string;
  testsCompleted?: number;
};

type MutantStatus =
  | 'Killed'
  | 'Survived'
  | 'NoCoverage'
  | 'Timeout'
  | 'CompileError'
  | 'RuntimeError';
```

### Error messages

TODO
