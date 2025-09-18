import { DBSoundSet, DBSoundTile, SoundSet, SoundSetTile } from "../../types";

export class DataGetter {
  db: {
    sets: Map<SoundSet["uuid"], DBSoundSet>;
    tiles: Map<SoundSetTile["tileUUID"], DBSoundTile>;
  };

  constructor() {
    this.db = { sets: new Map(), tiles: new Map() };
  }

  emptyDb() {
    this.db = { sets: new Map(), tiles: new Map() };
  }

  populateDb(soundSets: SoundSet[]) {
    for (const set of soundSets) {
      const dbSet: DBSoundSet = { ...set, tiles: [] };
      for (let i = 0; i < set.tiles.length; i++) {
        const tile = { ...set.tiles[i], setUuid: dbSet.uuid };
        this.db.tiles.set(tile.tileUUID, tile);
        dbSet.tiles[i] = tile.tileUUID;
      }
      this.db.sets.set(dbSet.uuid, dbSet);
    }
  }

  // data operations

  getTileByUuid(tileUuid: string) {
    const tile = this.db.tiles.get(tileUuid);
    if (!tile) {
      throw new Error(`Tile not found for UUID ${tileUuid}`);
    }
    return tile;
  }

  getSetByUuid(setUuid: string) {
    const set = this.db.sets.get(setUuid);
    if (!set) {
      throw new Error(`Set not found for UUID ${setUuid}`);
    }
    return set;
  }
}
