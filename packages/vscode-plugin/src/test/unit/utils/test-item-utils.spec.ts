import { expect } from 'chai';
import sinon from 'sinon';
import vscode from 'vscode';
import fs from 'fs';
import {
  MutantResult,
  MutationTestParams,
} from 'mutation-server-protocol';
import { testItemUtils } from '../../../utils/test-item-utils.ts';

describe('testItemUtils', () => {
  let testController: vscode.TestController;
  let lstatSyncStub: sinon.SinonStub;

  beforeEach(() => {
    testController = vscode.tests.createTestController(
      'test-item-utils',
      'Test Item Utils',
    );
    lstatSyncStub = sinon.stub(fs, 'lstatSync');
  });

  afterEach(() => {
    testController.dispose();
    sinon.restore();
  });

  describe('isMutantInTestTree', () => {
    it('should return true when mutant exists in test tree', () => {
      const mutant: MutantResult = {
        id: 'mutant-1',
        mutatorName: 'StringLiteral',
        location: {
          start: { line: 5, column: 10 },
          end: { line: 5, column: 20 },
        },
        replacement: '"test"',
        status: 'Killed',
      };

      // Create test item with matching mutant ID
      const expectedMutantId = 'StringLiteral(5:10-5:20) ("test")';
      const mutantTestItem = testController.createTestItem(
        expectedMutantId,
        'String Literal Mutant',
      );
      const testItems = [mutantTestItem];

      const result = testItemUtils.isMutantInTestTree(mutant, testItems);

      expect(result).to.be.true;
    });

    it('should return false when mutant does not exist in test tree', () => {
      const mutant: MutantResult = {
        id: 'mutant-1',
        mutatorName: 'StringLiteral',
        location: {
          start: { line: 5, column: 10 },
          end: { line: 5, column: 20 },
        },
        replacement: '"test"',
        status: 'Killed',
      };

      // Create test item with different mutant ID
      const differentMutantId = 'NumberLiteral(3:5-3:7) (42)';
      const mutantTestItem = testController.createTestItem(
        differentMutantId,
        'Number Literal Mutant',
      );
      const testItems = [mutantTestItem];

      const result = testItemUtils.isMutantInTestTree(mutant, testItems);

      expect(result).to.be.false;
    });

    it('should find mutant in deeply nested structure', () => {
      const mutant: MutantResult = {
        id: 'mutant-1',
        mutatorName: 'ArithmeticOperator',
        location: {
          start: { line: 12, column: 8 },
          end: { line: 12, column: 9 },
        },
        replacement: '-',
        status: 'Killed',
      };

      // Create deep structure: folder -> subfolder -> file -> mutant
      const folderItem = testController.createTestItem('src', 'Source');
      const subfolderItem = testController.createTestItem('utils', 'Utils');
      const fileItem = testController.createTestItem('math.ts', 'Math File');
      const expectedMutantId = 'ArithmeticOperator(12:8-12:9) (-)';
      const mutantItem = testController.createTestItem(
        expectedMutantId,
        'Arithmetic Mutant',
      );

      folderItem.children.add(subfolderItem);
      subfolderItem.children.add(fileItem);
      fileItem.children.add(mutantItem);
      const testItems = [folderItem];

      const result = testItemUtils.isMutantInTestTree(mutant, testItems);

      expect(result).to.be.true;
    });

    it('should handle empty test items array', () => {
      const mutant: MutantResult = {
        id: 'mutant-1',
        mutatorName: 'StringLiteral',
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 5 },
        },
        replacement: '"empty"',
        status: 'Killed',
      };

      const result = testItemUtils.isMutantInTestTree(mutant, []);

      expect(result).to.be.false;
    });

    it('should handle mutant with no replacement', () => {
      const mutant: MutantResult = {
        id: 'mutant-1',
        mutatorName: 'BlockStatement',
        location: {
          start: { line: 10, column: 1 },
          end: { line: 15, column: 1 },
        },
        status: 'Killed',
        // No replacement property
      };

      const expectedMutantId = 'BlockStatement(10:1-15:1) (undefined)';
      const mutantTestItem = testController.createTestItem(
        expectedMutantId,
        'Block Statement Mutant',
      );
      const testItems = [mutantTestItem];

      const result = testItemUtils.isMutantInTestTree(mutant, testItems);

      expect(result).to.be.true;
    });
  });

  describe('toMutationTestParams', () => {
    it('should convert test items with URI and range to FileRange objects', () => {
      const uri = vscode.Uri.file('/test/project/src/file.ts');
      const range = new vscode.Range(4, 9, 4, 19); // 0-based VS Code range

      const testItem = testController.createTestItem(
        'test-item',
        'Test Item',
        uri,
      );
      testItem.range = range;

      // Mock fs.lstatSync to return file (not directory)
      lstatSyncStub.returns({ isDirectory: () => false });

      const result = testItemUtils.toMutationTestParams([testItem]);

      const expected: MutationTestParams = {
        files: [
          {
            path: '/test/project/src/file.ts',
            range: {
              start: { line: 5, column: 10 }, // Converted to 1-based
              end: { line: 5, column: 20 },
            },
          },
        ],
      };

      expect(result).to.deep.equal(expected);
      expect(lstatSyncStub.calledOnceWith('/test/project/src/file.ts')).to.be
        .true;
    });

    it('should convert test items without range to FileRange without range', () => {
      const uri = vscode.Uri.file('/test/project/src/file.ts');

      const testItem = testController.createTestItem(
        'test-item',
        'Test Item',
        uri,
      );
      // No range set

      lstatSyncStub.returns({ isDirectory: () => false });

      const result = testItemUtils.toMutationTestParams([testItem]);

      const expected: MutationTestParams = {
        files: [
          {
            path: '/test/project/src/file.ts',
            // No range property
          },
        ],
      };

      expect(result).to.deep.equal(expected);
    });

    it('should handle directory test items by appending slash', () => {
      const uri = vscode.Uri.file('/test/project/src');

      const testItem = testController.createTestItem(
        'src-folder',
        'Source Folder',
        uri,
      );

      // Mock fs.lstatSync to return directory
      lstatSyncStub.returns({ isDirectory: () => true });

      const result = testItemUtils.toMutationTestParams([testItem]);

      const expected: MutationTestParams = {
        files: [
          {
            path: '/test/project/src/',
          },
        ],
      };

      expect(result).to.deep.equal(expected);
      expect(lstatSyncStub.calledOnceWith('/test/project/src')).to.be.true;
    });

    it('should handle multiple test items', () => {
      const uri1 = vscode.Uri.file('/test/project/file1.ts');
      const uri2 = vscode.Uri.file('/test/project/file2.js');
      const range2 = new vscode.Range(2, 5, 3, 10);

      const testItem1 = testController.createTestItem('item1', 'Item 1', uri1);
      const testItem2 = testController.createTestItem('item2', 'Item 2', uri2);
      testItem2.range = range2;

      lstatSyncStub.returns({ isDirectory: () => false });

      const result = testItemUtils.toMutationTestParams([testItem1, testItem2]);

      const expected: MutationTestParams = {
        files: [
          { path: '/test/project/file1.ts' },
          {
            path: '/test/project/file2.js',
            range: {
              start: { line: 3, column: 6 },
              end: { line: 4, column: 11 },
            },
          },
        ],
      };

      expect(result).to.deep.equal(expected);
      expect(lstatSyncStub.callCount).to.equal(2);
    });

    it('should throw error for test item without URI', () => {
      const testItem = testController.createTestItem(
        'no-uri-item',
        'No URI Item',
      );
      // No URI set

      expect(() => {
        testItemUtils.toMutationTestParams([testItem]);
      }).to.throw(
        'Test item No URI Item does not have a URI. Cannot run mutation tests on it.',
      );
    });

    it('should handle mix of files and directories', () => {
      const fileUri = vscode.Uri.file('/test/project/file.ts');
      const dirUri = vscode.Uri.file('/test/project/src');
      const fileRange = new vscode.Range(0, 0, 1, 5);

      const fileItem = testController.createTestItem(
        'file-item',
        'File Item',
        fileUri,
      );
      fileItem.range = fileRange;
      const dirItem = testController.createTestItem(
        'dir-item',
        'Directory Item',
        dirUri,
      );

      lstatSyncStub
        .withArgs('/test/project/file.ts')
        .returns({ isDirectory: () => false });
      lstatSyncStub
        .withArgs('/test/project/src')
        .returns({ isDirectory: () => true });

      const result = testItemUtils.toMutationTestParams([fileItem, dirItem]);

      const expected: MutationTestParams = {
        files: [
          {
            path: '/test/project/file.ts',
            range: {
              start: { line: 1, column: 1 },
              end: { line: 2, column: 6 },
            },
          },
          { path: '/test/project/src/' },
        ],
      };

      expect(result).to.deep.equal(expected);
    });

    it('should handle empty test items array', () => {
      const result = testItemUtils.toMutationTestParams([]);

      const expected: MutationTestParams = {
        files: [],
      };

      expect(result).to.deep.equal(expected);
      expect(lstatSyncStub.called).to.be.false;
    });

    it('should handle Windows-style paths', () => {
      const windowsUri = vscode.Uri.file('C:\\Users\\test\\project\\file.ts');

      const testItem = testController.createTestItem(
        'windows-item',
        'Windows Item',
        windowsUri,
      );

      lstatSyncStub.returns({ isDirectory: () => false });

      const result = testItemUtils.toMutationTestParams([testItem]);

      expect(result.files![0].path).to.equal(
        'c:\\Users\\test\\project\\file.ts',
      );
    });
  });
});
