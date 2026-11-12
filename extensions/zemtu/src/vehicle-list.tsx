import { ActionPanel, Action, Icon, List, Keyboard, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { graphqlClient, Vehicle } from "./graphql";
import { describeLoadError, useAuth } from "./useAuth";
import { useVehicles } from "./useVehicles";
import { haversineKm } from "./utils";
import { getLocationPreference, resolveLocation } from "./location";
import { VehicleDetail } from "./vehicle-detail";
import { BookingForm } from "./reservation-create";
import { ErrorEmptyView } from "./error-view";

interface TransformedVehicle {
  id: string;
  icon: Icon | { source: string };
  title: string;
  subtitle: string;
  accessory: string;
  booking_url?: string;
  calculatedDistance?: number | null;
  originalData: Vehicle;
}

type SortOption = "alphabetical" | "distance";

// `onBooked` is only set when another command pushes this view
export default function Command({ onBooked }: { onBooked?: () => void }) {
  const { error: authError, hasCredentials, retryLogin } = useAuth();
  // Cached vehicles show up instantly, fresh data replaces them once loaded
  const { data: vehicles, isLoading, error: loadError, revalidate } = useVehicles({ execute: hasCredentials });

  // Default to sorting by distance when the user entered a location
  const locationPreference = getLocationPreference();
  const hasCoordinates = Boolean(locationPreference);
  const [sortBy, setSortBy] = useState<SortOption>(hasCoordinates ? "distance" : "alphabetical");

  // Address or coordinates from the preferences; cached, so an address is only looked up once
  const { data: userLocation } = useCachedPromise(resolveLocation, [locationPreference], {
    execute: hasCoordinates,
    onData: (coordinates) => {
      if (coordinates) return;
      showToast({
        style: Toast.Style.Failure,
        title: "Location not found – check the address in the preferences",
        message: locationPreference,
        primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
      });
    },
  });

  // Distance from the user's location to the vehicle's current (or home) position
  const getDistance = (vehicle: Vehicle): number | null => {
    if (!userLocation) return null;
    const position = vehicle.data.floatingPosition?.point ?? vehicle.homebase;
    if (position?.latitude == null || position?.longitude == null) return null;
    return haversineKm(userLocation.latitude, userLocation.longitude, position.latitude, position.longitude);
  };

  const transformVehicles = (vehicles: Vehicle[]): TransformedVehicle[] => {
    return vehicles.map((vehicle) => {
      const title = vehicle.label || vehicle.captions?.[0] || `${vehicle.brand} ${vehicle.model}`;
      const subtitle = `${vehicle.address}, ${vehicle.city} ${vehicle.zip}`;
      const accessory = vehicle.instantAvailability.usableNow ? "Available" : "Not Available";

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
        booking_url: `${graphqlClient.getBaseUrl()}/instant_booking/${vehicle.pk}`,
        calculatedDistance: getDistance(vehicle),
        originalData: vehicle,
      };
    });
  };

  const handleBooked = () => {
    revalidate();
    onBooked?.();
  };

  const items = transformVehicles(vehicles);

  // Show authentication required message
  if (!hasCredentials) {
    return (
      <List>
        <List.Item
          icon={Icon.Lock}
          title="Authentication Required"
          subtitle="Please enter your username and password in preferences"
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Show error state (only if there is nothing cached to show instead)
  const errorMessage = authError ?? (loadError ? describeLoadError(loadError) : null);
  if (errorMessage && items.length === 0) {
    return (
      <List isLoading={isLoading}>
        <ErrorEmptyView
          description={errorMessage}
          onRetry={() => {
            retryLogin();
            revalidate();
          }}
        />
      </List>
    );
  }

  // Sort items based on selected option
  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === "distance") {
      // Sort by distance (closest first), put items without distance at the end
      const aDistance = a.calculatedDistance ?? null;
      const bDistance = b.calculatedDistance ?? null;

      if (aDistance === null && bDistance === null) return 0;
      if (aDistance === null) return 1;
      if (bDistance === null) return -1;
      return aDistance - bDistance;
    } else {
      // Sort alphabetically by title
      return a.title.localeCompare(b.title);
    }
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search vehicles"
      searchBarAccessory={
        hasCoordinates ? (
          <List.Dropdown tooltip="Filter by" value={sortBy} onChange={(newValue) => setSortBy(newValue as SortOption)}>
            <List.Dropdown.Item title="Sort by Distance" value="distance" />
            <List.Dropdown.Item title="Sort Alphabetically" value="alphabetical" />
          </List.Dropdown>
        ) : undefined
      }
    >
      {sortedItems.length === 0 && !isLoading ? (
        <List.Item icon={Icon.Car} title="No vehicles found" subtitle="No vehicles are currently available" />
      ) : (
        sortedItems.map((item) => {
          const vehicle = item.originalData;

          // Create additional info for accessories
          const accessories = [
            { text: item.accessory },
            ...(item.calculatedDistance != null ? [{ text: `${item.calculatedDistance.toFixed(1)} km` }] : []),
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
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Eye}
                    target={<VehicleDetail vehicle={vehicle} onBooked={handleBooked} />}
                  />
                  <Action.Push
                    title="Book Vehicle"
                    icon={Icon.Calendar}
                    target={<BookingForm vehicle={vehicle} onBooked={handleBooked} />}
                  />
                  {item.booking_url && (
                    <Action.OpenInBrowser title="Book in Browser" url={item.booking_url} icon={Icon.Globe} />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <Action.CopyToClipboard title="Copy Title" icon={Icon.Clipboard} content={item.title} />
                  <Action.CopyToClipboard title="Copy Vehicle ID" icon={Icon.Clipboard} content={item.id} />
                  <Action.CopyToClipboard
                    title="Copy License Plate"
                    icon={Icon.Clipboard}
                    content={vehicle.licensePlate}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
