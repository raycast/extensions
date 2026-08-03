import { Teardown } from "./types";

export function registrationUrl(): string {
  return "https://nichefund.app/register/";
}

export function teardownArchiveUrl(): string {
  return "https://nichefund.app/teardowns/";
}

export function teardownUrl(teardown: Teardown): string {
  return teardown.url;
}
