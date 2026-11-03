import { ActionPanel, Action, Icon, Form, List, openExtensionPreferences, Keyboard } from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { graphqlClient, Vehicle } from "./graphql";
import { useAuth } from "./useAuth";
import { VehicleDetail } from "./vehicle-detail";
import { BookingForm } from "./reservation-create";
import CheckSettings from "./check-settings";

interface TransformedVehicle {
  id: string;
  icon: Icon | { source: string };
  title: string;
  subtitle: string;
  accessory: string;
  booking_url?: string;
  originalData: Vehicle;
}

export default function TimeBasedSearch() {
  const { error, hasCredentials, preferences, t } = useAuth();
  const [showResults, setShowResults] = useState(false);

  // Helper function to round time to nearest half hour (round down)
  const roundToHalfHour = (date: Date): Date => {
    const rounded = new Date(date);
    const minutes = rounded.getMinutes();

    if (minutes < 30) {
      rounded.setMinutes(0);
    } else {
      rounded.setMinutes(30);
    }

    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
  };

  // Smart defaults: now (rounded down) and +2 hours
  const now = new Date();
  const defaultStartTime = roundToHalfHour(now);
  const defaultEndTime = new Date(defaultStartTime.getTime() + 2 * 60 * 60 * 1000);

  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);

  // The server checks availability for the whole timespan (incl. buffers and future reservations)
  const { data: vehicles = [], isLoading: isSearching } = usePromise(
    (start: string, end: string) => graphqlClient.getVehicles(100, { start, end }),
    [startTime.toISOString(), endTime.toISOString()],
    { execute: hasCredentials && showResults },
  );

  // Transform GraphQL vehicles to display format
  const transformVehicles = (vehicles: Vehicle[]): TransformedVehicle[] => {
    return vehicles.map((vehicle) => {
      const title = vehicle.label || vehicle.captions?.[0] || `${vehicle.brand} ${vehicle.model}`;
      const subtitle = `${vehicle.address}, ${vehicle.city} ${vehicle.zip}`;
      const accessory = t.availableInTimeRange || "Available in time range";

      return {
        id: vehicle.id,
        icon: vehicle.thumbnail
          ? {
              source: vehicle.thumbnail,
              mask: "circle",
              fallback: Icon.Car,
            }
          : Icon.Car,
        title,
        subtitle,
        accessory,
        booking_url: `${preferences.baseUrl}/instant_booking/${vehicle.pk}`,
        originalData: vehicle,
      };
    });
  };

  const searchVehicles = () => setShowResults(true);

  const filteredVehicles = transformVehicles(vehicles);

  // Show authentication required message
  if (!hasCredentials) {
    return (
      <Form
        navigationTitle={t.timeBasedSearch || "Time-Based Vehicle Search"}
        actions={
          <ActionPanel>
            <Action title={t.openPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      >
        <Form.Description title={t.authRequired} text={t.pleaseEnterCredentials} />
      </Form>
    );
  }

  // Show error state
  if (error) {
    return (
      <Form
        navigationTitle={t.timeBasedSearch || "Time-Based Vehicle Search"}
        actions={
          <ActionPanel>
            <Action title={t.checkCredentials} icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.Push title={t.checkSettings} icon={Icon.Checkmark} target={<CheckSettings />} />
          </ActionPanel>
        }
      >
        <Form.Description title={t.error} text={error} />
      </Form>
    );
  }

  // Show results if search was performed
  if (showResults) {
    const timeRangeText = `${startTime.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })} - ${endTime.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    return (
      <List
        navigationTitle={`${t.availableVehicles || "Available Vehicles"}: ${timeRangeText}`}
        isLoading={isSearching}
      >
        {filteredVehicles.length === 0 && !isSearching ? (
          <List.Item
            icon={Icon.Car}
            title={t.noVehiclesInTimeRange || "No vehicles available in this time range"}
            subtitle={t.tryDifferentTimeRange || "Try a different time range"}
            actions={
              <ActionPanel>
                <Action
                  title={t.newSearch || "New Search"}
                  onAction={() => setShowResults(false)}
                  icon={Icon.ArrowLeft}
                />
              </ActionPanel>
            }
          />
        ) : (
          filteredVehicles.map((item) => {
            const vehicle = item.originalData;

            const accessories = [
              { text: `🕐 ${t.availableInTimeRange || "Available"}` },
              ...(vehicle.data.electricVehicleData?.stateOfCharge?.value
                ? [{ text: `⚡ ${vehicle.data.electricVehicleData.stateOfCharge.value}%` }]
                : []),
              ...(vehicle.data.fuelLevelData?.fuelLevel?.value
                ? [{ text: `⛽ ${vehicle.data.fuelLevelData.fuelLevel.value}%` }]
                : []),
              ...(vehicle.data.electricVehicleData?.charging ? [{ text: "🔌" }] : []),
            ];

            return (
              <List.Item
                key={item.id}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.Push title={t.showDetails} icon={Icon.Eye} target={<VehicleDetail vehicle={vehicle} />} />
                    <Action.Push
                      title={t.bookVehicle}
                      icon={Icon.Calendar}
                      target={<BookingForm vehicle={vehicle} />}
                    />
                    {item.booking_url && (
                      <Action.OpenInBrowser title={t.bookInBrowser} url={item.booking_url} icon={Icon.Globe} />
                    )}
                    <Action
                      title={t.newSearch || "New Search"}
                      onAction={() => setShowResults(false)}
                      icon={Icon.ArrowLeft}
                      shortcut={Keyboard.Shortcut.Common.New}
                    />
                    <Action.CopyToClipboard title={t.copyTitle} content={item.title} />
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List>
    );
  }

  // Show search form
  return (
    <Form
      navigationTitle={t.timeBasedSearch || "Time-Based Vehicle Search"}
      isLoading={isSearching && !showResults}
      actions={
        <ActionPanel>
          <Action title={t.searchVehicles || "Search Vehicles"} onAction={searchVehicles} icon={Icon.MagnifyingGlass} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t.timeBasedSearch || "Time-Based Vehicle Search"}
        text={t.timeBasedSearchDescription || "Find vehicles available in a specific time range"}
      />

      <Form.DatePicker
        id="start-time"
        title={t.startDateTime || "From"}
        value={startTime}
        onChange={(date) => date && setStartTime(date)}
        type={Form.DatePicker.Type.DateTime}
      />

      <Form.DatePicker
        id="end-time"
        title={t.endDateTime || "To"}
        value={endTime}
        onChange={(date) => date && setEndTime(date)}
        type={Form.DatePicker.Type.DateTime}
      />
    </Form>
  );
}
