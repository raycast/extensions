import { getPreferenceValues, showToast, Toast } from "@raycast/api";

export interface ZendeskInstance {
  name: string;
  subdomain: string;
  user: string;
  api_key: string;
  color?: string;
  production?: boolean;
}

interface Preferences {
  instanceNames: string;
  subdomains: string;
  users: string;
  apiKeys: string;
  colors?: string;
  productionFlags?: string;
}

function parseCommaSeparatedString(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function validatePreferences(preferences: Preferences): { isValid: boolean; error?: string } {
  const names = parseCommaSeparatedString(preferences.instanceNames);
  const subdomains = parseCommaSeparatedString(preferences.subdomains);
  const users = parseCommaSeparatedString(preferences.users);
  const apiKeys = parseCommaSeparatedString(preferences.apiKeys);
  const colors = preferences.colors ? parseCommaSeparatedString(preferences.colors) : [];
  const productionFlags = preferences.productionFlags ? parseCommaSeparatedString(preferences.productionFlags) : [];

  // Check if required arrays have the same length
  if (names.length === 0) {
    return { isValid: false, error: "At least one instance name is required" };
  }

  if (names.length !== subdomains.length) {
    return {
      isValid: false,
      error: `Mismatch: ${names.length} names but ${subdomains.length} subdomains. All comma-separated lists must have the same number of items.`,
    };
  }

  if (names.length !== users.length) {
    return {
      isValid: false,
      error: `Mismatch: ${names.length} names but ${users.length} users. All comma-separated lists must have the same number of items.`,
    };
  }

  if (names.length !== apiKeys.length) {
    return {
      isValid: false,
      error: `Mismatch: ${names.length} names but ${apiKeys.length} API keys. All comma-separated lists must have the same number of items.`,
    };
  }

  // Check optional arrays
  if (colors.length > 0 && colors.length !== names.length) {
    return {
      isValid: false,
      error: `Mismatch: ${names.length} names but ${colors.length} colors. All comma-separated lists must have the same number of items.`,
    };
  }

  if (productionFlags.length > 0 && productionFlags.length !== names.length) {
    return {
      isValid: false,
      error: `Mismatch: ${names.length} names but ${productionFlags.length} production flags. All comma-separated lists must have the same number of items.`,
    };
  }

  // Validate production flags format
  for (let i = 0; i < productionFlags.length; i++) {
    const flag = productionFlags[i].toLowerCase();
    if (flag !== "true" && flag !== "false") {
      return {
        isValid: false,
        error: `Invalid production flag at position ${i + 1}: "${productionFlags[i]}". Must be 'true' or 'false'.`,
      };
    }
  }

  return { isValid: true };
}

export function getZendeskInstances(): ZendeskInstance[] {
  const preferences = getPreferenceValues<Preferences>();

  // Validate preferences
  const validation = validatePreferences(preferences);
  if (!validation.isValid) {
    showToast({
      style: Toast.Style.Failure,
      title: "Configuration Error",
      message: validation.error || "Invalid configuration",
    });
    return [];
  }

  // Parse comma-separated values
  const names = parseCommaSeparatedString(preferences.instanceNames);
  const subdomains = parseCommaSeparatedString(preferences.subdomains);
  const users = parseCommaSeparatedString(preferences.users);
  const apiKeys = parseCommaSeparatedString(preferences.apiKeys);
  const colors = preferences.colors ? parseCommaSeparatedString(preferences.colors) : [];
  const productionFlags = preferences.productionFlags ? parseCommaSeparatedString(preferences.productionFlags) : [];

  // Build instances array
  const instances: ZendeskInstance[] = [];

  for (let i = 0; i < names.length; i++) {
    const instance: ZendeskInstance = {
      name: names[i],
      subdomain: subdomains[i],
      user: users[i],
      api_key: apiKeys[i],
    };

    // Add optional properties if provided
    if (colors.length > i) {
      instance.color = colors[i];
    }

    if (productionFlags.length > i) {
      instance.production = productionFlags[i].toLowerCase() === "true";
    }

    instances.push(instance);
  }

  return instances;
}
