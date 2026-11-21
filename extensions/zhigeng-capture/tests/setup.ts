import { vi } from "vitest";

// Mock @raycast/api — it only works inside Raycast, so we stub it for tests
vi.mock("@raycast/api", () => {
  const actualPreferences: Record<string, string> = {};

  return {
    getPreferenceValues: vi.fn(() => actualPreferences),
    showToast: vi.fn(),
    Toast: {
      Style: { Success: "success", Failure: "failure", Animated: "animated" },
    },
    Action: () => null,
    ActionPanel: ({ children }: { children: unknown }) => children,
    Form: {
      Dropdown: () => null,
      TextField: () => null,
      TextArea: () => null,
      DatePicker: () => null,
    },
    Clipboard: {
      copy: vi.fn(),
    },
    Icon: {},
    LaunchProps: {},
  };
});

// Set up default test preferences
export function setTestPreferences(prefs: {
  vaultPath?: string;
  zhigengCliPath?: string;
  obsidianWikiCliPath?: string;
}) {
  const { getPreferenceValues } = require("@raycast/api");
  const current = getPreferenceValues();
  Object.assign(current, prefs);
  getPreferenceValues.mockReturnValue(current);
}