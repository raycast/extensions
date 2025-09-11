/**
 * Google Calendar Menu Bar Extension
 *
 * This component displays the next upcoming meeting in the macOS menu bar
 * with real-time countdown and quick access to calendar functions.
 */

import { calendar_v3 } from "@googleapis/calendar";
import { environment, getPreferenceValues, Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { differenceInMinutes, format, isAfter, isToday, isTomorrow } from "date-fns";
import { getCalendarClient, withGoogleAPIs } from "./lib/google";

// Extended event interface with calendar information
interface EventWithCalendar extends calendar_v3.Schema$Event {
  calendarId?: string | null;
  calendarName?: string | null;
  calendarColor?: string | null;
}

// Simple debounce for logging to reduce noise
let lastLogTime = 0;
const LOG_DEBOUNCE_MS = 1000; // Only log once per second

/**
 * Interface defining the menu bar configuration preferences
 * These are set by the user in Raycast preferences
 */
interface MenuBarPreferences {
  showTimeUntilNext: boolean; // Whether to show countdown timer
  maxCharacters: string; // Max characters for meeting title display
  refreshInterval: string; // How often to refresh data (in minutes)
  showOngoingMinutes: string; // How many minutes after start to show ongoing meetings
}

/**
 * Custom hook optimized for menu bar performance
 *
 * Fetches only the next 10 events (instead of 50) to reduce API calls and loading time.
 * Uses aggressive caching to prevent loading states on every menu bar click.
 *
 * API calls are made based on the refreshInterval preference, but the countdown display
 * updates every minute using cached data, providing real-time feel without excessive API usage.
 */
function useMenuBarEvents() {
  return useCachedPromise(
    async () => {
      const calendar = getCalendarClient();

      // Get all selected calendars first
      console.log("📅 Fetching calendar list...");
      const calendarsResponse = await calendar.calendarList.list();
      const selectedCalendars = calendarsResponse.data.items?.filter((cal) => cal.selected && cal.id) || [];
      console.log(
        `📅 Found ${selectedCalendars.length} selected calendars:`,
        selectedCalendars.map((cal) => cal.summary),
      );

      // For background refresh, optimize to avoid timeout
      const isBackground = environment.launchType === "background";
      const calendarsToFetch = selectedCalendars; // Always fetch all calendars

      console.log(`📅 Launch type: ${environment.launchType}, fetching from ${calendarsToFetch.length} calendars`);
      if (isBackground) {
        console.log(`📅 Background refresh: optimizing for speed`);
      }

      // Fetch events from selected calendars
      const allEvents: EventWithCalendar[] = [];

      // Use Promise.all for parallel fetching to speed up the process
      const fetchPromises = calendarsToFetch.map(async (cal) => {
        try {
          console.log(`📅 Fetching events from calendar: ${cal.summary} (${cal.id})`);
          const response = await calendar.events.list({
            calendarId: cal.id!,
            timeMin: new Date().toISOString(), // Only future events
            timeMax: isBackground ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined, // Limit to next 24 hours in background
            maxResults: isBackground ? 5 : 20, // Fetch fewer events in background
            singleEvents: true, // Expand recurring events
            orderBy: "startTime", // Sort by start time
          });

          const calendarEvents = response.data.items ?? [];
          console.log(
            `📅 Found ${calendarEvents.length} events in ${cal.summary}:`,
            calendarEvents.map((event) => event.summary),
          );

          // Add calendar info to each event for identification
          return calendarEvents.map(
            (event): EventWithCalendar => ({
              ...event,
              calendarId: cal.id,
              calendarName: cal.summaryOverride ?? cal.summary,
              calendarColor: cal.backgroundColor,
            }),
          );
        } catch (error) {
          console.error(`❌ Failed to fetch events from calendar ${cal.summary}:`, error);
          return []; // Return empty array if calendar fails
        }
      });

      // Wait for all calendar fetches to complete in parallel
      const results = await Promise.all(fetchPromises);

      // Flatten the results
      for (const calendarEvents of results) {
        allEvents.push(...calendarEvents);
      }

      // Sort all events by start time and return the first 10
      const sortedEvents = allEvents.sort((a, b) => {
        const dateA = new Date(a.start?.dateTime ?? a.start?.date ?? "");
        const dateB = new Date(b.start?.dateTime ?? b.start?.date ?? "");
        return dateA.getTime() - dateB.getTime();
      });

      console.log(
        `📅 Total events found: ${sortedEvents.length}, returning first 10:`,
        sortedEvents.slice(0, 10).map((event) => `${event.summary} (${event.calendarName})`),
      );

      return sortedEvents.slice(0, 10);
    },
    [],
    {
      keepPreviousData: true, // Keep cached data while refreshing
      initialData: [], // Prevent initial loading state
      execute: true, // Execute immediately
      // Cache for 2 minutes to balance freshness with background refresh timeout
    },
  );
}

/**
 * Finds the next upcoming meeting from the list of events
 * Also includes ongoing meetings within the configured time window
 *
 * @param events - Array of calendar events
 * @param showOngoingMinutes - How many minutes after start to show ongoing meetings
 * @returns The next upcoming meeting or null if none found
 */
function getNextMeeting(events: calendar_v3.Schema$Event[] | undefined, showOngoingMinutes: number = 15) {
  if (!events?.length) return null;

  const now = new Date();
  const ongoingThreshold = new Date(now.getTime() - showOngoingMinutes * 60 * 1000);

  // Filter events that are upcoming OR ongoing (within the threshold), and not all-day
  const relevantEvents = events.filter((event) => {
    const startDate = new Date(event.start?.dateTime ?? event.start?.date ?? "");
    const isUpcoming = isAfter(startDate, now);
    const isOngoing = startDate >= ongoingThreshold && startDate <= now;
    const isNotAllDay = !event.start?.date; // Filter out all-day events (they have start.date but no start.dateTime)
    return (isUpcoming || isOngoing) && isNotAllDay;
  });

  if (!relevantEvents.length) return null;

  // Sort by start time and get the first one (earliest relevant event)
  const sortedEvents = relevantEvents.sort((a, b) => {
    const dateA = new Date(a.start?.dateTime ?? a.start?.date ?? "");
    const dateB = new Date(b.start?.dateTime ?? b.start?.date ?? "");
    return dateA.getTime() - dateB.getTime();
  });

  return sortedEvents[0];
}

/**
 * Formats the event time for display in a human-readable format
 *
 * @param event - The calendar event to format
 * @returns Formatted time string (e.g., "2:00 PM - 3:00 PM", "All day today")
 */
function formatEventTime(event: calendar_v3.Schema$Event) {
  const startDate = new Date(event.start?.dateTime ?? event.start?.date ?? "");
  const endDate = new Date(event.end?.dateTime ?? event.end?.date ?? "");

  // Handle all-day events
  if (event.start?.date) {
    if (isToday(startDate)) {
      return "All day today";
    } else if (isTomorrow(startDate)) {
      return "All day tomorrow";
    } else {
      return `All day ${format(startDate, "MMM d")}`;
    }
  }

  // Handle timed events
  const startTime = format(startDate, "h:mm a");
  const endTime = format(endDate, "h:mm a");

  if (isToday(startDate)) {
    return `${startTime} - ${endTime}`;
  } else if (isTomorrow(startDate)) {
    return `Tomorrow ${startTime} - ${endTime}`;
  } else {
    return `${format(startDate, "MMM d")} ${startTime} - ${endTime}`;
  }
}

/**
 * Calculates and formats the time remaining until an event starts
 *
 * @param event - The calendar event
 * @returns Human-readable countdown string (e.g., "In 15m", "In 2h 30m", "Tomorrow")
 */
function getTimeUntilEvent(event: calendar_v3.Schema$Event) {
  const now = new Date();
  const startDate = new Date(event.start?.dateTime ?? event.start?.date ?? "");

  // Handle all-day events
  if (event.start?.date) {
    if (isToday(startDate)) {
      return "Today";
    } else if (isTomorrow(startDate)) {
      return "Tomorrow";
    } else {
      const diffDays = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `In ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    }
  }

  // Handle timed events
  const diffMinutes = differenceInMinutes(startDate, now);

  // Event has already started - show how long ago
  if (diffMinutes < 0) {
    const minutesAgo = Math.abs(diffMinutes);
    if (minutesAgo < 60) {
      return `${minutesAgo}m ago`;
    }

    const hoursAgo = Math.floor(minutesAgo / 60);
    const remainingMinutes = minutesAgo % 60;

    if (hoursAgo < 24) {
      return remainingMinutes > 0 ? `${hoursAgo}h ${remainingMinutes}m ago` : `${hoursAgo}h ago`;
    }

    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`;
  }

  // Less than an hour
  if (diffMinutes < 60) return `In ${diffMinutes}m`;

  // Calculate hours and remaining minutes
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;

  // Less than a day
  if (diffHours < 24) {
    return remainingMinutes > 0 ? `In ${diffHours}h ${remainingMinutes}m` : `In ${diffHours}h`;
  }

  // Multiple days
  const diffDays = Math.floor(diffHours / 24);
  return `In ${diffDays} day${diffDays > 1 ? "s" : ""}`;
}

/**
 * Truncates text to fit within the menu bar width constraints
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum allowed characters
 * @returns Truncated text with "..." if needed
 */
function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Main Command component that renders the menu bar
 *
 * Handles different states: loading, no meetings, and displaying next meeting
 * with appropriate actions and styling based on urgency.
 */
function Command() {
  // Get user preferences for menu bar configuration
  const preferences = getPreferenceValues<MenuBarPreferences>();

  // Parse preferences with defaults
  const maxCharacters = parseInt(preferences.maxCharacters || "30");
  const showTimeUntil = preferences.showTimeUntilNext !== false;
  const showOngoingMinutes = parseInt(preferences.showOngoingMinutes || "15");
  const { data: events, isLoading, revalidate } = useMenuBarEvents();

  const nextMeeting = getNextMeeting(events, showOngoingMinutes);

  // Get all upcoming events for the dropdown
  const allUpcomingEvents =
    events
      ?.filter((event) => {
        const startDate = new Date(event.start?.dateTime ?? event.start?.date ?? "");
        const now = new Date();
        const ongoingThreshold = new Date(now.getTime() - showOngoingMinutes * 60 * 1000);
        const isUpcoming = isAfter(startDate, now);
        const isOngoing = startDate >= ongoingThreshold && startDate <= now;
        const isNotAllDay = !event.start?.date;
        return (isUpcoming || isOngoing) && isNotAllDay;
      })
      .sort((a, b) => {
        const dateA = new Date(a.start?.dateTime ?? a.start?.date ?? "");
        const dateB = new Date(b.start?.dateTime ?? b.start?.date ?? "");
        return dateA.getTime() - dateB.getTime();
      }) || [];

  // Debug: Log only when data changes or on background refresh, with debounce
  const now = Date.now();
  if ((environment.launchType === "background" || !isLoading) && now - lastLogTime > LOG_DEBOUNCE_MS) {
    console.log(`[${environment.launchType}] Events: ${events?.length || 0}, Next: ${nextMeeting?.summary || "none"}`);
    lastLogTime = now;
  }

  // Show minimal loading state only if we have no cached data
  if (isLoading && !events?.length) {
    return (
      <MenuBarExtra title="Calendar">
        <MenuBarExtra.Item title="Loading..." />
      </MenuBarExtra>
    );
  }

  // No upcoming meetings state
  if (!nextMeeting) {
    return (
      <MenuBarExtra title="No meetings">
        <MenuBarExtra.Item title="No upcoming meetings" />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={() => {
            revalidate();
          }}
        />
      </MenuBarExtra>
    );
  }

  // Extract and format meeting information
  const eventTitle = nextMeeting.summary || "Untitled Event";
  const truncatedTitle = truncateText(eventTitle, maxCharacters);
  const eventTime = formatEventTime(nextMeeting);
  const timeUntil = getTimeUntilEvent(nextMeeting);

  // Build menu bar title based on user preferences
  let menuBarTitle = truncatedTitle;
  if (showTimeUntil) {
    menuBarTitle = `${truncatedTitle} (${timeUntil})`;
  }

  // Render the main menu bar with next meeting information
  return (
    <MenuBarExtra title={menuBarTitle} tooltip={`Next: ${eventTitle} - ${eventTime}`}>
      {/* Display all upcoming events */}
      {allUpcomingEvents.map((event, index) => {
        const eventTitle = event.summary || "Untitled Event";
        const eventTime = formatEventTime(event);
        const timeUntil = getTimeUntilEvent(event);
        const isNextMeeting = event.id === nextMeeting?.id;
        const calendarName = event.calendarName;

        return (
          <MenuBarExtra.Item
            key={event.id || index}
            title={eventTitle}
            subtitle={`${eventTime} (${timeUntil})${calendarName ? ` • ${calendarName}` : ""}`}
            icon={isNextMeeting ? Icon.Calendar : undefined}
            onAction={() => {
              if (event.htmlLink) {
                open(event.htmlLink);
              }
            }}
          />
        );
      })}

      {/* Show join meeting option only for video conferences of the next meeting */}
      {nextMeeting?.conferenceData?.entryPoints?.[0]?.uri && (
        <>
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Join Meeting"
            icon={Icon.Video}
            onAction={() => {
              open(nextMeeting.conferenceData!.entryPoints![0].uri!);
            }}
          />
        </>
      )}

      <MenuBarExtra.Separator />

      {/* Manual refresh option - needed since we disabled automatic refresh */}
      <MenuBarExtra.Item
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={() => {
          revalidate();
        }}
      />
    </MenuBarExtra>
  );
}

// Export the component wrapped with Google APIs authentication
export default withGoogleAPIs(Command);
