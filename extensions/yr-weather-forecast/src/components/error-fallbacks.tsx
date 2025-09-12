import React from "react";
import { List } from "@raycast/api";
import { ActionPanelBuilders } from "../utils/action-panel-builders";

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
        actions={ActionPanelBuilders.createErrorActions(onRetry || (() => {}), onReset || (() => {}), undefined)}
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
        actions={ActionPanelBuilders.createErrorActions(onRetry || (() => {}), onReset || (() => {}), undefined)}
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
        actions={ActionPanelBuilders.createErrorActions(onRetry || (() => {}), onReset || (() => {}), undefined)}
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
        actions={ActionPanelBuilders.createErrorActions(onRetry || (() => {}), onReset || (() => {}), undefined)}
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
        actions={ActionPanelBuilders.createErrorActions(onRetry || (() => {}), onReset || (() => {}), error)}
      />
    </List.Section>
  );
}
