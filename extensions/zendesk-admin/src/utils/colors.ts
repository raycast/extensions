import { Color, Icon } from "@raycast/api";

export const getStatusColor = (status: string) => {
  switch (status) {
    case "new":
      return Color.Yellow;
    case "open":
      return Color.Red;
    case "pending":
      return Color.Blue;
    case "hold":
    case "on-hold":
      return Color.Purple;
    case "solved":
      return Color.Green;
    case "closed":
      return Color.PrimaryText;
    default:
      return Color.PrimaryText;
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return Color.Red;
    case "high":
      return Color.Orange;
    case "normal":
      return Color.Blue;
    case "low":
      return Color.Green;
    default:
      return Color.PrimaryText;
  }
};

export const getUserRoleColor = (role: string) => {
  switch (role) {
    case "end-user":
      return Color.Blue;
    case "agent":
      return Color.Green;
    case "admin":
      return Color.Red;
    default:
      return Color.PrimaryText;
  }
};

// New utility functions for repeated patterns

export const getActiveStatusColor = (active: boolean) => {
  return active ? Color.Green : Color.Red;
};

export const getVerificationStatusColor = (verified: boolean) => {
  return verified ? Color.Green : Color.Orange;
};

export const getDefaultStatusColor = (isDefault: boolean) => {
  return isDefault ? Color.Green : Color.Orange;
};

export const getBooleanIcon = (condition: boolean) => {
  return condition
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: Icon.XMarkCircle, tintColor: Color.Red };
};

export const getHelpCenterStateColor = (state: string) => {
  switch (state) {
    case "enabled":
      return Color.Green;
    case "disabled":
      return Color.Red;
    case "restricted":
      return Color.Orange;
    default:
      return Color.PrimaryText;
  }
};

// Role access level color mapping
export const getRoleAccessLevelColor = (level: string) => {
  switch (level) {
    // Full access levels
    case "full":
    case "all":
    case "public":
      return Color.Green;

    // Edit/Manage access levels
    case "edit":
    case "edit-topics":
    case "manage-group":
    case "manage-personal":
    case "all-except-self":
    case "all-with-self-restriction":
      return Color.Blue;

    // Read-only access levels
    case "readonly":
    case "playonly":
      return Color.Orange;

    // Limited access levels
    case "edit-within-org":
    case "within-groups":
    case "within-groups-and-public-groups":
    case "within-organization":
    case "assigned-only":
      return Color.Yellow;

    // No access levels
    case "none":
      return Color.Red;

    default:
      return Color.SecondaryText;
  }
};

// Role access level text mapping
export const getRoleAccessLevelText = (level: string) => {
  switch (level) {
    case "full":
      return "Full Access";
    case "edit":
      return "Edit Access";
    case "readonly":
      return "Read Only";
    case "none":
      return "No Access";
    case "all":
      return "All Tickets";
    case "public":
      return "Public Comments";
    case "edit-topics":
      return "Edit Topics";
    case "manage-group":
      return "Manage Group";
    case "manage-personal":
      return "Manage Personal";
    case "all-except-self":
      return "All Except Self";
    case "all-with-self-restriction":
      return "All With Self Restriction";
    case "edit-within-org":
      return "Edit Within Org";
    case "within-groups":
      return "Within Groups";
    case "within-groups-and-public-groups":
      return "Within Groups & Public";
    case "within-organization":
      return "Within Organization";
    case "assigned-only":
      return "Assigned Only";
    case "playonly":
      return "Play Only";
    default:
      return level;
  }
};

// Ticket type color mapping
export const getTicketTypeColor = (type: string) => {
  switch (type) {
    case "problem":
      return Color.Red;
    case "incident":
      return Color.Orange;
    case "question":
      return Color.Blue;
    case "task":
      return Color.Green;
    default:
      return Color.PrimaryText;
  }
};

// Ticket type text mapping
export const getTicketTypeText = (type: string) => {
  switch (type) {
    case "problem":
      return "Problem";
    case "incident":
      return "Incident";
    case "question":
      return "Question";
    case "task":
      return "Task";
    default:
      return type;
  }
};
