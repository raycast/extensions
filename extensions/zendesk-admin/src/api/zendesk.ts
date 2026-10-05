import { showToast, Toast } from "@raycast/api";
import { ZendeskInstance } from "../utils/preferences";
import {
  ZendeskUser,
  ZendeskOrganization,
  ZendeskTrigger,
  ZendeskTriggerCategory,
  ZendeskAutomation,
  ZendeskDynamicContent,
  ZendeskDynamicContentVariant,
  ZendeskMacro,
  ZendeskTicketField,
  ZendeskCustomFieldOption,
  ZendeskSupportAddress,
  ZendeskTicketForm,
  ZendeskGroup,
  ZendeskTicket,
  ZendeskView,
  ZendeskBrand,
  ZendeskGroupMembership,
  ZendeskCustomRole,
  ZendeskUserSearchResponse,
  ZendeskOrganizationSearchResponse,
  ZendeskTriggerSearchResponse,
  ZendeskTriggerCategorySearchResponse,
  ZendeskAutomationSearchResponse,
  ZendeskDynamicContentListResponse,
  ZendeskMacroListResponse,
  ZendeskTicketFieldSearchResponse,
  ZendeskSupportAddressSearchResponse,
  ZendeskTicketFormSearchResponse,
  ZendeskGroupSearchResponse,
  ZendeskTicketSearchResponse,
  ZendeskViewSearchResponse,
  ZendeskBrandSearchResponse,
  ZendeskGroupMembershipResponse,
  ZendeskCustomRoleSearchResponse,
} from "./types";
import { zendeskFetch, buildZendeskUrl } from "./utils";

export type { ZendeskInstance };
export type {
  ZendeskUser,
  ZendeskOrganization,
  ZendeskTrigger,
  ZendeskTriggerCategory,
  ZendeskAutomation,
  ZendeskDynamicContent,
  ZendeskDynamicContentVariant,
  ZendeskMacro,
  ZendeskTicketField,
  ZendeskCustomFieldOption,
  ZendeskSupportAddress,
  ZendeskTicketForm,
  ZendeskGroup,
  ZendeskTicket,
  ZendeskView,
  ZendeskBrand,
  ZendeskGroupMembership,
  ZendeskCustomRole,
};

// Legacy functions for backward compatibility
export function getZendeskAuthHeader(instance: ZendeskInstance): string {
  const credentials = `${instance.user}/token:${instance.api_key}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export function getZendeskUrl(instance: ZendeskInstance): string {
  return `https://${instance.subdomain}.zendesk.com/api/v2`;
}

export async function searchZendeskUsers(query: string, instance: ZendeskInstance): Promise<ZendeskUser[]> {
  const searchTerms = query;
  const url = `${buildZendeskUrl(instance, "")}/users/search.json?query=${encodeURIComponent(searchTerms)}&per_page=20`;

  const data = await zendeskFetch<ZendeskUserSearchResponse>(url, instance, {}, "fetch users");
  return data.users;
}

export async function searchZendeskOrganizations(
  query: string,
  instance: ZendeskInstance,
): Promise<ZendeskOrganization[]> {
  const searchTerms = query;
  const url = `${buildZendeskUrl(instance, "")}/search.json?query=type:organization ${encodeURIComponent(searchTerms)}&per_page=20`;

  const data = await zendeskFetch<ZendeskOrganizationSearchResponse>(url, instance, {}, "fetch organizations");
  return data.results;
}

export async function searchZendeskTriggers(query: string, instance: ZendeskInstance): Promise<ZendeskTrigger[]> {
  const searchTerms = query;
  const url = searchTerms
    ? `${buildZendeskUrl(instance, "")}/triggers/search.json?query=${encodeURIComponent(searchTerms)}`
    : `${buildZendeskUrl(instance, "")}/triggers.json`;

  const data = await zendeskFetch<ZendeskTriggerSearchResponse>(url, instance, {}, "fetch triggers");
  return data.triggers;
}

