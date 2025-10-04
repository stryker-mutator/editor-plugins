import { commonTokens } from './di/index.ts';
import vscode from 'vscode';
import { Constants } from './index.ts';
import { TestRunner } from './test-runner.ts';
import { testControllerUtils } from './utils/test-controller-utils.ts';
import { DiscoverResult } from 'mutation-server-protocol';
export function provideTestController(
  workspaceFolder: vscode.WorkspaceFolder,
): vscode.TestController {
  return vscode.tests.createTestController(
    workspaceFolder.name,
    workspaceFolder.name,
  );
}
provideTestController.inject = [commonTokens.workspaceFolder] as const;
export class TestExplorer {
  private readonly testController;
  private readonly testRunner;
  private readonly workspaceFolder;
  static readonly inject = [
    commonTokens.testController,
    commonTokens.testRunner,
    commonTokens.workspaceFolder,
  ] as const;
  constructor(
    testController: vscode.TestController,
    testRunner: TestRunner,
    workspaceFolder: vscode.WorkspaceFolder,
  ) {
    this.testController = testController;
    this.testRunner = testRunner;
    this.workspaceFolder = workspaceFolder;
    this.testController.createRunProfile(
      Constants.TestRunProfileLabel,
      vscode.TestRunProfileKind.Run,
      this.testRunHandler.bind(this),
    );
  }
  async testRunHandler(
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken,
  ) {
    await this.testRunner.runMutationTests(request, this.testController, token);
  }

  processDiscoverResult(
    discovery: DiscoverResult,
    serverWorkingDirectory: string,
  ) {
    Object.entries(discovery.files).forEach(([relativeFilePath, mutants]) => {
      const fileTestItem = testControllerUtils.getTestItemForFile(
        this.testController,
        this.workspaceFolder,
        relativeFilePath,
        serverWorkingDirectory,
      );
      if (fileTestItem) {
        fileTestItem.children.replace([]);
      }
      mutants.mutants.forEach((mutant) => {
        testControllerUtils.upsertMutantTestItem(
          this.testController,
          this.workspaceFolder,
          relativeFilePath,
          serverWorkingDirectory,
          mutant,
        );
      });
    });
  }
  processFileDeletions(uris: vscode.Uri[]) {
    for (const uri of uris) {
      testControllerUtils.removeTestItemsForUri(this.testController, uri);
    }
  }
  async dispose() {
    this.testController.dispose();
    // Wait for the event loop to process disposal,
    // otherwise a new test controller cannot be created immediately when the workspace is reloaded.
    await Promise.resolve();
  }
}
