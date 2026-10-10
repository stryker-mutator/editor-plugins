import type {
  MutantResult,
  MutationTestParams,
  MutationTestResult,
} from 'mutation-server-protocol';
import { lastValueFrom, mergeMap } from 'rxjs';
import vscode from 'vscode';

import { commonTokens } from './di/index.ts';
import type { MutationServer } from './index.ts';
import type { ContextualLogger } from './logging/index.ts';
import {
  locationUtils,
  testControllerUtils,
  testItemUtils,
} from './utils/index.ts';

export class TestRunner {
  private readonly mutationServer;
  private readonly workspaceFolder;
  private readonly testController;
  private readonly logger;
  private readonly serverWorkspaceDirectory;
  static readonly inject = [
    commonTokens.mutationServer,
    commonTokens.workspaceFolder,
    commonTokens.serverWorkspaceDirectory,
    commonTokens.testController,
    commonTokens.contextualLogger,
  ] as const;

  constructor(
    mutationServer: MutationServer,
    workspaceFolder: vscode.WorkspaceFolder,
    serverWorkspaceDirectory: string,
    testController: vscode.TestController,
    logger: ContextualLogger,
  ) {
    this.serverWorkspaceDirectory = serverWorkspaceDirectory;
    this.mutationServer = mutationServer;
    this.workspaceFolder = workspaceFolder;
    this.testController = testController;
    this.logger = logger;
  }

  async runMutationTests(
    request: vscode.TestRunRequest,
    testController: vscode.TestController,
    token: vscode.CancellationToken,
  ) {
    this.logger.info('Starting mutation test run');
    const testRun = testController.createTestRun(
      request,
      'Mutation Test',
      true,
    );
    const queue: vscode.TestItem[] = request.include
      ? [...request.include]
      : [...testController.items].map(([, testItem]) => testItem);
    this.markAsStarted(testRun, queue);
    token.onCancellationRequested(() => {
      testRun.appendOutput('Test run cancellation requested, ending test run.');
      testRun.end();
    });
    const mutationTestParams = testItemUtils.toMutationTestParams(queue);
    try {
      await this.executeMutationTest(testRun, mutationTestParams, queue);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Mutation server threw an exception during mutation testing:\n${errorMessage}`,
      );
      queue.forEach((testItem) => {
        testControllerUtils.traverse(testItem, (item) => {
          testRun.errored(
            item,
            new vscode.TestMessage(`Mutation Server: ${errorMessage}`),
          );
        });
      });
    } finally {
      testRun.end();
      this.logger.info('Mutation test run finished');
    }
  }

  async runMutationTestsForFile(fileUri: vscode.Uri) {
    this.logger.info(
      `Starting file-scoped mutation test run for ${fileUri.fsPath}`,
    );
    const testRun = this.testController.createTestRun(
      new vscode.TestRunRequest(),
      'Mutation Test',
      true,
    );

    const fileTestItems = this.getExistingFileTestItems(fileUri);
    this.markAsStarted(testRun, fileTestItems);

    const relativePath = testItemUtils.toWorkspaceRelativePath(fileUri);
    const mutationTestParams: MutationTestParams = {
      files: [{ path: relativePath }],
    };

    try {
      await this.executeMutationTest(testRun, mutationTestParams);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Mutation server threw an exception during file-scoped mutation testing:\n${errorMessage}`,
      );
      testRun.appendOutput(`Mutation Server: ${errorMessage}\r\n`);
    } finally {
      testRun.end();
      this.logger.info('File-scoped mutation test run finished');
    }
  }

  private getExistingFileTestItems(fileUri: vscode.Uri): vscode.TestItem[] {
    const fileTestItems: vscode.TestItem[] = [];
    for (const [, rootItem] of this.testController.items) {
      testControllerUtils.traverse(rootItem, (item) => {
        if (item.uri?.fsPath === fileUri.fsPath && item.children.size > 0) {
          fileTestItems.push(item);
        }
      });
    }
    return fileTestItems;
  }

  private markAsStarted(testRun: vscode.TestRun, testItems: vscode.TestItem[]) {
    testItems.forEach((testItem) => {
      testControllerUtils.traverse(testItem, (item) => {
        testRun.started(item);
      });
    });
  }

  private async executeMutationTest(
    testRun: vscode.TestRun,
    mutationTestParams: MutationTestParams,
    queue?: vscode.TestItem[],
  ) {
    const mutationTestResult$ =
      this.mutationServer.mutationTest(mutationTestParams);

    await lastValueFrom(
      mutationTestResult$.pipe(
        mergeMap(async (result) => {
          await this.processMutationTestResult(result, testRun, queue);
        }),
      ),
    );
  }

  private async processMutationTestResult(
    mutationTestResult: MutationTestResult,
    testRun: vscode.TestRun,
    queue?: vscode.TestItem[],
  ) {
    // Process each mutant emitted by the mutation server and report it to the VS Code test run.
    // When a queue is provided (normal run), only mutants that already exist in that queued
    // test tree are handled. When queue is omitted (file-scoped run), all emitted mutants are
    // handled, which allows direct file runs without relying on pre-discovered tree state.
    for (const [filePath, mutants] of Object.entries(
      mutationTestResult.files,
    )) {
      for (const mutant of mutants.mutants) {
        if (queue && !testItemUtils.isMutantInTestTree(mutant, queue)) {
          continue;
        }
        const testItem = testControllerUtils.upsertMutantTestItem(
          this.testController,
          this.workspaceFolder,
          filePath,
          this.serverWorkspaceDirectory,
          mutant,
        );
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
            testRun.failed(
              testItem,
              await this.getTestMessage(mutant, filePath),
            );
            break;
        }
        testRun.appendOutput(
          this.createOutputMessage(mutant, filePath),
          undefined,
          testItem,
        );
      }
    }
  }

  private async getTestMessage(
    mutant: MutantResult,
    filePath: string,
  ): Promise<vscode.TestMessage> {
    const message = new vscode.TestMessage(
      `${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column}) ${mutant.status}`,
    );
    const uri = vscode.Uri.joinPath(
      this.workspaceFolder.uri,
      testItemUtils.resolveFromWorkspaceRoot(
        this.workspaceFolder,
        this.serverWorkspaceDirectory,
        filePath,
      ),
    );
    message.location = new vscode.Location(
      uri,
      locationUtils.locationToRange(mutant.location),
    );
    message.message = `${mutant.mutatorName} ${mutant.status}`;
    if (!mutant.replacement) {
      return message;
    }
    try {
      const fileBuffer = await vscode.workspace.fs.readFile(uri);
      const originalCode = fileBuffer.toString();
      const originalLines = originalCode.split('\n');
      const codeLines = originalLines.slice(
        mutant.location.start.line - 1,
        mutant.location.end.line,
      );
      message.expectedOutput = codeLines.join('\n');
      if (codeLines.length === 1) {
        const replacedPart = codeLines[0].substring(
          mutant.location.start.column - 1,
          mutant.location.end.column - 1,
        );
        message.actualOutput = codeLines[0].replace(
          replacedPart,
          mutant.replacement,
        );
      } else {
        const firstLine = codeLines[0].substring(
          0,
          mutant.location.start.column - 1,
        );
        const lastLine = codeLines[codeLines.length - 1].substring(
          mutant.location.end.column - 1,
        );
        message.actualOutput = firstLine + mutant.replacement + lastLine;
      }
      return message;
    } catch (error) {
      this.logger.error(`Failed to read file ${filePath}: ${error}`);
      return message;
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
