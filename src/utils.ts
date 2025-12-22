import { Application, Icon, showToast, Toast, open } from "@raycast/api"
import { FolderItem, Folder } from "./types"
import { getCachedFavicon, extractDomain, isValidFaviconPath } from "./favicon"
import { isCssColorName, cssColorToHex } from "./css-colors"

// =============================================================================
// Toast Helpers - Centralized toast utilities for consistent UX
// =============================================================================

/** Show a success toast */
export const toastSuccess = (title: string, message?: string) =>
  showToast({ style: Toast.Style.Success, title, message })

/** Show a failure toast */
export const toastFailure = (title: string, message?: string) =>
  showToast({ style: Toast.Style.Failure, title, message })

/** Show an animated (loading) toast */
export const toastLoading = (title: string, message?: string) =>
  showToast({ style: Toast.Style.Animated, title, message })

// Types
export type SortMethod = "alphabetical" | "length" | "recent" | "none"
export type SortDirection = "asc" | "desc"
export interface SortConfig {
  method: SortMethod
  direction: SortDirection
}

// Sort preference parsing cache
const sortConfigCache = new Map<string, SortConfig>()

/**
 * Parse a preference value into sort method and direction (cached)
 */
export function parseSortPreference(value: string): SortConfig {
  const cached = sortConfigCache.get(value)
  if (cached) return cached

  let config: SortConfig
  if (value === "none") {
    config = { method: "none", direction: "asc" }
  } else {
    const [method, direction] = value.split("-")
    if (["alphabetical", "length", "recent"].includes(method) && ["asc", "desc"].includes(direction)) {
      config = { method: method as SortMethod, direction: direction as SortDirection }
    } else {
      config = { method: value as SortMethod, direction: "asc" }
    }
  }

  sortConfigCache.set(value, config)
  return config
}

/**
 * Get display name for a folder item
 * For nested folders, looks up the actual folder name from allFolders
 */
export function getItemDisplayName(item: FolderItem, applications?: Application[], allFolders?: Folder[]): string {
  if (item.type === "folder") {
    // Look up the actual folder name if allFolders is provided
    if (allFolders && item.folderId) {
      const folder = allFolders.find((f) => f.id === item.folderId)
      if (folder) return folder.name
    }
    return item.name
  }
  if (item.type === "website") return item.name
  if (!applications || !item.path) return item.name
  return findApplicationByItemPath(item.path, applications)?.name || item.name
}

/**
 * Find application by item path using multiple matching strategies
 */
export function findApplicationByItemPath(itemPath: string, applications: Application[]): Application | undefined {
  if (!itemPath) return undefined

  // Try exact match first (most common)
  let app = applications.find((a) => a.path === itemPath)
  if (app) return app

  // Normalized path (handle trailing slashes)
  const normalizedPath = itemPath.replace(/\/$/, "")
  app = applications.find((a) => a.path?.replace(/\/$/, "") === normalizedPath)
  if (app) return app

  // Name or bundleId match
  app = applications.find((a) => a.name === itemPath || a.bundleId === itemPath)
  if (app) return app

  // Case-insensitive path match (last resort)
  const lowerPath = itemPath.toLowerCase()
  return applications.find((a) => a.path?.toLowerCase() === lowerPath)
}

// Icon type that includes tinted icons and source URLs
export type FolderIconType = Icon | { source: Icon; tintColor: string } | { fileIcon: string } | { source: string }

/**
 * Get icon for a folder item
 */
