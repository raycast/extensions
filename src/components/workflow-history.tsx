import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getWorkflowHistory, showConnectionError } from "../lib/temporal-client";
import { HistoryEvent } from "../lib/types";
import { formatDuration } from "../lib/utils";

interface WorkflowHistoryProps {
  workflowId: string;
  runId?: string;
}

export default function WorkflowHistory({ workflowId, runId }: WorkflowHistoryProps) {
  const {
    data: events,
    isLoading,
    error,
  } = useCachedPromise(
    async (wfId: string, rId?: string) => {
      return getWorkflowHistory(wfId, rId);
    },
    [workflowId, runId],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  const groupedEvents = groupEventsByActivity(events || []);

  return (
    <List isLoading={isLoading} navigationTitle={`History: ${workflowId}`}>
      {error && !events ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load History"
          description={error.message}
        />
      ) : events?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No History Events"
          description="This workflow has no history yet"
        />
      ) : (
        <>
          {/* Summary Section */}
          <List.Section title="Summary">
            <List.Item
              title={`${events?.length || 0} Events`}
              subtitle={`${groupedEvents.activities.length} Activities, ${groupedEvents.timers.length} Timers`}
              icon={Icon.List}
            />
          </List.Section>

          {/* Activities Section */}
          {groupedEvents.activities.length > 0 && (
            <List.Section title="Activities" subtitle={String(groupedEvents.activities.length)}>
              {groupedEvents.activities.map((activity, index) => (
                <ActivityItem key={`activity-${index}`} activity={activity} />
              ))}
            </List.Section>
          )}

          {/* Timers Section */}
          {groupedEvents.timers.length > 0 && (
            <List.Section title="Timers" subtitle={String(groupedEvents.timers.length)}>
              {groupedEvents.timers.map((timer, index) => (
                <TimerItem key={`timer-${index}`} timer={timer} />
              ))}
            </List.Section>
          )}

          {/* Signals Section */}
          {groupedEvents.signals.length > 0 && (
            <List.Section title="Signals" subtitle={String(groupedEvents.signals.length)}>
              {groupedEvents.signals.map((signal, index) => (
                <EventItem
                  key={`signal-${index}`}
                  event={signal}
                  icon={Icon.Message}
                  color={Color.Purple}
                />
              ))}
            </List.Section>
          )}

          {/* Other Events Section */}
          {groupedEvents.other.length > 0 && (
            <List.Section title="Other Events" subtitle={String(groupedEvents.other.length)}>
              {groupedEvents.other.map((event, index) => (
                <EventItem
                  key={`other-${index}`}
                  event={event}
                  icon={Icon.Circle}
                  color={Color.SecondaryText}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

// ============================================================================
// Event Grouping
// ============================================================================

interface ActivityGroup {
  name: string;
  scheduledEvent?: HistoryEvent;
  startedEvent?: HistoryEvent;
  completedEvent?: HistoryEvent;
  failedEvent?: HistoryEvent;
  status: "scheduled" | "running" | "completed" | "failed";
  duration?: number;
}

interface TimerGroup {
  startedEvent: HistoryEvent;
  firedEvent?: HistoryEvent;
  canceledEvent?: HistoryEvent;
  status: "running" | "fired" | "canceled";
  duration?: number;
}

interface GroupedEvents {
  activities: ActivityGroup[];
  timers: TimerGroup[];
  signals: HistoryEvent[];
  other: HistoryEvent[];
}

function groupEventsByActivity(events: HistoryEvent[]): GroupedEvents {
  const activities: Map<string, ActivityGroup> = new Map();
  const timers: Map<string, TimerGroup> = new Map();
  const signals: HistoryEvent[] = [];
  const other: HistoryEvent[] = [];

  for (const event of events) {
    const eventType = event.eventType.toLowerCase();

    // Activity events
    if (eventType.includes("activity")) {
      const activityId = (event.details?.activityId as string) || `activity-${event.eventId}`;
      // Try multiple ways to get activity type name
      const activityTypeName =
        (event.details?.activityTypeName as string) ||
        (event.details?.activityType as { name?: string })?.name ||
        null;

      if (!activities.has(activityId)) {
        activities.set(activityId, {
          name: activityTypeName || "Unknown Activity",
          status: "scheduled",
        });
      }

      const activity = activities.get(activityId)!;

      if (eventType.includes("scheduled")) {
        activity.scheduledEvent = event;
        // Update name from scheduled event which has the activity type
        if (activityTypeName) {
          activity.name = activityTypeName;
        }
      } else if (eventType.includes("started")) {
        activity.startedEvent = event;
        activity.status = "running";
        // Started event may also have activity type
        if (activityTypeName && activity.name === "Unknown Activity") {
          activity.name = activityTypeName;
        }
      } else if (eventType.includes("completed")) {
        activity.completedEvent = event;
        activity.status = "completed";
        if (activity.startedEvent) {
          activity.duration = event.eventTime.getTime() - activity.startedEvent.eventTime.getTime();
        }
      } else if (eventType.includes("failed") || eventType.includes("timed")) {
        activity.failedEvent = event;
        activity.status = "failed";
      }
    }
    // Timer events
    else if (eventType.includes("timer")) {
      const timerId = (event.details?.timerId as string) || `timer-${event.eventId}`;

      if (!timers.has(timerId)) {
        timers.set(timerId, {
          startedEvent: event,
          status: "running",
        });
      }

      const timer = timers.get(timerId)!;

      if (eventType.includes("started")) {
        timer.startedEvent = event;
      } else if (eventType.includes("fired")) {
        timer.firedEvent = event;
        timer.status = "fired";
        timer.duration = event.eventTime.getTime() - timer.startedEvent.eventTime.getTime();
      } else if (eventType.includes("canceled")) {
        timer.canceledEvent = event;
        timer.status = "canceled";
      }
    }
    // Signal events
    else if (eventType.includes("signal")) {
      signals.push(event);
    }
    // Workflow lifecycle events (skip these as they're less interesting)
    else if (
      eventType.includes("workflow execution started") ||
      eventType.includes("workflow execution completed") ||
      eventType.includes("workflow task")
    ) {
      // Skip workflow task events, but keep workflow execution events in other
      if (!eventType.includes("task")) {
        other.push(event);
      }
    }
    // Other events
    else {
      other.push(event);
    }
  }

  return {
    activities: Array.from(activities.values()),
    timers: Array.from(timers.values()),
    signals,
    other,
  };
}

// ============================================================================
// List Items
// ============================================================================

function ActivityItem({ activity }: { activity: ActivityGroup }) {
  const { icon, color } = getActivityStatusIcon(activity.status);
  const duration = activity.duration ? formatDuration(activity.duration) : undefined;

  return (
    <List.Item
      title={activity.name}
      subtitle={activity.status}
      icon={{ source: icon, tintColor: color }}
      accessories={[
        ...(duration ? [{ text: duration, tooltip: "Duration" }] : []),
        {
          text: activity.scheduledEvent?.eventTime.toLocaleTimeString() || "",
          tooltip: "Scheduled at",
        },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Activity Name" content={activity.name} />
          {activity.failedEvent?.details && (
            <Action.CopyToClipboard
              title="Copy Failure Details"
              content={JSON.stringify(activity.failedEvent.details, null, 2)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function TimerItem({ timer }: { timer: TimerGroup }) {
  const { icon, color } = getTimerStatusIcon(timer.status);
  const duration = timer.duration ? formatDuration(timer.duration) : undefined;

  return (
    <List.Item
      title="Timer"
      subtitle={timer.status}
      icon={{ source: icon, tintColor: color }}
      accessories={[
        ...(duration ? [{ text: duration, tooltip: "Duration" }] : []),
        { text: timer.startedEvent.eventTime.toLocaleTimeString(), tooltip: "Started at" },
      ]}
    />
  );
}

function EventItem({ event, icon, color }: { event: HistoryEvent; icon: Icon; color: Color }) {
  return (
    <List.Item
      title={event.eventType}
      subtitle={`Event #${event.eventId}`}
      icon={{ source: icon, tintColor: color }}
      accessories={[
        { text: event.eventTime.toLocaleTimeString(), tooltip: event.eventTime.toLocaleString() },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Event Details"
            content={JSON.stringify(event.details, null, 2)}
          />
        </ActionPanel>
      }
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getActivityStatusIcon(status: string): { icon: Icon; color: Color } {
  switch (status) {
    case "completed":
      return { icon: Icon.CheckCircle, color: Color.Green };
    case "running":
      return { icon: Icon.CircleProgress, color: Color.Blue };
    case "failed":
      return { icon: Icon.XMarkCircle, color: Color.Red };
    default:
      return { icon: Icon.Clock, color: Color.Orange };
  }
}

function getTimerStatusIcon(status: string): { icon: Icon; color: Color } {
  switch (status) {
    case "fired":
      return { icon: Icon.CheckCircle, color: Color.Green };
    case "canceled":
      return { icon: Icon.XMarkCircle, color: Color.Orange };
    default:
      return { icon: Icon.Clock, color: Color.Blue };
  }
}
