import vscode from 'vscode';
import { Constants } from './index.ts';
import { commonTokens } from './di/index.ts';
import { Configuration, Settings } from './config/index.ts';
import { Subject, buffer, debounceTime } from 'rxjs';
import { FileChangeHandler } from './file-change-handler.ts';
import { ContextualLogger } from './logging/contextual-logger.ts';
export class FileSystemWatcher {
  private readonly workspaceFolder;
  private readonly fileChangeHandler;
  private readonly logger;

  #watcher?: vscode.FileSystemWatcher;
  private readonly fileChangeSubject = new Subject<vscode.Uri>();
  private readonly fileDeleteSubject = new Subject<vscode.Uri>();
  public static readonly inject = [
    commonTokens.workspaceFolder,
    commonTokens.fileChangeHandler,
    commonTokens.contextualLogger,
  ] as const;
  constructor(
    workspaceFolder: vscode.WorkspaceFolder,
    fileChangeHandler: FileChangeHandler,
    logger: ContextualLogger,
  ) {
    this.workspaceFolder = workspaceFolder;
    this.fileChangeHandler = fileChangeHandler;
    this.logger = logger;
  }
  init() {
    this.fileChangeSubject
      .pipe(
        buffer(
          this.fileChangeSubject.pipe(
            debounceTime(Constants.FileSystemWatcherDebounceMs),
          ),
        ),
      )
      .subscribe(async (uris) => {
        await this.fileChangeHandler.handleFilesChanged(uris);
      });
    this.fileDeleteSubject
      .pipe(
        buffer(
          this.fileDeleteSubject.pipe(
            debounceTime(Constants.FileSystemWatcherDebounceMs),
          ),
        ),
      )
      .subscribe((uris) => {
        this.fileChangeHandler.handleFilesDeleted(uris);
      });
    const configuredPattern = Configuration.getSettingOrDefault<string>(
      Settings.FileSystemWatcherPattern,
      Constants.DefaultFileSystemWatcherPattern,
      this.workspaceFolder,
    );
    const relativePattern = new vscode.RelativePattern(
      this.workspaceFolder,
      configuredPattern,
    );
    this.#watcher = vscode.workspace.createFileSystemWatcher(relativePattern);
    this.#watcher.onDidCreate((uri) => this.fileChangeSubject.next(uri));
    this.#watcher.onDidChange((uri) => this.fileChangeSubject.next(uri));
    this.#watcher.onDidDelete((uri) => this.fileDeleteSubject.next(uri));
  }
  dispose() {
    this.#watcher?.dispose();
    this.fileChangeSubject.complete();
    this.fileDeleteSubject.complete();
  }
}
