import { commonTokens, tokens } from './di/index';
import * as vscode from 'vscode';
import { Constants } from './index';
import { TestRunner } from './test-runner';
import { testControllerUtils } from './utils/test-controller-utils';
import { DiscoverResult } from 'mutation-server-protocol';

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
  static readonly inject = tokens(
    commonTokens.testController,
    commonTokens.testRunner,
    commonTokens.workspaceFolder,
  );

  constructor(
    private readonly testController: vscode.TestController,
    private readonly testRunner: TestRunner,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
  ) {
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

  processDiscoverResult(discovery: DiscoverResult) {
    Object.entries(discovery.files).forEach(([relativeFilePath, mutants]) => {
      const fileTestItem = testControllerUtils.getTestItemForFile(this.testController, relativeFilePath);
      if (fileTestItem) {
        fileTestItem.children.replace([]);
      }
      mutants.mutants.forEach((mutant) => {
        testControllerUtils.upsertMutantTestItem(this.testController, this.workspaceFolder, relativeFilePath, mutant);
      });
    });
  }

  processFileDeletions(uris: vscode.Uri[]) {
    for (const uri of uris) {
      testControllerUtils.removeTestItemsForUri(this.testController, uri);
    }
  }
}
