import * as vscode from 'vscode';
import { Location } from 'mutation-server-protocol';

export const locationUtils = {
  locationToRange(location: Location): vscode.Range {
    return new vscode.Range(
      new vscode.Position(location.start.line - 1, location.start.column - 1),
      new vscode.Position(location.end.line - 1, location.end.column - 1),
    );
  },

  rangeToLocation(range: vscode.Range): Location {
    return {
      start: {
        line: range.start.line + 1,
        column: range.start.character + 1,
      },
      end: {
        line: range.end.line + 1,
        column: range.end.character + 1,
      },
    };
  },
};
