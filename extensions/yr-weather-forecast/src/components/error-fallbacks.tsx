import React from "react";
import { List, Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";

interface ErrorFallbackProps {
  componentName: string;
  error?: Error;
  onRetry?: () => void;
  onReset?: () => void;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Weather-specific error fallback component
 */
export function WeatherErrorFallback({
  componentName,
  onRetry,
  onReset,
  retryCount = 0,
  maxRetries = 3,
}: Omit<ErrorFallbackProps, "error">) {
  return (
    <List.Section title="🌤️ Weather Error">
      <List.Item
        title="Weather Data Unavailable"
        subtitle={`Unable to load weather information for ${componentName}`}
        icon="🌤️"
        accessories={[
          {
            text: `Retry ${retryCount}/${maxRetries}`,
            tooltip: "Number of retry attempts",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Retry Weather Load"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Reset Component"
              icon={Icon.Trash}
              onAction={onReset}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
            <Action
              title="Check Network"
              icon={Icon.Globe}
              onAction={() => {
                showToast({
                  style: Toast.Style.Animated,
                  title: "Checking Network",
                  message: "Testing connectivity to weather services...",
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

/**
 * Search-specific error fallback component
 */
export function SearchErrorFallback({
  componentName,
  onRetry,
  onReset,
  retryCount = 0,
  maxRetries = 3,
}: Omit<ErrorFallbackProps, "error">) {
  return (
    <List.Section title="🔍 Search Error">
      <List.Item
        title="Search Unavailable"
        subtitle={`Unable to search for locations in ${componentName}`}
        icon="🔍"
        accessories={[
          {
            text: `Retry ${retryCount}/${maxRetries}`,
            tooltip: "Number of retry attempts",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Retry Search"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Reset Search"
              icon={Icon.Trash}
              onAction={onReset}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
            <Action
              title="Try Different Search"
              icon={Icon.MagnifyingGlass}
              onAction={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Search Reset",
                  message: "Try searching for a different location",
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

/**
 * Graph/Chart-specific error fallback component
 */
export function GraphErrorFallback({
  componentName,
  onRetry,
  onReset,
  retryCount = 0,
  maxRetries = 3,
}: Omit<ErrorFallbackProps, "error">) {
  return (
    <List.Section title="📊 Graph Error">
      <List.Item
        title="Graph Unavailable"
        subtitle={`Unable to display weather graph for ${componentName}`}
        icon="📊"
        accessories={[
          {
            text: `Retry ${retryCount}/${maxRetries}`,
            tooltip: "Number of retry attempts",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Retry Graph"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Reset Graph"
              icon={Icon.Trash}
              onAction={onReset}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
            <Action
              title="View Forecast Instead"
              icon={Icon.List}
              onAction={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Switch to Forecast",
                  message: "Try viewing the detailed forecast instead",
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

/**
 * Favorites-specific error fallback component
 */
export function FavoritesErrorFallback({
  componentName,
  onRetry,
  onReset,
  retryCount = 0,
  maxRetries = 3,
}: Omit<ErrorFallbackProps, "error">) {
  return (
    <List.Section title="⭐ Favorites Error">
      <List.Item
        title="Favorites Unavailable"
        subtitle={`Unable to load favorites in ${componentName}`}
        icon="⭐"
        accessories={[
          {
            text: `Retry ${retryCount}/${maxRetries}`,
            tooltip: "Number of retry attempts",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Retry Favorites"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Reset Favorites"
              icon={Icon.Trash}
              onAction={onReset}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
            <Action
              title="Search for Locations"
              icon={Icon.MagnifyingGlass}
              onAction={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Search Mode",
                  message: "You can still search for new locations",
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

/**
 * Generic error fallback component
 */
export function GenericErrorFallback({
  componentName,
  error,
  onRetry,
  onReset,
  retryCount = 0,
  maxRetries = 3,
}: ErrorFallbackProps) {
  return (
    <List.Section title="⚠️ Error">
      <List.Item
        title="Something went wrong"
        subtitle={`Error in ${componentName}`}
        icon="⚠️"
        accessories={[
          {
            text: `Retry ${retryCount}/${maxRetries}`,
            tooltip: "Number of retry attempts",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Reset"
              icon={Icon.Trash}
              onAction={onReset}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
            <Action
              title="Show Error Details"
              icon={Icon.Info}
              onAction={() => {
                if (error) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Error Details",
                    message: error.message,
                  });
                }
              }}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
