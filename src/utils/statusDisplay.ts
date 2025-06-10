import { Icon, Color } from "@raycast/api";

export const StatusDisplay = {
  cursorManaged: {
    text: "Enabled",
    icon: Icon.CheckCircle,
    color: Color.Green,
    tooltip: "Server state is managed through Cursor's MCP settings",
  },
  disabled: {
    text: "Disabled",
    icon: Icon.XMarkCircle,
    color: Color.Red,
    tooltip: "Server is disabled",
  },
  enabled: {
    text: "Enabled",
    icon: Icon.CheckCircle,
    color: Color.Green,
    tooltip: "Server is enabled",
  },
  unknown: {
    text: "Enabled",
    icon: Icon.CheckCircle,
    color: Color.Green,
    tooltip: "Server status unknown",
  },
  protected: {
    text: "Protected",
    icon: Icon.Lock,
    color: Color.SecondaryText,
    tooltip: "This server is protected from editing. Click unlock to modify.",
  },
};
