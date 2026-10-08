export function getPreferenceValues<T>() {
  return {} as T;
}
export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
  },
} as const;

export const showToast = jest.fn(async () => undefined);

export const getPreferenceValues = jest.fn(() => ({
  units: "metric",
  clockFormat: "24h",
  debugMode: false,
  showWindDirection: true,
  showSunTimes: true,
}));

const store: Record<string, string> = {};

export const LocalStorage = {
  getItem: jest.fn(async (key: string) => store[key] ?? undefined),
  setItem: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete store[key];
  }),
  allItems: jest.fn(async () => ({ ...store })),
  clear: jest.fn(async () => {
    for (const k of Object.keys(store)) delete store[k];
  }),
  _store: store,
};

export const Image = {
  Mask: { Circle: "circle", RoundedRectangle: "roundedRectangle" },
};
