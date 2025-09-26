import { getPreferenceValues } from "@raycast/api";
import { DataGetter } from "./clients/dataGetter";
import { FileParser } from "./clients/fileParser";
import { OSCClient } from "./clients/oscClient";
import { DBSoundSet, DBSoundTile, SoundSetTile, TileCoordinates } from "../types";

const eventKeys = [
  //
  "dbRefreshed",
] as const;
type EventKey = (typeof eventKeys)[number];
type ListenerCallback = (cm: ClientManager) => void;
type Listeners = { [K in EventKey]?: Set<ListenerCallback> };

export class ClientManager {
  dataGetter: DataGetter;
  fileParser: FileParser;
  oscClient: OSCClient;
  _preferencesSnapshot: Preferences;
  _listeners: Listeners;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.dataGetter = new DataGetter();
    this.fileParser = new FileParser(preferences);
    this.oscClient = ClientManager.initializeOscClient(preferences);
    this._preferencesSnapshot = preferences;
    this._listeners = {};
  }

  static initializeOscClient(preferences?: Preferences) {
    preferences ??= getPreferenceValues<Preferences>();
    return OSCClient.initFromPreferences(preferences);
  }

  closeOscClient() {
    this.oscClient.close();
  }

  readaptToPreferences() {
    const oldPrefs = this._preferencesSnapshot;
    const curPrefs = getPreferenceValues<Preferences>();

    if (oldPrefs.farragoDataDir !== curPrefs.farragoDataDir) {
      this.fileParser = new FileParser(curPrefs);
      this._preferencesSnapshot = curPrefs;
    }

    if (oldPrefs.oscHost !== curPrefs.oscHost || oldPrefs.oscPort !== curPrefs.oscPort) {
      this.oscClient.close();
      this.oscClient = OSCClient.initFromPreferences(curPrefs);
    }

    if (!this.fileParser.hasFreshSets()) {
      this.refreshData();
    }
  }

  refreshData() {
    this.dataGetter.emptyDb();
    this.dataGetter.populateDb(this.fileParser.getFreshSetsParsed());
    this._listeners.dbRefreshed?.forEach((cb) => cb(this));
  }

  addEventListener<E extends EventKey>(ev: E, cb: ListenerCallback) {
    this._listeners[ev] ??= new Set();
    this._listeners[ev].add(cb);
  }

  // data actions

  getAllTiles() {
    return [...this.dataGetter.db.tiles.values()];
  }

  // osc actions

  playStopTile(tile: DBSoundTile) {
    this.oscClient.playStopTile(this.getTileBaseOscAddress(tile));
  }

  fadeTile(tile: DBSoundTile) {
    this.oscClient.fadeTile(this.getTileBaseOscAddress(tile));
  }

  toggleTileDuckVolume(tile: DBSoundTile) {
    this.oscClient.send(this.getTileBaseOscAddress(tile) + "/toggleAB", [true]);
  }

  // utils

  getTileCoordinates(tile: DBSoundTile): TileCoordinates {
    const set = this.dataGetter.getSetByUuid(tile.setUuid);

    let tilePosition = { x: 0, y: 0 };
    if (set.mode === 0) {
      // i.e. if it's a grid
      tilePosition = { x: tile.gridPositionX, y: tile.gridPositionY };
    } else {
      // if it 's a list
      tilePosition.y = tile.listPositionY;
    }

    return { setPosition: set.position, tilePosition };
  }

  getTileBaseOscAddress(tile: DBSoundTile) {
    const { setPosition, tilePosition } = this.getTileCoordinates(tile);
    return `/set/${setPosition}/tile/${tilePosition.x}/${tilePosition.y}`;
  }
}
