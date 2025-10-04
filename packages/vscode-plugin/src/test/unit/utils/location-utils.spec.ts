import { expect } from 'chai';
import vscode from 'vscode';
import { Location } from 'mutation-server-protocol';
import { locationUtils } from '../../../utils/location-utils.ts';

describe('locationUtils', () => {
  describe('locationToRange', () => {
    it('should convert Location to VS Code Range with correct position adjustments', () => {
      const location: Location = {
        start: { line: 10, column: 5 },
        end: { line: 15, column: 20 },
      };

      const range = locationUtils.locationToRange(location);

      expect(range.start.line).to.equal(9); // line - 1
      expect(range.start.character).to.equal(4); // column - 1
      expect(range.end.line).to.equal(14); // line - 1
      expect(range.end.character).to.equal(19); // column - 1
    });
  });

  describe('rangeToLocation', () => {
    it('should convert VS Code Range to Location with correct position adjustments', () => {
      const range = new vscode.Range(
        new vscode.Position(9, 4),
        new vscode.Position(14, 19),
      );

      const location = locationUtils.rangeToLocation(range);

      expect(location.start.line).to.equal(10); // line + 1
      expect(location.start.column).to.equal(5); // character + 1
      expect(location.end.line).to.equal(15); // line + 1
      expect(location.end.column).to.equal(20); // character + 1
    });
  });

  describe('round-trip conversions', () => {
    it('should maintain consistency when converting Location -> Range -> Location', () => {
      const originalLocation: Location = {
        start: { line: 42, column: 13 },
        end: { line: 45, column: 28 },
      };

      const range = locationUtils.locationToRange(originalLocation);
      const convertedLocation = locationUtils.rangeToLocation(range);

      expect(convertedLocation).to.deep.equal(originalLocation);
    });
  });
});
