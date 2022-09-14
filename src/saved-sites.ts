import { environment } from "@raycast/api";
import path from "node:path";
import { readFileSync, writeFileSync } from "fs";

export const SEARCH_TEMPLATE = "{}";

export interface SavedSite {
  title: string;
  url: string;
}

export interface SavedSites {
  items: SavedSite[];
  defaultSiteTitle?: string;
}

export type SavedSitesState = [SavedSites, (_: SavedSites) => void];

const SAVED_SITES_FILEPATH = path.join(environment.supportPath, "saved_searches.json");

export function getSavedSites() {
  try {
    const contents = readFileSync(SAVED_SITES_FILEPATH, { encoding: "utf8" });
    return JSON.parse(contents) as SavedSites;
  } catch (_) {
    return { items: [] };
  }
}

function writeSavedSitesToDisk(savedSites: SavedSites) {
  return writeFileSync(SAVED_SITES_FILEPATH, JSON.stringify(savedSites));
}

export function persistSavedSites(savedSitesState: SavedSitesState) {
  const [savedSites, setSavedSites] = savedSitesState;
  setSavedSites({ ...savedSites });
  writeSavedSitesToDisk(savedSites);
}

export function getExistingTitlesAndUrls(savedSites: SavedSites) {
  const titles = [] as string[];
  const urls = [] as string[];
  for (const { title, url } of savedSites.items) {
    titles.push(title);
    urls.push(url);
  }
  return { titles, urls };
}
