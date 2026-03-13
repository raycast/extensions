import { ZendeskInstance } from "./preferences";

export class ZendeskUrlBuilder {
  constructor(private instance: ZendeskInstance | undefined) {}

  private getBaseUrl(): string {
    return `https://${this.instance?.subdomain}.zendesk.com`;
  }

  // User URLs
  getUserProfile(userId: number): string {
    return `${this.getBaseUrl()}/agent/users/${userId}`;
  }

  getUserFilters(): string {
    return `${this.getBaseUrl()}/agent/user_filters`;
  }

  // Organization URLs
  getOrganizationDetails(orgId: number): string {
    return `${this.getBaseUrl()}/agent/organizations/${orgId}`;
  }

  getOrganizationsList(): string {
    return `${this.getBaseUrl()}/agent/organizations`;
  }

  // Dynamic Content URLs
  getDynamicContentItem(itemId: number): string {
    return `${this.getBaseUrl()}/dynamic_content/items/${itemId}`;
  }

  getDynamicContentList(): string {
    return `${this.getBaseUrl()}/admin/workspaces/agent-workspace/dynamic_content`;
  }

  // Macro URLs
  getMacroDetails(macroId: number): string {
    return `${this.getBaseUrl()}/admin/workspaces/agent-workspace/macros/${macroId}`;
  }

  getMacrosList(): string {
    return `${this.getBaseUrl()}/admin/workspaces/agent-workspace/macros`;
  }

  // Trigger URLs
  getTriggerDetails(triggerId: number): string {
    return `${this.getBaseUrl()}/admin/objects-rules/rules/triggers/${triggerId}`;
  }

  getTriggersList(): string {
    return `${this.getBaseUrl()}/admin/objects-rules/rules/triggers`;
  }

  // Ticket Field URLs
  getTicketFieldDetails(fieldId: number): string {
    return `${this.getBaseUrl()}/admin/objects-rules/tickets/ticket-fields/${fieldId}`;
  }

  getTicketFieldsList(): string {
    return `${this.getBaseUrl()}/admin/objects-rules/tickets/ticket-fields`;
  }

  // Support Address URLs
  getSupportAddressesList(): string {
    return `${this.getBaseUrl()}/admin/channels/talk_and_email/email`;
  }

  // Ticket Form URLs
  getTicketFormDetails(formId: number): string {
    return `${this.getBaseUrl()}/admin/objects-rules/tickets/ticket-forms/edit/${formId}`;
  }

  getTicketFormConditions(formId: number): string {
    return `${this.getBaseUrl()}/admin/objects-rules/tickets/ticket-forms/edit/${formId}/conditions`;
  }

  getTicketFormsList(): string {
    return `${this.getBaseUrl()}/admin/objects-rules/tickets/ticket-forms`;
  }

  // Group URLs
  getGroupDetails(groupId: number): string {
    return `${this.getBaseUrl()}/admin/people/groups/${groupId}`;
  }

  getGroupsList(): string {
    return `${this.getBaseUrl()}/admin/people/team/groups`;
  }

  // Ticket URLs
  getTicketDetails(ticketId: number): string {
    return `${this.getBaseUrl()}/agent/tickets/${ticketId}`;
  }

  getTicketsList(): string {
    return `${this.getBaseUrl()}/agent/filters`;
  }

  // View URLs
  getAgentView(viewId: number): string {
    return `${this.getBaseUrl()}/agent/filters/${viewId}`;
  }

  getAdminViewEdit(viewId: number): string {
    return `${this.getBaseUrl()}/admin/workspaces/agent-workspace/views/${viewId}`;
  }

  getViewsList(): string {
    return `${this.getBaseUrl()}/admin/workspaces/agent-workspace/views`;
  }

  // Brand URLs
  getBrandDetails(brandId: number): string {
    return `${this.getBaseUrl()}/admin/account/brand_management/brands/${brandId}`;
  }

  getBrandsList(): string {
    return `${this.getBaseUrl()}/admin/account/brand_management/brands`;
  }

  // Automation URLs
  getAutomationDetails(automationId: number): string {
    return `${this.getBaseUrl()}/admin/objects-rules/rules/automations/${automationId}`;
  }

  getAutomationsList(): string {
    return `${this.getBaseUrl()}/admin/objects-rules/rules/automations`;
  }

  // Custom Role URLs
  getCustomRoleDetails(roleId: number): string {
    return `${this.getBaseUrl()}/admin/people/team/roles/${roleId}`;
  }

  getCustomRolesList(): string {
    return `${this.getBaseUrl()}/admin/people/team/roles`;
  }
}

// Helper functions for specific entity types
export const getZendeskUrls = (instance: ZendeskInstance | undefined) => new ZendeskUrlBuilder(instance);
