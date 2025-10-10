import { Subject } from 'rxjs';
import { JSONRPCRequest, JSONRPCResponse } from 'json-rpc-2.0';

/**
 * Transport mode for mutation server communication
 */
export const TransportMode = {
  Socket: 'socket',
  Stdio: 'stdio',
} as const;

export type TransportMode = (typeof TransportMode)[keyof typeof TransportMode];

/**
 * Configuration for transport initialization
 */
export interface TransportConfig {
  mode: TransportMode;
}

export interface SocketTransportConfig extends TransportConfig {
  mode: typeof TransportMode.Socket;
  host: string;
  port: number;
}

/**
 * Abstract interface for mutation server transport implementations
 */
export interface ITransport {
  /**
   * Initialize and connect the transport
   */
  connect(): Promise<void>;

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
   * Check if transport is connected
   */
  isConnected(): boolean;

  /**
   * Dispose and cleanup resources
   */
  dispose(): Promise<void>;
}
