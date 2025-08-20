/**
 * API client for searching WinGet and Homebrew packages via Dev DX service
 * Features result ranking and preference-based configuration
 */
import { getPreferenceValues } from "@raycast/api";
import type { SearchResponse, SearchResult } from "./types";

type Prefs = {
  apiBaseUrl: string;
  defaultEcosystem: "all" | "homebrew" | "winget";
  pageSize: string; // keep for UI pref, but clamp it
};

export const apiBaseUrl = "https://dev-dx-api.kytech.workers.dev";

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;

function clampLimit(n?: number) {
  const val = Number.isFinite(n as number) ? Number(n) : DEFAULT_LIMIT;
  return Math.min(Math.max(1, val), MAX_LIMIT);
}

export async function searchPackages(query: string, ecosystem: "all" | "homebrew" | "winget", limit?: number) {
  const prefs = getPreferenceValues<Prefs>();
  const base = (prefs.apiBaseUrl || apiBaseUrl).replace(/\/+$/, "");
  const effLimit = clampLimit(limit ?? (Number(prefs.pageSize) || DEFAULT_LIMIT));

  // Minimum query length to avoid noisy results (except when ecosystem is narrowed)
  const q = (query || "").trim();
  const minLen = ecosystem === "all" ? 2 : 1;
  if (q.length < minLen) {
    return { total: 0, page: 0, limit: effLimit, count: 0, results: [] };
  }

  const params = new URLSearchParams();
  params.set("q", q);
  if (ecosystem !== "all") params.set("ecosystem", ecosystem);
  params.set("limit", String(effLimit));
  params.set("page", String(0)); // keep 0; backend’s tiered search is not paged

  const url = `${base}/v1/search?${params.toString()}`;
  // Fetch packages from Dev DX API

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Raycast Extension",
      },
    });

    // Check response status and handle errors

    if (!res.ok) {
      const errorText = await res.text();
      // Log error for debugging purposes
      throw new Error(`API Error ${res.status}: ${res.statusText}${errorText ? ` - ${errorText}` : ""}`);
    }

    const data = (await res.json()) as SearchResponse;

    // Re-rank results to prioritize exact matches and prefix matches
    const nq = q.toLowerCase();
    const exactFirst = (data.results || []).slice().sort((a: SearchResult, b: SearchResult) => {
      const ax = Number(a.name?.toLowerCase() === nq || a.id?.toLowerCase() === nq);
      const bx = Number(b.name?.toLowerCase() === nq || b.id?.toLowerCase() === nq);
      if (bx - ax !== 0) return bx - ax;

      const ap = Number(a.name?.toLowerCase().startsWith(nq));
      const bp = Number(b.name?.toLowerCase().startsWith(nq));
      if (bp - ap !== 0) return bp - ap;

      // recent tie-breaker if available
      const at = a.updated_at ? Date.parse(a.updated_at) : 0;
      const bt = b.updated_at ? Date.parse(b.updated_at) : 0;
      return bt - at;
    });

    return { ...data, results: exactFirst, count: exactFirst.length, total: exactFirst.length };
  } catch {
    // Return empty results when API is unavailable
    return { total: 0, page: 0, limit: effLimit, count: 0, results: [] };
  }
}
