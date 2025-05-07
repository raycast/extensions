import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  "access-token": string;
  perPage: string;
  "remember-tag": boolean;
  detail: boolean;
  primaryAction: string;
}
export const {
  "access-token": personalAccessTokens,
  perPage,
  "remember-tag": rememberTag,
  detail: showDetail,
  primaryAction,
} = getPreferenceValues<Preferences>();
