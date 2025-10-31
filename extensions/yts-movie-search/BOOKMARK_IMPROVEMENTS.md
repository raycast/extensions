# Future Improvements for YTS Raycast Extension

This document tracks potential improvements and enhancements for the bookmarking feature and overall extension. These are organized by priority and implementation complexity.

---

## High Priority

### 1. Sorting in Bookmarked View
**Status:** Not implemented
**Complexity:** Medium
**Impact:** High

Currently bookmarks are only sorted by creation date (newest first). Add user-configurable sorting options.

**Implementation:**
```typescript
// In hooks.ts
function sortBookmarks(map: BookmarkMap, sortBy: BookmarkSortBy): Bookmark[] {
  return Object.values(map).sort((a, b) => {
    switch (sortBy) {
      case 'created':
        return b.createdAt.localeCompare(a.createdAt);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'year':
        return (b.year ?? 0) - (a.year ?? 0);
      case 'rating':
        return (b.rating ?? 0) - (a.rating ?? 0);
      case 'lastSynced':
        return (b.lastSyncedAt ?? '').localeCompare(a.lastSyncedAt ?? '');
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
}
```

**UI Changes:**
- Add bookmark sort dropdown in search-movies.tsx when viewMode === "bookmarks"
- Store preference in localStorage
- Use Cmd+S shortcut to cycle through bookmark sorts (similar to movie search)

---

### 2. Filter Application in Bookmarked View
**Status:** Partially implemented (only search text works)
**Complexity:** Medium
**Impact:** High

Current behavior is confusing: genre/quality/rating filters are visible but don't affect bookmarked view.

**Options:**
1. **Make filters work** - Filter bookmarked movies by genre/quality/rating
2. **Hide filters** - Don't show filter dropdowns when in bookmarked view
3. **Disable filters** - Show but disable with tooltip explaining they only work in search view

**Recommended:** Option 1 (make filters work)

**Implementation:**
```typescript
// In search-movies.tsx
const bookmarkMovies = useMemo(() => {
  return bookmarks
    .filter((bookmark) => {
      // Existing search text filter
      if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;

      // Genre filter
      if (selectedGenre !== "All") {
        // Need to fetch full movie data or store genres in bookmark
        // This requires schema update
      }

      // Quality filter
      if (selectedQuality !== "All") {
        return bookmark.qualities.includes(selectedQuality);
      }

      // Rating filter
      if (selectedRating !== "All") {
        const minRating = getAPIRating(selectedRating);
        return (bookmark.rating ?? 0) >= minRating;
      }

      return true;
    })
    .map((bookmark) => bookmarkToMovie(bookmark));
}, [bookmarks, normalizedSearch, selectedGenre, selectedQuality, selectedRating]);
```

**Schema Update Needed:**
```typescript
interface Bookmark {
  // ... existing fields
  genres?: string[]; // Add genres to bookmark
}
```

---

### 3. Bulk Quality Acknowledgment
**Status:** Not implemented
**Complexity:** Low
**Impact:** Medium

Add "Mark All as Seen" action when multiple bookmarks have new qualities.

**Implementation:**
```typescript
// In hooks.ts
const acknowledgeAllQualityUpdates = useCallback(async () => {
  const current = await ensureBookmarksLoaded();
  const bookmarksWithUpdates = Object.values(current).filter(b => b.hasNewQuality);

  if (bookmarksWithUpdates.length === 0) {
    return;
  }

  const next = { ...current };
  for (const bookmark of bookmarksWithUpdates) {
    next[bookmark.id] = {
      ...bookmark,
      hasNewQuality: false,
      sourceUpdate: bookmark.sourceUpdate?.type === "sync"
        ? { ...bookmark.sourceUpdate, note: "Bulk quality update acknowledged" }
        : bookmark.sourceUpdate,
    };
  }

  try {
    await persistBookmarks(next, current);
    await showToast({
      style: Toast.Style.Success,
      title: "Cleared Quality Badges",
      message: `${bookmarksWithUpdates.length} bookmark${bookmarksWithUpdates.length === 1 ? '' : 's'} updated`,
    });
  } catch (error) {
    // Error handling
  }
}, []);
```

