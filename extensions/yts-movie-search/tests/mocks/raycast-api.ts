import { vi } from "vitest";

const storage = new Map<string, string>();

export const LocalStorage = {
  getItem: vi.fn((key: string) => Promise.resolve(storage.get(key))),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, value);
    return Promise.resolve();
  }),
  removeItem: vi.fn((key: string) => {
    storage.delete(key);
    return Promise.resolve();
  }),
  clear: vi.fn(() => {
    storage.clear();
    return Promise.resolve();
  }),
};

export const showToast = vi.fn(() => Promise.resolve());

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const getPreferenceValues = vi.fn(() => ({}));
export const getSelectedText = vi.fn(() => Promise.resolve(""));

export const __storage = storage;
