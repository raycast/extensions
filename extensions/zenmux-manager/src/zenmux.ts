import { Cache, Color, getPreferenceValues } from "@raycast/api";

const API_BASE_URL = "https://zenmux.ai/api/v1/management";
const CACHE_KEY = "zenmux-account-snapshot";
const cache = new Cache();

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type SubscriptionPlan = {
  tier: string;
  amount_usd: number;
  interval: string;
  expires_at?: string | null;
};

export type QuotaWindow = {
  usage_percentage?: number;
  resets_at?: string | null;
  max_flows?: number;
  used_flows?: number;
  remaining_flows?: number;
  used_value_usd?: number;
  max_value_usd?: number;
};

export type SubscriptionDetail = {
  plan?: SubscriptionPlan;
  currency?: string;
  base_usd_per_flow?: number;
  effective_usd_per_flow?: number;
  account_status?: string;
  quota_5_hour?: QuotaWindow;
  quota_7_day?: QuotaWindow;
  quota_monthly?: {
    max_flows?: number;
    max_value_usd?: number;
  };
};

export type PaygBalance = {
  currency?: string;
  total_credits?: number;
  top_up_credits?: number;
  bonus_credits?: number;
};

export type EndpointWarning = {
  title: string;
  message: string;
};

export type AccountSnapshot = {
  subscription?: SubscriptionDetail;
  payg?: PaygBalance;
  warnings: EndpointWarning[];
  fetchedAt: string;
};

export async function fetchAccountSnapshot(): Promise<AccountSnapshot> {
  const { managementApiKey: platformApiKey } = getPreferenceValues<Preferences>();
  const apiKey = platformApiKey?.trim();

  if (!apiKey) {
    throw new Error("Set your ZenMux Platform API key in extension preferences.");
  }

  const [subscriptionResult, paygResult] = await Promise.allSettled([
    requestZenMux<SubscriptionDetail>("/subscription/detail", apiKey),
    requestZenMux<PaygBalance>("/payg/balance", apiKey),
  ]);

  const warnings: EndpointWarning[] = [];
  const snapshot: AccountSnapshot = {
    warnings,
    fetchedAt: new Date().toISOString(),
  };

  if (subscriptionResult.status === "fulfilled") {
    if (hasSubscriptionData(subscriptionResult.value)) {
      snapshot.subscription = subscriptionResult.value;
    }
  } else {
    const message = getErrorMessage(subscriptionResult.reason);
    if (!isMissingSubscriptionError(message) || paygResult.status !== "fulfilled") {
      warnings.push({
        title: "Subscription",
        message,
      });
    }
  }

  if (paygResult.status === "fulfilled") {
    snapshot.payg = paygResult.value;
  } else {
    warnings.push({
      title: "PAYG Balance",
      message: getErrorMessage(paygResult.reason),
    });
  }

  if (!snapshot.subscription && !snapshot.payg) {
    throw new Error(warnings.map((warning) => `${warning.title}: ${warning.message}`).join("; "));
  }

  return snapshot;
}

async function requestZenMux<T>(path: string, apiKey: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  const responseText = await response.text();
  const payload = parseJson<ApiEnvelope<T>>(responseText);

  if (!response.ok || payload?.success === false) {
    const message = payload?.message || payload?.error || response.statusText || "Request failed";
    throw new Error(`${response.status} ${message}`.trim());
  }

  if (!payload || !("data" in payload)) {
    throw new Error("ZenMux returned an unexpected response.");
  }

  return payload.data as T;
}

function parseJson<T>(value: string): T | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function readCachedSnapshot(): AccountSnapshot | undefined {
  const cached = cache.get(CACHE_KEY);
  if (!cached) {
    return undefined;
  }

  return parseJson<AccountSnapshot>(cached);
}

export function cacheSnapshot(snapshot: AccountSnapshot) {
  cache.set(CACHE_KEY, JSON.stringify(snapshot));
}

export function formatAccountSnapshotForAI(snapshot?: AccountSnapshot): string {
  if (!snapshot) {
    return "ZenMux account data is unavailable.";
  }

  const subscription = snapshot.subscription;
  const payg = snapshot.payg;
  const sections = [
    `Fetched at: ${formatDateTime(snapshot.fetchedAt)}`,
    "",
    "PAYG:",
    `- Total balance: ${formatCurrency(payg?.total_credits, payg?.currency)}`,
    `- Top-up credits: ${formatCurrency(payg?.top_up_credits, payg?.currency)}`,
    `- Bonus credits: ${formatCurrency(payg?.bonus_credits, payg?.currency)}`,
  ];

  if (hasSubscriptionData(subscription)) {
    sections.splice(
      2,
      0,
      "Subscription:",
      `- Plan: ${formatPlan(subscription.plan)}`,
      `- Account status: ${formatStatus(subscription.account_status)}`,
      `- Flow rate: ${formatCurrency(subscription.effective_usd_per_flow, subscription.currency)}/Flow`,
      `- Subscription expires: ${formatDateTime(subscription.plan?.expires_at)}`,
      "",
      "Quota:",
      formatQuotaForAI("5-hour quota", subscription.quota_5_hour),
      formatQuotaForAI("7-day quota", subscription.quota_7_day),
      `- Monthly cap: ${formatFlows(subscription.quota_monthly?.max_flows)} (${formatCurrency(
        subscription.quota_monthly?.max_value_usd,
        subscription.currency,
      )})`,
      "",
    );
  }

  if (snapshot.warnings.length > 0) {
    sections.push(
      "",
      "Partial data warnings:",
      ...snapshot.warnings.map((warning) => `- ${warning.title}: ${warning.message}`),
    );
  }

  return sections.join("\n");
}

