import { GoogleCalendarClient } from "@/lib/gcal/gcal-api-client";
import { getAccessToken, useCachedPromise, useLocalStorage } from "@raycast/utils";
import { DefaultConfig, ExtensionConfig } from "./config";

export function useCache<T>(fetcher: () => Promise<T | null>) {
  const { data, isLoading, mutate, revalidate } = useCachedPromise(fetcher);
  return { data, isLoading, mutate, revalidate };
}

export function useUpcomingEvents() {
  const apiClient = new GoogleCalendarClient(getAccessToken().token);
  return useCache(async () => {
    const calendars = await apiClient.getCalendars();
    const allEvents = await Promise.all(calendars.map((cal) => apiClient.getUpcomingEvents(cal)));
    const events = allEvents.flat();
    events.sort((a, b) => {
      if (a.startTime !== b.startTime) {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      } else {
        return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      }
    });
    return events;
  });
}

export function useConfig(): {
  value: ExtensionConfig | undefined;
  setValue: (config: ExtensionConfig) => Promise<void>;
  isLoading: boolean;
} {
  const { value, setValue, isLoading } = useLocalStorage("config", DefaultConfig);
  return { value, setValue, isLoading };
}

export function useCalendars() {
  const apiClient = new GoogleCalendarClient(getAccessToken().token);
  return useCache(async () => await apiClient.getCalendars());
}
