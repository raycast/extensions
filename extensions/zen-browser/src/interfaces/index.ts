import { ReactElement } from "react";

export interface Preferences {
  readonly searchEngine: string;
  readonly limitResults: number;
}

export interface Shortcut {
  id: string;
  key: string;
  modifiers: ("control" | "alt" | "shift" | "option" | "command")[];
}

export interface Tab {
  title: string;
  url: string;
}

export interface WorkspaceEntry {
  uuid: string;
  name: string;
  icon: string;
  position: number;
  is_default: boolean;
  shortcut?: Shortcut;
}

export interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  lastVisited: Date;
}

export interface BookmarkEntry {
  id: number;
  url: number;
  title: number;
  lastModified: Date;
}

export interface SearchResult<T> {
  data?: T[];
  errorView?: ReactElement;
  isLoading: boolean;
}

export interface ShortcutModel {
  id: string;
  key: string;
  group: string;
  modifiers: {
    control: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
    accel: boolean;
  };
}

export interface WorkspaceModel {
  uuid: string;
  name: string;
  icon: string;
  position: number;
  is_default: boolean;
}

export type GroupedEntries = Map<string, HistoryEntry[]>;