**UI Changes:**
- Add action to search-movies.tsx when in bookmarked view
- Only show when at least one bookmark has `hasNewQuality === true`
- Use Cmd+Shift+A shortcut

---

## Medium Priority

### 4. Export/Import Bookmarks
**Status:** Not implemented
**Complexity:** Medium
**Impact:** Medium

Allow users to backup and restore bookmarks as JSON files.

**Implementation:**
```typescript
// Export
const exportBookmarks = useCallback(async () => {
  const current = await ensureBookmarksLoaded();
  const payload = {
    version: BOOKMARK_STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    bookmarks: Object.values(current),
  };

  const json = JSON.stringify(payload, null, 2);
  await Clipboard.copy(json);
  await showToast({
    style: Toast.Style.Success,
    title: "Bookmarks Exported",
    message: "JSON copied to clipboard. Save to a file for backup.",
  });
}, []);

// Import
const importBookmarks = useCallback(async (jsonString: string) => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.bookmarks || !Array.isArray(parsed.bookmarks)) {
      throw new Error("Invalid bookmark format");
    }

    const current = await ensureBookmarksLoaded();
    const imported = normalizeBookmarkList(parsed.bookmarks);

    // Merge strategy: keep existing, add new
    const merged = { ...current };
    for (const [id, bookmark] of Object.entries(imported)) {
      if (!merged[id]) {
        merged[id] = bookmark;
      }
    }

    await persistBookmarks(merged, current);
    // Show success toast
  } catch (error) {
    // Show error toast
  }
}, []);
```

**UI Considerations:**
- Add "Export Bookmarks" action in bookmarked view
- Add "Import Bookmarks" form (paste JSON, validate, import)
- Consider merge strategy (replace vs merge)

---

### 5. Refresh Failure Details
**Status:** Partially implemented
**Complexity:** Low
**Impact:** Low

Currently failed refreshes are counted but not highlighted. Improve visibility.

**Implementation:**
```typescript
// In Bookmark type
interface Bookmark {
  // ... existing fields
  lastSyncError?: {
    message: string;
    timestamp: string;
  };
}

// In refreshBookmarks
failures.push({ bookmark, error: getErrorMessage(error) });
next[bookmark.id] = {
  ...bookmark,
  lastSyncedAt: now,
  lastSyncError: {
    message: getErrorMessage(error),
    timestamp: now,
  },
  sourceUpdate: { type: "sync", at: now, note: "Failed to refresh" },
};

// In MovieItem component
if (bookmark.lastSyncError) {
  // Show warning icon
  // Add "Retry Refresh" action
}
```

**UI Changes:**
- Show warning icon on failed bookmarks
- Add tooltip with error message
- Add "Retry Failed Bookmarks" action

---

### 6. Performance Guard for Large Collections
**Status:** Not implemented
**Complexity:** Low
**Impact:** Medium

With 100+ bookmarks, refresh could take minutes and storage could grow large.

**Implementation:**
```typescript
// In constants.ts
export const MAX_RECOMMENDED_BOOKMARKS = 50;
export const MAX_CONCURRENT_REFRESH = 5; // Already implemented

// In useBookmarks
const addBookmark = useCallback(async (movie: Movie) => {
  const current = await ensureBookmarksLoaded();
  const count = Object.keys(current).length;

  if (count >= MAX_RECOMMENDED_BOOKMARKS) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Many Bookmarks",
      message: `You have ${count} bookmarks. Consider removing old ones for better performance.`,
    });
  }

  // ... rest of implementation
}, []);
```

**Additional Considerations:**
- Add progress indicator during long refreshes
- Show "Refreshing X of Y" in toast
- Allow canceling refresh operation

