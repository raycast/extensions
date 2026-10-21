import { getPreferenceValues } from "@raycast/api";

const REQUEST_TIMEOUT_MILLISECONDS = 30_000;

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  params?: Record<string, string | number | boolean>;
  body?: unknown;
};

type ErrorBody = {
  description?: string;
  message?: string;
};

export class ZadigError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ZadigError";
  }
}

export const getBaseUrl = () => {
  const { domain } = getPreferenceValues<Preferences>();

  return `https://${domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")}`;
};

const parseJson = <T>(text: string): T | undefined => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const getFallbackMessage = (status: number) =>
  status === 401 ? "API token is invalid or expired" : `Zadig responded with HTTP ${status}`;

/**
 * Calls a Zadig OpenAPI endpoint.
 * @param path - Path under `/openapi`, with every dynamic segment already URI-encoded.
 * @returns The parsed JSON body, or `undefined` when the response has no body.
 */
export async function request<T>(path: string, { method = "GET", params, body }: RequestOptions = {}) {
  const { token } = getPreferenceValues<Preferences>();
  const baseUrl = getBaseUrl();
  const query = params
    ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])))}`
    : "";

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/openapi${path}${query}`, {
      method,
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";

    throw new Error(isTimeout ? `${baseUrl} did not respond in time` : `Cannot reach ${baseUrl}`, { cause: error });
  }

  const text = await response.text();

  if (!response.ok) {
    const errorBody = parseJson<ErrorBody>(text);

    throw new ZadigError(
      response.status,
      errorBody?.description || errorBody?.message || getFallbackMessage(response.status),
    );
  }

  if (!text) {
    return undefined as T;
  }

  const data = parseJson<T>(text);

  if (data === undefined) {
    throw new ZadigError(response.status, "Zadig returned a response that is not JSON");
  }

  return data;
}
