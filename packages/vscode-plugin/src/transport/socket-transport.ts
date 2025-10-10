import * as net from 'net';
import { Subject } from 'rxjs';
import { JSONRPCRequest, JSONRPCResponse } from 'json-rpc-2.0';
import { promisify } from 'util';
import { JsonRpcEventDeserializer } from '../utils/index.ts';
import { ContextualLogger } from '../logging/index.ts';
import { ITransport, SocketTransportConfig } from './index.ts';
import { commonTokens } from '../di/index.ts';

/**
 * Socket-based transport implementation
 */
export class SocketTransport implements ITransport {
  private socket?: net.Socket;
  private connected = false;
  private readonly deserializer = new JsonRpcEventDeserializer();

  public readonly notifications = new Subject<JSONRPCRequest>();
  public readonly messages = new Subject<JSONRPCResponse>();

  private readonly logger: ContextualLogger;
  private readonly config: SocketTransportConfig;

  public static readonly inject = [
    commonTokens.contextualLogger,
    commonTokens.transportConfig,
  ] as const;
  constructor(logger: ContextualLogger, config: SocketTransportConfig) {
    this.logger = logger;
    this.config = config;
  }

  async connect(): Promise<void> {
    // Wait a bit for the server to be fully ready to accept connections
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return new Promise((resolve, reject) => {
      this.socket = net.connect(this.config.port, this.config.host, () => {
        this.connected = true;
        this.logger.info(
          'Connected to mutation server socket',
          SocketTransport.name,
        );
        resolve();
      });

      this.socket.on('error', (error) => {
        this.logger.error(
          `Socket connection error: ${error.message}`,
          SocketTransport.name,
        );
        reject(error);
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.logger.info('Socket connection closed', SocketTransport.name);
      });

      this.socket.on('data', (data) => {
        this.handleIncomingData(data);
      });
    });
  }

  send(message: string): void {
    if (!this.socket || !this.connected) {
      throw new Error('Socket transport is not connected');
    }

    const content = Buffer.from(message);
    this.socket.write(`Content-Length: ${content.byteLength}\r\n\r\n`);
    this.socket.write(content);
  }

  isConnected(): boolean {
    return this.connected;
  }

  async dispose(): Promise<void> {
    if (this.socket) {
      this.connected = false;
      await promisify(this.socket.end.bind(this.socket))();
      this.socket = undefined;
    }

    this.notifications.complete();
    this.messages.complete();
  }

  // TODO: move to base transport class
  private handleIncomingData(data: Buffer): void {
    try {
      const events = this.deserializer.deserialize(data);
      for (const event of events) {
        if (event.id === undefined) {
          // Notification (no id)
          this.notifications.next(event);
        } else {
          // Request or Response (has id)
          this.messages.next(event);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error processing incoming data: ${error}`,
        SocketTransport.name,
      );
    }
  }
}
