/**
 * Mock for @raycast/utils to use in tests.
 * This avoids the transitive @raycast/api dependency which can't be resolved outside Raycast runtime.
 */

// Mock executeSQL - used in db.ts for Windows
export async function executeSQL(_dbPath: string, _query: string): Promise<unknown[]> {
  return [];
}

// Mock showFailureToast - used in various components
export async function showFailureToast(_error: unknown, _options?: { title?: string }): Promise<void> {
  // no-op in tests
}

// Mock usePromise - used in with-zed.tsx
export function usePromise<T>(_fn: () => Promise<T>, _deps?: unknown[]) {
  return {
    data: undefined,
    isLoading: true,
    error: undefined,
    revalidate: () => Promise.resolve(undefined as T),
  };
}

// Mock useCachedState - used in use-pinned-entries.ts
export function useCachedState<T>(_key: string, initialValue: T): [T, (value: T) => void] {
  return [initialValue, () => {}];
}

// Mock useSQL - used in use-recent-workspaces.ts
export function useSQL<T>(_dbPath: string, _query: string) {
  return {
    data: [] as T[],
    isLoading: false,
    error: undefined,
    revalidate: () => Promise.resolve(),
    permissionView: undefined,
  };
}

// Mock runAppleScript - used in zed.ts, open-new-window.tsx, open.ts
export async function runAppleScript(_script: string): Promise<string> {
  return "";
}

// Mock runPowerShellScript - used in windows.ts
export async function runPowerShellScript(_script: string): Promise<string> {
  return "";
}
