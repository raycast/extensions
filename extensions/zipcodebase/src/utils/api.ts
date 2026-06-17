import { Toast, showToast } from "@raycast/api";
import {
  ErrorResponse,
  GetPostalCodeDistanceResponse,
  GetPostalCodeLocationInformationResponse,
  GetPostalCodesByCityResponse,
  GetPostalCodesByStateResponse,
  GetPostalCodesWithinDistanceResponse,
  GetPostalCodesWithinRadiusResponse,
  GetRemainingRequestsResponse,
  GetStatesByCountryResponse,
} from "./types";
import { API_KEY, BASE_URL, DEFAULT_LIMIT, DEFAULT_UNIT } from "./constants";
import checkIfDefaultLimitIsValid from "./functions";

const callApi = async <T>(endpoint: string, animatedToastMessage = "", params?: Record<string, string>) => {
  const toast = await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);
  try {
    const apiResponse = await fetch(BASE_URL + endpoint + `?${new URLSearchParams({ apikey: API_KEY, ...params })}`);
    if (!apiResponse.headers.get("content-type")?.includes("application/json")) throw new Error("Unknown Error");
    if (!apiResponse.ok) {
      const response = (await apiResponse.json()) as ErrorResponse;
      const message =
        "error" in response
          ? response.error
          : Object.entries(response.errors[0]).map(([key, val]) => `${key}: ${val}`)[0];
      throw new Error(message, { cause: response });
    } else {
      // This is undocumented in the documentation but some endpoints return an error INSIDE results object.
      // Rather than re-declaring types on the off-chance "error" is sent,
      // this codeblock checks if "error" is present then returns an Error object.
      const response = (await apiResponse.json()) as {
        results?: {
          error?: string;
        };
      };
      if (response.results?.error) throw new Error(response.results.error);
      return response as T;
    }
  } catch (error) {
    const err = error as Error;
    toast.style = Toast.Style.Failure;
    toast.title = `${err.cause || "Error"}`;
    toast.message = err.message;
    if (err.cause) return err.cause as ErrorResponse;
    return { error: err.message } as ErrorResponse;
  }
};

export async function getRemainingRequests() {
  return await callApi<GetRemainingRequestsResponse>(`status`, "Fetching Remaining Requests");
}
export async function getStatesByCountry(country: string) {
  return await callApi<GetStatesByCountryResponse>(`country/province`, `Fetching States in ${country}`, { country });
}

export async function getPostalCodesByCity(city: string, country: string, state_name: string) {
  const limitIsValid = await checkIfDefaultLimitIsValid();
  if ("error" in limitIsValid) return limitIsValid as ErrorResponse;
  const limit = DEFAULT_LIMIT;

  return await callApi<GetPostalCodesByCityResponse>(
    `code/city`,
    `Fetching ${limit} Codes in ${city} (${country}) [${state_name || "null"}]`,
    { city, country, state_name, limit },
  );
}
export async function getPostalCodesByState(state_name: string, country: string) {
  const limitIsValid = await checkIfDefaultLimitIsValid();
  if ("error" in limitIsValid) return limitIsValid as ErrorResponse;
  const limit = DEFAULT_LIMIT;

  return await callApi<GetPostalCodesByStateResponse>(
    `code/state`,
    `Fetching ${limit} Codes in ${state_name} (${country})`,
    { state_name, country, limit },
  );
}

export async function getPostalCodeLocationInformation(codes: string, country: string) {
  let message = "Fetching Location Information";
  if (country) message += ` in ${country}`;

  return await callApi<GetPostalCodeLocationInformationResponse>(`search`, message, { codes, country });
}

export async function getPostalCodeDistance(code: string, compare: string, country: string) {
  return await callApi<GetPostalCodeDistanceResponse>(
    `distance`,
    `Fetching Distance between ${code} and ${compare} in ${country}`,
    { code, compare, country, unit: DEFAULT_UNIT },
  );
}

export async function getPostalCodesWithinRadius(code: string, radius: string, country: string) {
  return await callApi<GetPostalCodesWithinRadiusResponse>(
    `radius`,
    `Fetching Codes within ${radius}${DEFAULT_UNIT} of ${code} in ${country}`,
    { code, radius, country },
  );
}
export async function getPostalCodesWithinDistance(codes: string, distance: string, country: string) {
  return await callApi<GetPostalCodesWithinDistanceResponse>(
    `match`,
    `Fetching Codes within ${distance}${DEFAULT_UNIT}`,
    {
      codes,
      distance,
      country,
      unit: DEFAULT_UNIT,
    },
  );
}
