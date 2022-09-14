import { environment } from "@raycast/api";
import path from "node:path";
import { readFileSync, writeFileSync } from "fs";
import React from "react";
import { strCmp, strEq } from "./utils";

export const SEARCH_TEMPLATE = "{}";

export interface SavedSite {
  title: string;
  url: string;
}

export type FormData = SavedSite & { isDefault: boolean };

export interface SavedSites {
  items: SavedSite[];
  defaultSiteTitle?: string;
}

export interface SavedSitesState {
  savedSites: SavedSites;
  setSavedSites: (_: SavedSites) => void;
}

// export type SavedSitesState = [SavedSites, (_: SavedSites) => void];

const SAVED_SITES_FILEPATH = path.join(environment.supportPath, "saved_searches.json");

export function getSavedSitesFromDisk() {
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

export function getExistingTitlesAndUrls(savedSites: SavedSites) {
  const titles = [] as string[];
  const urls = [] as string[];
  for (const { title, url } of savedSites.items) {
    titles.push(title);
    urls.push(url);
  }
  return { titles, urls };
}

export type SavedSitesDispatch = React.Dispatch<SavedSitesAction>;

export type SavedSitesEditingKind = { type: "edit"; index: number } | { type: "add" };
export type SavedSitesAction =
  | (({ type: "edit"; index: number } | { type: "add" }) & {
      newTitle: string;
      newUrl: string;
      newIsDefault: boolean;
    })
  | { type: "delete"; index: number }
  | { type: "noop" };

function sortItemsInPlace(items: SavedSite[]) {
  items.sort(({ title: title1 }, { title: title2 }) => strCmp(title1, title2));
}

function editSavedSiteAtIndex(savedSites: SavedSites, index: number, { title, url, isDefault }: FormData): SavedSites {
  const defaultSiteTitle = isDefault ? title : savedSites.defaultSiteTitle;

  const newItems = savedSites.items.map((item, i) => (i === index ? { title, url } : item));
  sortItemsInPlace(newItems);

  return { items: newItems, defaultSiteTitle };
}

function addSavedSite(savedSites: SavedSites, { title, url, isDefault }: FormData): SavedSites {
  const defaultSiteTitle = isDefault ? title : savedSites.defaultSiteTitle;

  const newItems = [...savedSites.items, { title, url }];
  sortItemsInPlace(newItems);

  return { items: newItems, defaultSiteTitle };
}

function deleteSavedSiteAtIndex(savedSites: SavedSites, index: number): SavedSites {
  const deletedItem = savedSites.items[index];
  const defaultSiteTitle = strEq(deletedItem.title, savedSites.defaultSiteTitle ?? "")
    ? undefined
    : savedSites.defaultSiteTitle;
  return { items: savedSites.items.filter((_, i) => i !== index), defaultSiteTitle };
}

function savedSitesReducer(savedSites: SavedSites, action: SavedSitesAction) {
  switch (action.type) {
    case "add": {
      const { newTitle: title, newUrl: url, newIsDefault: isDefault } = action;
      savedSites = addSavedSite(savedSites, { title, url, isDefault });
      break;
    }
    case "delete": {
      const { index } = action;
      savedSites = deleteSavedSiteAtIndex(savedSites, index);
      break;
    }
    case "edit": {
      const { newTitle: title, newUrl: url, newIsDefault: isDefault, index } = action;
      savedSites = editSavedSiteAtIndex(savedSites, index, { title, url, isDefault });
      break;
    }
    case "noop": {
      break;
    }
  }

  savedSites = { ...savedSites };

  return savedSites;
}

export function updateSavedSites(
  { savedSites: oldSavedSites, setSavedSites }: SavedSitesState,
  action: SavedSitesAction
) {
  const savedSites = savedSitesReducer(oldSavedSites, action);
  writeSavedSitesToDisk(savedSites);
  setSavedSites(savedSites);
  return savedSites;
}
