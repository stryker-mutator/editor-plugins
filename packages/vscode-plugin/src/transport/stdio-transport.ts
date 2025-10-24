import { ContextualLogger } from '../logging/index.ts';
import { BaseTransport } from './base-transport.ts';
import { commonTokens } from '../di/index.ts';
import { Process } from '../process.ts';

/**
 * Stdio-based transport implementation
 * Communicates with the mutation server through stdin/stdout
 */
export class StdioTransport extends BaseTransport {
  private readonly process: Process;

  public static readonly inject = [
    commonTokens.contextualLogger,
    commonTokens.process,
  ] as const;

  constructor(logger: ContextualLogger, process: Process) {
    super(logger);
    this.process = process;
  }

  async init(): Promise<void> {
    this.process.on('stdout', (data: Buffer) => {
      this.handleIncomingData(data);
    });

    this.process.on('stderr', (data: Buffer) => {
      this.logger.info(data.toString(), 'Server');
    });

    this.connected = true;
    this.logger.info(
      'Connected to mutation server via stdio',
      StdioTransport.name,
    );
  }

  send(message: string): void {
    if (!this.connected) {
      throw new Error('Stdio transport is not connected');
    }

    const content = Buffer.from(message);
    this.process.write(
      `Content-Length: ${content.byteLength}\r\n\r\n${content}`,
    );
  }

  async dispose(): Promise<void> {
    this.connected = false;
    this.completeSubjects();
  }
}
