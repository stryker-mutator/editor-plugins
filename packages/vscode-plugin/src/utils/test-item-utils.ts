import * as vscode from 'vscode';
import {
  FileRange,
  MutantResult,
  MutationTestParams,
} from 'mutation-server-protocol';
import { locationUtils } from './location-utils';
import * as fs from 'fs';

export const testItemUtils = {
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
      let path = uri.fsPath;
      if (fs.lstatSync(uri.fsPath).isDirectory()) {
        path = `${uri.fsPath}/`;
      }
      if (!testItem.range) {
        return { path };
      }
      return { path, range: locationUtils.rangeToLocation(testItem.range) };
    });
    return { files };
  },
};
