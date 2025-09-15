// Export all types from the organized structure
export * from "./entities";
export * from "./common";

// Re-export commonly used types for convenience
export type { ZendeskUser, ZendeskTicket, ZendeskOrganization, ZendeskGroup, ZendeskBrand } from "./entities";

export type { ZendeskInstance, ZendeskUserSearchResponse, ZendeskTicketSearchResponse } from "./common";
