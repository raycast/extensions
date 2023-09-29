import { API_KEY, BASE_URL } from "./utils/constants";
import { Toast, showToast } from "@raycast/api";
import { ErrorResponse, GetRemainingRequestsResponse } from "./utils/types";
import fetch from "node-fetch";

export default async function GetRemainingRequests() {
  await showToast(Toast.Style.Animated, "Fetching Remaining Requests");

  const params = new URLSearchParams({ apikey: API_KEY });

  const apiResponse = await fetch(`${BASE_URL}status?` + params);
  if (!apiResponse.ok) {
    const { status } = apiResponse;
    const error = `${status} Error`;

    const response = (await apiResponse.json()) as ErrorResponse;

    await showToast(Toast.Style.Failure, error, response.error);
  } else {
    const response = await apiResponse.json() as GetRemainingRequestsResponse;
    await showToast(Toast.Style.Success, "SUCCESS", `Remaining Requests: ${response.remaining_requests}`);
  }
}