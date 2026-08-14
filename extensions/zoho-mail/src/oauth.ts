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
  clientId: "1000.E41PIH3QNGZSZYJ2PS89AMZVOR50RK",
  authorizeUrl: "https://oauth.raycast.com/v1/authorize/L56YnDJ7Pyv-SZlWPCgVlUHSVMI4Eo71Yzox2S9xDRtI83vegut87tcNRpoby4W-_L3m6rYKozB71tAb1THv3G00VX-9rvnQ5klOYengXzr7E8GE6pEIFP9rCqF2KCHqAV_yVzzjYYgt7ztx3FS1",
  tokenUrl: "https://oauth.raycast.com/v1/token/IzJ2IgubKiVDyntspLduHwp2fbqLnidriix9jaZCAzZbj2wdsPWfJpv3TUtpQCRyopHNO1YPx0HgWOiQlaIaDiJu8zCrnvxFsp9beqRPVE1w5acImQsJ3BHoVq36OD3mAS6BV0FlkgzkPWjcqjMvzg",
  refreshTokenUrl: "https://oauth.raycast.com/v1/refresh-token/PkgYXNFbQinA8SK-3Wvcl8xdP7Hq-kaX6ur_sct3_qk_ATrFgb8uneFkkpkwlACWOjsnG_TIvW75N7SdQ9Afd-ZfeKxtqdHj2yYEfg5Y0oueBi8zBwGoRWc-sglHUgecZaF2PQfuzqKZ0JoXL2JP4w",
  scope: "ZohoMail.accounts.READ ZohoMail.folders.READ ZohoMail.messages.READ ZohoMail.messages.UPDATE ZohoMail.organization.domains.READ ZohoMail.partner.organization.READ",
  extraParameters: {
    access_type: "offline"
  },
  bodyEncoding: "url-encoded"
});
// export const provider = new OAuthService({
//   client,
//   clientId: "1000.THQS4GQYCRT24CBM70XZGD9Q0BHN6G",
//   scope: "ZohoMail.accounts.READ ZohoMail.messages.READ ZohoMail.folders.READ",
//   authorizeUrl:
//     "https://oauth.raycast.com/v1/authorize/QyDrUGb3ZrzvGpG5XH3rvT0Y4--N8go--_6wsvTDbWaQJlfMw9_OOmqLV42rToFgDWTg5ovvqOvzx5iVovOhCh4QBRveM5D40epSRw9FNJN01tu6Yudnka4KV6ce4uDWeacd5Jd5Py3fLPPYZupF",
//   tokenUrl:
//     "https://oauth.raycast.com/v1/token/77N0FfhpvzS0dyop-G-l9aRvp8jYw_2Tjf4-SqIqZDwJDSUo1HRSSusPnfRfMwFVQqocz30YiHfXhMkuZHpvfpkFiCEdjlxdhMDiMbuyMFGqTtMCuoMXPDjl8bHl8wSRr5Yh_rDhKzQnLXIctgqdZw",
//   refreshTokenUrl:
//     "https://oauth.raycast.com/v1/refresh-token/a1y1yh6AJcveHlR8OJA7RfjAcW1U-Gnw_271PfqgDRnY4ArVHLB52CxmLVezczUmsQ-ZHDNxaxiIxHihBOGOEtmXqDxl3q7dfV83I10bWJvYsw4ExEUVBAKmy06OIMGEAIy9357lSiNLgjaPhs8nFQ",
// });
