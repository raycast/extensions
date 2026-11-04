import {
  MenuBarExtra,
  openExtensionPreferences,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { graphqlClient, Reservation } from "./graphql";
import { describeLoadError, useAuth } from "./useAuth";

// Raycast re-runs this command every 5 minutes (see "interval" in package.json)
const fetchReservations = () => graphqlClient.getReservations();

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const getTimeUntilStart = (startTime: string) => {
  const diffMs = new Date(startTime).getTime() - Date.now();
  if (diffMs < 0) return "Ongoing";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `in ${hours}h ${minutes}m` : `in ${minutes}m`;
};

const vehicleName = ({ vehicle }: Reservation) => vehicle.label || vehicle.captions?.[0] || `Vehicle ${vehicle.id}`;

const openCommand = async (name: string, title: string) => {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch {
    await showHUD(`Could not open ${title}. Is the command enabled in Raycast?`);
  }
};
const openReservations = () => openCommand("reservation-list", "My Reservations");
const openVehicles = () => openCommand("vehicle-list", "List Vehicles");

export default function MenuBarReservations() {
  const { enableMenuBar } = getPreferenceValues<Preferences>();
  const { isLoading: isAuthLoading, error: authError, hasCredentials } = useAuth();
  const {
    data: reservations = [],
    isLoading: isLoadingReservations,
    error: loadError,
    revalidate,
  } = usePromise(fetchReservations, [], {
    execute: hasCredentials && enableMenuBar,
    // Shown as a menu item below
    onError: () => undefined,
  });

  // If the menu bar is disabled in the preferences, don't render anything
  if (!enableMenuBar) {
    return null;
  }

  const isLoading = isAuthLoading || isLoadingReservations;
  const errorMessage = authError ?? (loadError ? describeLoadError(loadError) : null);

  const now = new Date();
  const current = reservations.find((r) => now >= new Date(r.start) && now <= new Date(r.end));
  const upcoming = reservations
    .filter((r) => new Date(r.start) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5); // Show max 5 upcoming

  const tooltip = isLoading
    ? "Loading reservations..."
    : !hasCredentials
      ? "Authentication Required"
      : errorMessage
        ? errorMessage
        : current
          ? `Current Reservation: ${vehicleName(current)} until ${formatDateTime(current.end)}`
          : upcoming[0]
            ? `Next Reservation: ${vehicleName(upcoming[0])} ${getTimeUntilStart(upcoming[0].start)}`
            : "You have no reservations.";

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "menu-bar-black.png",
          dark: "menu-bar-white.png",
        },
      }}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {!hasCredentials ? (
        <MenuBarExtra.Item title="Authentication Required" onAction={openExtensionPreferences} />
      ) : authError ? (
        <MenuBarExtra.Item title="Error" subtitle={authError} onAction={openExtensionPreferences} />
      ) : loadError ? (
        <>
          <MenuBarExtra.Item title="Could not load reservations" subtitle={errorMessage ?? undefined} />
          <MenuBarExtra.Item title="Try Again" onAction={revalidate} icon="🔄" />
        </>
      ) : isLoading ? (
        <MenuBarExtra.Item title="Loading reservations..." />
      ) : reservations.length === 0 ? (
        <>
          <MenuBarExtra.Item title="You have no reservations." />
          <MenuBarExtra.Item title="Open Zemtu Extension" onAction={openVehicles} />
        </>
      ) : (
        <>
          {current ? (
            <MenuBarExtra.Section title="Current Reservation">
              <MenuBarExtra.Item
                title={vehicleName(current)}
                subtitle={`until ${formatDateTime(current.end)}`}
                icon="🚗"
                onAction={openReservations}
              />
            </MenuBarExtra.Section>
          ) : null}

          {upcoming.length > 0 ? (
            <MenuBarExtra.Section title="Upcoming Reservations">
              {upcoming.map((reservation) => (
                <MenuBarExtra.Item
                  key={reservation.id}
                  title={vehicleName(reservation)}
                  subtitle={`${formatDateTime(reservation.start)} (${getTimeUntilStart(reservation.start)})`}
                  icon="🕐"
                  onAction={openReservations}
                />
              ))}
            </MenuBarExtra.Section>
          ) : null}

          <MenuBarExtra.Section title="Actions">
            <MenuBarExtra.Item title="Refresh" onAction={revalidate} icon="🔄" />
            <MenuBarExtra.Item title="Open Zemtu Extension" onAction={openVehicles} icon="🚗" />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
