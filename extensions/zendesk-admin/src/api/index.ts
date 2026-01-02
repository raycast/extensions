// Main API exports
export * from "./zendesk";
export * from "./types";
export * from "./utils";

// Re-export commonly used functions and types
export {
  searchZendeskUsers,
  searchZendeskTickets,
  searchZendeskOrganizations,
  searchZendeskGroups,
  createUser,
  updateUser,
} from "./zendesk";

export type { ZendeskUser, ZendeskTicket, ZendeskOrganization, ZendeskGroup, ZendeskInstance } from "./types";
