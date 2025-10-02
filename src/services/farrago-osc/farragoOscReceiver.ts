import { DBSoundTile } from "../../types";
import { OscReceiver } from "../osc/oscReceiver";
import { Endpoint, TileAction } from "./types";
import { getTileBaseAddress } from "./utils";

export class FarragoOscReceiver extends OscReceiver {
  subscribeToTileAction<T>(opts: { tile: DBSoundTile; action: TileAction; handler: (...values: T[]) => void }) {
    const { tile, action, handler } = opts;

    const _handler = this.addMessageHandler(makeStrictRegExp(`${getTileBaseAddress(tile)}/${action}`), (msg) => {
      const values = msg.args.map((arg) => arg.value) as T[];
      handler(...values);
    });

    return () => {
      this.removeMessageHandler(_handler);
    };
  }

  subscribeToPing<T>(handler: (...values: T[]) => void) {
    const _handler = this.addMessageHandler(/.*/, (msg) => {
      const values = msg.args.map((arg) => arg.value) as T[];
      handler(...values);
    });

    return () => {
      this.removeMessageHandler(_handler);
    };
  }
}

function makeStrictRegExp(endpoint: Endpoint) {
  return new RegExp(`^${endpoint}$`);
}
