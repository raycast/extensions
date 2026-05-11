import { useEffect, useCallback } from "react";
import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  listSchedules,
  pauseSchedule,
  unpauseSchedule,
  triggerSchedule,
  deleteSchedule,
  showConnectionError,
  getCurrentNamespace,
} from "./lib/temporal-client";
import { ScheduleInfo } from "./lib/types";
import { formatRelativeTime, formatDateTime } from "./lib/utils";
import ScheduleDetails from "./components/schedule-details";

export default function Schedules() {
  const namespace = getCurrentNamespace();

  const {
    data: schedules,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      return listSchedules();
    },
    [],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      revalidate();
    }, 30000);

    return () => clearInterval(interval);
  }, [revalidate]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Schedules"
      searchBarPlaceholder="Search schedules..."
    >
      {error && !schedules ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Connection Error"
          description="Could not connect to Temporal. Please check your settings."
        />
      ) : schedules?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Schedules Found"
          description={`No schedules in namespace "${namespace}"`}
        />
      ) : (
        <>
          {/* Active Schedules */}
          <List.Section
            title="Active"
            subtitle={String(schedules?.filter((s) => !s.isPaused).length || 0)}
          >
            {schedules
              ?.filter((s) => !s.isPaused)
              .map((schedule) => (
                <ScheduleListItem
                  key={schedule.scheduleId}
                  schedule={schedule}
                  onRefresh={revalidate}
                />
              ))}
          </List.Section>

          {/* Paused Schedules */}
          {schedules?.some((s) => s.isPaused) && (
            <List.Section
              title="Paused"
              subtitle={String(schedules?.filter((s) => s.isPaused).length || 0)}
            >
              {schedules
                ?.filter((s) => s.isPaused)
                .map((schedule) => (
                  <ScheduleListItem
                    key={schedule.scheduleId}
                    schedule={schedule}
                    onRefresh={revalidate}
                  />
                ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface ScheduleListItemProps {
  schedule: ScheduleInfo;
  onRefresh: () => void;
}

function ScheduleListItem({ schedule, onRefresh }: ScheduleListItemProps) {
  const icon = schedule.isPaused ? Icon.Pause : Icon.Play;
  const color = schedule.isPaused ? Color.Orange : Color.Green;

  const nextRun = schedule.nextActionTimes[0];
  const nextRunText = nextRun ? formatRelativeTime(nextRun) : "No upcoming runs";

  return (
    <List.Item
      title={schedule.scheduleId}
      subtitle={schedule.workflowType || undefined}
      icon={{ source: icon, tintColor: color }}
      accessories={[
        { text: `${schedule.numActions} runs`, tooltip: `Total runs: ${schedule.numActions}` },
        {
          text: nextRunText,
          tooltip: nextRun ? `Next run: ${formatDateTime(nextRun)}` : "No upcoming runs",
        },
        {
          tag: { value: schedule.isPaused ? "Paused" : "Active", color },
        },
      ]}
      actions={<ScheduleActions schedule={schedule} onRefresh={onRefresh} />}
    />
  );
}

interface ScheduleActionsProps {
  schedule: ScheduleInfo;
  onRefresh: () => void;
}

function ScheduleActions({ schedule, onRefresh }: ScheduleActionsProps) {
  const handlePause = useCallback(async () => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Pausing schedule..." });
      await pauseSchedule(schedule.scheduleId);
      await showToast({ style: Toast.Style.Success, title: "Schedule Paused" });
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Pause",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [schedule.scheduleId, onRefresh]);

  const handleUnpause = useCallback(async () => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Unpausing schedule..." });
      await unpauseSchedule(schedule.scheduleId);
      await showToast({ style: Toast.Style.Success, title: "Schedule Unpaused" });
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Unpause",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [schedule.scheduleId, onRefresh]);

  const handleTrigger = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Trigger Schedule Now",
      message: `Are you sure you want to trigger "${schedule.scheduleId}" immediately?`,
      primaryAction: { title: "Trigger Now" },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Triggering schedule..." });
      await triggerSchedule(schedule.scheduleId);
      await showToast({ style: Toast.Style.Success, title: "Schedule Triggered" });
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Trigger",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [schedule.scheduleId, onRefresh]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Delete Schedule",
      message: `Are you sure you want to delete "${schedule.scheduleId}"?\n\nThis action cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Deleting schedule..." });
      await deleteSchedule(schedule.scheduleId);
      await showToast({ style: Toast.Style.Success, title: "Schedule Deleted" });
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Delete",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [schedule.scheduleId, onRefresh]);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Schedule">
        <Action.Push
          title="View Details"
          icon={Icon.Eye}
          target={<ScheduleDetails scheduleId={schedule.scheduleId} />}
        />
        <Action.CopyToClipboard
          title="Copy Schedule Id"
          content={schedule.scheduleId}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Actions">
        <Action
          title="Trigger Now"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={handleTrigger}
        />
        {schedule.isPaused ? (
          <Action
            title="Unpause"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            onAction={handleUnpause}
          />
        ) : (
          <Action
            title="Pause"
            icon={Icon.Pause}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={handlePause}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Danger">
        <Action
          title="Delete Schedule"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          onAction={handleDelete}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
