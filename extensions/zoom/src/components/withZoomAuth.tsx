import { OAuthService, getAccessToken, withAccessToken } from "@raycast/utils";

export const zoom = OAuthService.zoom({
  clientId: "C_EgncmFQYWrxiZ1lEHFA",
  authorizeUrl: "https://zoom.oauth.raycast.com/authorize",
  tokenUrl: "https://zoom.oauth.raycast.com/token",
  refreshTokenUrl: "https://zoom.oauth.raycast.com/refresh-token",
  scope: "",
  bodyEncoding: "json",
});

export function withZoomAuth<T>(Component: React.ComponentType<T>) {
  return withAccessToken<T>(zoom)(Component);
}

export function getOAuthToken(): string {
  const { token } = getAccessToken();
  return token;
}
