import { ZendeskInstance } from "../../utils/preferences";
// Import entity types for use in response interfaces
import type {
  ZendeskUser,
  ZendeskOrganization,
  ZendeskTrigger,
  ZendeskTriggerCategory,
  ZendeskAutomation,
  ZendeskDynamicContent,
  ZendeskMacro,
  ZendeskTicketField,
  ZendeskSupportAddress,
  ZendeskTicketForm,
  ZendeskGroup,
  ZendeskTicket,
  ZendeskView,
  ZendeskBrand,
  ZendeskGroupMembership,
  ZendeskCustomRole,
} from "./entities";

export type { ZendeskInstance };

// Common response interfaces
export interface ZendeskUserSearchResponse {
  users: ZendeskUser[];
  count: number;
}

export interface ZendeskOrganizationSearchResponse {
  results: ZendeskOrganization[];
  count: number;
}

export interface ZendeskTriggerSearchResponse {
  triggers: ZendeskTrigger[];
  count: number;
}

export interface ZendeskTriggerCategorySearchResponse {
  trigger_categories: ZendeskTriggerCategory[];
  links?: {
    next?: string;
    prev?: string;
  };
  meta?: {
    after_cursor?: string;
    before_cursor?: string;
    has_more?: boolean;
  };
}

export interface ZendeskAutomationSearchResponse {
  automations: ZendeskAutomation[];
  count: number;
  next_page: string | null;
  previous_page: string | null;
}

export interface ZendeskDynamicContentListResponse {
  items: ZendeskDynamicContent[];
  next_page: string | null;
}

export interface ZendeskMacroListResponse {
  macros: ZendeskMacro[];
}

export interface ZendeskTicketFieldSearchResponse {
  ticket_fields: ZendeskTicketField[];
}

export interface ZendeskSupportAddressSearchResponse {
  recipient_addresses: ZendeskSupportAddress[];
  next_page: string | null;
}

export interface ZendeskTicketFormSearchResponse {
  ticket_forms: ZendeskTicketForm[];
}

export interface ZendeskGroupSearchResponse {
  groups: ZendeskGroup[];
  next_page: string | null;
}

export interface ZendeskTicketSearchResponse {
  results: ZendeskTicket[];
  count: number;
}

export interface ZendeskViewSearchResponse {
  views: ZendeskView[];
  count: number;
}

export interface ZendeskBrandSearchResponse {
  brands: ZendeskBrand[];
  count: number;
  next_page: string | null;
  previous_page: string | null;
}

export interface ZendeskGroupMembershipResponse {
  group_memberships: ZendeskGroupMembership[];
}

export interface ZendeskCustomRoleSearchResponse {
  custom_roles: ZendeskCustomRole[];
}
