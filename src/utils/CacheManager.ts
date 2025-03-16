import { Cache } from "@raycast/api";
import fs from "fs";
import { homedir } from "os";
import { join } from "path";

// Cache keys
export const CACHE_KEYS = {
  AUTH_STATUS: "auth-status",
  AUTH_USER: "auth-user",
  AUTH_TIMESTAMP: "auth-timestamp",
  SELECTED_PROJECT: "selected-project",
  PROJECT_TIMESTAMP: "project-timestamp",
  PROJECTS_LIST: "projects-list",
  PROJECTS_LIST_TIMESTAMP: "projects-list-timestamp"
};

// Cache expiration times (in milliseconds)
export const CACHE_TTL = {
  AUTH: 24 * 60 * 60 * 1000, // 24 hours
  PROJECT: 24 * 60 * 60 * 1000, // 24 hours
  PROJECTS_LIST: 1 * 60 * 60 * 1000 // 1 hour
};

// File paths
const PREFS_FILE_PATH = join(homedir(), '.raycast-gcloud-prefs.json');

// Create cache instance
const cache = new Cache({ namespace: "gcloud-cache" });

export interface Project {
  id: string;
  name: string;
  projectNumber: string;
  createTime: string;
}

export interface CachedAuth {
  isAuthenticated: boolean;
  user: string;
  timestamp: number;
}

export interface CachedProject {
  projectId: string;
  timestamp: number;
}

export interface CachedProjectsList {
  projects: Project[];
  timestamp: number;
}

/**
 * Cache manager for Google Cloud authentication and project selection
 */
export class CacheManager {
  /**
   * Save authentication status to cache
   */
  static saveAuthStatus(isAuthenticated: boolean, user: string): void {
    cache.set(CACHE_KEYS.AUTH_STATUS, isAuthenticated.toString());
    cache.set(CACHE_KEYS.AUTH_USER, user);
    cache.set(CACHE_KEYS.AUTH_TIMESTAMP, Date.now().toString());
  }

  /**
   * Get cached authentication status
   */
  static getAuthStatus(): CachedAuth | null {
    const isAuthenticatedStr = cache.get(CACHE_KEYS.AUTH_STATUS);
    const user = cache.get(CACHE_KEYS.AUTH_USER);
    const timestampStr = cache.get(CACHE_KEYS.AUTH_TIMESTAMP);

    if (!isAuthenticatedStr || !timestampStr) {
      return null;
    }

    const isAuthenticated = isAuthenticatedStr === "true";
    const timestamp = parseInt(timestampStr, 10);

    // Check if cache is expired
    if (Date.now() - timestamp > CACHE_TTL.AUTH) {
      return null;
    }

    return { isAuthenticated, user: user || "", timestamp };
  }

  /**
   * Clear authentication cache
   */
  static clearAuthCache(): void {
    cache.remove(CACHE_KEYS.AUTH_STATUS);
    cache.remove(CACHE_KEYS.AUTH_USER);
    cache.remove(CACHE_KEYS.AUTH_TIMESTAMP);
  }

  /**
   * Save selected project to cache and preferences file
   */
  static saveSelectedProject(projectId: string): void {
    // Save to cache
    cache.set(CACHE_KEYS.SELECTED_PROJECT, projectId);
    cache.set(CACHE_KEYS.PROJECT_TIMESTAMP, Date.now().toString());

    // Save to preferences file
    try {
      fs.writeFileSync(PREFS_FILE_PATH, JSON.stringify({ projectId }));
    } catch (error) {
      console.error("Failed to save project to preferences file:", error);
    }
  }

  /**
   * Get cached selected project
   */
  static getSelectedProject(): CachedProject | null {
    // Try to get from cache first
    const projectId = cache.get(CACHE_KEYS.SELECTED_PROJECT);
    const timestampStr = cache.get(CACHE_KEYS.PROJECT_TIMESTAMP);

    if (projectId && timestampStr) {
      const timestamp = parseInt(timestampStr, 10);
      
      // Check if cache is expired
      if (Date.now() - timestamp <= CACHE_TTL.PROJECT) {
        return { projectId, timestamp };
      }
    }

    // If not in cache or expired, try to get from preferences file
    try {
      if (fs.existsSync(PREFS_FILE_PATH)) {
        const prefsData = JSON.parse(fs.readFileSync(PREFS_FILE_PATH, 'utf8'));
        if (prefsData.projectId) {
          // Update cache with data from preferences file
          cache.set(CACHE_KEYS.SELECTED_PROJECT, prefsData.projectId);
          const now = Date.now();
          cache.set(CACHE_KEYS.PROJECT_TIMESTAMP, now.toString());
          return { projectId: prefsData.projectId, timestamp: now };
        }
      }
    } catch (error) {
      console.error("Failed to load project from preferences file:", error);
    }

    return null;
  }

  /**
   * Clear project selection cache
   */
  static clearProjectCache(): void {
    cache.remove(CACHE_KEYS.SELECTED_PROJECT);
    cache.remove(CACHE_KEYS.PROJECT_TIMESTAMP);
  }

  /**
   * Save projects list to cache
   */
  static saveProjectsList(projects: Project[]): void {
    cache.set(CACHE_KEYS.PROJECTS_LIST, JSON.stringify(projects));
    cache.set(CACHE_KEYS.PROJECTS_LIST_TIMESTAMP, Date.now().toString());
  }

  /**
   * Get cached projects list
   */
  static getProjectsList(): CachedProjectsList | null {
    const projectsListStr = cache.get(CACHE_KEYS.PROJECTS_LIST);
    const timestampStr = cache.get(CACHE_KEYS.PROJECTS_LIST_TIMESTAMP);

    if (!projectsListStr || !timestampStr) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);

    // Check if cache is expired
    if (Date.now() - timestamp > CACHE_TTL.PROJECTS_LIST) {
      return null;
    }

    try {
      const projects = JSON.parse(projectsListStr);
      return { projects, timestamp };
    } catch (error) {
      console.error("Failed to parse cached projects list:", error);
      return null;
    }
  }

  /**
   * Clear projects list cache
   */
  static clearProjectsListCache(): void {
    cache.remove(CACHE_KEYS.PROJECTS_LIST);
    cache.remove(CACHE_KEYS.PROJECTS_LIST_TIMESTAMP);
  }

  /**
   * Clear all caches
   */
  static clearAllCaches(): void {
    CacheManager.clearAuthCache();
    CacheManager.clearProjectCache();
    CacheManager.clearProjectsListCache();
  }
} 