import osc from "osc";

type OscMessageHandler = (msg: osc.OscMessage, cl: OSCClient) => void;

export class OSCClient {
  _port: osc.UDPPort;
  _messageHandlers: Map<RegExp["source"], [RegExp, Set<OscMessageHandler>]>;
  _messagehandlersRegexMap: Map<OscMessageHandler, Set<RegExp["source"]>>;
  _options: { remoteAddress: string; remotePort: number };

  constructor(options: { remoteAddress: string; remotePort: number }) {
    this._messageHandlers = new Map();
    this._messagehandlersRegexMap = new Map();
    this._options = options;
    this._port = this._createOpenedPort();
  }

  static initFromPreferences(preferences: Preferences) {
    return new OSCClient({
      remoteAddress: preferences.oscHost,
      remotePort: +preferences.oscPort,
    });
  }

  _createOpenedPort() {
    const options = this._options;

    const port = new osc.UDPPort({
      localAddress: "127.0.0.1",
      localPort: 8091,
      remoteAddress: options.remoteAddress,
      remotePort: options.remotePort,
    });

    port.on("ready", () => {
      console.log("OSC Client is ready");
    });

    // Handle incoming messages
    port.on("message", (message) => {
      // console.log("Received OSC message:", message);
      for (const [rgx, handlers] of this._messageHandlers.values()) {
        if (rgx.exec(message.address)) {
          handlers.forEach((handler) => handler(message, this));
        }
      }
    });

    port.open();

    return port;
  }

  open() {
    this._port.open();
  }

  close() {
    this._port.close();
  }

  send(address: string, args: any[] = [], errorCount = 0) {
    const message = { address, args };

    try {
      this._port.send(message);
      console.log("OSC message sent:", message);
    } catch (error: any) {
      if (error.code === "ERR_SOCKET_DGRAM_NOT_RUNNING") {
        if (errorCount < 1) {
          this._port = this._createOpenedPort();
          this.send(address, args, errorCount + 1);
        } else {
          throw error;
        }
      }
    }
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

  playStopTile(tileBaseAddress: string) {
    this.send(`${tileBaseAddress}/play`, [true]);
  }

  fadeTile(tileBaseAddress: string) {
    this.send(`${tileBaseAddress}/fadeOut`, [true]);
  }

  stopAll() {
    this.send("/transport/stopAll", [true]);
  }

  fadeAll() {
    this.send("/master/fadeAll", [true]);
  }
}
