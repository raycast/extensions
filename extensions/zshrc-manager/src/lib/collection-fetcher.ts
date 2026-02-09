/**
 * Collection Fetcher Module
 *
 * Handles fetching alias collections from various sources:
 * - curated: JSON files from the shell-alias-collections repo
 * - omz-plugin: Oh My Zsh plugin files
 * - external: External GitHub repos or URLs
 */

import { parseAliasFile, extractDescription, type ParsedAlias } from "./parse-alias-file";

/**
 * Source configuration for a collection
 */
export interface CollectionSource {
  type: "curated" | "omz-plugin" | "external";
  path?: string | undefined; // For curated
  pluginId?: string | undefined; // For OMZ
  url?: string | undefined; // For external
  parser?: string | undefined; // For external
}

/**
 * Attribution information for a collection
 */
export interface CollectionAttribution {
  inspirations?:
    | Array<{
        name: string;
        url: string;
      }>
    | undefined;
  contributors?: string[] | undefined;
}

/**
 * Collection metadata from manifest
 */
export interface ManifestCollection {
  id: string;
  name: string;
  description: string;
  icon?: string | undefined; // Simple Icons slug for display
  category: string;
  tags?: string[] | undefined;
  aliasCount?: number | undefined;
  source: CollectionSource;
}

/**
 * Full collection with aliases (curated format)
 */
export interface CuratedCollectionData {
  id: string;
  name: string;
  description: string;
  version: string;
  attribution?: CollectionAttribution | undefined;
  aliases: ParsedAlias[];
}

/**
 * Loaded collection ready for use
 */
export interface LoadedCollection {
  id: string;
  name: string;
  description: string;
  icon?: string | undefined; // Simple Icons slug for display
  category: string;
  aliases: ParsedAlias[];
  aliasCount: number;
  loadedAt: number;
  source: CollectionSource;
  attribution?: CollectionAttribution | undefined;
}

/**
 * Manifest structure
 */
export interface Manifest {
  version: string;
  lastUpdated: string;
  iconSynonyms?: Record<string, string>;
  collections: ManifestCollection[];
  categories: Array<{ id: string; order: number }>;
  sources: Record<
    string,
    {
      name: string;
      url: string;
      license?: string;
      author?: string;
      type?: string;
    }
  >;
}

/**
 * Base URL for the collections repository
 */
const REPO_BASE_URL = "https://raw.githubusercontent.com/TurboCoder13/shell-alias-collections/v1.4.0";

/**
 * Fetch a curated collection from the repository
 */
async function fetchCuratedCollection(path: string): Promise<CuratedCollectionData> {
  const url = `${REPO_BASE_URL}/${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch curated collection: ${response.status}`);
  }

  const data = (await response.json()) as CuratedCollectionData;
  return data;
}

/**
 * Fetch an Oh My Zsh plugin and parse its aliases
 */
async function fetchOMZPlugin(pluginId: string): Promise<{ aliases: ParsedAlias[]; description: string }> {
  const url = `https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/plugins/${pluginId}/${pluginId}.plugin.zsh`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch OMZ plugin ${pluginId}: ${response.status}`);
  }

  const content = await response.text();
  const aliases = parseAliasFile(content);
  const description = extractDescription(content) || `${pluginId} aliases from Oh My Zsh`;

  return { aliases, description };
}

/**
 * Fetch from an external source and parse
 */
async function fetchExternalSource(
  url: string,
  parser: string = "bash",
): Promise<{ aliases: ParsedAlias[]; description: string }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch external source: ${response.status}`);
  }

  const content = await response.text();

  // Parse based on parser type
  let aliases: ParsedAlias[];
  if (parser === "bash" || parser === "zsh") {
    aliases = parseAliasFile(content);
  } else {
    // Default to standard parsing
    aliases = parseAliasFile(content);
  }

  const description = extractDescription(content) || "External alias collection";

  return { aliases, description };
}

/**
 * Fetch a collection based on its metadata
 */
export async function fetchCollection(metadata: ManifestCollection): Promise<LoadedCollection> {
  const { source } = metadata;

  switch (source.type) {
    case "curated": {
      if (!source.path) {
        throw new Error(`Curated collection ${metadata.id} missing path`);
      }
      const curatedData = await fetchCuratedCollection(source.path);
      return {
        id: metadata.id,
        name: curatedData.name || metadata.name,
        description: curatedData.description || metadata.description,
        icon: metadata.icon,
        category: metadata.category,
        aliases: curatedData.aliases,
        aliasCount: curatedData.aliases.length,
        loadedAt: Date.now(),
        source,
        attribution: curatedData.attribution,
      };
    }

    case "omz-plugin": {
      if (!source.pluginId) {
        throw new Error(`OMZ plugin collection ${metadata.id} missing pluginId`);
      }
      const { aliases, description } = await fetchOMZPlugin(source.pluginId);
      return {
        id: metadata.id,
        name: metadata.name,
        description: description || metadata.description,
        icon: metadata.icon,
        category: metadata.category,
        aliases,
        aliasCount: aliases.length,
        loadedAt: Date.now(),
        source,
        attribution: {
          inspirations: [
            {
              name: "Oh My Zsh",
              url: `https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/${source.pluginId}`,
            },
          ],
        },
      };
    }

    case "external": {
      if (!source.url) {
        throw new Error(`External collection ${metadata.id} missing url`);
      }
      const { aliases, description } = await fetchExternalSource(source.url, source.parser);
      return {
        id: metadata.id,
        name: metadata.name,
        description: description || metadata.description,
        icon: metadata.icon,
        category: metadata.category,
        aliases,
        aliasCount: aliases.length,
        loadedAt: Date.now(),
        source,
      };
    }

    default:
      throw new Error(`Unknown source type: ${(source as CollectionSource).type}`);
  }
}

/**
 * Fetch the manifest from the repository
 */
export async function fetchManifest(): Promise<Manifest> {
  const url = `${REPO_BASE_URL}/manifest.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: ${response.status}`);
  }

  return (await response.json()) as Manifest;
}

/**
 * Get source attribution text for display
 */
export function getSourceAttribution(collection: LoadedCollection): string {
  const { source, attribution } = collection;

  switch (source.type) {
    case "curated":
      if (attribution?.inspirations?.length) {
        const sources = attribution.inspirations.map((i) => i.name).join(", ");
        return `Curated collection (inspired by ${sources})`;
      }
      return "Curated collection";

    case "omz-plugin":
      return `From Oh My Zsh ${source.pluginId} plugin`;

    case "external":
      return "External source";

    default:
      return "Unknown source";
  }
}

/**
 * Get source URL for attribution link
 */
export function getSourceUrl(collection: LoadedCollection): string | undefined {
  const { source, attribution } = collection;

  switch (source.type) {
    case "curated":
      return attribution?.inspirations?.[0]?.url;

    case "omz-plugin":
      return `https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/${source.pluginId}`;

    case "external":
      return source.url;

    default:
      return undefined;
  }
}
