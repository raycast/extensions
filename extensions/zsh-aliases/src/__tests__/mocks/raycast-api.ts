// Mock implementation of @raycast/api for testing
export const showToast = vi.fn().mockResolvedValue(undefined);
export const popToRoot = vi.fn().mockResolvedValue(undefined);
export const confirmAlert = vi.fn().mockResolvedValue(true);

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
  },
};

export const List = vi.fn();
export const ActionPanel = vi.fn();

export const Action = {
  Push: vi.fn(),
  SubmitForm: vi.fn(),
  CopyToClipboard: vi.fn(),
  Paste: vi.fn(),
  Style: {
    Destructive: "destructive",
  },
};

export const Icon = {
  Plus: "plus",
  Pencil: "pencil",
  Trash: "trash",
  Document: "document",
};

export const Form = {
  TextField: vi.fn(),
  Dropdown: {
    Item: vi.fn(),
  },
  Description: vi.fn(),
};

export const Alert = {
  ActionStyle: {
    Destructive: "destructive",
  },
};

export const useState = vi.fn();
export const useEffect = vi.fn();
