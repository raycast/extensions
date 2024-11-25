import { LocalStorage } from "@raycast/api";
import { GlucoseReading } from "./types";
import { fetchGlucoseData } from "./libreview";

const CACHE_KEY = "glucose_readings";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  readings: GlucoseReading[];
  timestamp: number;
}

class GlucoseStore {
  private static instance: GlucoseStore;
  private cache: CachedData | null = null;
  private fetchPromise: Promise<GlucoseReading[]> | null = null;

  private constructor() {
    // Initialize cache from localStorage on startup
    this.initializeCache();
  }

  private async initializeCache() {
    try {
      const data = await LocalStorage.getItem<string>(CACHE_KEY);
      if (data) {
        this.cache = JSON.parse(data) as CachedData;
      }
    } catch (error) {
      console.error("Error initializing cache:", error);
    }
  }

  static getInstance(): GlucoseStore {
    if (!GlucoseStore.instance) {
      GlucoseStore.instance = new GlucoseStore();
    }
    return GlucoseStore.instance;
  }

  private async setCachedData(readings: GlucoseReading[]): Promise<void> {
    this.cache = {
      readings,
      timestamp: Date.now(),
    };
    // Update localStorage in the background
    LocalStorage.setItem(CACHE_KEY, JSON.stringify(this.cache)).catch(console.error);
  }

  async getReadings(forceRefresh = false): Promise<GlucoseReading[]> {
    const now = Date.now();

    // Return cache if valid and not forcing refresh
    if (!forceRefresh && this.cache && now - this.cache.timestamp < CACHE_DURATION) {
      return this.cache.readings;
    }

    // Return existing fetch if one is in progress
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Start new fetch
    this.fetchPromise = fetchGlucoseData()
      .then(async (readings) => {
        await this.setCachedData(readings);
        return readings;
      })
      .catch((error) => {
        // Return cached data on error if available
        if (this.cache) {
          return this.cache.readings;
        }
        throw error;
      })
      .finally(() => {
        this.fetchPromise = null;
      });

    return this.fetchPromise;
  }

  async clearCache(): Promise<void> {
    this.cache = null;
    await LocalStorage.removeItem(CACHE_KEY);
  }
}

export const glucoseStore = GlucoseStore.getInstance();
