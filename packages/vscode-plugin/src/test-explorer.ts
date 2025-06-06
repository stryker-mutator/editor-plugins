import { commonTokens, tokens } from './di/index';
import * as vscode from 'vscode';
import {
  DiscoveredMutant,
  DiscoverResult,
  Location,
  MutantResult,
  MutationTestParams,
  MutationTestResult,
} from 'mutation-server-protocol';
import { Constants, MutationServer } from './index';
import * as fs from 'fs';
import { ContextualLogger } from './logging/index';

export function provideTestController(
  workspaceFolder: vscode.WorkspaceFolder,
): vscode.TestController {
  return vscode.tests.createTestController(
    workspaceFolder.name,
    workspaceFolder.name,
  );
}
provideTestController.inject = tokens(commonTokens.workspaceFolder);

export class TestExplorer {
  public static readonly inject = tokens(
    commonTokens.workspaceFolder,
    commonTokens.testController,
    commonTokens.mutationServer,
    commonTokens.contextualLogger,
  );
  constructor(
    private readonly workspaceFolder: vscode.WorkspaceFolder,
    private readonly testController: vscode.TestController,
    private readonly mutationServer: MutationServer,
    private readonly logger: ContextualLogger,
  ) {
    this.testController.createRunProfile(
      Constants.TestRunProfileLabel,
      vscode.TestRunProfileKind.Run,
      this.testRunHandler.bind(this),
    );
  }