export type StatusDisplay =
  | "payg-both-left"
  | "payg-both-used"
  | "payg-5h-left"
  | "payg-5h-used"
  | "payg-7d-left"
  | "payg-7d-used"
  | "payg-only";

export function formatCommandSubtitle(snapshot?: AccountSnapshot, display: StatusDisplay = "payg-both-left"): string {
  if (!snapshot) {
    return "ZenMux account data unavailable";
  }

  const parts = [`PAYG ${formatCurrency(snapshot.payg?.total_credits, snapshot.payg?.currency)}`];

  if (hasSubscriptionData(snapshot.subscription)) {
    parts.push(...buildQuotaSubtitleParts(snapshot.subscription, display));
  }

  if (snapshot.warnings.length > 0) {
    parts.push("Partial data");
  }

  return parts.filter(Boolean).join(" · ");
}

export function hasSubscriptionData(subscription?: SubscriptionDetail): subscription is SubscriptionDetail {
  return Boolean(
    subscription?.plan?.tier ||
    subscription?.account_status ||
    subscription?.quota_5_hour ||
    subscription?.quota_7_day ||
    subscription?.quota_monthly,
  );
}

function isMissingSubscriptionError(message: string): boolean {
  return /(?:404|not found|no subscription|without subscription|subscription.*missing)/i.test(message);
}

function formatQuotaForAI(label: string, quota?: QuotaWindow): string {
  if (!quota) {
    return `- ${label}: unavailable`;
  }

  const used = getUsagePercentage(quota);
  const remaining = typeof used === "number" ? 1 - used : undefined;

  return [
    `- ${label}:`,
    `  - Used: ${formatPercentage(used)} (${formatFlows(quota.used_flows)} of ${formatFlows(quota.max_flows)})`,
    `  - Remaining: ${formatPercentage(remaining)} (${formatFlows(quota.remaining_flows)})`,
    `  - Resets in: ${formatRelativeDuration(quota.resets_at)} (${formatDateTime(quota.resets_at)})`,
    `  - USD value used: ${formatCurrency(quota.used_value_usd)} of ${formatCurrency(quota.max_value_usd)}`,
  ].join("\n");
}

export function getUsagePercentage(quota: QuotaWindow): number | undefined {
  if (typeof quota.usage_percentage === "number") {
    return quota.usage_percentage;
  }

  if (typeof quota.used_flows === "number" && typeof quota.max_flows === "number" && quota.max_flows > 0) {
    return quota.used_flows / quota.max_flows;
  }

  return undefined;
}

function buildQuotaSubtitleParts(subscription: SubscriptionDetail, display: StatusDisplay): string[] {
  switch (display) {
    case "payg-both-used":
      return [
        formatQuotaSubtitleValue("5h", subscription.quota_5_hour, "used"),
        formatQuotaSubtitleValue("7d", subscription.quota_7_day, "used"),
      ];
    case "payg-5h-left":
      return [formatQuotaSubtitleValue("5h", subscription.quota_5_hour, "left")];
    case "payg-5h-used":
      return [formatQuotaSubtitleValue("5h", subscription.quota_5_hour, "used")];
    case "payg-7d-left":
      return [formatQuotaSubtitleValue("7d", subscription.quota_7_day, "left")];
    case "payg-7d-used":
      return [formatQuotaSubtitleValue("7d", subscription.quota_7_day, "used")];
    case "payg-only":
      return [];
    case "payg-both-left":
    default:
      return [
        formatQuotaSubtitleValue("5h", subscription.quota_5_hour, "left"),
        formatQuotaSubtitleValue("7d", subscription.quota_7_day, "left"),
      ];
  }
}

function formatQuotaSubtitleValue(label: string, quota: QuotaWindow | undefined, mode: "left" | "used"): string {
  const usage = quota ? getUsagePercentage(quota) : undefined;
  const value = mode === "left" && typeof usage === "number" ? 1 - usage : usage;
  return `${label} ${formatPercentage(value)} ${mode}`;
}

export function getUsageColor(value?: number): Color {
  if (!isFiniteNumber(value)) {
    return Color.SecondaryText;
  }

  if (value >= 0.95) {
    return Color.Red;
  }

  if (value >= 0.8) {
    return Color.Yellow;
  }

  return Color.Green;
}

export function formatPlan(plan?: SubscriptionPlan): string {
  if (!plan?.tier) {
    return "Unavailable";
  }

  const tier = plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1);
  const price = formatCurrency(plan.amount_usd, "usd");
  return `${tier} (${price}/${plan.interval || "month"})`;
}

export function formatStatus(status?: string): string {
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getStatusColor(status?: string): Color {
  switch (status) {
    case "healthy":
      return Color.Green;
    case "monitored":
      return Color.Yellow;
    case "abusive":
    case "suspended":
    case "banned":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export function formatFlows(value?: number): string {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  return `${formatNumber(value)} Flow`;
}

export function formatCurrency(value?: number, currency = "usd"): string {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  const safeCode = currency.toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCode,
      maximumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  } catch {
    return `${safeCode} ${value.toFixed(value < 1 ? 4 : 2)}`;
  }
}

export function formatPercentage(value?: number): string {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 10 ? 2 : 1,
  }).format(value);
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeDuration(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const target = new Date(value).getTime();
  if (Number.isNaN(target)) {
    return formatDateTime(value);
  }

  const remainingMs = target - Date.now();
  if (remainingMs <= 0) {
    return "now";
  }

  const minutes = Math.ceil(remainingMs / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return `${mins}m`;
}

function isFiniteNumber(value?: number): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
