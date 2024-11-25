import { Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { ReactElement } from "react";

export interface Preferences {
  readonly searchEngine: string;
  readonly limitResults: number;
}

export class Tab {
  constructor(public readonly title: string, public readonly url: string) {}

  static parse(entry: { url: string; title: string }): Tab {
    return new Tab(entry.title, entry.url);
  }

  urlWithoutScheme(): string {
    return this.url.replace(/(^\w+:|^)\/\//, "").replace("www.", "");
  }

  googleFavicon(): Image.ImageLike {
    return getFavicon(this.url);
  }
}

export interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  lastVisited: Date;
}

export interface SearchResult<T> {
  data?: T[];
  errorView?: ReactElement;
  isLoading: boolean;
}

export interface BookmarkEntry {
  id: number;
  url: number;
  title: number;
  lastModified: Date;
}

export type GroupedEntries = Map<string, HistoryEntry[]>;
