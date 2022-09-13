import { environment } from "@raycast/api";
import path from "node:path";
import { readFileSync, writeFileSync } from "fs";

export interface SavedSite {
  title: string;
  url: string;
}

export interface SavedSites {
  items: SavedSite[];
}

const SAVED_SITES_FILEPATH = path.join(environment.supportPath, "saved_searches.json");

export function getSavedSites() {
  try {
    const contents = readFileSync(SAVED_SITES_FILEPATH, { encoding: "utf8" });
    return JSON.parse(contents) as SavedSites;
  } catch (_) {
    return { items: [] };
  }
}

export function writeSavedSites(savedSites: SavedSites) {
  return writeFileSync(SAVED_SITES_FILEPATH, JSON.stringify(savedSites));
}

export function getExistingTitles(savedSites: SavedSites) {
  return savedSites.items.map((item) => item.title);
}
