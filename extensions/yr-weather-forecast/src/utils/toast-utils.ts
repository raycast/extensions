import { showToast, Toast } from "@raycast/api";

/**
 * Toast message utilities to eliminate duplication
 */
export const ToastMessages = {
  /**
   * Show success toast for favorite operations
   */
  favoriteAdded: (locationName: string) =>
    showToast({
      style: Toast.Style.Success,
      title: "Added to Favorites",
      message: `${locationName} has been added to your favorites`,
    }),

  favoriteRemoved: (locationName: string) =>
    showToast({
      style: Toast.Style.Success,
      title: "Removed from Favorites",
      message: `${locationName} has been removed from your favorites`,
    }),

  /**
   * Show error toasts for network issues
   */
  weatherApiUnavailable: () =>
    showToast({
      style: Toast.Style.Failure,
      title: "Weather API Unavailable",
      message: "Unable to connect to weather service. Some features may not work properly.",
    }),

  locationApiUnavailable: () =>
    showToast({
      style: Toast.Style.Failure,
      title: "Location Search Unavailable",
      message: "Unable to connect to location service. You may not be able to search for new locations.",
    }),

  networkConnectivityIssues: () =>
    showToast({
      style: Toast.Style.Failure,
      title: "Network Connectivity Issues",
      message: "Multiple services are unavailable. Please check your internet connection.",
    }),

  /**
   * Show general error toasts
   */
  weatherLoadFailed: (error: unknown) =>
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load weather",
      message: String((error as Error)?.message ?? error),
    }),

  /**
   * Show info toasts
   */
  networkTestsRetry: () =>
    showToast({
      style: Toast.Style.Success,
      title: "Network Tests",
      message: "Tests will re-run when you restart the extension",
    }),

  networkTestErrors: (error: string) =>
    showToast({
      style: Toast.Style.Failure,
      title: "Network Test Errors",
      message: error || "Unknown network connectivity issues",
    }),
} as const;
