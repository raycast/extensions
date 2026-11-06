// Vitest mock for @raycast/api — the real package only works inside Raycast runtime
import { vi } from "vitest";

// Create mutable store for preferences
const mockPreferences: Record<string, unknown> = {};

export const getPreferenceValues = vi.fn(() => mockPreferences);

export const Toast = {
  Style: { Success: "success", Failure: "failure", Animated: "animated" },
};

export const showToast = vi.fn();

export const Action = Object.assign(
  vi.fn(() => null),
  {
    SubmitForm: Object.assign(
      vi.fn(({ onSubmit, ...rest }: Record<string, unknown>) => {
        // Store for potential testing
        (Action.SubmitForm as Record<string, unknown>)._lastOnSubmit = onSubmit;
        return null;
      }),
      { displayName: "Action.SubmitForm" }
    ),
    OpenInBrowser: vi.fn(() => null),
    CopyToClipboard: vi.fn(() => null),
    Push: vi.fn(() => null),
    Pop: vi.fn(() => null),
  }
);

export const ActionPanel = Object.assign(
  vi.fn(({ children }: { children: unknown }) => children),
  { displayName: "ActionPanel" }
);

export const Form = {
  Dropdown: Object.assign(
    vi.fn((props: Record<string, unknown>) => null),
    { Item: vi.fn(() => null) }
  ),
  TextField: vi.fn((props: Record<string, unknown>) => null),
  TextArea: vi.fn((props: Record<string, unknown>) => null),
  DatePicker: Object.assign(vi.fn((props: Record<string, unknown>) => null), {
    Type: { Date: "date" as const },
  }),
  Checkbox: vi.fn((props: Record<string, unknown>) => null),
  Description: vi.fn((props: Record<string, unknown>) => null),
  PasswordField: vi.fn((props: Record<string, unknown>) => null),
  TagPicker: vi.fn((props: Record<string, unknown>) => null),
  Separator: vi.fn(() => null),
};

export const Clipboard = {
  copy: vi.fn(),
};

export const Icon = {};

export const LaunchProps = {};

export function setMockPreferences(prefs: Record<string, unknown>) {
  Object.assign(mockPreferences, prefs);
  getPreferenceValues.mockReturnValue(mockPreferences);
}