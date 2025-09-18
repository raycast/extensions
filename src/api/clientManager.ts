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
  _dataGetter: DataGetter;
  _fileParser: FileParser;
  _oscClient: OSCClient;
  _preferencesSnapshot: Preferences;
  _listeners: Listeners;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this._dataGetter = new DataGetter();
    this._fileParser = new FileParser(preferences);
    this._oscClient = OSCClient.initFromPreferences(preferences);
    this._preferencesSnapshot = preferences;
    this._listeners = {};
  }

  closeOscClient() {
    this._oscClient._close();
  }

  readaptToPreferences() {
    const oldPrefs = this._preferencesSnapshot;
    const curPrefs = getPreferenceValues<Preferences>();

    if (oldPrefs.farragoDataDir !== curPrefs.farragoDataDir) {
      this._fileParser = new FileParser(curPrefs);
      this._preferencesSnapshot = curPrefs;
    }

    if (oldPrefs.oscHost !== curPrefs.oscHost || oldPrefs.oscPort !== curPrefs.oscPort) {
      this._oscClient._close();
      this._oscClient = OSCClient.initFromPreferences(curPrefs);
    }

    if (!this._fileParser.hasFreshSets()) {
      this.refreshData();
    }
  }

  refreshData() {
    this._dataGetter.emptyDb();
    this._dataGetter.populateDb(this._fileParser.getFreshSetsParsed());
    this._listeners.dbRefreshed?.forEach((cb) => cb(this));
  }

  addEventListener<E extends EventKey>(ev: E, cb: ListenerCallback) {
    this._listeners[ev] ??= new Set();
    this._listeners[ev].add(cb);
  }

  // data actions

  getAllTiles() {
    return [...this._dataGetter.db.tiles.values()];
  }

  // osc actions

  playTile(tile: DBSoundTile) {
    // todo: check if tile is already playing
    this._oscClient.togglePlayTile(this.getTileCoordinates(tile));
  }

  playTileByUuid(tileUuid: string) {
    const tile = this._dataGetter.getTileByUuid(tileUuid);
    this._oscClient.togglePlayTile(this.getTileCoordinates(tile));
  }

  fadeAll() {
    this._oscClient.fadeAll();
  }

  // utils

  getTileCoordinates(tile: DBSoundTile): TileCoordinates {
    const set = this._dataGetter.getSetByUuid(tile.setUuid);

    return { setPosition: set.position, tilePosition: { x: tile.gridPositionX, y: tile.gridPositionY } };
  }
}
