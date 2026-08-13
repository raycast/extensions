import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Zoho",
  providerIcon: "zoho-mail.png",
  description: "Connect your Zoho account",
});

export const provider = new OAuthService({
  client,
  clientId: "1000.THQS4GQYCRT24CBM70XZGD9Q0BHN6G",
  scope: "ZohoMail.accounts.READ ZohoMail.messages.READ",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/QyDrUGb3ZrzvGpG5XH3rvT0Y4--N8go--_6wsvTDbWaQJlfMw9_OOmqLV42rToFgDWTg5ovvqOvzx5iVovOhCh4QBRveM5D40epSRw9FNJN01tu6Yudnka4KV6ce4uDWeacd5Jd5Py3fLPPYZupF",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/77N0FfhpvzS0dyop-G-l9aRvp8jYw_2Tjf4-SqIqZDwJDSUo1HRSSusPnfRfMwFVQqocz30YiHfXhMkuZHpvfpkFiCEdjlxdhMDiMbuyMFGqTtMCuoMXPDjl8bHl8wSRr5Yh_rDhKzQnLXIctgqdZw",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/a1y1yh6AJcveHlR8OJA7RfjAcW1U-Gnw_271PfqgDRnY4ArVHLB52CxmLVezczUmsQ-ZHDNxaxiIxHihBOGOEtmXqDxl3q7dfV83I10bWJvYsw4ExEUVBAKmy06OIMGEAIy9357lSiNLgjaPhs8nFQ",
});
