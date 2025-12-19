import vscode from 'vscode';
import {
  FileRange,
  MutantResult,
  MutationTestParams,
} from 'mutation-server-protocol';
import fs from 'fs';
import path from 'path';
import { locationUtils } from './location-utils.ts';

export const testItemUtils = {
  resolveFromWorkspaceRoot(
    workspaceFolder: vscode.WorkspaceFolder,
    serverWorkingDirectory: string,
    mutantRelativeFilePath: string,
  ) {
    return path.relative(
      workspaceFolder.uri.fsPath,
      path.resolve(
        workspaceFolder.uri.fsPath,
        serverWorkingDirectory,
        mutantRelativeFilePath,
      ),
    );
  },

  isMutantInTestTree(
    mutant: MutantResult,
    testItems: vscode.TestItem[],
  ): boolean {
    const mutantId = `${mutant.mutatorName}(${mutant.location.start.line}:${mutant.location.start.column}-${mutant.location.end.line}:${mutant.location.end.column}) (${mutant.replacement})`;
    function hasMutantId(testItem: vscode.TestItem): boolean {
      if (testItem.id === mutantId) {
        return true;
      }
      for (const [, child] of testItem.children) {
        if (hasMutantId(child)) {
          return true;
        }
      }
      return false;
    }
    return testItems.some(hasMutantId);
  },

  toMutationTestParams(testItems: vscode.TestItem[]): MutationTestParams {
    const files: FileRange[] = testItems.map((testItem) => {
      if (!testItem.uri) {
        throw new Error(
          `Test item ${testItem.label} does not have a URI. Cannot run mutation tests on it.`,
        );
      }
      const uri = testItem.uri;
      
      const isDirectory = fs.lstatSync(uri.path).isDirectory();
      let relativePath = vscode.workspace
        .asRelativePath(uri, false)
        .replaceAll('\\', '/');
      if (isDirectory) {
        relativePath = `${relativePath}/`;
      }
      if (!testItem.range) {
        return { path: relativePath };
      }
      return {
        path: relativePath,
        range: locationUtils.rangeToLocation(testItem.range),
      };
    });
    return { files };
  },
};
