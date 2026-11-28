import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Zoho",
  providerIcon: "zoho-mail.png",
  description: "Connect your Zoho account",
});

const scopes = [
  "ZohoMail.accounts.READ",
  "ZohoMail.folders.READ",
  "ZohoMail.messages.READ",
  "ZohoMail.messages.UPDATE",
  "ZohoMail.organization.accounts.READ",
  "ZohoMail.organization.domains.READ",
  "ZohoMail.partner.organization.READ",
];

export const provider = new OAuthService({
  client,
  clientId: "1000.E41PIH3QNGZSZYJ2PS89AMZVOR50RK",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/L56YnDJ7Pyv-SZlWPCgVlUHSVMI4Eo71Yzox2S9xDRtI83vegut87tcNRpoby4W-_L3m6rYKozB71tAb1THv3G00VX-9rvnQ5klOYengXzr7E8GE6pEIFP9rCqF2KCHqAV_yVzzjYYgt7ztx3FS1",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/IzJ2IgubKiVDyntspLduHwp2fbqLnidriix9jaZCAzZbj2wdsPWfJpv3TUtpQCRyopHNO1YPx0HgWOiQlaIaDiJu8zCrnvxFsp9beqRPVE1w5acImQsJ3BHoVq36OD3mAS6BV0FlkgzkPWjcqjMvzg",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/PkgYXNFbQinA8SK-3Wvcl8xdP7Hq-kaX6ur_sct3_qk_ATrFgb8uneFkkpkwlACWOjsnG_TIvW75N7SdQ9Afd-ZfeKxtqdHj2yYEfg5Y0oueBi8zBwGoRWc-sglHUgecZaF2PQfuzqKZ0JoXL2JP4w",
  scope: scopes.join(" "),
  extraParameters: {
    access_type: "offline",
  },
  bodyEncoding: "url-encoded",
});
