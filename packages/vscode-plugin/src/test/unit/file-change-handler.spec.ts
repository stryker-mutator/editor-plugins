import sinon from 'sinon';
import vscode from 'vscode';
import { expect } from 'chai';
import fs from 'fs/promises';
import { FileChangeHandler } from '../../file-change-handler.ts';
import * as factory from '../factory.ts';
import { MutationServer } from '../../mutation-server.ts';
import { TestExplorer } from '../../test-explorer.ts';
import { ContextualLogger } from '../../logging/contextual-logger.ts';

describe(FileChangeHandler.name, () => {
  let sandbox: sinon.SinonSandbox;
  let sut: FileChangeHandler;
  let mutationServerMock: sinon.SinonStubbedInstance<MutationServer>;
  let testExplorerMock: sinon.SinonStubbedInstance<TestExplorer>;
  let contextualLoggerMock: sinon.SinonStubbedInstance<ContextualLogger>;
  let fsStub: sinon.SinonStub;

  const serverWorkspaceDirectory = '/foo/bar/server';

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mutationServerMock = sinon.createStubInstance(MutationServer);
    testExplorerMock = sinon.createStubInstance(TestExplorer);
    contextualLoggerMock = sinon.createStubInstance(ContextualLogger);
    fsStub = sandbox.stub(fs, 'lstat');

    sut = new FileChangeHandler(
      mutationServerMock,
      testExplorerMock,
      serverWorkspaceDirectory,
      contextualLoggerMock,
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('handleFilesChanged', () => {
    it('should handle file changes for regular files', async () => {
      // Arrange
      const mockUri1 = { fsPath: '/path/to/file1.ts' } as vscode.Uri;
      const mockUri2 = { fsPath: '/path/to/file2.js' } as vscode.Uri;
      
      fsStub.withArgs('/path/to/file1.ts').resolves({ isDirectory: () => false });
      fsStub.withArgs('/path/to/file2.js').resolves({ isDirectory: () => false });
      
      const expectedDiscoverResult = {
        files: {
          '/path/to/file1.ts': { mutants: [factory.createDiscoveredMutant()] }
        }
      };
      mutationServerMock.discover.resolves(expectedDiscoverResult);

      // Act
      await sut.handleFilesChanged([mockUri1, mockUri2]);

      // Assert
      const expectedParams = {
        files: [
          { path: '/path/to/file1.ts' },
          { path: '/path/to/file2.js' }
        ]
      };
      expect(mutationServerMock.discover).calledOnceWithExactly(expectedParams);
      expect(testExplorerMock.processDiscoverResult).calledOnceWithExactly(
        expectedDiscoverResult,
        serverWorkspaceDirectory
      );
    });

    it('should handle file changes for directories by adding trailing slash', async () => {
      // Arrange
      const mockUri = { fsPath: '/path/to/directory' } as vscode.Uri;
      
      fsStub.withArgs('/path/to/directory').resolves({ isDirectory: () => true });
      
      const expectedDiscoverResult = {
        files: {
          '/path/to/directory/': { mutants: [] }
        }
      };
      mutationServerMock.discover.resolves(expectedDiscoverResult);

      // Act
      await sut.handleFilesChanged([mockUri]);

      // Assert
      const expectedParams = {
        files: [{ path: '/path/to/directory/' }]
      };
      expect(mutationServerMock.discover).calledOnceWithExactly(expectedParams);
      expect(testExplorerMock.processDiscoverResult).calledOnceWithExactly(
        expectedDiscoverResult,
        serverWorkspaceDirectory
      );
    });

    it('should handle mixed files and directories', async () => {
      // Arrange
      const fileUri = { fsPath: '/path/to/file.ts' } as vscode.Uri;
      const dirUri = { fsPath: '/path/to/dir' } as vscode.Uri;
      
      fsStub.withArgs('/path/to/file.ts').resolves({ isDirectory: () => false });
      fsStub.withArgs('/path/to/dir').resolves({ isDirectory: () => true });
      
      const expectedDiscoverResult = {
        files: {
          '/path/to/file.ts': { mutants: [factory.createDiscoveredMutant()] },
          '/path/to/dir/': { mutants: [] }
        }
      };
      mutationServerMock.discover.resolves(expectedDiscoverResult);

      // Act
      await sut.handleFilesChanged([fileUri, dirUri]);

      // Assert
      const expectedParams = {
        files: [
          { path: '/path/to/file.ts' },
          { path: '/path/to/dir/' }
        ]
      };
      expect(mutationServerMock.discover).calledOnceWithExactly(expectedParams);
      expect(testExplorerMock.processDiscoverResult).calledOnceWithExactly(
        expectedDiscoverResult,
        serverWorkspaceDirectory
      );
    });

    it('should handle directory check errors gracefully and filter out failed files', async () => {
      // Arrange
      const workingUri = { fsPath: '/path/to/working-file.ts' } as vscode.Uri;
      const failingUri = { fsPath: '/path/to/failing-file.ts' } as vscode.Uri;
      
      fsStub.withArgs('/path/to/working-file.ts').resolves({ isDirectory: () => false });
      fsStub.withArgs('/path/to/failing-file.ts').rejects(new Error('File not found'));
      
      const expectedDiscoverResult = {
        files: {
          '/path/to/working-file.ts': { mutants: [factory.createDiscoveredMutant()] }
        }
      };
      mutationServerMock.discover.resolves(expectedDiscoverResult);

      // Act
      await sut.handleFilesChanged([workingUri, failingUri]);

      // Assert
      expect(contextualLoggerMock.warn).calledWith(
        'Could not resolve file /path/to/failing-file.ts: Error: File not found',
        'FileChangeHandler'
      );
      
      // Only the working file should be included in the discovery params
      const expectedParams = {
        files: [{ path: '/path/to/working-file.ts' }]
      };
      expect(mutationServerMock.discover).calledOnceWithExactly(expectedParams);
      expect(testExplorerMock.processDiscoverResult).calledOnceWithExactly(
        expectedDiscoverResult,
        serverWorkspaceDirectory
      );
    });

    it('should not discover any files when given an empty array', async () => {
      // Act
      await sut.handleFilesChanged([]);

      // Assert
      expect(mutationServerMock.discover).not.called;
      expect(testExplorerMock.processDiscoverResult).not.called;
    });

    it('should not discover any files when all file stats fail', async () => {
      // Arrange
      const failingUri1 = { fsPath: '/path/to/failing1.ts' } as vscode.Uri;
      const failingUri2 = { fsPath: '/path/to/failing2.ts' } as vscode.Uri;
      
      fsStub.withArgs('/path/to/failing1.ts').rejects(new Error('File not found'));
      fsStub.withArgs('/path/to/failing2.ts').rejects(new Error('Permission denied'));
      
      const expectedDiscoverResult = { files: {} };
      mutationServerMock.discover.resolves(expectedDiscoverResult);

      // Act
      await sut.handleFilesChanged([failingUri1, failingUri2]);

      // Assert
      expect(mutationServerMock.discover).not.called;
      expect(testExplorerMock.processDiscoverResult).not.called;
    });

    it('should not propagate mutation server discover errors', async () => {
      // Arrange
      const mockUri = { fsPath: '/path/to/file.ts' } as vscode.Uri;
      fsStub.withArgs('/path/to/file.ts').resolves({ isDirectory: () => false });
      
      const discoveryError = new Error('Mutation server discovery failed');
      mutationServerMock.discover.rejects(discoveryError);

      // Act
      await sut.handleFilesChanged([mockUri]);

      // Assert
      expect(contextualLoggerMock.error).calledWith(
        `Failed to process file changes: Error: Mutation server discovery failed for ${[{ path: '/path/to/file.ts' }]}`,
        'FileChangeHandler'
      );
      expect(testExplorerMock.processDiscoverResult).not.called;
    });
  });

  describe('handleFilesDeleted', () => {
    it('should handle file deletions', () => {
      // Arrange
      const mockUri1 = { fsPath: '/path/to/deleted1.ts' } as vscode.Uri;
      const mockUri2 = { fsPath: '/path/to/deleted2.js' } as vscode.Uri;

      // Act
      sut.handleFilesDeleted([mockUri1, mockUri2]);

      // Assert
      expect(testExplorerMock.processFileDeletions).calledOnceWithExactly([mockUri1, mockUri2]);
    });

    it('should handle empty deletion array', () => {
      // Act
      sut.handleFilesDeleted([]);

      // Assert
      expect(testExplorerMock.processFileDeletions).calledOnceWithExactly([]);
    });
  });
});
