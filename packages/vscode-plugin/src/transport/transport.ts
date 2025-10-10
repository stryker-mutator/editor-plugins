import { Subject } from 'rxjs';
import { JSONRPCRequest } from 'json-rpc-2.0';

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
  process: any; // Using any to avoid circular dependency with child_process
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
  connect(config: TransportConfig): Promise<void>;

  /**
   * Send a JSON-RPC message
   */
  send(message: string): void;

  /**
   * Observable stream of incoming JSON-RPC notifications (messages without id)
   */
  readonly notifications: Subject<JSONRPCRequest>;

  /**
   * Observable stream of incoming JSON-RPC responses and requests (messages with id)
   */
  readonly messages: Subject<JSONRPCRequest>;

  /**
   * Check if transport is connected
   */
  isConnected(): boolean;

  /**
   * Dispose and cleanup resources
   */
  dispose(): Promise<void>;
}
