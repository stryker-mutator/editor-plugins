import sinon from 'sinon';
import vscode from 'vscode';
import { expect } from 'chai';
import { FileSystemWatcher } from '../../file-system-watcher.ts';
import * as factory from '../factory.ts';
import { FileChangeHandler } from '../../file-change-handler.ts';
import { ContextualLogger } from '../../logging/contextual-logger.ts';
import { Configuration, Settings } from '../../config/index.ts';
import { Constants } from '../../constants.ts';

describe(FileSystemWatcher.name, () => {
  let sandbox: sinon.SinonSandbox;
  let sut: FileSystemWatcher;
  let fileChangeHandlerMock: sinon.SinonStubbedInstance<FileChangeHandler>;
  let workspaceFolderMock: sinon.SinonStubbedInstance<vscode.WorkspaceFolder>;
  let contextualLoggerMock: sinon.SinonStubbedInstance<ContextualLogger>;
  let getSettingOrDefaultStub: sinon.SinonStub;
  let vscodeFileSystemWatcherMock: sinon.SinonStubbedInstance<vscode.FileSystemWatcher>;
  let createFileSystemWatcherStub: sinon.SinonStub;
  let relativePatternStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fileChangeHandlerMock = sinon.createStubInstance(FileChangeHandler);
    workspaceFolderMock = factory.workspaceFolder();
    contextualLoggerMock = sinon.createStubInstance(ContextualLogger);

    // Create mock for VS Code FileSystemWatcher
    vscodeFileSystemWatcherMock = {
      onDidCreate: sandbox.stub(),
      onDidChange: sandbox.stub(),
      onDidDelete: sandbox.stub(),
      dispose: sandbox.stub(),
    } as any;

    // Stub VS Code workspace API
    createFileSystemWatcherStub = sandbox
      .stub(vscode.workspace, 'createFileSystemWatcher')
      .returns(vscodeFileSystemWatcherMock);

    // Stub RelativePattern constructor
    relativePatternStub = sandbox.stub(vscode, 'RelativePattern' as any);

    // Stub Configuration
    getSettingOrDefaultStub = sandbox.stub(
      Configuration,
      'getSettingOrDefault',
    );

    sut = new FileSystemWatcher(
      workspaceFolderMock,
      fileChangeHandlerMock,
      contextualLoggerMock,
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('init', () => {
    beforeEach(() => {
      getSettingOrDefaultStub
        .withArgs(
          Settings.FileSystemWatcherPattern,
          Constants.DefaultFileSystemWatcherPattern,
          workspaceFolderMock,
        )
        .returns('**/*.{js,ts,jsx,tsx}');
    });

    it('should create file system watcher with configured pattern', () => {
      // Act
      sut.init();

      // Assert
      expect(relativePatternStub).calledOnceWithExactly(
        workspaceFolderMock,
        '**/*.{js,ts,jsx,tsx}',
      );
      expect(createFileSystemWatcherStub).calledOnce;
    });

    it('should register file system event handlers', () => {
      // Act
      sut.init();

      // Assert
      expect(vscodeFileSystemWatcherMock.onDidCreate).calledOnce;
      expect(vscodeFileSystemWatcherMock.onDidChange).calledOnce;
      expect(vscodeFileSystemWatcherMock.onDidDelete).calledOnce;
    });

    it('should use default pattern when no configuration is provided', () => {
      // Arrange
      getSettingOrDefaultStub
        .withArgs(
          Settings.FileSystemWatcherPattern,
          Constants.DefaultFileSystemWatcherPattern,
          workspaceFolderMock,
        )
        .returns(Constants.DefaultFileSystemWatcherPattern);

      // Act
      sut.init();

      // Assert
      expect(relativePatternStub).calledOnceWithExactly(
        workspaceFolderMock,
        Constants.DefaultFileSystemWatcherPattern,
      );
    });

    describe('file change handling', () => {
      let onCreateCallback: (uri: vscode.Uri) => void;
      let onChangeCallback: (uri: vscode.Uri) => void;
      let onDeleteCallback: (uri: vscode.Uri) => void;

      beforeEach(() => {
        // Capture the callbacks when they're registered
        vscodeFileSystemWatcherMock.onDidCreate.callsFake((callback) => {
          onCreateCallback = callback;
          return { dispose: sandbox.stub() };
        });
        vscodeFileSystemWatcherMock.onDidChange.callsFake((callback) => {
          onChangeCallback = callback;
          return { dispose: sandbox.stub() };
        });
        vscodeFileSystemWatcherMock.onDidDelete.callsFake((callback) => {
          onDeleteCallback = callback;
          return { dispose: sandbox.stub() };
        });

        sut.init();
      });

      it('should handle file creation events', (done) => {
        // Arrange
        const mockUri = { fsPath: '/path/to/created-file.ts' } as vscode.Uri;
        fileChangeHandlerMock.handleFilesChanged.resolves();

        // Act
        onCreateCallback(mockUri);

        // Assert - use setTimeout to allow for debouncing
        setTimeout(() => {
          expect(fileChangeHandlerMock.handleFilesChanged).calledWith([
            mockUri,
          ]);
          done();
        }, Constants.FileSystemWatcherDebounceMs + 10);
      });

      it('should handle file change events', (done) => {
        // Arrange
        const mockUri = { fsPath: '/path/to/changed-file.ts' } as vscode.Uri;
        fileChangeHandlerMock.handleFilesChanged.resolves();

        // Act
        onChangeCallback(mockUri);

        // Assert - use setTimeout to allow for debouncing
        setTimeout(() => {
          expect(fileChangeHandlerMock.handleFilesChanged).calledWith([
            mockUri,
          ]);
          done();
        }, Constants.FileSystemWatcherDebounceMs + 10);
      });

      it('should handle file deletion events', (done) => {
        // Arrange
        const mockUri = { fsPath: '/path/to/deleted-file.ts' } as vscode.Uri;

        // Act
        onDeleteCallback(mockUri);

        // Assert - use setTimeout to allow for debouncing
        setTimeout(() => {
          expect(fileChangeHandlerMock.handleFilesDeleted).calledWith([
            mockUri,
          ]);
          done();
        }, Constants.FileSystemWatcherDebounceMs + 10);
      });

      it('should debounce multiple file change events', (done) => {
        // Arrange
        const mockUri1 = { fsPath: '/path/to/file1.ts' } as vscode.Uri;
        const mockUri2 = { fsPath: '/path/to/file2.ts' } as vscode.Uri;
        const mockUri3 = { fsPath: '/path/to/file3.ts' } as vscode.Uri;
        fileChangeHandlerMock.handleFilesChanged.resolves();

        // Act - trigger multiple events in quick succession
        onChangeCallback(mockUri1);
        onChangeCallback(mockUri2);
        onCreateCallback(mockUri3);

        // Assert - should be batched into a single call
        setTimeout(() => {
          expect(fileChangeHandlerMock.handleFilesChanged).calledOnce;
          expect(fileChangeHandlerMock.handleFilesChanged).calledWith([
            mockUri1,
            mockUri2,
            mockUri3,
          ]);
          done();
        }, Constants.FileSystemWatcherDebounceMs + 10);
      });

      it('should debounce multiple file deletion events', (done) => {
        // Arrange
        const mockUri1 = { fsPath: '/path/to/deleted1.ts' } as vscode.Uri;
        const mockUri2 = { fsPath: '/path/to/deleted2.ts' } as vscode.Uri;

        // Act - trigger multiple deletion events
        onDeleteCallback(mockUri1);
        onDeleteCallback(mockUri2);

        // Assert - should be batched into a single call
        setTimeout(() => {
          expect(fileChangeHandlerMock.handleFilesDeleted).calledOnce;
          expect(fileChangeHandlerMock.handleFilesDeleted).calledWith([
            mockUri1,
            mockUri2,
          ]);
          done();
        }, Constants.FileSystemWatcherDebounceMs + 10);
      });
    });
  });

  describe('dispose', () => {
    it('should dispose VS Code file system watcher when initialized', () => {
      // Arrange
      sut.init();

      // Act
      sut.dispose();

      // Assert
      expect(vscodeFileSystemWatcherMock.dispose).calledOnce;
    });
  });
});
