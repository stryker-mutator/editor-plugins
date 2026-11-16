import { buffer, debounceTime, Subject } from 'rxjs';
import vscode from 'vscode';

import { Configuration, Platforms, Settings } from './config/index.ts';
import { commonTokens } from './di/index.ts';
import type { FileChangeHandler } from './file-change-handler.ts';
import { Constants } from './index.ts';

export class FileSystemWatcher {
  private readonly workspaceFolder;
  private readonly fileChangeHandler;

  #watcher?: vscode.FileSystemWatcher;
  private readonly fileChangeSubject = new Subject<vscode.Uri>();
  private readonly fileDeleteSubject = new Subject<vscode.Uri>();

  public static readonly inject = [
    commonTokens.workspaceFolder,
    commonTokens.fileChangeHandler,
  ] as const;

  constructor(
    workspaceFolder: vscode.WorkspaceFolder,
    fileChangeHandler: FileChangeHandler,
  ) {
    this.workspaceFolder = workspaceFolder;
    this.fileChangeHandler = fileChangeHandler;
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
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
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

    const defaultPattern =
      Configuration.getPlatform(this.workspaceFolder) === Platforms.DotNet
        ? Constants.DefaultDotNetFileSystemWatcherPattern
        : Constants.DefaultJsFileSystemWatcherPattern;

    const configuredPattern = Configuration.getSettingOrDefault<string>(
      Settings.FileSystemWatcherPattern,
      defaultPattern,
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
