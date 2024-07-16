import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const { googleClientId } = getPreferenceValues();

export const RaycastGoogleOAuthService = OAuthService.google({
  clientId: googleClientId,
  scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/meetings.space.created",
});
