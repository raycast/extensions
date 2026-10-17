import { List, ActionPanel, Action, Icon } from "@raycast/api";

export interface WelcomeMessageProps {
  showActions?: boolean;
}

export default function WelcomeMessage({ showActions = true }: WelcomeMessageProps) {
  return (
    <List.Section title="👋 Welcome to Yr Weather!">
      <List.Item
        title="Get Started with Weather Forecasts"
        subtitle="Search for any location to get detailed weather information"
        icon="🌤️"
        accessories={[{ text: "Quick Start", tooltip: "Begin searching for locations" }]}
        actions={
          showActions ? (
            <ActionPanel>
              <Action
                title="Start Searching"
                icon={Icon.MagnifyingGlass}
                onAction={() => {
                  // Handled by the parent component
                  // We can emit an event or use a callback if needed
                }}
              />
            </ActionPanel>
          ) : undefined
        }
      />
      <List.Item
        title="Main Features"
        subtitle="Search locations, save favorites, view detailed forecasts and graphs"
        icon="⭐"
        accessories={[
          { text: "Search", tooltip: "Type city names to find locations" },
          { text: "Favorites", tooltip: "Save your frequently used locations" },
        ]}
        actions={
          showActions ? (
            <ActionPanel>
              <Action
                title="Learn More About Features"
                icon={Icon.Info}
                onAction={() => {
                  // Could open documentation or show more details
                }}
              />
            </ActionPanel>
          ) : undefined
        }
      />
      <List.Item
        title="Available Settings"
        subtitle="Customize units, wind direction, and sunrise/sunset display"
        icon="⚙️"
        accessories={[
          { text: "Units", tooltip: "Metric (°C) or Imperial (°F)" },
          { text: "Wind", tooltip: "Show/hide wind direction arrows" },
          { text: "Sun", tooltip: "Show/hide sunrise and sunset times" },
        ]}
        actions={
          showActions ? (
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => {
                  // Handled by the parent component
                }}
              />
              <Action
                title="Open Command Preferences"
                icon={Icon.Gear}
                onAction={() => {
                  // Handled by the parent component
                }}
              />
            </ActionPanel>
          ) : undefined
        }
      />
      <List.Item
        title="Quick Day Search"
        subtitle="Try searching for specific dates like 'Oslo tomorrow' or 'London Friday'"
        icon="📅"
        accessories={[{ text: "Examples", tooltip: "Oslo fredag, London next monday" }]}
        actions={
          showActions ? (
            <ActionPanel>
              <Action
                title="Try Quick Day Search"
                icon={Icon.Calendar}
                onAction={() => {
                  // Could show examples or guide user
                }}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    </List.Section>
  );
}
