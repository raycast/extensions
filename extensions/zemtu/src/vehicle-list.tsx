import {
  ActionPanel,
  Action,
  Icon,
  List,
  Keyboard,
  openExtensionPreferences,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Vehicle } from "./graphql";
import { useAuth } from "./useAuth";
import { useVehicles } from "./useVehicles";
import { haversineKm } from "./utils";
import { getLocationPreference, resolveLocation } from "./location";
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
  calculatedDistance?: number | null;
  originalData: Vehicle;
}

type SortOption = "alphabetical" | "distance";

export default function Command() {
  const { error: authError, hasCredentials, preferences, t } = useAuth();
  // Cached vehicles show up instantly, fresh data replaces them once loaded
  const { data: vehicles, isLoading, revalidate } = useVehicles({ execute: hasCredentials });

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
        title: t.locationNotFound,
        message: locationPreference,
        primaryAction: { title: t.openPreferences, onAction: () => openExtensionPreferences() },
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
      const accessory = vehicle.instantAvailability.usableNow ? t.available : t.notAvailable;

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
        calculatedDistance: getDistance(vehicle),
        originalData: vehicle,
      };
    });
  };

  const items = transformVehicles(vehicles);

  // Show authentication required message
  if (!hasCredentials) {
    return (
      <List>
        <List.Item
          icon={Icon.Lock}
          title={t.authRequired}
          subtitle={t.pleaseEnterCredentials}
          actions={
            <ActionPanel>
              <Action title={t.openPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Show error state (only if there is nothing cached to show instead)
  if (authError && items.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={t.error}
          description={authError}
          actions={
            <ActionPanel>
              <Action title={t.checkCredentials} icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.Push title={t.checkSettings} icon={Icon.Checkmark} target={<CheckSettings />} />
            </ActionPanel>
          }
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
      searchBarAccessory={
        hasCoordinates ? (
          <List.Dropdown tooltip={t.filterBy} value={sortBy} onChange={(newValue) => setSortBy(newValue as SortOption)}>
            <List.Dropdown.Item title={t.sortByDistance} value="distance" />
            <List.Dropdown.Item title={t.sortAlphabetically} value="alphabetical" />
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
                  <Action.Push title={t.showDetails} icon={Icon.Eye} target={<VehicleDetail vehicle={vehicle} />} />
                  <Action.Push title={t.bookVehicle} icon={Icon.Calendar} target={<BookingForm vehicle={vehicle} />} />
                  {item.booking_url && (
                    <Action.OpenInBrowser title={t.bookInBrowser} url={item.booking_url} icon={Icon.Globe} />
                  )}
                  <Action
                    title={t.refreshReservations}
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <Action.CopyToClipboard title={t.copyTitle} content={item.title} />
                  <Action.CopyToClipboard title={t.copyVehicleId} content={item.id} />
                  <Action.CopyToClipboard title={t.copyLicensePlate} content={vehicle.licensePlate} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
