import osc from "osc";
import { TileCoordinates } from "../../types";

type OscMessageHandler = (msg: osc.OscMessage, cl: OSCClient) => void;

export class OSCClient {
  _port: osc.UDPPort;
  _messageHandlers: Map<RegExp["source"], [RegExp, Set<OscMessageHandler>]>;
  _messagehandlersRegexMap: Map<OscMessageHandler, Set<RegExp["source"]>>;

  constructor(options: { remoteAddress: string; remotePort: number }) {
    this._port = new osc.UDPPort({
      localAddress: "127.0.0.1",
      localPort: 8091,
      remoteAddress: options.remoteAddress,
      remotePort: options.remotePort,
    });

    this._messageHandlers = new Map();
    this._messagehandlersRegexMap = new Map();

    this._port.on("ready", () => {
      console.log("OSC Client is ready");
    });

    // Handle incoming messages
    this._port.on("message", (message) => {
      // console.log("Received OSC message:", message);
      for (const [rgx, handlers] of this._messageHandlers.values()) {
        if (rgx.exec(message.address)) {
          handlers.forEach((handler) => handler(message, this));
        }
      }
    });

    this._port.open();
  }

  static initFromPreferences(preferences: Preferences) {
    return new OSCClient({
      remoteAddress: preferences.oscHost,
      remotePort: +preferences.oscPort,
    });
  }

  _open() {
    this._port.open();
  }

  close() {
    this._port.close();
  }

  _send(address: string, args: any[] = []) {
    const message = { address, args };
    this._port.send(message);
    console.log("OSC message sent:", message);
  }

  addMessageHandler(rgx: RegExp, handler: OscMessageHandler) {
    if (!this._messageHandlers.has(rgx.source)) {
      this._messageHandlers.set(rgx.source, [rgx, new Set()]);
    }
    const [, handlersSet] = this._messageHandlers.get(rgx.source)!;
    handlersSet.add(handler);

    if (!this._messagehandlersRegexMap.has(handler)) {
      this._messagehandlersRegexMap.set(handler, new Set());
    }
    this._messagehandlersRegexMap.get(handler)!.add(rgx.source);

    return handler;
  }

  removeMessageHandler(handler: OscMessageHandler) {
    const rgxSources = this._messagehandlersRegexMap.get(handler);
    if (!rgxSources) return;

    const emptySourceKeys: string[] = [];
    rgxSources.forEach((source) => {
      const [, handlers] = this._messageHandlers?.get(source) ?? [];
      if (!handlers) return;
      handlers.delete(handler);
      if (!handlers.size) emptySourceKeys.push(source);
    });

    this._messagehandlersRegexMap.delete(handler);
    emptySourceKeys.forEach((source) => this._messageHandlers.delete(source));
  }

  // farrago operations

  togglePlayTile(options: TileCoordinates) {
    this._open();
    const { setPosition, tilePosition } = options;
    const address = `/set/${setPosition}/tile/${tilePosition.x}/${tilePosition.y}/play`;
    this._send(address, [true]);
  }

  fadeAll() {
    this._send("/master/fadeAll", [true]);
  }
}
