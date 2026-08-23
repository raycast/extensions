import { getAccessToken } from "@raycast/utils";
import { Result } from "./types";

export const API_URL = "https://mail.zoho.com/api";
export const PAGE_LIMIT = 20;
export const getZohoHeaders = () => {
  const { token } = getAccessToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Zoho-oauthtoken ${token}`,
  };
};
export const parseZohoResponse = async <T>(response: Response) => {
  const result = (await response.json()) as
    | Result<T>
    | [
        number,
        {
          msg: string;
          errorCode: string;
          authFail: string;
          status: string;
        },
      ];
  if (Array.isArray(result)) throw new Error(result[1].errorCode);
  if (!response.ok) throw new Error(result.status.description);
  return result.data;
};