  public async testRunHandler(
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken,
  ) {
    this.logger.info('Starting mutation test run');

    const testRun = this.testController.createTestRun(
      request,
      Constants.AppName,
      true,
    );

    // If the request includes specific tests, use them; otherwise, use all test items
    const queue: vscode.TestItem[] = request.include
      ? [...request.include]
      : [...this.testController.items].map(([_, testItem]) => testItem);

    queue.forEach((testItem) => {
      this.traverseTestItems(testItem, (item) => {
        testRun.started(item);
      });
    });

    const mutationTestParams: MutationTestParams = {
      files: this.toFilePaths(queue),
    };

    token.onCancellationRequested(async () => {
      testRun.appendOutput('Test run cancellation requested, ending test run.');
      testRun.end();
    });

    try {
      await this.mutationServer.mutationTest(mutationTestParams, async (progress) =>
        await this.processMutationTestResult(progress, testRun),
      );
    } catch (error: Error | unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Mutation server threw an exception during mutation testing:
        ${errorMessage}`,
      );
      queue.forEach((testItem) => {
        this.traverseTestItems(testItem, (item) => {
          testRun.errored(item, new vscode.TestMessage(errorMessage));
        });
      });
    } finally {
      testRun.end();
      this.logger.info('Mutation test run finished');
    }
  }

  private traverseTestItems(
    testItem: vscode.TestItem,
    action: (item: vscode.TestItem) => void,
  ): void {
    action(testItem);
    for (const [, child] of testItem.children) {
      this.traverseTestItems(child, action);
    }
  }

  private toFilePaths(testItems: vscode.TestItem[]): string[] {
    let filePaths: string[] = [];
    // based on uri, check if uri is folder or file, then if folder, add / to the end
    testItems.forEach((testItem) => {
      const uri = testItem.uri;
      if (uri) {
        if (fs.lstatSync(uri.fsPath).isDirectory()) {
          filePaths.push(`${uri.fsPath}/`);
        } else {
          filePaths.push(uri.fsPath);
        }
      }
    });
    return filePaths;
  }

  private async processMutationTestResult(
    mutationTestResult: MutationTestResult,
    testRun: vscode.TestRun,
  ) {
    for (const [filePath, mutants] of Object.entries(
      mutationTestResult.files,
    )) {
      for (const mutant of mutants.mutants) {
        const testItem = this.addMutantTestItem(filePath, mutant);
        switch (mutant.status) {
          case 'Timeout':
          case 'RuntimeError':
          case 'CompileError':
          case 'Killed':
            testRun.passed(testItem);
            break;
          case 'Ignored':
            testRun.skipped(testItem);
            break;
          default:
            const testMessage = await this.getTestMessage(mutant, filePath);
            testRun.failed(testItem, testMessage);
            break;
        }

        testRun.appendOutput(this.createOutputMessage(mutant, filePath));
      }
    }
  }

  // A test message is shown as an annotation in the editor
  private async getTestMessage(mutant: MutantResult, filePath: string): Promise<vscode.TestMessage> {
    const message = new vscode.TestMessage(
      `${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column}) ${mutant.status}`);

    const uri = vscode.Uri.joinPath(this.workspaceFolder.uri, filePath);

    message.location = new vscode.Location(uri, TestExplorer.locationToRange(mutant.location));
    message.message = `${mutant.mutatorName} ${mutant.status}`;

    if (!mutant.replacement) {
      return message;
    }

    // // TODO: Fix? as actually this is not the original code, but the code once the mutation result was received.
    // // TODO: Store the original code or maybe cancel this part of the run if the code has changed
    try {
      const fileBuffer = await vscode.workspace.fs.readFile(uri);
      const originalCode = fileBuffer.toString();
      const originalLines = originalCode.split('\n');

      const codeLines = originalLines.slice(mutant.location.start.line - 1, mutant.location.end.line);
      message.expectedOutput = codeLines.join('\n');

      if (codeLines.length === 1) {
        const replacedPart = codeLines[0].substring(mutant.location.start.column - 1, mutant.location.end.column - 1);
        message.actualOutput = codeLines[0].replace(replacedPart, mutant.replacement);
      } else {
        const firstLine = codeLines[0].substring(0, mutant.location.start.column - 1);
        const lastLine = codeLines[codeLines.length - 1].substring(mutant.location.end.column - 1);
        message.actualOutput = firstLine + mutant.replacement + lastLine;
      }

      return message;
    } catch (error) {
      this.logger.error(`Failed to read file ${filePath}: ${error}`);
      return message;
    }
  }

  public processDiscoverResult(discovery: DiscoverResult) {
    Object.entries(discovery.files).forEach(([relativeFilePath, mutants]) => {
      const fileTestItem = this.findFileTestItem(relativeFilePath);
      if (fileTestItem) {
        // Remove mutants that are no longer present in the file
        fileTestItem.children.replace([]);
      }

      mutants.mutants.forEach((mutant) => {
        this.addMutantTestItem(relativeFilePath, mutant);
      });
    });
  }

  public processFileDeletions(uris: vscode.Uri[]) {
    for (const uri of uris) {
      this.deleteUriFromTestExplorer(uri);
    }
  }

  private deleteUriFromTestExplorer(uri: vscode.Uri): void {
    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const directories = relativePath.split('/');

    const fileName = directories[directories.length - 1];
    const parentDirectory = directories[directories.length - 2];

    let currentNodes = this.testController.items;
    let parent: vscode.TestItem | undefined;

    // Traverse the tree to find the parent directory
    for (const directory of directories) {
      const node = currentNodes.get(directory);

      if (!node) {
        // Directory not found, exit the loop
        break;
      }

      if (directory === parentDirectory) {
        parent = node;
        node.children.delete(fileName);
        break;
      }

      currentNodes = node.children;
    }

    // Remove parent directories that have no children
    while (parent && parent.children.size === 0) {
      const parentParent: vscode.TestItem | undefined = parent.parent;
      if (!parentParent) {
        // Parent is top-level item
        this.testController.items.delete(parent.id);
        break;
      }
      parentParent.children.delete(parent.id);
      parent = parentParent;
    }
  }

  private addMutantTestItem(
    relativeFilePath: string,
    mutant: DiscoveredMutant | MutantResult,
  ): vscode.TestItem {
    const pathSegments = relativeFilePath.split('/');

    let currentCollection = this.testController.items;

    let currentUri = '';

    // Iterate through the directories to find the file test item in the tree
    for (const pathSegment of pathSegments) {
      currentUri += `/${pathSegment}`;
      const node = currentCollection.get(pathSegment);

      if (!node) {
        const uri = vscode.Uri.file(
          `${this.workspaceFolder.uri.path}${currentUri}`,
        );
        const newDirectory = this.testController.createTestItem(
          pathSegment,
          pathSegment,
          uri,
        );
        currentCollection.add(newDirectory);
        currentCollection = newDirectory.children;
      } else {
        currentCollection = node.children;
      }
    }

    var fileUri = vscode.Uri.file(
      `${this.workspaceFolder.uri.path}${currentUri}`,
    );

    const mutantId =
      `${mutant.mutatorName}(${mutant.location.start.line}:` +
      `${mutant.location.start.column}-${mutant.location.end.line}:` +
      `${mutant.location.end.column}) (${mutant.replacement})`;

    const mutantName = `${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column})`;

    const testItem = this.testController.createTestItem(
      mutantId,
      mutantName,
      fileUri,
    );

    testItem.range = TestExplorer.locationToRange(mutant.location);

    currentCollection.add(testItem);
    return testItem;
  }

  private static locationToRange(location: Location): vscode.Range {
    // Convert the 1-based line and column numbers to 0-based for VS Code
    return new vscode.Range(
      new vscode.Position(location.start.line - 1, location.start.column - 1),
      new vscode.Position(location.end.line - 1, location.end.column - 1),
    );
  }

  private static rangeToLocation(range: vscode.Range): Location {
    // Convert the 0-based line and column numbers to 1-based for the mutation server
    return {
      start: {
        line: range.start.line + 1,
        column: range.start.character + 1,
      },
      end: {
        line: range.end.line + 1,
        column: range.end.character + 1,
      },
    };
  }

  private findFileTestItem(
    relativeFilePath: string,
  ): vscode.TestItem | undefined {
    const directories = relativeFilePath.split('/');
    const fileName = directories[directories.length - 1];

    let currentCollection = this.testController.items;

    // Iterate through the directories to find the file test item in the tree
    for (const directory of directories) {
      const node = currentCollection.get(directory);

      if (node && node.id === fileName) {
        return node;
      }

      if (!node) {
        return undefined;
      }

      currentCollection = node.children;
    }
  }

  private createOutputMessage(mutant: MutantResult, filePath: string): string {
    let outputMessage = '';

    const relativeFilePath = vscode.workspace.asRelativePath(filePath, false);

    const makeBold = (text: string) => `\x1b[1m${text}\x1b[0m`;
    const makeBlue = (text: string) => `\x1b[34m${text}\x1b[0m`;
    const makeYellow = (text: string) => `\x1b[33m${text}\x1b[0m`;

    outputMessage += `[${mutant.status}] ${mutant.mutatorName}\r\n`;
    outputMessage += `${makeBlue(relativeFilePath)}:${makeYellow(mutant.location.start.line.toString())}:${makeYellow(mutant.location.start.column.toString())}\r\n`;
    outputMessage += `${makeBold('Replacement:')} ${mutant.replacement}\r\n`;
    outputMessage += `${makeBold('Covered by tests:')}\r\n`;
    if (mutant.coveredBy && mutant.coveredBy.length > 0) {
      mutant.coveredBy.forEach((test) => {
        outputMessage += `\t${test}\r\n`;
      });
    }

    outputMessage += `${makeBold('Killed by tests:')}\r\n`;
    if (mutant.killedBy && mutant.killedBy.length > 0) {
      mutant.killedBy.forEach((test) => {
        outputMessage += `\t${test}\r\n`;
      });
    }

    if (mutant.duration) {
      outputMessage += `${makeBold('Test Duration:')}${mutant.duration} milliseconds\r\n`;
    }
    if (mutant.testsCompleted) {
      outputMessage += `${makeBold('Tests Completed:')}${mutant.testsCompleted}\r\n`;
    }

    outputMessage += '\r\n\r\n';

    return outputMessage;
  }
}
