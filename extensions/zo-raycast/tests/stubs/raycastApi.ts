let preferenceValues: unknown = {};
const localStorageValues = new Map<string, unknown>();

export function __setPreferenceValues(value: unknown): void {
  preferenceValues = value;
}

export function getPreferenceValues<T>(): T {
  return preferenceValues as T;
}

export function __resetLocalStorage(): void {
  localStorageValues.clear();
}

export const LocalStorage = {
  getItem<T>(key: string): Promise<T | undefined> {
    if (!localStorageValues.has(key)) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve(localStorageValues.get(key) as T);
  },

  setItem(key: string, value: unknown): Promise<void> {
    localStorageValues.set(key, value);
    return Promise.resolve();
  },

  removeItem(key: string): Promise<void> {
    localStorageValues.delete(key);
    return Promise.resolve();
  },
};
