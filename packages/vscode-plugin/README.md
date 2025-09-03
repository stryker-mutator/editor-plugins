# Stryker Mutation Testing for VS Code

The Stryker Mutation Testing extension for Visual Studio Code brings mutation testing to life with a fast, visual, and fully integrated experience. Say goodbye to sifting through raw terminal output or hunting through HTML reports. This extension puts everything right where you need it: in your code, in your workflow, and in real time.

## Why use the extension instead of the CLI?

While the Stryker CLI is powerful, this extension amplifies its utility by delivering:

- 🚀 Real-time feedback directly in your code editor. See which mutants survive or are killed without leaving VS Code.
- 🧭 Test Explorer integration. Browse discover and test mutants per file, folder, or individually.
- 👀 Inline annotations and diff views. Instantly see how each mutation changed your code, and whether your tests caught it.
- 🔁 Streamlined workflow. No need to jump between CLI, browser reports, and code. Everything happens in your IDE.

## What is Mutation Testing?

Mutation testing is a fault-based testing strategy that evaluates the effectiveness of your test suite by intentionally introducing small changes (called mutants) into the source code. Each mutant simulates a potential bug; tests are executed to determine whether they detect the anomaly. If the test suite fails as expected, the mutant is killed. If it passes, the mutant survives, signaling an opportunity to improve test coverage or logic.

Higher kill rates indicate stronger, more resilient tests. Mutation testing provides an objective metric to guide improvements in your test suite.

Learn more about mutation testing and StrykerJS in the [official documentation](https://stryker-mutator.io/docs/).

## Features

- **Test Explorer Integration:**

  - Browse and test mutants using the VS Code Test Explorer.
  - Visual feedback on mutant status per folder, file, or individual mutant.
  - Quickly jump to mutant locations in your codebase.

  ![test-explorer.gif](https://raw.githubusercontent.com/stryker-mutator/editor-plugins/refs/heads/main/packages/vscode-plugin/images/test-explorer.gif)

- **Code Annotations:**

  - See mutation test results inline in your code editor.
  - Re-test mutants directly from the editor.
  - Use the code diff view to see exactly what the mutation changed.

  ![code-annotations.gif](https://raw.githubusercontent.com/stryker-mutator/editor-plugins/refs/heads/main/packages/vscode-plugin/images/inline-annotations.gif)

## Requirements

- You must have [StrykerJS v9.1.0 or higher](https://stryker-mutator.io/docs/stryker-js/getting-started/) installed and configured in your project.
- The extension will automatically detect your Stryker configuration in your project and guide you through setup (check your notifications)

  ![setup-notification.png](https://raw.githubusercontent.com/stryker-mutator/editor-plugins/refs/heads/main/packages/vscode-plugin/images/setup-notification.png)

## Extension Settings

This extension contributes the following settings:

- **`strykerMutator.enable`** (boolean):

  - Enable or disable Stryker mutation testing integration for this workspace.

- **`strykerMutator.watchPattern`** (string):

  - Glob pattern for files to watch for changes and trigger mutation discovery. Uses [VS Code glob pattern syntax](https://code.visualstudio.com/docs/editor/glob-patterns#_glob-pattern-syntax).
  - Default: `**/*.{js,ts,jsx,tsx}`

- **`strykerMutator.server.path`** (string):

  - Path to the Stryker server executable. Can be absolute or relative to the workspace folder.
  - Default: `node_modules/.bin/stryker`

- **`strykerMutator.server.args`** (array):

  - Arguments to pass to the Stryker server process when starting.
  - Default: `["runServer"]`

- **`strykerMutator.server.workingDirectory`** (string):

  - Working directory for the Stryker server process. Defaults to the workspace folder if not set.

- **`strykerMutator.server.configFile`** (string):
  - Path to the Stryker configuration file to use. Can be absolute or relative to the workspace folder.
  - Default: `stryker.config.json`

## Troubleshooting & Feedback

If you have feedback or encounter any problems, please open an issue on our [GitHub repository](https://github.com/stryker-mutator/editor-plugins).
