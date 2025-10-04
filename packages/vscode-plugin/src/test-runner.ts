import vscode from 'vscode';
import { MutationTestResult, MutantResult } from 'mutation-server-protocol';
import { ContextualLogger } from './logging/index.ts';
import { MutationServer } from './index.ts';
import { commonTokens } from './di/index.ts';
import {
  locationUtils,
  testItemUtils,
  testControllerUtils,
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
      : [...testController.items].map(([_, testItem]) => testItem);
    queue.forEach((testItem) => {
      testControllerUtils.traverse(testItem, (item) => {
        testRun.started(item);
      });
    });
    token.onCancellationRequested(async () => {
      testRun.appendOutput('Test run cancellation requested, ending test run.');
      testRun.end();
    });
    const mutationTestParams = testItemUtils.toMutationTestParams(queue);
    let progressPromises: Promise<void>[] = [];
    try {
      await this.mutationServer.mutationTest(
        mutationTestParams,
        async (progress) => {
          const progressPromise = this.processMutationTestResult(
            progress,
            testRun,
            queue,
          );
          progressPromises.push(progressPromise);
          await progressPromise;
        },
      );
    } catch (error: Error | unknown) {
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
      await Promise.all(progressPromises);
      testRun.end();
      this.logger.info('Mutation test run finished');
    }
  }
  private async processMutationTestResult(
    mutationTestResult: MutationTestResult,
    testRun: vscode.TestRun,
    queue: vscode.TestItem[],
  ) {
    for (const [filePath, mutants] of Object.entries(
      mutationTestResult.files,
    )) {
      for (const mutant of mutants.mutants) {
        if (!testItemUtils.isMutantInTestTree(mutant, queue)) {
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
            const testMessage = await this.getTestMessage(mutant, filePath);
            testRun.failed(testItem, testMessage);
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