---

### 7. Quality Change History
**Status:** Not implemented
**Complexity:** Medium
**Impact:** Low

Track when each quality was first detected, not just the current set.

**Implementation:**
```typescript
interface QualityHistoryEntry {
  quality: string;
  firstSeen: string;
  source: 'initial' | 'sync';
}

interface Bookmark {
  // ... existing fields
  qualityHistory?: QualityHistoryEntry[];
}

// When creating/updating bookmark
const updateQualityHistory = (
  existing: QualityHistoryEntry[] = [],
  newQualities: string[],
  timestamp: string,
  source: 'initial' | 'sync'
): QualityHistoryEntry[] => {
  const history = [...existing];
  const existingQualities = new Set(history.map(h => h.quality));

  for (const quality of newQualities) {
    if (!existingQualities.has(quality)) {
      history.push({ quality, firstSeen: timestamp, source });
    }
  }

  return history;
};
```

**Use Cases:**
- Show timeline of quality releases
- "2160p added 3 days ago"
- Filter bookmarks by "recently upgraded"

---

## Low Priority (Polish)

### 8. Notification Badge Count
**Status:** Not implemented
**Complexity:** Medium (Raycast API dependent)
**Impact:** Low

Show count of bookmarks with new qualities in extension icon or title.

**Research Needed:**
- Check if Raycast API supports badge counts
- May need to use menu bar item with badge

---

### 9. Smart Refresh Priority
**Status:** Not implemented
**Complexity:** Medium
**Impact:** Low

Instead of refreshing all bookmarks equally, prioritize based on likelihood of updates.

**Implementation:**
```typescript
const calculateRefreshPriority = (bookmark: Bookmark): number => {
  const now = Date.now();
  const releaseDate = bookmark.year ? new Date(bookmark.year, 0, 1).getTime() : now;
  const ageInYears = (now - releaseDate) / (365 * 24 * 60 * 60 * 1000);

  // Skip very old movies
  if (ageInYears > 5) return 0;

  // Prioritize recent releases
  if (ageInYears < 1) return 3;
  if (ageInYears < 2) return 2;
  return 1;
};

// In refreshBookmarks
const sortedByPriority = bookmarkValues
  .map(b => ({ bookmark: b, priority: calculateRefreshPriority(b) }))
  .filter(item => item.priority > 0)
  .sort((a, b) => b.priority - a.priority);
```

**Benefits:**
- Faster refreshes (skip old movies)
- More efficient API usage
- Better UX (recent releases checked first)

---

### 10. Bookmark Notes
**Status:** Not implemented
**Complexity:** Low
**Impact:** Low

Allow users to add personal notes to bookmarks.

**Implementation:**
```typescript
interface Bookmark {
  // ... existing fields
  notes?: string;
}

// Add action to edit notes
const updateBookmarkNotes = useCallback(async (movieId: number, notes: string) => {
  const current = await ensureBookmarksLoaded();
  const bookmark = current[movieId];

  if (!bookmark) return;

  const next = {
    ...current,
    [movieId]: {
      ...bookmark,
      notes: notes.trim() || undefined,
      updatedAt: getNowIso(),
    },
  };

  await persistBookmarks(next, current);
}, []);
```

**UI:**
- Add "Edit Notes" action in movie details
- Show notes in detail view
- Search bookmarks by notes content

---

## Documentation Updates

### 11. Update CHANGELOG.md
**Status:** Missing entry
**Complexity:** Trivial
**Impact:** High

Add entry for bookmarking feature.

**Suggested Content:**
```markdown
## [1.1.0] - 2025-10-22

### Added
- Bookmark movies locally for quick access and monitoring
- Automatic quality tracking - get notified when new torrent qualities are released
- Dedicated bookmarked movies view with pagination
- Manual and automatic bookmark refresh (6-hour threshold)
- Visual indicators (📍 for bookmarked, ✨ for new qualities available)
- Quality update acknowledgment system

### Changed
- Increased API timeout from 5s to 10s for more reliable requests

### Technical
- Added comprehensive test suite for bookmark functionality
- Implemented singleton bookmark cache with listener pattern
- Queued persistence to prevent race conditions
```

