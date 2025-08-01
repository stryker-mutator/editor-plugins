import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { DiscoveredMutant, MutantResult } from 'mutation-server-protocol';
import { testControllerUtils } from '../../../utils/test-controller-utils';

describe('testControllerUtils', () => {
  describe('traverse', () => {
    let testController: vscode.TestController;
    let actionSpy: sinon.SinonSpy;

    beforeEach(() => {
      testController = vscode.tests.createTestController('test-traverse', 'Test Traverse');
      actionSpy = sinon.spy();
    });

    afterEach(() => {
      testController.dispose();
      sinon.restore();
    });

    it('should call action on the root test item', () => {
      const rootItem = testController.createTestItem('root', 'Root Item');
      
      testControllerUtils.traverse(rootItem, actionSpy);

      expect(actionSpy.calledOnce).to.be.true;
      expect(actionSpy.calledWith(rootItem)).to.be.true;
    });

    it('should handle nested children recursively', () => {
      const rootItem = testController.createTestItem('root', 'Root Item');
      const child1 = testController.createTestItem('child1', 'Child 1');
      const child2 = testController.createTestItem('child2', 'Child 2');
      const grandchild1 = testController.createTestItem('grandchild1', 'Grandchild 1');
      const grandchild2 = testController.createTestItem('grandchild2', 'Grandchild 2');

      // Build the hierarchy
      rootItem.children.add(child1);
      rootItem.children.add(child2);
      child1.children.add(grandchild1);
      child2.children.add(grandchild2);

      testControllerUtils.traverse(rootItem, actionSpy);

      expect(actionSpy.callCount).to.equal(5);
      expect(actionSpy.getCall(0).calledWith(rootItem)).to.be.true;
      expect(actionSpy.getCall(1).calledWith(child1)).to.be.true;
      expect(actionSpy.getCall(2).calledWith(grandchild1)).to.be.true;
      expect(actionSpy.getCall(3).calledWith(child2)).to.be.true;
      expect(actionSpy.getCall(4).calledWith(grandchild2)).to.be.true;
    });

    it('should handle empty children collection', () => {
      const rootItem = testController.createTestItem('root', 'Root Item');
      
      testControllerUtils.traverse(rootItem, actionSpy);

      expect(actionSpy.calledOnce).to.be.true;
      expect(actionSpy.calledWith(rootItem)).to.be.true;
    });
  });

  describe('upsertMutantTestItem', () => {
    let testController: vscode.TestController;
    let workspaceFolder: vscode.WorkspaceFolder;

    beforeEach(() => {
      testController = vscode.tests.createTestController('test-upsert', 'Test Upsert');
      workspaceFolder = {
        uri: vscode.Uri.file('/test/workspace'),
        name: 'test-workspace',
        index: 0
      };
    });

    afterEach(() => {
      testController.dispose();
      sinon.restore();
    });

    it('should create directory structure for nested file path', () => {
      const mutant: DiscoveredMutant = {
        id: 'mutant-1',
        mutatorName: 'StringLiteral',
        location: {
          start: { line: 5, column: 10 },
          end: { line: 5, column: 20 }
        },
        replacement: '"mutated"'
      };

      const result = testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'src/utils/helper.ts',
        mutant
      );

      // Verify directory structure was created
      expect(testController.items.get('src')).to.exist;
      expect(testController.items.get('src')?.children.get('utils')).to.exist;
      expect(testController.items.get('src')?.children.get('utils')?.children.get('helper.ts')).to.exist;

      // Verify the mutant test item was created
      const expectedMutantId = 'StringLiteral(5:10-5:20) ("mutated")';
      const helperTsItem = testController.items.get('src')?.children.get('utils')?.children.get('helper.ts');
      const mutantItem = helperTsItem?.children.get(expectedMutantId);
      
      expect(mutantItem).to.exist;
      expect(mutantItem?.id).to.equal(expectedMutantId);
      expect(mutantItem?.label).to.equal('StringLiteral (Ln 5, Col 10)');
      expect(result).to.equal(mutantItem);
    });

    it('should create single-level file path', () => {
      const mutant: DiscoveredMutant = {
        id: 'mutant-2',
        mutatorName: 'BooleanLiteral',
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 5 }
        },
        replacement: 'false'
      };

      const result = testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'index.js',
        mutant
      );

      // Verify file item was created directly under root
      expect(testController.items.get('index.js')).to.exist;
      
      const expectedMutantId = 'BooleanLiteral(1:1-1:5) (false)';
      const fileItem = testController.items.get('index.js');
      const mutantItem = fileItem?.children.get(expectedMutantId);
      
      expect(mutantItem).to.exist;
      expect(mutantItem?.label).to.equal('BooleanLiteral (Ln 1, Col 1)');
      expect(result).to.equal(mutantItem);
    });

    it('should reuse existing directory structure', () => {
      const mutant1: DiscoveredMutant = {
        id: 'mutant-1',
        mutatorName: 'StringLiteral',
        location: {
          start: { line: 5, column: 10 },
          end: { line: 5, column: 20 }
        },
        replacement: '"first"'
      };

      const mutant2: DiscoveredMutant = {
        id: 'mutant-2',
        mutatorName: 'NumberLiteral',
        location: {
          start: { line: 10, column: 5 },
          end: { line: 10, column: 7 }
        },
        replacement: '999'
      };

      // Create first mutant
      testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'src/utils/helper.ts',
        mutant1
      );

      // Create second mutant in same file
      const result = testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'src/utils/helper.ts',
        mutant2
      );

      // Verify only one directory structure exists
      expect(testController.items.size).to.equal(1);
      expect(testController.items.get('src')?.children.size).to.equal(1);
      expect(testController.items.get('src')?.children.get('utils')?.children.size).to.equal(1);

      // Verify both mutants exist under the same file
      const fileItem = testController.items.get('src')?.children.get('utils')?.children.get('helper.ts');
      expect(fileItem?.children.size).to.equal(2);
      expect(fileItem?.children.get('StringLiteral(5:10-5:20) ("first")')).to.exist;
      expect(fileItem?.children.get('NumberLiteral(10:5-10:7) (999)')).to.exist;
    });

    it('should set correct URI for directory and file items', () => {
      const mutant: DiscoveredMutant = {
        id: 'mutant-1',
        mutatorName: 'ConditionalExpression',
        location: {
          start: { line: 3, column: 5 },
          end: { line: 3, column: 15 }
        },
        replacement: 'true'
      };

      testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'src/components/Button.tsx',
        mutant
      );

      const srcItem = testController.items.get('src');
      const componentsItem = srcItem?.children.get('components');
      const buttonItem = componentsItem?.children.get('Button.tsx');

      expect(srcItem?.uri?.fsPath).to.equal('/test/workspace/src');
      expect(componentsItem?.uri?.fsPath).to.equal('/test/workspace/src/components');
      expect(buttonItem?.uri?.fsPath).to.equal('/test/workspace/src/components/Button.tsx');
    });

    it('should set correct range on mutant test item', () => {
      const mutant: DiscoveredMutant = {
        id: 'mutant-1',
        mutatorName: 'ArithmeticOperator',
        location: {
          start: { line: 10, column: 15 },
          end: { line: 10, column: 16 }
        },
        replacement: '-'
      };

      const result = testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'math.js',
        mutant
      );

      // Verify range is converted from 1-based to 0-based coordinates
      expect(result.range).to.exist;
      expect(result.range?.start.line).to.equal(9); // 10 - 1
      expect(result.range?.start.character).to.equal(14); // 15 - 1
      expect(result.range?.end.line).to.equal(9); // 10 - 1
      expect(result.range?.end.character).to.equal(15); // 16 - 1
    });

    it('should handle mutants with no replacement', () => {
      const mutant: DiscoveredMutant = {
        id: 'mutant-1',
        mutatorName: 'BlockStatement',
        location: {
          start: { line: 20, column: 1 },
          end: { line: 25, column: 1 }
        }
        // No replacement property
      };

      const result = testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'test.js',
        mutant
      );

      const expectedMutantId = 'BlockStatement(20:1-25:1) (undefined)';
      expect(result.id).to.equal(expectedMutantId);
      expect(result.label).to.equal('BlockStatement (Ln 20, Col 1)');
    });

    it('should handle MutantResult type mutants', () => {
      const mutantResult: MutantResult = {
        id: 'mutant-result-1',
        mutatorName: 'EqualityOperator',
        location: {
          start: { line: 8, column: 12 },
          end: { line: 8, column: 14 }
        },
        replacement: '!==',
        status: 'Killed'
      };

      const result = testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'comparison.ts',
        mutantResult
      );

      const expectedMutantId = 'EqualityOperator(8:12-8:14) (!==)';
      expect(result.id).to.equal(expectedMutantId);
      expect(result.label).to.equal('EqualityOperator (Ln 8, Col 12)');
    });

    it('should handle complex file paths with many directories', () => {
      const mutant: DiscoveredMutant = {
        id: 'mutant-1',
        mutatorName: 'LogicalOperator',
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 3 }
        },
        replacement: '||'
      };

      testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'src/app/components/ui/forms/validation/rules.ts',
        mutant
      );

      // Verify deep directory structure
      let currentItem = testController.items.get('src');
      expect(currentItem).to.exist;
      
      currentItem = currentItem?.children.get('app');
      expect(currentItem).to.exist;
      
      currentItem = currentItem?.children.get('components');
      expect(currentItem).to.exist;
      
      currentItem = currentItem?.children.get('ui');
      expect(currentItem).to.exist;
      
      currentItem = currentItem?.children.get('forms');
      expect(currentItem).to.exist;
      
      currentItem = currentItem?.children.get('validation');
      expect(currentItem).to.exist;
      
      currentItem = currentItem?.children.get('rules.ts');
      expect(currentItem).to.exist;
      
      expect(currentItem?.children.size).to.equal(1);
    });

    it('should handle special characters in file paths', () => {
      const mutant: DiscoveredMutant = {
        id: 'mutant-1',
        mutatorName: 'StringLiteral',
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 10 }
        },
        replacement: '"test"'
      };

      testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'special chars/file-with-dashes/test@file#1.js',
        mutant
      );

      expect(testController.items.get('special chars')).to.exist;
      expect(testController.items.get('special chars')?.children.get('file-with-dashes')).to.exist;
      expect(testController.items.get('special chars')?.children.get('file-with-dashes')?.children.get('test@file#1.js')).to.exist;
    });

    it('should return the created test item', () => {
      const mutant: DiscoveredMutant = {
        id: 'mutant-1',
        mutatorName: 'ReturnStatement',
        location: {
          start: { line: 15, column: 8 },
          end: { line: 15, column: 20 }
        },
        replacement: 'return false'
      };

      const result = testControllerUtils.upsertMutantTestItem(
        testController,
        workspaceFolder,
        'func.js',
        mutant
      );

      expect(result).to.be.instanceOf(Object);
      expect(result.id).to.equal('ReturnStatement(15:8-15:20) (return false)');
      expect(result.label).to.equal('ReturnStatement (Ln 15, Col 8)');
      expect(result.uri?.fsPath).to.equal('/test/workspace/func.js');
    });
  });

  describe('getTestItemForFile', () => {
    let testController: vscode.TestController;
    let workspaceFolder: vscode.WorkspaceFolder;

    beforeEach(() => {
      testController = vscode.tests.createTestController('test-get-item', 'Test Get Item');
      workspaceFolder = {
        uri: vscode.Uri.file('/test/workspace'),
        name: 'test-workspace',
        index: 0
      };
    });

    afterEach(() => {
      testController.dispose();
      sinon.restore();
    });

    it('should return undefined for non-existent file', () => {
      const result = testControllerUtils.getTestItemForFile(
        testController,
        'nonexistent/file.js'
      );

      expect(result).to.be.undefined;
    });

    it('should return file item for single-level file path', () => {
      // Create a file item directly under root
      const fileItem = testController.createTestItem('index.js', 'Index File');
      testController.items.add(fileItem);

      const result = testControllerUtils.getTestItemForFile(
        testController,
        'index.js'
      );

      expect(result).to.equal(fileItem);
      expect(result?.id).to.equal('index.js');
    });

    it('should return file item for nested file path', () => {
      // Create directory structure: src/utils/helper.ts
      const srcItem = testController.createTestItem('src', 'Source');
      const utilsItem = testController.createTestItem('utils', 'Utils');
      const helperItem = testController.createTestItem('helper.ts', 'Helper File');

      testController.items.add(srcItem);
      srcItem.children.add(utilsItem);
      utilsItem.children.add(helperItem);

      const result = testControllerUtils.getTestItemForFile(
        testController,
        'src/utils/helper.ts'
      );

      expect(result).to.equal(helperItem);
      expect(result?.id).to.equal('helper.ts');
    });

    it('should return undefined for partial path match', () => {
      // Create directory structure: src/utils/helper.ts
      const srcItem = testController.createTestItem('src', 'Source');
      const utilsItem = testController.createTestItem('utils', 'Utils');
      const helperItem = testController.createTestItem('helper.ts', 'Helper File');

      testController.items.add(srcItem);
      srcItem.children.add(utilsItem);
      utilsItem.children.add(helperItem);

      // Try to get item for path that only partially exists
      const result = testControllerUtils.getTestItemForFile(
        testController,
        'src/utils/nonexistent.ts'
      );

      expect(result).to.be.undefined;
    });

    it('should return undefined for empty file path', () => {
      const result = testControllerUtils.getTestItemForFile(
        testController,
        ''
      );

      expect(result).to.be.undefined;
    });

    it('should handle files that exist at multiple levels with same name', () => {
      // Create structure where same filename exists at different levels
      const srcItem = testController.createTestItem('src', 'Source');
      const testItem = testController.createTestItem('test', 'Test Dir');
      const indexSrcItem = testController.createTestItem('index.js', 'Source Index');
      const indexTestItem = testController.createTestItem('index.js', 'Test Index');

      testController.items.add(srcItem);
      testController.items.add(testItem);
      srcItem.children.add(indexSrcItem);
      testItem.children.add(indexTestItem);

      // Should return the specific file from src directory
      const srcResult = testControllerUtils.getTestItemForFile(
        testController,
        'src/index.js'
      );

      expect(srcResult).to.equal(indexSrcItem);
      expect(srcResult?.id).to.equal('index.js');

      // Should return the specific file from test directory
      const testResult = testControllerUtils.getTestItemForFile(
        testController,
        'test/index.js'
      );

      expect(testResult).to.equal(indexTestItem);
      expect(testResult?.id).to.equal('index.js');
    });

    it('should handle root level files correctly', () => {
      // Create a root level file
      const packageItem = testController.createTestItem('package.json', 'Package');
      testController.items.add(packageItem);

      const result = testControllerUtils.getTestItemForFile(
        testController,
        'package.json'
      );

      expect(result).to.equal(packageItem);
      expect(result?.id).to.equal('package.json');
    });

    it('should return undefined when intermediate directory is missing', () => {
      // Create partial structure: src/ exists but src/utils/ does not
      const srcItem = testController.createTestItem('src', 'Source');
      testController.items.add(srcItem);

      const result = testControllerUtils.getTestItemForFile(
        testController,
        'src/utils/helper.ts'
      );

      expect(result).to.be.undefined;
    });

    it('should handle case where file name matches directory name in path', () => {
      // Create structure: src/src/index.js (where directory and file have same name)
      const srcRootItem = testController.createTestItem('src', 'Source Root');
      const srcNestedItem = testController.createTestItem('src', 'Source Nested');
      const indexItem = testController.createTestItem('index.js', 'Index File');

      testController.items.add(srcRootItem);
      srcRootItem.children.add(srcNestedItem);
      srcNestedItem.children.add(indexItem);

      const result = testControllerUtils.getTestItemForFile(
        testController,
        'src/src/index.js'
      );

      expect(result).to.equal(indexItem);
      expect(result?.id).to.equal('index.js');
    });

    it('should be case sensitive for file paths', () => {
      const fileItem = testController.createTestItem('CamelCase.ts', 'Camel Case File');
      testController.items.add(fileItem);

      // Exact case should work
      const exactResult = testControllerUtils.getTestItemForFile(
        testController,
        'CamelCase.ts'
      );
      expect(exactResult).to.equal(fileItem);

      // Different case should not work
      const wrongCaseResult = testControllerUtils.getTestItemForFile(
        testController,
        'camelcase.ts'
      );
      expect(wrongCaseResult).to.be.undefined;
    });
  });

  describe('removeTestItemsForUri', () => {
    let testController: vscode.TestController;

    beforeEach(() => {
      testController = vscode.tests.createTestController('test-remove', 'Test Remove');
    });

    afterEach(() => {
      testController.dispose();
      sinon.restore();
    });

    it('should remove file and cleanup empty parent directories', () => {
      // Manually create structure: src/utils/helper.ts
      const srcItem = testController.createTestItem('src', 'src');
      const utilsItem = testController.createTestItem('utils', 'utils');
      const helperItem = testController.createTestItem('helper.ts', 'helper.ts');

      testController.items.add(srcItem);
      srcItem.children.add(utilsItem);
      utilsItem.children.add(helperItem);

      // Verify structure was created
      expect(testController.items.get('src')).to.exist;
      expect(testController.items.get('src')?.children.get('utils')).to.exist;
      expect(testController.items.get('src')?.children.get('utils')?.children.get('helper.ts')).to.exist;

      // Remove the file
      const uri = vscode.Uri.file('src/utils/helper.ts');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // Verify everything was cleaned up since directories are now empty
      expect(testController.items.size).to.equal(0);
      expect(testController.items.get('src')).to.be.undefined;
    });

    it('should remove file but keep non-empty parent directories', () => {
      // Manually create structure with multiple files: src/utils/helper.ts and src/utils/calculator.ts
      const srcItem = testController.createTestItem('src', 'src');
      const utilsItem = testController.createTestItem('utils', 'utils');
      const helperItem = testController.createTestItem('helper.ts', 'helper.ts');
      const calculatorItem = testController.createTestItem('calculator.ts', 'calculator.ts');

      testController.items.add(srcItem);
      srcItem.children.add(utilsItem);
      utilsItem.children.add(helperItem);
      utilsItem.children.add(calculatorItem);

      // Verify both files exist
      expect(testController.items.get('src')?.children.get('utils')?.children.get('helper.ts')).to.exist;
      expect(testController.items.get('src')?.children.get('utils')?.children.get('calculator.ts')).to.exist;

      // Remove only helper.ts
      const uri = vscode.Uri.file('/src/utils/helper.ts');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // Verify helper.ts was removed but directories and calculator.ts remain
      expect(testController.items.get('src')).to.exist;
      expect(testController.items.get('src')?.children.get('utils')).to.exist;
      expect(testController.items.get('src')?.children.get('utils')?.children.get('helper.ts')).to.be.undefined;
      expect(testController.items.get('src')?.children.get('utils')?.children.get('calculator.ts')).to.exist;
    });

    it('should handle removal of root-level files', () => {
      // Create a root-level file
      const indexItem = testController.createTestItem('index.js', 'Index File');
      testController.items.add(indexItem);

      // Verify file exists
      expect(testController.items.get('index.js')).to.exist;

      // Remove the root-level file
      const uri = vscode.Uri.file('/index.js');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // Verify file was removed
      expect(testController.items.get('index.js')).to.be.undefined;
      expect(testController.items.size).to.equal(0);
    });

    it('should handle non-existent files gracefully', () => {
      // Create some structure first
      const srcItem = testController.createTestItem('src', 'Source');
      const existingItem = testController.createTestItem('existing.ts', 'Existing File');

      testController.items.add(srcItem);
      srcItem.children.add(existingItem);

      // Try to remove a non-existent file
      const uri = vscode.Uri.file('/src/nonexistent.ts');
      
      expect(() => {
        testControllerUtils.removeTestItemsForUri(testController, uri);
      }).to.not.throw();

      // Verify existing structure is untouched
      expect(testController.items.get('src')?.children.get('existing.ts')).to.exist;
    });

    it('should handle partial path matches gracefully', () => {
      // Create structure: src/utils/helper.ts
      const srcItem = testController.createTestItem('src', 'Source');
      const utilsItem = testController.createTestItem('utils', 'Utils');
      const helperItem = testController.createTestItem('helper.ts', 'Helper File');

      testController.items.add(srcItem);
      srcItem.children.add(utilsItem);
      utilsItem.children.add(helperItem);

      // Try to remove a file in non-existent directory
      const uri = vscode.Uri.file('/src/nonexistent/file.ts');
      
      expect(() => {
        testControllerUtils.removeTestItemsForUri(testController, uri);
      }).to.not.throw();

      // Verify existing structure is untouched
      expect(testController.items.get('src')?.children.get('utils')?.children.get('helper.ts')).to.exist;
    });

    it('should remove multiple levels of empty directories', () => {
      // Create deep structure: src/app/components/ui/Button.tsx
      const srcItem = testController.createTestItem('src', 'Source');
      const appItem = testController.createTestItem('app', 'App');
      const componentsItem = testController.createTestItem('components', 'Components');
      const uiItem = testController.createTestItem('ui', 'UI');
      const buttonItem = testController.createTestItem('Button.tsx', 'Button File');

      testController.items.add(srcItem);
      srcItem.children.add(appItem);
      appItem.children.add(componentsItem);
      componentsItem.children.add(uiItem);
      uiItem.children.add(buttonItem);

      // Verify deep structure exists
      let currentItem = testController.items.get('src');
      expect(currentItem).to.exist;
      currentItem = currentItem?.children.get('app');
      expect(currentItem).to.exist;
      currentItem = currentItem?.children.get('components');
      expect(currentItem).to.exist;
      currentItem = currentItem?.children.get('ui');
      expect(currentItem).to.exist;
      currentItem = currentItem?.children.get('Button.tsx');
      expect(currentItem).to.exist;

      // Remove the file
      const uri = vscode.Uri.file('/src/app/components/ui/Button.tsx');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // Verify all empty directories were cleaned up
      expect(testController.items.size).to.equal(0);
    });

    it('should stop cleanup at first non-empty directory', () => {
      // Create structure with shared directories: src/app/components/Button.tsx and src/app/utils/helper.ts
      const srcItem = testController.createTestItem('src', 'Source');
      const appItem = testController.createTestItem('app', 'App');
      const componentsItem = testController.createTestItem('components', 'Components');
      const utilsItem = testController.createTestItem('utils', 'Utils');
      const buttonItem = testController.createTestItem('Button.tsx', 'Button File');
      const helperItem = testController.createTestItem('helper.ts', 'Helper File');

      testController.items.add(srcItem);
      srcItem.children.add(appItem);
      appItem.children.add(componentsItem);
      appItem.children.add(utilsItem);
      componentsItem.children.add(buttonItem);
      utilsItem.children.add(helperItem);

      // Remove Button.tsx
      const uri = vscode.Uri.file('/src/app/components/Button.tsx');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // Verify: components directory should be removed, but src/app should remain
      expect(testController.items.get('src')).to.exist;
      expect(testController.items.get('src')?.children.get('app')).to.exist;
      expect(testController.items.get('src')?.children.get('app')?.children.get('components')).to.be.undefined;
      expect(testController.items.get('src')?.children.get('app')?.children.get('utils')).to.exist;
      expect(testController.items.get('src')?.children.get('app')?.children.get('utils')?.children.get('helper.ts')).to.exist;
    });

    it('should handle files with special characters', () => {
      // Create file with special characters: special chars/test@file#1.js
      const specialDirItem = testController.createTestItem('special chars', 'Special Directory');
      const specialFileItem = testController.createTestItem('test@file#1.js', 'Special File');

      testController.items.add(specialDirItem);
      specialDirItem.children.add(specialFileItem);

      // Verify file exists
      expect(testController.items.get('special chars')?.children.get('test@file#1.js')).to.exist;

      // Remove the file
      const uri = vscode.Uri.file('/special chars/test@file#1.js');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // Verify everything was cleaned up
      expect(testController.items.size).to.equal(0);
    });

    it('should work with vscode.workspace.asRelativePath correctly', () => {
      // Mock vscode.workspace.asRelativePath to return a known relative path
      const asRelativePathStub = sinon.stub(vscode.workspace, 'asRelativePath');
      asRelativePathStub.returns('src/components/Button.tsx');

      // Create the structure manually
      const srcItem = testController.createTestItem('src', 'Source');
      const componentsItem = testController.createTestItem('components', 'Components');
      const buttonItem = testController.createTestItem('Button.tsx', 'Button File');

      testController.items.add(srcItem);
      srcItem.children.add(componentsItem);
      componentsItem.children.add(buttonItem);

      // Remove using any URI (the stub will return our controlled path)
      const uri = vscode.Uri.file('/any/path/to/file.tsx');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // Verify the file was removed based on the stubbed relative path
      expect(testController.items.size).to.equal(0);
      expect(asRelativePathStub.calledOnce).to.be.true;
      expect(asRelativePathStub.calledWith(uri, false)).to.be.true;
    });

    it('should handle directory structures with single child at each level', () => {
      // Create a linear structure: a/b/c/d/file.ts
      const aItem = testController.createTestItem('a', 'A');
      const bItem = testController.createTestItem('b', 'B');
      const cItem = testController.createTestItem('c', 'C');
      const dItem = testController.createTestItem('d', 'D');
      const fileItem = testController.createTestItem('file.ts', 'File');

      testController.items.add(aItem);
      aItem.children.add(bItem);
      bItem.children.add(cItem);
      cItem.children.add(dItem);
      dItem.children.add(fileItem);

      // Remove the file
      const uri = vscode.Uri.file('/a/b/c/d/file.ts');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // All directories should be cleaned up since they're all empty
      expect(testController.items.size).to.equal(0);
    });

    it('should handle parent relationships correctly during cleanup', () => {
      // Create structure with multiple files to test parent relationship traversal
      const srcItem = testController.createTestItem('src', 'Source');
      const componentsItem = testController.createTestItem('components', 'Components');
      const deepItem = testController.createTestItem('deep', 'Deep');
      const nestedItem = testController.createTestItem('nested', 'Nested');
      const componentFileItem = testController.createTestItem('Component.tsx', 'Component File');
      const utilsItem = testController.createTestItem('utils', 'Utils');
      const helperItem = testController.createTestItem('helper.ts', 'Helper File');

      // Build structure: src/components/deep/nested/Component.tsx and src/utils/helper.ts
      testController.items.add(srcItem);
      srcItem.children.add(componentsItem);
      srcItem.children.add(utilsItem);
      componentsItem.children.add(deepItem);
      deepItem.children.add(nestedItem);
      nestedItem.children.add(componentFileItem);
      utilsItem.children.add(helperItem);

      // Remove the deeply nested file
      const uri = vscode.Uri.file('/src/components/deep/nested/Component.tsx');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // Verify: deep/nested/components should be cleaned up, but src and utils should remain
      expect(testController.items.get('src')).to.exist;
      expect(testController.items.get('src')?.children.get('components')).to.be.undefined;
      expect(testController.items.get('src')?.children.get('utils')).to.exist;
      expect(testController.items.get('src')?.children.get('utils')?.children.get('helper.ts')).to.exist;
    });

    it('should handle edge case where parentDirectory is undefined', () => {
      // Test case where there's no parent directory (root level file)
      const packageItem = testController.createTestItem('package.json', 'Package File');
      testController.items.add(packageItem);

      // Remove the root file
      const uri = vscode.Uri.file('/package.json');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // Verify file was removed
      expect(testController.items.size).to.equal(0);
    });

    it('should handle case where file does not exist in expected directory', () => {
      // Create structure: src/utils/existing.ts
      const srcItem = testController.createTestItem('src', 'Source');
      const utilsItem = testController.createTestItem('utils', 'Utils');
      const existingItem = testController.createTestItem('existing.ts', 'Existing File');

      testController.items.add(srcItem);
      srcItem.children.add(utilsItem);
      utilsItem.children.add(existingItem);

      // Try to remove different file in same directory
      const uri = vscode.Uri.file('/src/utils/missing.ts');
      
      expect(() => {
        testControllerUtils.removeTestItemsForUri(testController, uri);
      }).to.not.throw();

      // Verify structure is unchanged
      expect(testController.items.get('src')?.children.get('utils')?.children.get('existing.ts')).to.exist;
    });

    it('should handle multiple files in root directory', () => {
      // Create multiple root files
      const indexItem = testController.createTestItem('index.js', 'Index');
      const packageItem = testController.createTestItem('package.json', 'Package');
      const readmeItem = testController.createTestItem('README.md', 'Readme');

      testController.items.add(indexItem);
      testController.items.add(packageItem);
      testController.items.add(readmeItem);

      // Remove one file
      const uri = vscode.Uri.file('/package.json');
      testControllerUtils.removeTestItemsForUri(testController, uri);

      // Verify only the target file was removed
      expect(testController.items.get('index.js')).to.exist;
      expect(testController.items.get('package.json')).to.be.undefined;
      expect(testController.items.get('README.md')).to.exist;
      expect(testController.items.size).to.equal(2);
    });

    it('should handle empty directory path gracefully', () => {
      // Create some structure
      const srcItem = testController.createTestItem('src', 'Source');
      const fileItem = testController.createTestItem('file.ts', 'File');

      testController.items.add(srcItem);
      srcItem.children.add(fileItem);

      // Try to remove with empty path
      const asRelativePathStub = sinon.stub(vscode.workspace, 'asRelativePath');
      asRelativePathStub.returns('');

      const uri = vscode.Uri.file('/');
      
      expect(() => {
        testControllerUtils.removeTestItemsForUri(testController, uri);
      }).to.not.throw();

      // Verify structure is unchanged
      expect(testController.items.get('src')?.children.get('file.ts')).to.exist;
    });
  });
});
