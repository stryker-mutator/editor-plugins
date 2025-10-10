import vscode from 'vscode';
import fs from 'fs/promises';
import { FileRange } from 'mutation-server-protocol';
import { MutationServer, TestExplorer } from './index.ts';
import { ContextualLogger } from './logging/index.ts';
import { commonTokens } from './di/index.ts';

export class FileChangeHandler {
  #mutationServer;
  #testExplorer;
  #serverWorkspaceDirectory;
  #logger;

  static readonly inject = [
    commonTokens.mutationServer,
    commonTokens.testExplorer,
    commonTokens.serverWorkspaceDirectory,
    commonTokens.contextualLogger,
  ] as const;

  constructor(
    mutationServer: MutationServer,
    testExplorer: TestExplorer,
    serverWorkspaceDirectory: string,
    logger: ContextualLogger,
  ) {
    this.#mutationServer = mutationServer;
    this.#testExplorer = testExplorer;
    this.#serverWorkspaceDirectory = serverWorkspaceDirectory;
    this.#logger = logger;
  }
  async handleFilesChanged(uris: vscode.Uri[]): Promise<void> {
    const fileRanges = (await Promise.all(
      uris.map(async (uri) => {
        try {
          return await this.toFileRange(uri);
        } catch (statError) {
          this.#logger.warn(
            `Could not stat file ${uri.fsPath}: ${statError}`,
            'FileChangeHandler',
          );
          return undefined;
        }
      })
    )).filter((fr): fr is FileRange => fr !== undefined);

    if (fileRanges.length === 0) {
      this.#logger.info('No valid file changes to process.', 'FileChangeHandler');
      return;
    }

    try {
      const discoverResult = await this.#mutationServer.discover({ files: fileRanges });
      this.#testExplorer.processDiscoverResult(
        discoverResult,
        this.#serverWorkspaceDirectory,
      );
    } catch (error) {
      this.#logger.error(`Failed to process file changes: ${error} for ${fileRanges}`, 'FileChangeHandler');
    }
  }
  handleFilesDeleted(uris: vscode.Uri[]): void {
    this.#testExplorer.processFileDeletions(uris);
  }
  private async toFileRange(uri: vscode.Uri): Promise<FileRange> {
    const stats = await fs.lstat(uri.fsPath);
    const filePath = stats.isDirectory() ? `${uri.fsPath}/` : uri.fsPath;
    return { path: filePath };
  }
}
