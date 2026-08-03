import { Teardown } from "./types";

const attribution = {
  utm_source: "raycast",
  utm_medium: "extension",
  utm_campaign: "teardowns",
};

export function trackedUrl(url: string, content: "latest" | "daily"): string {
  const result = new URL(url);
  Object.entries({ ...attribution, utm_content: content }).forEach(
    ([key, value]) => result.searchParams.set(key, value),
  );
  return result.toString();
}

export function registrationUrl(content: "latest" | "daily"): string {
  return trackedUrl("https://nichefund.app/register/", content);
}

export function teardownUrl(
  teardown: Teardown,
  content: "latest" | "daily",
): string {
  return trackedUrl(teardown.url, content);
}