---

### 12. README Clarifications
**Status:** Minor inconsistency
**Complexity:** Trivial
**Impact:** Low

**Issue:** Line 29 says "Cmd+Shift+B" for bookmarking in detail view, but the same shortcut works in grid view too.

**Fix:**
```markdown
6. Use **Cmd+Shift+B** to bookmark from either the grid or detail view.
```

---

## Code Quality Items

### 13. Magic Numbers to Constants
**Status:** Not implemented
**Complexity:** Trivial
**Impact:** Low

**Current:** `src/search-movies.tsx:92`
```typescript
const AUTO_REFRESH_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours
```

**Move to:** `src/constants.ts`
```typescript
export const BOOKMARK_AUTO_REFRESH_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours
export const BOOKMARK_BATCH_SIZE = 5;
```

---

### 14. Type Assertion Cleanup
**Status:** Not implemented
**Complexity:** Low
**Impact:** Low

**Current:** `src/hooks.ts:98`
```typescript
quality: getAPIQuality(selectedQuality) as any,
```

**Better:**
```typescript
// In constants.ts
export function getAPIQuality(quality: string): MovieQuality | undefined {
  // Return properly typed value or undefined
}

// In api.ts
interface SearchParams {
  quality?: MovieQuality;
  // ...
}

// In hooks.ts
const apiQuality = getAPIQuality(selectedQuality);
const response = await searchMovies({
  // ...
  ...(apiQuality && { quality: apiQuality }),
});
```

---

### 15. Test Coverage Gaps
**Status:** Not implemented
**Complexity:** Medium
**Impact:** Medium

**Missing tests:**
1. Auto-refresh logic in search-movies.tsx
2. Bookmark pagination behavior
3. Error suppression in MovieItem component
4. Quality update detection edge cases

**Suggested tests:**
```typescript
// tests/useBookmarks.test.ts
describe("auto-refresh", () => {
  it("triggers refresh when bookmarks are older than threshold", async () => {
    // Test auto-refresh logic
  });

  it("skips refresh when bookmarks are recent", async () => {
    // Test skip logic
  });
});

describe("pagination", () => {
  it("paginates bookmarked movies correctly", async () => {
    // Test bookmark pagination
  });
});
```

---

### 16. Error Handling Improvement
**Status:** Not implemented
**Complexity:** Low
**Impact:** Low

**Current:** `src/components/movie-item.tsx:133-135`
```typescript
} catch {
  // Failure toast handled inside hook; no-op here
}
```

**Better:**
```typescript
} catch (error) {
  console.error("Failed to toggle bookmark:", error);
  // Toast is already shown by the hook
}
```

**Rationale:** Silent error catching makes debugging harder. At minimum, log to console.

---

## Implementation Priority Recommendation

If implementing in phases, suggested order:

**Phase 1 (Quick Wins):**
- Update CHANGELOG.md (#11)
- Magic numbers to constants (#13)
- Error logging (#16)
- Bulk quality acknowledgment (#3)

**Phase 2 (Core Features):**
- Sorting in bookmarked view (#1)
- Filter application (#2)
- Export/import bookmarks (#4)

**Phase 3 (Polish):**
- Refresh failure details (#5)
- Performance guards (#6)
- Smart refresh priority (#9)

**Phase 4 (Nice to Have):**
- Quality history (#7)
- Bookmark notes (#10)
- Notification badges (#8)

---

## Notes

- All improvements are backward-compatible with existing bookmarks
- Schema changes require storage version bump
- Consider user preferences for configurable thresholds (refresh interval, batch size)
- May want to add telemetry to understand which features are most used

**Last Updated:** 2025-10-22