export function getItemIcon(item: FolderItem, applications: Application[], folders?: Folder[]): FolderIconType {
  if (item.type === "folder") {
    // Look up the actual folder to get its custom icon and color
    if (folders && item.folderId) {
      const folder = folders.find((f) => f.id === item.folderId)
      if (folder) {
        return getFolderIcon(folder.icon, folder.color)
      }
    }
    return Icon.Folder
  }

  if (item.type === "website") {
    // Try to use stored icon path if it's still valid
    if (item.icon && isValidFaviconPath(item.icon)) {
      return { source: item.icon }
    }
    // Try cached favicon by URL
    if (item.url) {
      const cachedPath = getCachedFavicon(item.url)
      if (cachedPath) {
        return { source: cachedPath }
      }
    }
    // Fall back to Globe icon (more reliable than Google's placeholder images)
    return Icon.Globe
  }

  if (item.path) {
    const app = findApplicationByItemPath(item.path, applications)
    if (app?.path) return { fileIcon: app.path }
    return { fileIcon: item.path }
  }

  return Icon.AppWindow
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Create a FolderItem from an application path
 */
export function createApplicationItem(appPath: string, applications: Application[]): FolderItem {
  const app = applications.find((a) => a.path === appPath || a.name === appPath)
  return {
    id: generateId(),
    name: app?.name || appPath,
    type: "application",
    path: appPath,
  }
}

/**
 * Create a FolderItem from a folder reference
 */
export function createNestedFolderItem(folderId: string, folders: Folder[]): FolderItem {
  const folder = folders.find((f) => f.id === folderId)
  return {
    id: generateId(),
    name: folder?.name || folderId,
    type: "folder",
    folderId,
  }
}

/**
 * Create a FolderItem from a website URL
 */
export function createWebsiteItem(url: string, name?: string, iconPath?: string): FolderItem {
  const displayName = name || extractDomain(url)
  return {
    id: generateId(),
    name: displayName,
    type: "website",
    url,
    icon: iconPath,
  }
}

/**
 * Compare function for sorting
 */
function compare<T>(
  a: T,
  b: T,
  config: SortConfig,
  getName: (item: T) => string,
  getTime?: (item: T) => number
): number {
  if (config.method === "none") return 0

  let result: number
  switch (config.method) {
    case "alphabetical":
      result = getName(a).localeCompare(getName(b))
      break
    case "length":
      result = getName(a).length - getName(b).length
      break
    case "recent":
      result = (getTime?.(b) ?? 0) - (getTime?.(a) ?? 0)
      break
    default:
      return 0
  }

  return config.direction === "desc" ? -result : result
}

/**
 * Multi-level sorting for folders
 */
export function sortFolders(folders: Folder[], primary: string, secondary: string, tertiary: string): Folder[] {
  const configs = [primary, secondary, tertiary].map(parseSortPreference)

  if (configs.every((c) => c.method === "none")) return [...folders]

  const getName = (f: Folder) => f.name
  const getTime = (f: Folder) => f.lastUsed ?? 0

  return [...folders].sort((a, b) => {
    for (const config of configs) {
      const result = compare(a, b, config, getName, getTime)
      if (result !== 0) return result
    }
    return 0
  })
}

/**
 * Multi-level sorting for folder items
 */
export function sortFolderItems(
  items: FolderItem[],
  primary: string,
  secondary: string,
  tertiary: string,
  applications?: Application[]
): FolderItem[] {
  const configs = [primary, secondary, tertiary].map(parseSortPreference)

  if (configs.every((c) => c.method === "none")) return [...items]

  const getName = (i: FolderItem) => (applications ? getItemDisplayName(i, applications) : i.name)
  const getTime = (i: FolderItem) => i.lastUsed ?? 0

  return [...items].sort((a, b) => {
    for (const config of configs) {
      const result = compare(a, b, config, getName, getTime)
      if (result !== 0) return result
    }
    return 0
  })
}

/**
 * Generate keywords for folder searchability
 */
export function generateFolderKeywords(folderName: string): string[] {
  const lower = folderName.toLowerCase()
  const words = lower.split(/\s+/).filter(Boolean)
  const prefixes = words.map((w) => w.slice(0, 3)).filter((w) => w.length >= 3)
  return [lower, ...words, "folder", "folders", ...prefixes]
}

// Lazy-loaded icon options cache
let iconOptionsCache: Array<{ value: string; title: string; icon: Icon }> | null = null

/**
 * Get icon options for folder customization (lazy-loaded and cached)
 */
export function getFolderIconOptions(): Array<{ value: string; title: string; icon: Icon }> {
  if (iconOptionsCache) return iconOptionsCache

  const iconNames = Object.keys(Icon) as Array<keyof typeof Icon>

  iconOptionsCache = iconNames
    .filter((name) => typeof Icon[name] === "string")
    .sort()
    .map((name) => ({
      value: name,
      title: name.replace(/([A-Z])/g, " $1").trim(),
      icon: Icon[name] as Icon,
    }))

  return iconOptionsCache
}

/**
 * Get Icon from icon name string with optional color
 * Returns Icon directly if no color, or Image object with tintColor if color is provided
 */
export function getFolderIcon(iconName?: string, color?: string): Icon | { source: Icon; tintColor: string } {
  const icon = iconName ? (Icon as Record<string, Icon>)[iconName] || Icon.Folder : Icon.Folder

  if (color && isValidHexColor(color)) {
    return { source: icon, tintColor: color }
  }

  return icon
}

/**
 * Get plain Icon from icon name (without color tinting)
 * Useful for APIs that only accept Icon type (e.g., Quicklink.icon)
 */
export function getFolderIconPlain(iconName?: string): Icon {
  return iconName ? (Icon as Record<string, Icon>)[iconName] || Icon.Folder : Icon.Folder
}

/**
 * Validate color format (hex with or without #, or CSS color name)
 */
export function isValidHexColor(color: string): boolean {
  if (!color) return false
  // Check for CSS color name first
  if (isCssColorName(color)) return true
  // Check for hex format
  return /^#?([0-9A-Fa-f]{3}){1,2}$/.test(color)
}

/**
 * Normalize color to full 6-digit hex format with # prefix
 * Accepts: hex (with/without #), shorthand hex (#CCC), CSS color names
 * Examples: "red" → "#FF0000", "CCC" → "#CCCCCC", "#ABC" → "#AABBCC"
 */
export function normalizeHexColor(color: string): string {
  if (!color) return color

  // Check for CSS color name first
  const cssHex = cssColorToHex(color)
  if (cssHex) return cssHex

  // Add # prefix if missing
  let hex = color.startsWith("#") ? color : `#${color}`

  // Expand shorthand hex (#RGB → #RRGGBB)
  if (hex.length === 4) {
    const r = hex[1]
    const g = hex[2]
    const b = hex[3]
    hex = `#${r}${r}${g}${g}${b}${b}`
  }

  // Uppercase for consistency
  return hex.toUpperCase()
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`
}

/**
 * Get a unique key for a folder item (for deduplication)
 * Returns undefined for items without identifying properties
 */
export function getItemKey(item: FolderItem): string | undefined {
  if (item.type === "website" && item.url) return `website:${item.url}`
  if (item.type === "application" && item.path) return `app:${item.path}`
  if (item.type === "folder" && item.folderId) return `folder:${item.folderId}`
  return undefined
}

/**
 * Open multiple items in bulk with toast feedback
 * Generic function that works for both apps and websites
 */
async function openItemsInBulk<T>(
  items: T[],
  getPath: (item: T) => string | undefined,
  options: {
    emptyTitle: string
    emptyMessage: string
    successTitle: string
    failureTitle: string
    itemLabel: string
  }
): Promise<void> {
  if (items.length === 0) {
    await toastFailure(options.emptyTitle, options.emptyMessage)
    return
  }

  let success = 0
  let failed = 0

  for (const item of items) {
    const path = getPath(item)
    if (!path) continue
    try {
      await open(path)
      success++
    } catch {
      failed++
    }
  }

  if (failed === 0) {
    await toastSuccess(options.successTitle, `Opened ${success} ${pluralize(success, options.itemLabel)}`)
  } else {
    const title = failed === items.length ? options.failureTitle : `Some ${options.itemLabel}s failed`
    await toastFailure(title, `Opened ${success}, failed ${failed}`)
  }
}

/**
 * Open all applications from a list of folder items
 */
export async function openAllApplications(
  items: FolderItem[],
  folderName: string,
  applications: Application[]
): Promise<void> {
  const appItems = items.filter((item) => item.type === "application" && item.path)

  await openItemsInBulk(
    appItems,
    (item) => {
      if (!item.path) return undefined
      const app = findApplicationByItemPath(item.path, applications)
      return app?.path || item.path
    },
    {
      emptyTitle: "No applications found",
      emptyMessage: `"${folderName}" has no applications`,
      successTitle: "All applications opened",
      failureTitle: "Failed to open applications",
      itemLabel: "app",
    }
  )
}

/**
 * Open all websites from a list of folder items
 */
export async function openAllWebsites(items: FolderItem[], folderName: string): Promise<void> {
  const websiteItems = items.filter((item) => item.type === "website" && item.url)

  await openItemsInBulk(websiteItems, (item) => item.url, {
    emptyTitle: "No websites found",
    emptyMessage: `"${folderName}" has no websites`,
    successTitle: "All websites opened",
    failureTitle: "Failed to open websites",
    itemLabel: "website",
  })
}

/**
 * Find duplicate items in a list
 * Returns info about duplicates (count) and optionally the unique items
 */
export function findDuplicateItems(items: FolderItem[]): {
  hasDuplicates: boolean
  duplicateCount: number
  uniqueItems: FolderItem[]
} {
  const seen = new Set<string>()
  const uniqueItems: FolderItem[] = []
  let duplicateCount = 0

  for (const item of items) {
    const key = getItemKey(item)
    if (key) {
      if (seen.has(key)) {
        duplicateCount++
      } else {
        seen.add(key)
        uniqueItems.push(item)
      }
    } else {
      // Keep items without a key (shouldn't happen, but just in case)
      uniqueItems.push(item)
    }
  }

  return {
    hasDuplicates: duplicateCount > 0,
    duplicateCount,
    uniqueItems,
  }
}

/**
 * Collected URL entry with source folder info for nested display
 */
export interface CollectedUrl {
  url: string
  folderName?: string
  depth: number
}

/**
 * Recursively collect URLs from a folder and its nested folders
 * Uses Map for O(1) folder lookups instead of O(n) find() calls
 * @param folder The folder to collect URLs from
 * @param allFolders All folders (for resolving nested folder references)
 * @param depth Current nesting depth (0 = root)
 * @param visited Set of visited folder IDs (prevents infinite loops)
 * @param folderMap Optional pre-built Map for performance (built on first call)
 */
export function collectFolderUrls(
  folder: Folder,
  allFolders: Folder[],
  depth = 0,
  visited = new Set<string>(),
  folderMap?: Map<string, Folder>
): CollectedUrl[] {
  // Prevent infinite loops from circular references
  if (visited.has(folder.id)) return []
  visited.add(folder.id)

  // Build map once on first call for O(1) lookups in recursion
  const map = folderMap ?? new Map(allFolders.map((f) => [f.id, f]))

  const urls: CollectedUrl[] = []

  // Collect websites from this folder
  for (const item of folder.items) {
    if (item.type === "website" && item.url) {
      urls.push({
        url: item.url,
        folderName: depth > 0 ? folder.name : undefined,
        depth,
      })
    }
  }

  // Recursively collect from nested folders
  for (const item of folder.items) {
    if (item.type === "folder" && item.folderId) {
      const nestedFolder = map.get(item.folderId)
      if (nestedFolder) {
        urls.push(...collectFolderUrls(nestedFolder, allFolders, depth + 1, visited, map))
      }
    }
  }

  return urls
}

/**
 * Format collected URLs as markdown with bullet points
 * Nested folder URLs are indented with additional bullet points
 * @param urls Collected URLs with depth info
 * @param rootFolderName Optional name of the root folder (shown only if there are nested URLs)
 */
export function formatUrlsAsMarkdown(urls: CollectedUrl[], rootFolderName?: string): string {
  if (urls.length === 0) return ""

  // Check if there are any nested folder URLs
  const hasNestedUrls = urls.some((u) => u.depth > 0)

  // Group URLs by depth and folder
  const lines: string[] = []
  let currentFolder: string | undefined

  // Add root folder header if we have nested URLs and a root folder name
  if (hasNestedUrls && rootFolderName) {
    lines.push(`- **${rootFolderName}**`)
  }

  for (const { url, folderName, depth } of urls) {
    // Calculate actual depth (add 1 if we're showing root folder header)
    const actualDepth = hasNestedUrls && rootFolderName ? depth + 1 : depth

    // Add folder header when entering a new nested folder
    if (depth > 0 && folderName && folderName !== currentFolder) {
      const indent = "  ".repeat(actualDepth - 1)
      lines.push(`${indent}- **${folderName}**`)
      currentFolder = folderName
    }

    // Add URL with appropriate indentation
    const indent = "  ".repeat(actualDepth)
    lines.push(`${indent}- ${url}`)
  }

  return lines.join("\n")
}

/**
 * Format collected URLs as a plain list (one URL per line, sorted by length)
 */
export function formatUrlsAsList(urls: CollectedUrl[]): string {
  if (urls.length === 0) return ""

  return urls
    .map((u) => u.url)
    .sort((a, b) => a.length - b.length)
    .join("\n")
}

/**
 * Count total URLs in collected results
 */
export function countUrls(urls: CollectedUrl[]): number {
  return urls.length
}
