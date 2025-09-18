declare module "osc" {
  export class EventEmitter<T> {
    addListener<E extends keyof T>(event: E, listener: T[E]): this;

    on<E extends keyof T>(event: E, listener: T[E]): this;

    once<E extends keyof T>(event: E, listener: T[E]): this;

    removeListener<E extends keyof T>(event: E, listener: T[E]): this;

    removeAllListeners(event?: keyof T): this;

    setMaxListeners(n: number): this;

    getMaxListeners(): number;

    listeners<E extends keyof T>(event: E): T[E][];

    emit(event: string | symbol, ...args: any[]): boolean;
    listenerCount(type: keyof T): number;

    // Added in Node 6...
    prependListener<E extends keyof T>(event: E, listener: T[E]): this;

    prependOnceListener<E extends keyof T>(event: E, listener: T[E]): this;

    eventNames(): Array<keyof T>;
  }

  export const defaults: {
    metadata: boolean;
    unpackSingleArgs: boolean;
  };
  export type Argument = number | string | Uint8Array;
  export type MetaArgument =
    | { type: "i" | "f"; value: number }
    | { type: "s"; value: string }
    | { type: "b"; value: Uint8Array };

  export abstract class SLIPPort {}

  export interface OscMessage {
    address: string;
    args: Argument | Array<Argument> | MetaArgument | Array<MetaArgument>;
  }

  export interface OscBundle {}

  export interface SenderInfo {
    address: string;
    port: number;
    size: number;
    family: "IPv4" | "IPv6";
  }

  export interface PortEvents {
    ready: () => void;
    message: (message: OscMessage, timeTag: number | undefined, info: SenderInfo) => void;
    bundle: (bundle: OscBundle, timeTag: number, info: SenderInfo) => void;
    osc: (packet: OscBundle | OscMessage, info: SenderInfo) => void;
    raw: (data: Uint8Array, info: SenderInfo) => void;
    error: (err: Error) => void;
  }

  export interface UdpOptions {
    /**
     * The port to listen on
     */
    localPort?: number; // 57121
    /**
     * The local address to bind to
     */
    localAddress?: string; // '127.0.0.1'
    /**
     * The remote port to send messages to
     */
    remotePort?: number;
    /**
     * The remote address to send messages to
     */
    remoteAddress?: string;
    broadcast?: boolean; // false
    /**
     * The time to live (number of hops) for a multicast connection
     */
    multicastTTL?: number;
    /**
     * An array of multicast addresses to join when listening for multicast messages
     */
    multicastMembership?: string[];
    socket?: any;

    /**
     * should message arguments be wrapped with type?
     */
    metadata?: boolean;
    unpackSingleArgs?: boolean;
  }

  export interface OscSender {
    send(msg: OscMessage, address?: string, port?: number): void;
  }

  export abstract class Port extends EventEmitter<PortEvents> implements OscSender {
    send(msg: OscMessage, address?: string, port?: number): void;
  }

  export class SerialPort extends SLIPPort {
    open(): void;

    close(): void;

    listen(): void;
  }

  export class UDPPort extends Port {
    static setupMulticast(that: UDPPort): void;

    options: UdpOptions;

    constructor(options: UdpOptions);

    open(): void;

    close(): void;

    listen(): void;
  }
}
