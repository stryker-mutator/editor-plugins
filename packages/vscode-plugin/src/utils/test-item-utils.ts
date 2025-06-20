import * as vscode from "vscode";
import { MutantResult } from "mutation-server-protocol";

export const testItemUtils = {
  isMutantInTestTree(mutant: MutantResult, testItems: vscode.TestItem[]): boolean {
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
  }
};