export async function searchZendeskTriggerCategories(
  instance: ZendeskInstance,
  onPage: (categories: ZendeskTriggerCategory[]) => void,
): Promise<void> {
  let url: string | null = `${getZendeskUrl(instance)}/trigger_categories.json?include=rule_counts&sort=position`;
  const headers = {
    Authorization: getZendeskAuthHeader(instance),
    "Content-Type": "application/json",
  };

  try {
    while (url) {
      const response = await fetch(url, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        showToast(
          Toast.Style.Failure,
          "Zendesk API Error",
          `Failed to fetch trigger categories: ${response.status} - ${errorText}`,
        );
        throw new Error(`Zendesk API Error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as ZendeskTriggerCategorySearchResponse;
      onPage(data.trigger_categories);

      // Use cursor navigation as recommended
      if (data.meta?.has_more && data.meta?.after_cursor) {
        const urlObj: URL = new URL(url as string);
        urlObj.searchParams.set("page[after]", data.meta.after_cursor);
        urlObj.searchParams.set("page[size]", "100");
        url = urlObj.toString();
      } else {
        url = null;
      }
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Connection Error",
      "Could not connect to Zendesk API. Please check your internet connection or API settings.",
    );
    throw error;
  }
}

export async function searchZendeskAutomations(query: string, instance: ZendeskInstance): Promise<ZendeskAutomation[]> {
  const searchTerms = query;
  const url = searchTerms
    ? `${getZendeskUrl(instance)}/automations/search.json?query=${encodeURIComponent(searchTerms)}`
    : `${getZendeskUrl(instance)}/automations.json`;
  const headers = {
    Authorization: getZendeskAuthHeader(instance),
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      showToast(
        Toast.Style.Failure,
        "Zendesk API Error",
        `Failed to fetch automations: ${response.status} - ${errorText}`,
      );
      throw new Error(`Zendesk API Error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as ZendeskAutomationSearchResponse;
    return data.automations;
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Connection Error",
      "Could not connect to Zendesk API. Please check your internet connection or API settings.",
    );
    throw error;
  }
}

export async function updateUser(
  userId: number,
  updatedFields: Record<string, unknown>,
  instance: ZendeskInstance,
): Promise<ZendeskUser> {
  const url = `${buildZendeskUrl(instance, "")}/users/${userId}.json`;

  const data = await zendeskFetch<{ user: ZendeskUser }>(
    url,
    instance,
    {
      method: "PUT",
      body: JSON.stringify({ user: updatedFields }),
    },
    "update user",
  );
  return data.user;
}

export async function searchZendeskDynamicContent(
  query: string,
  instance: ZendeskInstance,
  onPage: (items: ZendeskDynamicContent[]) => void,
): Promise<void> {
  let url: string | null = `${getZendeskUrl(instance)}/dynamic_content/items.json`;
  const headers = {
    Authorization: getZendeskAuthHeader(instance),
    "Content-Type": "application/json",
  };

  try {
    while (url) {
      const response = await fetch(url, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        showToast(
          Toast.Style.Failure,
          "Zendesk API Error",
          `Failed to fetch dynamic content: ${response.status} - ${errorText}`,
        );
        throw new Error(`Zendesk API Error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as ZendeskDynamicContentListResponse;
      onPage(data.items);
      url = data.next_page;
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Connection Error",
      "Could not connect to Zendesk API. Please check your internet connection or API settings.",
    );
    throw error;
  }
}

export async function searchZendeskMacros(query: string, instance: ZendeskInstance): Promise<ZendeskMacro[]> {
  const url = query
    ? `${buildZendeskUrl(instance, "")}/macros/search.json?query=${encodeURIComponent(query)}`
    : `${buildZendeskUrl(instance, "")}/macros.json?per_page=30`;

  const data = await zendeskFetch<ZendeskMacroListResponse>(url, instance, {}, "fetch macros");
  return data.macros;
}

export async function searchZendeskTicketFields(
  query: string,
  instance: ZendeskInstance,
): Promise<ZendeskTicketField[]> {
  const url = `${buildZendeskUrl(instance, "")}/ticket_fields.json`;

  const data = await zendeskFetch<ZendeskTicketFieldSearchResponse>(url, instance, {}, "fetch ticket fields");

  if (query) {
    return data.ticket_fields.filter((field) => field.title.toLowerCase().includes(query.toLowerCase()));
  }

  return data.ticket_fields;
}

export async function searchZendeskSupportAddresses(
  instance: ZendeskInstance,
  onPage: (addresses: ZendeskSupportAddress[]) => void,
): Promise<void> {
  let url: string | null = `${getZendeskUrl(instance)}/recipient_addresses.json`;
  const headers = {
    Authorization: getZendeskAuthHeader(instance),
    "Content-Type": "application/json",
  };

  try {
    while (url) {
      const response = await fetch(url, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        showToast(
          Toast.Style.Failure,
          "Zendesk API Error",
          `Failed to fetch support addresses: ${response.status} - ${errorText}`,
        );
        throw new Error(`Zendesk API Error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as ZendeskSupportAddressSearchResponse;
      onPage(data.recipient_addresses);
      url = data.next_page;
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Connection Error",
      "Could not connect to Zendesk API. Please check your internet connection or API settings.",
    );
    throw error;
  }
}

export async function searchZendeskTicketForms(query: string, instance: ZendeskInstance): Promise<ZendeskTicketForm[]> {
  const url = `${buildZendeskUrl(instance, "")}/ticket_forms.json`;

  const data = await zendeskFetch<ZendeskTicketFormSearchResponse>(url, instance, {}, "fetch ticket forms");

  if (query) {
    return data.ticket_forms.filter((form) => form.name.toLowerCase().includes(query.toLowerCase()));
  }

  return data.ticket_forms;
}

export async function searchZendeskGroups(instance: ZendeskInstance): Promise<ZendeskGroup[]> {
  let allGroups: ZendeskGroup[] = [];
  let url: string | null = `${buildZendeskUrl(instance, "")}/groups.json?per_page=100`;

  while (url) {
    const data: ZendeskGroupSearchResponse = await zendeskFetch<ZendeskGroupSearchResponse>(
      url,
      instance,
      {},
      "fetch groups",
    );
    allGroups = allGroups.concat(data.groups);
    url = data.next_page;
  }
  return allGroups;
}

export async function searchZendeskBrands(
  instance: ZendeskInstance,
  onPage: (brands: ZendeskBrand[]) => void,
): Promise<void> {
  let currentUrl = `${getZendeskUrl(instance)}/brands`;
  const headers = {
    Authorization: getZendeskAuthHeader(instance),
    "Content-Type": "application/json",
  };

  try {
    while (currentUrl) {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        showToast(
          Toast.Style.Failure,
          "Zendesk API Error",
          `Failed to fetch brands: ${response.status} - ${errorText}`,
        );
        throw new Error(`Zendesk API Error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as ZendeskBrandSearchResponse;
      onPage(data.brands);
      currentUrl = data.next_page || "";
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Connection Error",
      "Could not connect to Zendesk API. Please check your internet connection or API settings.",
    );
    throw error;
  }
}

export async function addTicketFieldOption(
  ticketFieldId: number,
  label: string,
  tag: string,
  instance: ZendeskInstance,
): Promise<void> {
  const url = `${buildZendeskUrl(instance, "")}/ticket_fields/${ticketFieldId}/options.json`;

  await zendeskFetch<void>(
    url,
    instance,
    {
      method: "POST",
      body: JSON.stringify({ custom_field_option: { name: label, value: tag } }),
    },
    "add ticket field option",
  );
}

export async function createUser(name: string, email: string, instance: ZendeskInstance): Promise<ZendeskUser> {
  const url = `${buildZendeskUrl(instance, "")}/users.json`;

  try {
    const data = await zendeskFetch<{ user: ZendeskUser }>(
      url,
      instance,
      {
        method: "POST",
        body: JSON.stringify({ user: { name, email, verified: true, skip_verify_email: true } }),
      },
      "create user",
    );
    return data.user;
  } catch (error) {
    // Handle specific error cases for user creation
    if (error instanceof Error && error.message.includes("Zendesk API Error")) {
      // The error is already handled by zendeskFetch, but we can add specific handling here if needed
      throw error;
    }
    throw error;
  }
}

export async function searchZendeskTickets(
  query: string,
  instance: ZendeskInstance,
  filters?: {
    userEmail?: string;
    userId?: string;
    groupId?: string;
    organizationId?: string;
    brandId?: string;
    formId?: string;
    recipient?: string;
    roleId?: string;
  },
): Promise<ZendeskTicket[]> {
  let searchTerms = query ? `type:ticket ${query}` : "type:ticket";
  if (filters?.userEmail) {
    searchTerms += ` requester:${filters.userEmail}`;
  }
  if (filters?.userId) {
    searchTerms += ` requester_id:${filters.userId}`;
  }
  if (filters?.groupId) {
    searchTerms += ` group:${filters.groupId}`;
  }
  if (filters?.organizationId) {
    searchTerms += ` organization:${filters.organizationId}`;
  }
  if (filters?.brandId) {
    searchTerms += ` brand:${filters.brandId}`;
  }
  if (filters?.formId) {
    searchTerms += ` form:${filters.formId}`;
  }
  if (filters?.recipient) {
    searchTerms += ` recipient:${filters.recipient}`;
  }
  if (filters?.roleId) {
    searchTerms += ` role:${filters.roleId}`;
  }
  const url = `${buildZendeskUrl(instance, "")}/search.json?query=${encodeURIComponent(searchTerms)}&per_page=30`;

  const data = await zendeskFetch<ZendeskTicketSearchResponse>(url, instance, {}, "fetch tickets");
  return data.results;
}

export async function searchZendeskViews(query: string, instance: ZendeskInstance): Promise<ZendeskView[]> {
  const url = `${buildZendeskUrl(instance, "")}/views.json?active=true`;

  const data = await zendeskFetch<ZendeskViewSearchResponse>(url, instance, {}, "fetch views");

  if (query) {
    return data.views.filter((view) => view.title.toLowerCase().includes(query.toLowerCase()));
  }

  return data.views;
}

export async function searchZendeskGroupMemberships(
  groupId: number,
  instance: ZendeskInstance,
  onPage: (memberships: ZendeskGroupMembership[]) => void,
): Promise<void> {
  const url = `${getZendeskUrl(instance)}/groups/${groupId}/memberships.json`;
  const headers = {
    Authorization: getZendeskAuthHeader(instance),
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      showToast(
        Toast.Style.Failure,
        "Zendesk API Error",
        `Failed to fetch group memberships: ${response.status} - ${errorText}`,
      );
      throw new Error(`Zendesk API Error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as ZendeskGroupMembershipResponse;
    onPage(data.group_memberships);
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Connection Error",
      "Could not connect to Zendesk API. Please check your internet connection or API settings.",
    );
    throw error;
  }
}

export async function searchZendeskUserGroupMemberships(
  userId: number,
  instance: ZendeskInstance,
  onPage: (memberships: ZendeskGroupMembership[]) => void,
): Promise<void> {
  const url = `${getZendeskUrl(instance)}/users/${userId}/group_memberships.json`;
  const headers = {
    Authorization: getZendeskAuthHeader(instance),
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      showToast(
        Toast.Style.Failure,
        "Zendesk API Error",
        `Failed to fetch user group memberships: ${response.status} - ${errorText}`,
      );
      throw new Error(`Zendesk API Error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as ZendeskGroupMembershipResponse;
    onPage(data.group_memberships);
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Connection Error",
      "Could not connect to Zendesk API. Please check your internet connection or API settings.",
    );
    throw error;
  }
}

export async function searchZendeskCustomRoles(query: string, instance: ZendeskInstance): Promise<ZendeskCustomRole[]> {
  const searchTerms = query;
  const url = searchTerms
    ? `${buildZendeskUrl(instance, "")}/custom_roles/search.json?query=${encodeURIComponent(searchTerms)}`
    : `${buildZendeskUrl(instance, "")}/custom_roles.json`;

  const data = await zendeskFetch<ZendeskCustomRoleSearchResponse>(url, instance, {}, "fetch custom roles");
  return data.custom_roles;
}

export async function getGroupUsers(groupId: number, instance: ZendeskInstance): Promise<ZendeskUser[]> {
  const url = `${buildZendeskUrl(instance, "")}/groups/${groupId}/users.json`;

  const data = await zendeskFetch<ZendeskUserSearchResponse>(url, instance, {}, "fetch group users");
  return data.users;
}

export async function getUserGroups(userId: number, instance: ZendeskInstance): Promise<ZendeskGroup[]> {
  const url = `${buildZendeskUrl(instance, "")}/users/${userId}/groups.json`;

  const data = await zendeskFetch<ZendeskGroupSearchResponse>(url, instance, {}, "fetch user groups");
  return data.groups;
}
