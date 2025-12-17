export interface FolderItem {
  id: string
  name: string
  type: "application" | "folder" | "website"
  path?: string // For applications: app path or bundle ID
  folderId?: string // For nested folders: reference to parent folder
  url?: string // For websites: the URL to open
  icon?: string // For websites: cached favicon path (base64 data URI or file path)
  lastUsed?: number // Timestamp when item was last accessed
}

export interface Folder {
  id: string
  name: string
  items: FolderItem[]
  lastUsed?: number // Timestamp when folder was last accessed
  icon?: string // Icon name from Icon enum (e.g., "Folder", "Document", "Star")
  color?: string // Hex color code for icon tint (e.g., "#FF5733")
}

export const STORAGE_KEY = "launchpad-folders"
