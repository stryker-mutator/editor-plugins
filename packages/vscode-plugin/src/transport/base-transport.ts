import { Subject } from 'rxjs';
import { JSONRPCRequest, JSONRPCResponse } from 'json-rpc-2.0';
import { JsonRpcEventDeserializer } from '../utils/index.ts';
import { ContextualLogger } from '../logging/index.ts';

/**
 * Base transport class with common functionality
 */
export abstract class BaseTransport {
  protected readonly deserializer = new JsonRpcEventDeserializer();
  protected connected = false;

  public readonly notifications = new Subject<JSONRPCRequest>();
  public readonly messages = new Subject<JSONRPCResponse>();

  protected readonly logger: ContextualLogger;

  constructor(logger: ContextualLogger) {
    this.logger = logger;
  }

  abstract init(): Promise<void>;
  abstract send(message: string): void;
  abstract dispose(): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Handle incoming data by parsing JSON-RPC messages and routing them
   * to the appropriate subjects (notifications or messages)
   */
  protected handleIncomingData(data: Buffer): void {
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
        this.constructor.name,
      );
    }
  }

  /**
   * Common cleanup for subjects
   */
  protected completeSubjects(): void {
    this.notifications.complete();
    this.messages.complete();
  }
}
