import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { pathUtils } from '../../../utils/path-utils';

describe('pathUtils', () => {
  let mockWorkspaceFolder: vscode.WorkspaceFolder;
  let existsSyncStub: sinon.SinonStub;

  beforeEach(() => {
    // Create mock workspace folder
    mockWorkspaceFolder = {
      uri: vscode.Uri.file('/workspace/root'),
      name: 'test-workspace',
      index: 0
    };

    // Stub fs.existsSync
    existsSyncStub = sinon.stub(fs, 'existsSync');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('toAbsolutePath', () => {
    it('should return the path unchanged if it is already absolute', () => {
      const absolutePath = '/absolute/path/to/file.js';
      
      const result = pathUtils.toAbsolutePath(absolutePath, mockWorkspaceFolder);
      
      expect(result).to.equal(absolutePath);
    });

    it('should join relative path with workspace folder path', () => {
      const relativePath = 'src/components/Button.tsx';
      
      const result = pathUtils.toAbsolutePath(relativePath, mockWorkspaceFolder);
      
      expect(result).to.equal('/workspace/root/src/components/Button.tsx');
    });

    it('should handle relative paths starting with ./', () => {
      const relativePath = './config/stryker.conf.js';
      
      const result = pathUtils.toAbsolutePath(relativePath, mockWorkspaceFolder);
      
      expect(result).to.equal('/workspace/root/config/stryker.conf.js');
    });

    it('should handle relative paths with parent directory references', () => {
      const relativePath = '../shared/utils.ts';
      
      const result = pathUtils.toAbsolutePath(relativePath, mockWorkspaceFolder);
      
      expect(result).to.equal('/workspace/shared/utils.ts');
    });

    it('should handle empty relative path', () => {
      const relativePath = '';
      
      const result = pathUtils.toAbsolutePath(relativePath, mockWorkspaceFolder);
      
      expect(result).to.equal('/workspace/root');
    });

    it('should handle current directory reference', () => {
      const relativePath = '.';
      
      const result = pathUtils.toAbsolutePath(relativePath, mockWorkspaceFolder);
      
      expect(result).to.equal('/workspace/root');
    });

    it('should handle relative paths with multiple parent directory references', () => {
      const relativePath = '../../external/library/index.js';
      
      const result = pathUtils.toAbsolutePath(relativePath, mockWorkspaceFolder);
      
      expect(result).to.equal('/external/library/index.js');
    });

    it('should preserve file extensions', () => {
      const relativePath = 'test/unit/my-test.spec.ts';
      
      const result = pathUtils.toAbsolutePath(relativePath, mockWorkspaceFolder);
      
      expect(result).to.equal('/workspace/root/test/unit/my-test.spec.ts');
    });

    it('should handle paths with special characters', () => {
      const relativePath = 'files with spaces/and-special_chars@123.txt';
      
      const result = pathUtils.toAbsolutePath(relativePath, mockWorkspaceFolder);
      
      expect(result).to.equal('/workspace/root/files with spaces/and-special_chars@123.txt');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      const absolutePath = '/absolute/path/to/existing-file.js';
      existsSyncStub.returns(true);
      
      const result = pathUtils.fileExists(absolutePath, mockWorkspaceFolder);
      
      expect(result).to.be.true;
      expect(existsSyncStub.calledOnceWith(absolutePath)).to.be.true;
    });

    it('should return false when file does not exist at absolute path', () => {
      const absolutePath = '/absolute/path/to/non-existing-file.js';
      existsSyncStub.returns(false);
      
      const result = pathUtils.fileExists(absolutePath, mockWorkspaceFolder);
      
      expect(result).to.be.false;
      expect(existsSyncStub.calledOnceWith(absolutePath)).to.be.true;
    });
  });
});
