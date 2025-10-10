import vscode from 'vscode';
import fs from 'fs';
import { MutationTestParams } from 'mutation-server-protocol';
import { MutationServer } from './mutation-server.ts';
import { TestExplorer } from './test-explorer.ts';
import { ContextualLogger } from './logging/contextual-logger.ts';
import { commonTokens } from './di/tokens.ts';

export class FileChangeHandler {
  private readonly mutationServer;
  private readonly testExplorer;
  private readonly serverWorkspaceDirectory;
  private readonly logger;

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
    this.mutationServer = mutationServer;
    this.testExplorer = testExplorer;
    this.serverWorkspaceDirectory = serverWorkspaceDirectory;
    this.logger = logger;
  }

  async handleFilesChanged(uris: vscode.Uri[]): Promise<void> {
    const fileRanges = uris.map((uri) => {
      try {
        const filePath = fs.lstatSync(uri.fsPath).isDirectory()
          ? `${uri.fsPath}/`
          : uri.fsPath;
        return { path: filePath };
      } catch (statError) {
        this.logger.warn(
          `Could not stat file ${uri.fsPath}: ${statError}`,
          'FileChangeHandler',
        );
        // Fallback to file path without directory check
        return { path: uri.fsPath };
      }
    });

    const mutationTestParams: MutationTestParams = { files: fileRanges };
    const discoverResult = await this.mutationServer.discover(mutationTestParams);

    this.testExplorer.processDiscoverResult(
      discoverResult,
      this.serverWorkspaceDirectory,
    );
  }

  handleFilesDeleted(uris: vscode.Uri[]): void {
    this.testExplorer.processFileDeletions(uris);
  }
}
