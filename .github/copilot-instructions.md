# GitHub Copilot Instructions for Editor Plugins

This repository contains a VS Code extension and related packages for mutation testing integration via the Mutation Server Protocol.

## Project Overview

The **Stryker Mutation Testing extension for VS Code** brings mutation testing to life with a fast, visual, and fully integrated experience. Instead of sifting through raw terminal output or hunting through HTML reports, this extension puts everything right where developers need it: in their code, in their workflow, and in real time.

### Key Value Propositions

- **Real-time feedback** directly in the code editor - see which mutants survive or are killed without leaving VS Code
- **Test Explorer integration** - browse, discover and test mutants per file, folder, or individually
- **Inline annotations and diff views** - instantly see how each mutation changed code and whether tests caught it
- **Streamlined workflow** - no need to jump between CLI, browser reports, and code. Everything happens in the IDE

### What is Mutation Testing?

Mutation testing is a fault-based testing strategy that evaluates the effectiveness of test suites by intentionally introducing small changes (called mutants) into source code. Each mutant simulates a potential bug; tests are executed to determine whether they detect the anomaly. If the test suite fails as expected, the mutant is killed. If it passes, the mutant survives, signaling an opportunity to improve test coverage or logic.

Higher kill rates indicate stronger, more resilient tests. Mutation testing provides an objective metric to guide improvements in test suites.

## Project Structure

This is a monorepo with the following packages:

- `packages/vscode-plugin/` - Main VS Code extension for mutation testing
- `packages/mutation-server-protocol/` - TypeScript definitions for the Mutation Server Protocol

### Extension Features

The VS Code extension provides:

**Test Explorer Integration:**

- Browse and test mutants using the VS Code Test Explorer
- Visual feedback on mutant status per folder, file, or individual mutant
- Quick navigation to mutant locations in the codebase

**Code Annotations:**

- See mutation test results inline in the code editor
- Re-test mutants directly from the editor
- Use code diff view to see exactly what mutations changed

## Architecture Guidelines

### VS Code Extension (`packages/vscode-plugin/`)

**Core Principles:**

- Use dependency injection pattern with `typed-inject` library
- Follow modular architecture with clear separation of concerns
- Event-driven design using VS Code's extension API
- Configuration-driven behavior via VS Code settings

**Key Components:**

- `Workspace` - Top-level manager for multiple workspace folders
- `WorkspaceFolder` - Main orchestrator for workspace-level mutation testing
- `MutationServer` - Spawns server process & orchestrates communication with it via JSON-RPC
- `Process` - Manages mutation testing framework server process lifecycle
- `Transport` - Abstract transport layer for server communication (right now only stdio)
- `StdioTransport` - Process-based transport for local mutation testing framework instances
- `TestExplorer` - Integrates with VS Code Test Explorer API
- `Configuration` - Handles VS Code settings management
- `Logger` - Contextual logging with multiple labels support
- `TestRunner` - Executes mutation tests and handles test results
- `FileSystemWatcher` - Monitors file changes for automatic re-discovery
- `FileChangeHandler` - Processes file change events and triggers updates
- `ContextualLogger` - Enhanced logger with contextual labels

**Coding Standards:**

- Use TypeScript with strict typing
- Prefer composition over inheritance
- Use async/await for asynchronous operations
- Handle errors gracefully with proper logging
- Use meaningful variable and function names

### Error Handling

- Custom error classes for specific scenarios (e.g., `UnsupportedServerVersionError`)
- Proper logging at appropriate levels (info, warn, error)

### Testing

- Use Mocha for tests with VS Code APIs
- Use Sinon for mocking VS Code APIs and external dependencies
- Use Chai for assertions

**Test Organization:**
For the VS Code extension (`packages/vscode-plugin/`), tests are organized in the `src/test/` directory:

- `src/test/unit/` - Unit tests for individual classes and functions
- `src/test/integration/` - Integration tests that require VS Code APIs
- `src/test/helpers/` - Test utilities and helper functions
- Within each directory, follow the same structure as the source code (e.g., `src/test/unit/config/configuration.spec.ts`)
- DO NOT import Mocha functions (`describe`, `it`, `beforeEach`, `afterEach`, etc.) - they are provided globally by the VS Code test runner

**Test File Naming:**

- Use `*.spec.ts` suffix for test files (e.g., `workspaceFolder.spec.ts`)
- Use descriptive names that match the component being tested

### Dependencies

**Runtime Dependencies:**

- `typed-inject` - Dependency injection
- `json-rpc-2.0` - JSON-RPC communication
- `mutation-server-protocol` - Protocol definitions
- `rxjs` - Reactive programming

**Development Dependencies:**

- `esbuild` - Fast bundling
- `typescript` - Type checking
- `eslint` - Linting
- `@types/vscode` - VS Code API types

## Mutation Testing Framework Integration

This extension integrates with the mutation testing framework via the Mutation Server Protocol:

- Spawns mutation testing framework (e.g. StrykerJs) process with `serve stdio` command
- Communicates via JSON-RPC over stdio
- Handles configuration, discovery, and mutation testing operations
- Presents results in VS Code Test Explorer and inline annotations

## Code Style

- Use meaningful commit messages following conventional commits
- Prefer explicit types over `any`
- Follow VS Code extension development best practices

## Common Patterns

**Configuration Updates:**

```typescript
await Configuration.updateSettingIfChanged(
  Settings.SomeSetting,
  value,
  workspaceFolder,
);
```

**Logging with Context:**

```typescript
this.logger.info('Message', 'Context1', 'Context2');
```

**Dependency Injection:**

```typescript
static readonly inject = tokens(
  commonTokens.injector,
  commonTokens.workspaceFolder,
  commonTokens.contextualLogger,
);
```

When contributing, ensure your code follows these patterns and principles for consistency across the codebase.
