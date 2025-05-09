# Mutation Server Protocol Specification

The Mutation Server Protocol (MSP) provides endpoints for IDEs to run mutation testing and report the progress.

> [!NOTE]  
> Inspired by the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/overviews/lsp/overview/)

This document describes the mutation server protocol.

## Base Protocol

The base protocol exchanges [JSON-RPC 2.0](https://www.jsonrpc.org/) messages between the client and the server via a socket connection. The server must answer each request from the client with a response. The server may also send notifications to the client. The protocol is designed to be language agnostic and can be used with any programming language.

The mutation server must:

1. Open a socket to accept incoming client connections.
2. Provide a method such as command argument to configure a static port number. If a static port number is provided it must be used. If the static port number is already in use the server must exist with an error. If a port number is not provided the server must automatically select an available port.
3. Write connection details to the standard output as the first message, in the following JSON format:

```json
{ "port": <port_number> }
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

## Position and Location Semantics

Mutation locations and ranges are defined using a `start` and `end` position and must adhere to the [mutation-testing-report-schema](https://github.com/stryker-mutator/mutation-testing-elements/blob/master/packages/report-schema/src/mutation-testing-report-schema.json):

- `start` is **inclusive**: the character at this position is included.
- `end` is **exclusive**: the character at this position is not included.

### File paths

The `discover` method and `mutationTest` method both support targeting specific areas of code, but in **different ways**:

- The **`discover`** method accepts an array of **file paths** (as strings). These can refer to individual files, directories, or specific mutation ranges within files.
- The **`mutationTest`** method accepts two optional fields. If both files and mutants are undefined, the mutation test should be run across all files in the current project.
  - **Files**: similar to discover, these refer to files, directories, or mutation ranges.
  - **Mutants**: these refer to specific mutants previously discovered via the `discover` method.

#### File path examples

Each path can specify exactly which code blocks to mutate/discover using a mutation range. This can be done by postfixing your file with `:startLine[:startColumn]-endLine[:endColumn]`. Some examples:

- `"src/app.js:1-11"` \
   Discover/mutation-test test lines 1 through 10 inside app.js. Line 11 is excluded.
- `"src/app.js:5:4-6:4"` \
   Discover/mutation-test from line 5, column 4 through line 6, column 4 inside app.js (column 4 is excluded).
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
/**
 * The specific targets to run mutation testing on, or if both properties are left undefined: run mutation testing on all files in the current project.
 */
type MutationTestParams = {
  /**
   * Referring to files or directories, optionally with mutation ranges.
   */
  files?: string[];
  /**
   * Referring to specific discovered mutants within files previously discovered via the `discover` method.
   */
  mutants?: DiscoveredFiles;
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
