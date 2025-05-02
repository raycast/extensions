import { LocalStorage } from "@raycast/api";
import { Country, PinnedStates } from "../types";
import Holidays from "date-holidays";

// Function to pin a country
export const pinCountry = async (country: Country) => {
  try {
    const pinnedCountriesJson = await LocalStorage.getItem<string>("pinnedCountries");
    const pinnedCountries: Country[] = pinnedCountriesJson ? JSON.parse(pinnedCountriesJson) : [];

    if (!pinnedCountries.some((pinned) => pinned.alpha2 === country.alpha2)) {
      pinnedCountries.push(country);
      await LocalStorage.setItem("pinnedCountries", JSON.stringify(pinnedCountries));
    }
  } catch (error) {
    console.error(`Error pinning country ${country.name}:`, error);
  }
};

// Function to unpin a country
export const unpinCountry = async (country: Country) => {
  try {
    const pinnedCountriesJson = await LocalStorage.getItem<string>("pinnedCountries");
    const pinnedCountries: Country[] = pinnedCountriesJson ? JSON.parse(pinnedCountriesJson) : [];

    const updatedCountries = pinnedCountries.filter((pinned) => pinned.alpha2 !== country.alpha2);
    await LocalStorage.setItem("pinnedCountries", JSON.stringify(updatedCountries));
  } catch (error) {
    console.error(`Error unpinning country ${country.name}:`, error);
  }
};

// Function to load pinned countries
export const loadPinnedCountries = async (): Promise<Country[]> => {
  try {
    const pinnedCountriesJson = await LocalStorage.getItem<string>("pinnedCountries");
    return pinnedCountriesJson ? JSON.parse(pinnedCountriesJson) : []; // Return an empty array if no pinned countries
  } catch (error) {
    console.error("Error in loadPinnedCountries: ", error);
    return [];
  }
};

// Function to pin a state
export const pinState = async (country: Country, stateCode: string, stateName: string) => {
  try {
    const pinnedStatesJson = await LocalStorage.getItem<string>("pinnedStates");
    const pinnedStates: PinnedStates = pinnedStatesJson ? JSON.parse(pinnedStatesJson) : {};

    if (!pinnedStates[country.alpha2]) {
      pinnedStates[country.alpha2] = []; // Initialize if countryCode doesn't exist
    }

    if (!pinnedStates[country.alpha2].some((state) => state.stateCode === stateCode)) {
      pinnedStates[country.alpha2].push({ stateCode, stateName, country }); // Pin the state independently
      await LocalStorage.setItem("pinnedStates", JSON.stringify(pinnedStates));
    }
  } catch (error) {
    console.error(`Error pinning state ${stateName} for country ${country.name}:`, error);
  }
};

// Function to unpin a state
export const unpinState = async (countryCode: string, stateCode: string) => {
  try {
    const pinnedStatesJson = await LocalStorage.getItem<string>("pinnedStates");
    const pinnedStates: PinnedStates = pinnedStatesJson ? JSON.parse(pinnedStatesJson) : {};

    if (pinnedStates[countryCode]) {
      pinnedStates[countryCode] = pinnedStates[countryCode].filter((state) => state.stateCode !== stateCode);
      // Remove the country entry if no states are pinned
      if (pinnedStates[countryCode].length === 0) {
        delete pinnedStates[countryCode];
      }
      await LocalStorage.setItem("pinnedStates", JSON.stringify(pinnedStates));
    }
  } catch (error) {
    console.error(`Error unpinning state ${stateCode} for country ${countryCode}:`, error);
  }
};

// Function to load pinned states for a specific country
export const loadPinnedStates = async (countryCode: string): Promise<string[]> => {
  try {
    const pinnedStatesJson = await LocalStorage.getItem<string>("pinnedStates");
    const pinnedStates: PinnedStates = pinnedStatesJson ? JSON.parse(pinnedStatesJson) : {};
    return pinnedStates[countryCode]?.map((state) => state.stateCode) || []; // Return pinned states for the country
  } catch (error) {
    console.error(`Error loading pinned states for country ${countryCode}:`, error);
    return [];
  }
};

// Function to load all pinned states for all countries
export const loadAllPinnedStates = async (): Promise<PinnedStates> => {
  try {
    const pinnedStatesJson = await LocalStorage.getItem<string>("pinnedStates");
    const result = pinnedStatesJson ? JSON.parse(pinnedStatesJson) : {};

    return result;
  } catch (error) {
    console.error("Error in loadAllPinnedStates: ", error);
    return {};
  }
};
