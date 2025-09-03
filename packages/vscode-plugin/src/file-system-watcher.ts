import * as vscode from 'vscode';
import { Constants } from './index';
import { commonTokens, tokens } from './di/index';
import { Configuration, Settings } from './config';
import { Subject, buffer, debounceTime } from 'rxjs';

export class FileSystemWatcher {
  #watcher?: vscode.FileSystemWatcher;

  private readonly fileChangeSubject = new Subject<vscode.Uri>();
  private readonly fileDeleteSubject = new Subject<vscode.Uri>();

  private readonly _onFilesChanged = new vscode.EventEmitter<vscode.Uri[]>();
  private readonly _onFilesDeleted = new vscode.EventEmitter<vscode.Uri[]>();

  public readonly onFilesChanged = this._onFilesChanged.event;
  public readonly onFilesDeleted = this._onFilesDeleted.event;

  public static readonly inject = tokens(commonTokens.workspaceFolder);

  constructor(private readonly workspaceFolder: vscode.WorkspaceFolder) {
    this.fileChangeSubject
      .pipe(
        buffer(
          this.fileChangeSubject.pipe(
            debounceTime(Constants.FileSystemWatcherDebounceMs),
          ),
        ),
      )
      .subscribe((uris) => this._onFilesChanged.fire(uris));

    this.fileDeleteSubject
      .pipe(
        buffer(
          this.fileDeleteSubject.pipe(
            debounceTime(Constants.FileSystemWatcherDebounceMs),
          ),
        ),
      )
      .subscribe((uris) => this._onFilesDeleted.fire(uris));

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
    this._onFilesChanged.dispose();
    this._onFilesDeleted.dispose();
    this.fileChangeSubject.complete();
    this.fileDeleteSubject.complete();
  }
}
