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
import fetch from "node-fetch";
import { API_KEY, BASE_URL, DEFAULT_LIMIT, DEFAULT_UNIT } from "./constants";
import checkIfDefaultLimitIsValid from "./functions";

const callApi = async (endpoint: string, animatedToastMessage = "") => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  const apiResponse = await fetch(BASE_URL + endpoint);

  if (!apiResponse.ok) {
    const { status } = apiResponse;
    const error = `${status} Error`;

    const response = (await apiResponse.json()) as ErrorResponse;

    if ("error" in response) {
      await showToast(Toast.Style.Failure, error, response.error);
    } else {
      const message = Object.entries(response.errors[0]).map(([key, val]) => `${key}: ${val}`)[0];
      await showToast(Toast.Style.Failure, error, message);
    }
    return response;
  } else {
    // This is undocumented in the documentation but some endpoints return an error INSIDE results object.
    // Rather than re-declaring types on the off-chance "error" is sent,
    // this codeblock checks if "error" is present then returns an Error object.
    const response = (await apiResponse.json()) as any;
    if ("results" in response) {
      if ("error" in response.results) {
        const error = response.results.error;
        await showToast(Toast.Style.Failure, "Error", error);
        return { error } as ErrorResponse;
      }
    }
    return response;
  }
};

export async function getRemainingRequests() {
  const params = new URLSearchParams({ apikey: API_KEY });

  return (await callApi(`status?${params}`, "Fetching Remaining Requests")) as
    | ErrorResponse
    | GetRemainingRequestsResponse;
}
export async function getStatesByCountry(country: string) {
  const params = new URLSearchParams({ apikey: API_KEY, country });

  return (await callApi(`country/province?${params}`, `Fetching States in ${country}`)) as
    | ErrorResponse
    | GetStatesByCountryResponse;
}

export async function getPostalCodesByCity(city: string, country: string, state_name: string) {
  const limitIsValid = await checkIfDefaultLimitIsValid();
  if ("error" in limitIsValid) return limitIsValid as ErrorResponse;
  const limit = DEFAULT_LIMIT;

  const params = new URLSearchParams({ apikey: API_KEY, city, country, state_name, limit });

  return (await callApi(
    `code/city?${params}`,
    `Fetching ${limit} Codes in ${city} (${country}) [${state_name || "null"}]`
  )) as ErrorResponse | GetPostalCodesByCityResponse;
}
export async function getPostalCodesByState(state_name: string, country: string) {
  const limitIsValid = await checkIfDefaultLimitIsValid();
  if ("error" in limitIsValid) return limitIsValid as ErrorResponse;
  const limit = DEFAULT_LIMIT;

  const params = new URLSearchParams({ apikey: API_KEY, state_name, country, limit });

  return (await callApi(`code/state?${params}`, `Fetching ${limit} Codes in ${state_name} (${country})`)) as
    | ErrorResponse
    | GetPostalCodesByStateResponse;
}

export async function getPostalCodeLocationInformation(codes: string, country: string) {
  const params = new URLSearchParams({ apikey: API_KEY, codes });

  let message = "Fetching Location Information";
  if (country) {
    params.append("country", country);
    message += ` in ${country}`;
  }

  return (await callApi(`search?${params}`, message)) as ErrorResponse | GetPostalCodeLocationInformationResponse;
}

export async function getPostalCodeDistance(code: string, compare: string, country: string) {
  const params = new URLSearchParams({ apikey: API_KEY, code, compare, country, unit: DEFAULT_UNIT });

  return (await callApi(`distance?${params}`, `Fetching Distance between ${code} and ${compare} in ${country}`)) as
    | ErrorResponse
    | GetPostalCodeDistanceResponse;
}

export async function getPostalCodesWithinRadius(code: string, radius: string, country: string) {
  const params = new URLSearchParams({ apikey: API_KEY, code, radius, country });

  return (await callApi(
    `radius?${params}`,
    `Fetching Codes within ${radius}${DEFAULT_UNIT} of ${code} in ${country}`
  )) as ErrorResponse | GetPostalCodesWithinRadiusResponse;
}
export async function getPostalCodesWithinDistance(codes: string, distance: string, country: string) {
  const params = new URLSearchParams({ apikey: API_KEY, codes, distance, country, unit: DEFAULT_UNIT });

  return (await callApi(`match?${params}`, `Fetching Codes within ${distance}${DEFAULT_UNIT}`)) as
    | ErrorResponse
    | GetPostalCodesWithinDistanceResponse;
}
