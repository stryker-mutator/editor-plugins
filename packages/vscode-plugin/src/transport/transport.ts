import { Subject } from 'rxjs';
import { JSONRPCRequest, JSONRPCResponse } from 'json-rpc-2.0';

/**
 * Abstract interface for mutation server transport implementations
 */
export interface ITransport {
  /**
   * Initialize the transport
   */
  init(): Promise<void>;

  /**
   * Send a JSON-RPC message
   */
  send(message: string): void;

  /**
   * Observable stream of incoming JSON-RPC notifications (messages without id)
   */
  readonly notifications: Subject<JSONRPCRequest>;

  /**
   * Observable stream of incoming JSON-RPC responses
   */
  readonly messages: Subject<JSONRPCResponse>;

  /**
   * Dispose and cleanup resources
   */
  dispose(): Promise<void>;
}
