export const LocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

export const showToast = jest.fn();
export const Toast = {
  Style: {
    Failure: "failure",
    Success: "success",
    Animated: "animated",
  },
};

export const Icon = {
  Person: "person",
  ExclamationMark: "exclamationmark",
  XmarkCircle: "xmark.circle",
  Gear: "gear",
  Circle: "circle",
  ArrowClockwise: "arrow.clockwise",
  List: "list",
  Terminal: "terminal",
};

export const Color = {
  PrimaryText: "#FFFFFF",
  SecondaryText: "#999999",
  Red: "#FF0000",
  Green: "#00FF00",
  Yellow: "#FFFF00",
};

export const MenuBarExtra = ({ children, icon, title }: any) => ({ children, icon, title });
MenuBarExtra.Item = ({ title, icon, onAction }: any) => ({ title, icon, onAction });
MenuBarExtra.Section = ({ children }: any) => ({ children });

export const List = ({ children, isLoading }: any) => ({ children, isLoading });
List.Item = ({ title, icon }: any) => ({ title, icon });
List.Section = ({ children, title }: any) => ({ children, title });
List.EmptyView = ({ title, description, actions }: any) => ({ title, description, actions });

export const ActionPanel = ({ children }: any) => ({ children });
export const Action = ({ title, icon, onAction }: any) => ({ title, icon, onAction });

export const getPreferenceValues = jest.fn(() => ({
  username: "test@example.com",
  password: "password123",
  unit: "mmol",
}));

export const openExtensionPreferences = jest.fn();
export const popToRoot = jest.fn();
export const open = jest.fn();
