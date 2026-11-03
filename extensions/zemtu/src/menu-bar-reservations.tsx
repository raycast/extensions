import { MenuBarExtra, openExtensionPreferences, getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { graphqlClient, Reservation } from "./graphql";
import { useAuth } from "./useAuth";

interface Preferences {
  enableMenuBar: boolean;
}

export default function MenuBarReservations() {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, isAuthenticated, error, hasCredentials, t } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  // Format date for display
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get time until reservation starts
  const getTimeUntilStart = (startTime: string): string => {
    const now = new Date();
    const start = new Date(startTime);
    const diffMs = start.getTime() - now.getTime();

    if (diffMs < 0) {
      return t.ongoing || "Ongoing";
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${t.inHours || "in"} ${diffHours}h ${diffMinutes}m`;
    } else {
      return `${t.inMinutes || "in"} ${diffMinutes}m`;
    }
  };

  // Check if reservation is active now
  const isActive = (reservation: Reservation): boolean => {
    const now = new Date();
    const start = new Date(reservation.start);
    const end = new Date(reservation.end);
    return now >= start && now <= end;
  };

  // Get next upcoming reservation
  const getNextReservation = (): Reservation | null => {
    const now = new Date();
    const upcoming = reservations
      .filter((r) => new Date(r.start) > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return upcoming.length > 0 ? upcoming[0] : null;
  };

  // Get current active reservation
  const getCurrentReservation = (): Reservation | null => {
    return reservations.find((r) => isActive(r)) || null;
  };

  // Fetch reservations
  const fetchReservations = async () => {
    if (!isAuthenticated) return;

    setIsLoadingReservations(true);
    try {
      const fetchedReservations = await graphqlClient.getReservations();
      setReservations(fetchedReservations);
    } catch (err) {
      console.error("Error fetching reservations:", err);
    } finally {
      setIsLoadingReservations(false);
    }
  };

  useEffect(() => {
    // Raycast re-runs this command every 5 minutes (see "interval" in package.json)
    if (isAuthenticated && preferences.enableMenuBar) {
      fetchReservations();
    }
  }, [isAuthenticated]);

  // Get menu bar title and icon
  const getMenuBarDisplay = () => {
    if (isLoading || isLoadingReservations) {
      return {
        title: "🚗",
        tooltip: t.loadingReservations || "Loading reservations...",
      };
    }

    if (!hasCredentials || error) {
      return {
        title: "❌",
        tooltip: t.authenticationRequired || "Authentication required",
      };
    }

    const currentReservation = getCurrentReservation();
    const nextReservation = getNextReservation();

    if (currentReservation) {
      const vehicleName = currentReservation.vehicle.captions?.[0] || `Vehicle ${currentReservation.vehicle.id}`;
      const endTime = formatDateTime(currentReservation.end);
      return {
        title: "🚗",
        tooltip: `${t.currentReservation || "Current"}: ${vehicleName} ${t.until || "until"} ${endTime}`,
      };
    }

    if (nextReservation) {
      const vehicleName = nextReservation.vehicle.captions?.[0] || `Vehicle ${nextReservation.vehicle.id}`;
      const timeUntil = getTimeUntilStart(nextReservation.start);
      return {
        title: `🚗`,
        tooltip: `${t.nextReservation || "Next"}: ${vehicleName} ${timeUntil}`,
      };
    }

    return {
      title: "🚙",
      tooltip: t.noReservations || "No reservations",
    };
  };

  const { tooltip } = getMenuBarDisplay();

  const openReservations = async () => {
    try {
      await launchCommand({ name: "reservation-list", type: LaunchType.UserInitiated });
    } catch (err) {
      console.error("Error opening reservations:", err);
    }
  };

  const openVehicles = async () => {
    try {
      await launchCommand({ name: "vehicle-list", type: LaunchType.UserInitiated });
    } catch (err) {
      console.error("Error opening vehicles:", err);
    }
  };

  // If menu bar is disabled in preferences, don't render anything
  if (!preferences.enableMenuBar) {
    return null;
  }

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "menu-bar-black.png",
          dark: "menu-bar-white.png",
        },
      }}
      tooltip={tooltip}
      isLoading={isLoading || isLoadingReservations}
    >
      {!hasCredentials ? (
        <MenuBarExtra.Item
          title={t.authenticationRequired || "Authentication Required"}
          onAction={openExtensionPreferences}
        />
      ) : error ? (
        <MenuBarExtra.Item title={t.error || "Error"} subtitle={error} onAction={openExtensionPreferences} />
      ) : isLoading || isLoadingReservations ? (
        <MenuBarExtra.Item title={t.loadingReservations || "Loading reservations..."} />
      ) : reservations.length === 0 ? (
        <>
          <MenuBarExtra.Item title={t.noReservations || "No reservations"} />
          <MenuBarExtra.Item title={t.openZemtu || "Open Zemtu Extension"} onAction={openVehicles} />
        </>
      ) : (
        <>
          {/* Current reservation section */}
          {(() => {
            const current = getCurrentReservation();
            if (current) {
              const vehicleName = current.vehicle.captions?.[0] || `Vehicle ${current.vehicle.id}`;
              const endTime = formatDateTime(current.end);
              return (
                <>
                  <MenuBarExtra.Section title={t.currentReservation || "Current Reservation"}>
                    <MenuBarExtra.Item
                      title={vehicleName}
                      subtitle={`${t.until || "until"} ${endTime}`}
                      icon="🚗"
                      onAction={openReservations}
                    />
                  </MenuBarExtra.Section>
                </>
              );
            }
            return null;
          })()}

          {/* Upcoming reservations */}
          {(() => {
            const upcomingReservations = reservations
              .filter((r) => new Date(r.start) > new Date())
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .slice(0, 5); // Show max 5 upcoming

            if (upcomingReservations.length === 0) {
              return null;
            }

            return (
              <MenuBarExtra.Section title={t.upcomingReservations || "Upcoming Reservations"}>
                {upcomingReservations.map((reservation) => {
                  const vehicleName = reservation.vehicle.captions?.[0] || `Vehicle ${reservation.vehicle.id}`;
                  const startTime = formatDateTime(reservation.start);
                  const timeUntil = getTimeUntilStart(reservation.start);

                  return (
                    <MenuBarExtra.Item
                      key={reservation.id}
                      title={vehicleName}
                      subtitle={`${startTime} (${timeUntil})`}
                      icon="🕐"
                      onAction={openReservations}
                    />
                  );
                })}
              </MenuBarExtra.Section>
            );
          })()}

          {/* Actions */}
          <MenuBarExtra.Section title={t.actions || "Actions"}>
            <MenuBarExtra.Item title={t.refreshReservations || "Refresh"} onAction={fetchReservations} icon="🔄" />
            <MenuBarExtra.Item title={t.openZemtu || "Open Zemtu Extension"} onAction={openVehicles} icon="🚗" />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
