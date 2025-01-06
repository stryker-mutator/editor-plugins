import { Injector } from "typed-inject";
import { commonTokens, tokens } from "./di";
import { SetupWorkspaceFolderContext, MutationServer } from "./index";
import * as vscode from 'vscode';
import { DiscoveredMutant, DiscoverResult } from "mutation-server-protocol";

export interface TestExplorerContext extends SetupWorkspaceFolderContext {
  [commonTokens.mutationServer]: MutationServer;
}

export class TestExplorer {
  #testController: vscode.TestController;
  #mutationServer: MutationServer;
  #workspaceFolder: vscode.WorkspaceFolder;

  public static readonly inject = tokens(commonTokens.injector, commonTokens.mutationServer);
  constructor(
    private readonly injector: Injector<TestExplorerContext>
  ) {
    this.#workspaceFolder = this.injector.resolve(commonTokens.workspaceFolder);
    this.#mutationServer = this.injector.resolve(commonTokens.mutationServer);
    this.#testController = vscode.tests.createTestController(this.#workspaceFolder.name, this.#workspaceFolder.name);
  }

  public async discover(files?: string[]) {
    const discoverResult = await this.#mutationServer.discover({files});

    Object.entries(discoverResult.files).forEach(([relativePath, mutants]) => {
      const fileUri = vscode.Uri.file(relativePath);

      const fileTestItem = this.findFileTestItem(fileUri);
      if (fileTestItem) {
        // Remove mutants that are no longer present in the file
        fileTestItem.children.replace([]);
      }

      mutants.mutants.forEach(mutant => {
        this.addMutantTestItem(fileUri, mutant);
      });
    });
  }

  private addMutantTestItem(fileUri: vscode.Uri, mutant: DiscoveredMutant) {
    const relativeFilePath = vscode.workspace.asRelativePath(fileUri, false);
    const pathSegments = relativeFilePath.split('/');

    let currentCollection = this.#testController.items;

    let currentUri = '';

    // Iterate through the directories to find the file test item in the tree
    for (const pathSegment of pathSegments) {
      currentUri += `/${pathSegment}`;
      const node = currentCollection.get(pathSegment);

      if (!node) {
        const uri = vscode.Uri.file(`${this.#workspaceFolder.uri.path}${currentUri}`);
        const newDirectory = this.#testController.createTestItem(pathSegment, pathSegment, uri);
        currentCollection.add(newDirectory);
        currentCollection = newDirectory.children;
      } else {
        currentCollection = node.children;
      }
    }

    const testItem = this.#testController.createTestItem(mutant.id, mutant.mutatorName, fileUri);

    currentCollection.add(testItem);
  }

  private findFileTestItem(fileUri: vscode.Uri): vscode.TestItem | undefined {
    const relativeFilePath = vscode.workspace.asRelativePath(fileUri, false);
    const directories = relativeFilePath.split('/');
    const fileName = directories[directories.length - 1];

    let currentCollection = this.#testController.items;

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
