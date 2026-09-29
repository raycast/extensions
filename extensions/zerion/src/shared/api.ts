import { getAccessToken } from "@raycast/utils";
import { DASHBOARD_URL, clearStoredApiKey } from "./oauth";
import { markSessionRevoked } from "./session";

export const API_URL = "https://api.zerion.io/v1/";
export { DASHBOARD_URL };

export function getApiKey(): string | undefined {
  try {
    return getAccessToken().token;
  } catch {
    // Outside a withAccessToken context (menu bar) — callers there read the
    // stored key asynchronously and pass it to getApiHeaders explicitly.
    return undefined;
  }
}

export function getApiHeaders(apiKey: string | undefined = getApiKey()) {
  return {
    accept: "application/json",
    ...(apiKey ? { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` } : {}),
  };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiErrorWithStatus(error: unknown, status: number): error is ApiError {
  return error instanceof ApiError && error.status === status;
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `Zerion API request failed with status ${response.status}`;
    if (response.status === 401) {
      // The stored key was revoked or disabled — sign the user out so the
      // next command launch (or tool call) re-triggers the OAuth flow, and
      // flag the session so the current command's gate can offer re-sign-in
      // whichever request hit the 401.
      await clearStoredApiKey();
      markSessionRevoked();
      detail =
        "The Zerion API key is no longer valid, so you have been signed out. Run any Zerion command to sign in again.";
    } else if (response.status === 429) {
      detail = `Zerion API rate limit reached. Check your usage at ${DASHBOARD_URL}.`;
    } else {
      try {
        const body = (await response.json()) as { errors?: { title?: string; detail?: string }[] };
        const firstError = body?.errors?.[0];
        if (firstError?.title || firstError?.detail) {
          detail = [firstError.title, firstError.detail].filter(Boolean).join(": ");
        }
      } catch {
        // keep the generic message
      }
    }
    throw new ApiError(response.status, detail);
  }
  return response.json() as Promise<T>;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { headers: getApiHeaders() });
  return parseApiResponse<T>(response);
}

// Wire types for the JSON:API responses of api.zerion.io

export interface ApiPortfolioAttributes {
  positions_distribution_by_type: {
    wallet: number;
    deposited: number;
    borrowed: number;
    locked: number;
    staked: number;
  };
  positions_distribution_by_chain: Record<string, number>;
  total: { positions: number };
  changes: { absolute_1d: number; percent_1d: number };
}

export type ApiPositionType = "wallet" | "deposit" | "loan" | "locked" | "staked" | "reward" | "investment";

export interface ApiFungibleImplementation {
  chain_id: string;
  address: string | null;
  decimals: number;
  market_data?: { trading_volumes?: { volume_1d?: number } };
}

export interface ApiPosition {
  type: string;
  id: string;
  attributes: {
    name: string;
    quantity: { int: string; decimals: number; float: number; numeric: string };
    parent: string | null;
    protocol: string | null;
    position_type: ApiPositionType | null;
    value: number | null;
    price: number | null;
    changes: { absolute_1d: number; percent_1d: number } | null;
    fungible_info: {
      name: string;
      symbol: string;
      icon: { url: string | null } | null;
      flags: { verified: boolean };
      implementations: ApiFungibleImplementation[];
    };
    flags: { displayable: boolean; is_trash: boolean };
  };
  relationships: {
    chain: { data: { type: string; id: string } };
    fungible: { data: { type: string; id: string } };
    dapp?: { data: { type: string; id: string } };
  };
}

export interface ApiFungible {
  type: string;
  id: string;
  attributes: {
    name: string;
    symbol: string;
    description: string | null;
    icon: { url: string | null } | null;
    flags: { verified: boolean };
    external_links?: { type?: string; name?: string; url: string }[];
    implementations: ApiFungibleImplementation[];
    market_data: {
      price: number | null;
      total_supply?: number;
      circulating_supply?: number;
      fully_diluted_valuation?: number;
      market_cap?: number;
      trading_volumes?: { volume_1d?: number };
      changes?: {
        percent_1d: number | null;
        percent_30d: number | null;
        percent_90d: number | null;
        percent_365d: number | null;
      };
    };
  };
}

// FIFO-based gains; the same shape describes the whole wallet and each entry of `breakdown`
export interface ApiPnlStats {
  total_gain: number;
  realized_gain: number;
  unrealized_gain: number;
  relative_total_gain_percentage: number;
  relative_realized_gain_percentage: number;
  relative_unrealized_gain_percentage: number;
  total_invested: number;
  net_invested: number;
  realized_cost_basis: number;
  total_fee: number;
  received_external: number;
  sent_external: number;
  sent_for_nfts: number;
  received_for_nfts: number;
}

export type ApiPnlBreakdownStats = ApiPnlStats & {
  average_buy_price?: number | null;
  average_sell_price?: number | null;
};

export interface ApiWalletPnlAttributes extends ApiPnlStats {
  // Only present for implementation filters and multi-id requests
  breakdown?: {
    by_id?: Record<string, ApiPnlBreakdownStats>;
    by_implementation?: Record<string, ApiPnlBreakdownStats>;
  };
}

export interface ApiWalletPnlResponse {
  data: { type: string; id: string; attributes: ApiWalletPnlAttributes };
  meta?: { excluded_fungible_ids?: string[] };
}

export interface ApiChain {
  type: string;
  id: string;
  attributes: {
    name: string;
    external_id?: string;
    icon: { url: string | null } | null;
    explorer?: {
      name: string;
      token_url_format?: string;
      tx_url_format?: string;
      home_url?: string;
    } | null;
  };
}

export type ApiChartPeriod = "hour" | "day" | "week" | "month" | "3months" | "6months" | "year" | "5years" | "max";

export interface ApiChartAttributes {
  begin_at: string;
  end_at: string;
  stats: { first: number; min: number; avg: number; max: number; last: number };
  points: [number, number][];
}

// Wallet charts omit `stats`; points are [unix seconds, usd value]
export type ApiWalletChartAttributes = Omit<ApiChartAttributes, "stats">;

export interface ApiQuantity {
  int: string;
  decimals: number;
  float: number;
  numeric: string;
}

export interface ApiFungibleInfo {
  id?: string;
  name: string;
  symbol: string;
  icon: { url: string | null } | null;
  flags: { verified: boolean };
  implementations: ApiFungibleImplementation[];
}

export interface ApiNftInfo {
  contract_address: string;
  token_id: string;
  name: string;
  interface: "erc721" | "erc1155";
  content?: { preview?: { url: string }; detail?: { url: string } };
  flags: { is_spam?: boolean };
}

export type ApiOperationType =
  | "approve"
  | "bid"
  | "burn"
  | "claim"
  | "delegate"
  | "deploy"
  | "deposit"
  | "execute"
  | "mint"
  | "receive"
  | "revoke"
  | "revoke_delegation"
  | "send"
  | "trade"
  | "withdraw";

export interface ApiTransaction {
  type: string;
  id: string;
  attributes: {
    operation_type: ApiOperationType;
    hash: string;
    mined_at_block: number | null;
    /** Null while the transaction is pending */
    mined_at: string | null;
    sent_from: string;
    sent_to: string;
    status: "confirmed" | "failed" | "pending";
    nonce: number;
    fee: {
      fungible_info: ApiFungibleInfo | null;
      quantity: ApiQuantity;
      price: number | null;
      value: number | null;
    } | null;
    transfers: {
      fungible_info?: ApiFungibleInfo;
      nft_info?: ApiNftInfo;
      direction: "in" | "out" | "self";
      quantity: ApiQuantity;
      value: number | null;
      price: number | null;
      sender: string;
      recipient: string;
      act_id: string;
    }[];
    approvals: {
      fungible_info?: ApiFungibleInfo;
      nft_info?: ApiNftInfo;
      quantity: ApiQuantity;
      sender: string;
      act_id: string;
    }[];
    collection_approvals?: {
      collection_info?: { id: string; name: string; icon_url: string };
      cancelled: boolean;
      spender: string;
      act_id: string;
    }[];
    application_metadata?: {
      name?: string;
      icon?: { url: string | null } | null;
      contract_address: string;
      method?: { id?: string; name?: string };
    };
    flags?: { is_trash?: boolean };
  };
  relationships: {
    chain: { data: { type: string; id: string } };
    dapp?: { data: { type: string; id: string } };
  };
}

export interface ApiTransactionsResponse {
  links: { self: string; next?: string };
  data: ApiTransaction[];
}
