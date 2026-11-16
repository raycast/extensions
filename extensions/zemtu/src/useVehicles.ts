import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { graphqlClient } from "./graphql";

// Enough for every command (list, time-based search, editing a reservation)
const VEHICLE_LIMIT = 100;

const fetchVehicles = (baseUrl: string, username: string) => {
  // Arguments only key the cache per account; the client reads them from the preferences
  void baseUrl;
  void username;
  return graphqlClient.getVehicles(VEHICLE_LIMIT);
};

/**
 * Vehicles with stale-while-revalidate: the last result is shown immediately from
 * Raycast's on-disk cache (shared by all commands), then refreshed in the background.
 */
export function useVehicles(options: { execute?: boolean } = {}) {
  const { baseUrl, username } = getPreferenceValues<Preferences>();

  return useCachedPromise(fetchVehicles, [baseUrl, username], {
    execute: options.execute ?? Boolean(username),
    keepPreviousData: true,
    initialData: [],
  });
}
