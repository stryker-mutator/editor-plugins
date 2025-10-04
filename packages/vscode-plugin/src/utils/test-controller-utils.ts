import vscode from 'vscode';
import { DiscoveredMutant, MutantResult } from 'mutation-server-protocol';
import { locationUtils } from './location-utils.ts';

export const testControllerUtils = {
  traverse(
    testItem: vscode.TestItem,
    action: (item: vscode.TestItem) => void,
  ): void {
    action(testItem);
    for (const [, child] of testItem.children) {
      this.traverse(child, action);
    }
  },

  upsertMutantTestItem(
    testController: vscode.TestController,
    workspaceFolder: vscode.WorkspaceFolder,
    mutantRelativeFilePath: string,
    mutant: DiscoveredMutant | MutantResult,
  ): vscode.TestItem {
    const pathSegments = mutantRelativeFilePath.split('/');
    let currentCollection = testController.items;
    let currentUri = '';

    for (const pathSegment of pathSegments) {
      currentUri += `/${pathSegment}`;
      const node = currentCollection.get(pathSegment);

      if (!node) {
        const uri = vscode.Uri.file(`${workspaceFolder.uri.path}${currentUri}`);
        const newDirectory = testController.createTestItem(
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

    const fileUri = vscode.Uri.file(`${workspaceFolder.uri.path}${currentUri}`);
    const mutantId =
      `${mutant.mutatorName}(${mutant.location.start.line}:` +
      `${mutant.location.start.column}-${mutant.location.end.line}:` +
      `${mutant.location.end.column}) (${mutant.replacement})`;

    const mutantName = `${mutant.mutatorName} (Ln ${mutant.location.start.line}, Col ${mutant.location.start.column})`;

    const testItem = testController.createTestItem(
      mutantId,
      mutantName,
      fileUri,
    );
    testItem.range = locationUtils.locationToRange(mutant.location);
    currentCollection.add(testItem);
    return testItem;
  },

  getTestItemForFile(
    testController: vscode.TestController,
    relativeFilePath: string,
  ): vscode.TestItem | undefined {
    const directories = relativeFilePath.split('/');
    const fileName = directories[directories.length - 1];
    let currentCollection = testController.items;

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
  },

  removeTestItemsForUri(
    testController: vscode.TestController,
    uri: vscode.Uri,
  ): void {
    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const directories = relativePath.split('/').filter((x) => x.length > 0);
    const fileName = directories[directories.length - 1];
    const parentDirectory = directories[directories.length - 2];
    if (!parentDirectory) {
      // If there's no parent directory, we're at the root level
      testController.items.delete(fileName);
      return;
    }

    let currentNodes = testController.items;
    let parent: vscode.TestItem | undefined;

    for (const directory of directories) {
      const node = currentNodes.get(directory);
      if (!node) {
        break;
      }
      if (directory === parentDirectory) {
        parent = node;
        node.children.delete(fileName);
        break;
      }
      currentNodes = node.children;
    }

    while (parent && parent.children.size === 0) {
      const parentParent: vscode.TestItem | undefined = parent.parent;
      if (!parentParent) {
        testController.items.delete(parent.id);
        break;
      }
      parentParent.children.delete(parent.id);
      parent = parentParent;
    }
  },
};
