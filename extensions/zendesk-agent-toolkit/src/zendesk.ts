import { getPreferenceValues, showToast, Toast } from "@raycast/api";
function getBaseUrl(): string {
  const { subdomain } = getPreferenceValues<Preferences>();
  return `https://${subdomain}.zendesk.com`;
}

export function getAuthHeader(): string {
  const { email, apiToken } = getPreferenceValues<Preferences>();
  const token = Buffer.from(`${email}/token:${apiToken}`).toString("base64");
  return `Basic ${token}`;
}

export async function zdFetch<T>(path: string, init: any = {}): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...(init.headers || {}),
    },
  });
  if (res.status === 429) {
    const retry = parseInt(res.headers.get("Retry-After") || "1", 10) * 1000;
    await showToast({
      style: Toast.Style.Animated,
      title: "Rate limited",
      message: `Retrying in ${Math.ceil(retry / 1000)}s`,
    });
    await new Promise((r) => setTimeout(r, retry));
    return zdFetch<T>(path, init);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`.trim());
  }
  return (await res.json()) as T;
}

export function getAgentTicketUrl(id: number): string {
  return `${getBaseUrl()}/agent/tickets/${id}`;
}

let cachedCurrentUserId: number | null = null;

export async function getCurrentUserId(): Promise<number> {
  if (cachedCurrentUserId) return cachedCurrentUserId;
  const me = await zdFetch<{ user: { id: number } }>("/api/v2/users/me.json");
  cachedCurrentUserId = me.user.id;
  return cachedCurrentUserId;
}

// Macro-related interfaces and functions
export interface Macro {
  id: number;
  title: string;
  active: boolean;
  actions: MacroAction[];
  created_at: string;
  updated_at: string;
  description?: string;
}

export interface MacroAction {
  field: string;
  value: string | number | boolean | null;
}

export interface MacrosResponse {
  macros: Macro[];
  next_page?: string;
  previous_page?: string;
  count: number;
}

export interface MacroApplicationResponse {
  result: {
    ticket: {
      id: number;
      subject: string;
      status: string;
      comment?: {
        body: string;
        public: boolean;
      };
    };
  };
}

// Fetch all available macros
export async function getMacros(): Promise<Macro[]> {
  const response = await zdFetch<MacrosResponse>("/api/v2/macros.json?per_page=100");
  return response.macros.filter((macro) => macro.active);
}

// Apply a macro to a ticket
export async function applyMacro(ticketId: number, macroId: number): Promise<MacroApplicationResponse> {
  // Try multiple endpoint formats to find the correct one
  const endpoints = [
    `/api/v2/tickets/${ticketId}/macros/${macroId}/apply.json`,
    `/api/v2/macros/${macroId}/apply.json`,
    `/api/v2/macros/${macroId}/apply`,
  ];

  console.log("Applying macro:", { ticketId, macroId, endpoints });

  for (const url of endpoints) {
    try {
      console.log(`Trying endpoint: ${url}`);

      let result;
      if (url.includes("/tickets/")) {
        // Ticket-specific endpoint uses PUT
        result = await zdFetch<MacroApplicationResponse>(url, { method: "PUT" });
      } else {
        // General macro endpoint uses POST with body
        result = await zdFetch<MacroApplicationResponse>(url, {
          method: "POST",
          body: JSON.stringify({
            macro: { id: macroId },
            ticket: { id: ticketId },
          }),
        });
      }

      console.log(`Macro applied successfully with endpoint: ${url}`, result);
      return result;
    } catch (error) {
      console.error(`Endpoint ${url} failed:`, error);
      if (url === endpoints[endpoints.length - 1]) {
        // This was the last endpoint, throw the error
        throw error;
      }
      // Continue to next endpoint
    }
  }

  throw new Error("All macro application endpoints failed");
}

// Create a new macro
export async function createMacro(macroData: {
  title: string;
  description?: string;
  actions: MacroAction[];
}): Promise<{ macro: Macro }> {
  try {
    console.log("Sending macro creation request to Zendesk API...");
    console.log("Request body:", JSON.stringify({ macro: macroData }, null, 2));

    const result = await zdFetch<{ macro: Macro }>("/api/v2/macros.json", {
      method: "POST",
      body: JSON.stringify({ macro: macroData }),
    });

    console.log("Zendesk API response:", result);
    return result;
  } catch (error) {
    console.error("Zendesk API error:", error);
    throw error;
  }
}

// Get macro preview (what would happen if applied)
export async function getMacroPreview(ticketId: number, macroId: number) {
  return await zdFetch<MacroApplicationResponse>(`/api/v2/macros/${macroId}/apply.json?get_changes_only=true`, {
    method: "POST",
    body: JSON.stringify({
      macro: {
        id: macroId,
      },
      ticket: {
        id: ticketId,
      },
    }),
  });
}

// Help Center article management functions

export async function promoteArticle(
  articleId: number,
): Promise<{ article: { id: number; title: string; promoted: boolean } }> {
  return await zdFetch<{ article: { id: number; title: string; promoted: boolean } }>(
    `/api/v2/help_center/articles/${articleId}.json`,
    {
      method: "PUT",
      body: JSON.stringify({
        article: {
          promoted: true,
        },
      }),
    },
  );
}

export async function archiveArticle(
  articleId: number,
): Promise<{ article: { id: number; title: string; archived: boolean } }> {
  return await zdFetch<{ article: { id: number; title: string; archived: boolean } }>(
    `/api/v2/help_center/articles/${articleId}.json`,
    {
      method: "PUT",
      body: JSON.stringify({
        article: {
          archived: true,
        },
      }),
    },
  );
}

export async function getArticleDetails(articleId: number): Promise<{
  article: {
    id: number;
    title: string;
    body: string;
    section_id: number;
    draft: boolean;
    archived: boolean;
    promoted: boolean;
    outdated?: boolean;
    html_url: string;
    created_at: string;
    updated_at: string;
  };
}> {
  return await zdFetch<{
    article: {
      id: number;
      title: string;
      body: string;
      section_id: number;
      draft: boolean;
      archived: boolean;
      promoted: boolean;
      outdated?: boolean;
      html_url: string;
      created_at: string;
      updated_at: string;
    };
  }>(`/api/v2/help_center/articles/${articleId}.json`);
}

// Test function to see what article fields are actually returned
export async function debugArticleFields(articleId: number): Promise<any> {
  try {
    const response = await zdFetch<any>(`/api/v2/help_center/articles/${articleId}.json`);
    console.log("Article fields:", Object.keys(response.article));
    console.log("Full article data:", response.article);
    return response.article;
  } catch (error) {
    console.error("Error fetching article:", error);
    throw error;
  }
}

// Get ticket field details including options
export async function getTicketField(fieldId: string): Promise<{
  id: number;
  title: string;
  type: string;
  custom_field_options?: Array<{
    id: number;
    name: string;
    value: string;
    default?: boolean;
  }>;
}> {
  const response = await zdFetch<{
    ticket_field: {
      id: number;
      title: string;
      type: string;
      custom_field_options?: Array<{
        id: number;
        name: string;
        value: string;
        default?: boolean;
      }>;
    };
  }>(`/api/v2/ticket_fields/${fieldId}.json`);

  return response.ticket_field;
}
