import { Injector } from 'typed-inject';
import { commonTokens, tokens } from './di';
import { SetupWorkspaceFolderContext, MutationServer } from './index';
import * as vscode from 'vscode';
import { DiscoveredMutant, DiscoverResult } from 'mutation-server-protocol';

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
    commonTokens.injector,
    commonTokens.workspaceFolder,
    commonTokens.testController,
  );
  constructor(
    private readonly injector: Injector<SetupWorkspaceFolderContext>,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
    private readonly testController: vscode.TestController,
  ) {}

  public async processDiscoverResult(discovery: DiscoverResult) {
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
    throw new Error('Method not implemented.');
  }

  private addMutantTestItem(
    relativeFilePath: string,
    mutant: DiscoveredMutant,
  ) {
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

    const testItem = this.testController.createTestItem(
      mutant.id,
      mutant.mutatorName,
      fileUri,
    );
    const location = mutant.location;
    testItem.range = new vscode.Range(
      new vscode.Position(location.start.line, location.start.column),
      new vscode.Position(location.end.line, location.end.column),
    );

    currentCollection.add(testItem);
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
}
