import { getApplications, Application } from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"

/**
 * Shared hook for fetching applications with caching and error handling
 * Uses Raycast's built-in failureToastOptions for automatic error handling
 */
export function useApplications() {
  return useCachedPromise(getApplications, [], {
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to load applications",
    },
  })
}

/**
 * Get applications data and loading state
 */
export function useApplicationsData(): { applications: Application[]; isLoading: boolean } {
  const { data = [], isLoading } = useApplications()
  return { applications: data, isLoading }
}
