import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  openExtensionPreferences,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { graphqlClient, Reservation } from "./graphql";
import { describeLoadError, useAuth } from "./useAuth";
import { ReservationDetail } from "./reservation-detail";
import FindVehiclesCommand from "./vehicle-list";
import { ReservationUpdateWrapper } from "./reservation-update-wrapper";
import { ErrorEmptyView } from "./error-view";

// Not cached on disk on purpose: reservations contain the access PIN
const fetchReservations = () => graphqlClient.getReservations();

const formatTime = (date: Date) => date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

const formatDay = (date: Date) =>
  date.toDateString() === new Date().toDateString() ? "Today" : date.toLocaleDateString();

const formatRange = (reservation: Reservation) => {
  const start = new Date(reservation.start);
  const end = new Date(reservation.end);
  return start.toDateString() === end.toDateString()
    ? `${formatDay(start)}, ${formatTime(start)} – ${formatTime(end)}`
    : `${formatDay(start)}, ${formatTime(start)} – ${formatDay(end)}, ${formatTime(end)}`;
};

export default function Command() {
  const { isLoading: isAuthLoading, error: authError, hasCredentials, retryLogin } = useAuth();
  const {
    data: reservations = [],
    isLoading: isLoadingReservations,
    error: loadError,
    revalidate,
  } = usePromise(fetchReservations, [], {
    execute: hasCredentials,
    // Shown in the error view below
    onError: () => undefined,
  });

  const isLoading = isAuthLoading || isLoadingReservations;

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

  const errorMessage = authError ?? (loadError ? describeLoadError(loadError) : null);
  if (errorMessage) {
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

  const deleteReservation = async (reservation: Reservation, vehicleTitle: string) => {
    // Deleting can't be undone, so ask first
    const confirmed = await confirmAlert({
      title: "Delete this reservation?",
      message: `${vehicleTitle}\n${formatRange(reservation)}`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel" },
    });
    if (!confirmed) return;

    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting Reservation" });
      await graphqlClient.deleteReservation(reservation.id);
      toast.style = Toast.Style.Success;
      toast.title = "Reservation Deleted";
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Error Deleting" });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search reservations">
      {reservations.length === 0 && !isLoading ? (
        <List.Item
          icon={Icon.Calendar}
          title="You have no reservations."
          subtitle="Search for a vehicle."
          actions={
            <ActionPanel>
              <Action.Push
                title="Find Vehicles"
                icon={Icon.Car}
                target={<FindVehiclesCommand onBooked={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        reservations.map((reservation) => {
          const { vehicle } = reservation;
          const vehicleTitle = vehicle.label || vehicle.captions?.[0] || `Vehicle ${vehicle.id}`;
          const dateTimeText = formatRange(reservation);

          return (
            <List.Item
              key={reservation.id}
              icon={reservation.state === "OPENED" ? Icon.Car : Icon.Lock}
              title={vehicleTitle}
              accessories={[{ text: dateTimeText }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Eye}
                    target={<ReservationDetail reservation={reservation} onChange={revalidate} />}
                  />
                  <Action.Push
                    title="Edit Reservation"
                    icon={Icon.Pencil}
                    target={<ReservationUpdateWrapper reservation={reservation} onSaved={revalidate} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Reservation Details"
                    icon={Icon.Clipboard}
                    content={`Reservation: ${vehicleTitle}\n${dateTimeText}\nStatus: ${reservation.state}`}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    icon={Icon.Globe}
                    url={`${graphqlClient.getBaseUrl()}/reservations/${reservation.id}`}
                  />
                  <Action
                    title="Delete Reservation"
                    icon={Icon.Trash}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                    style={Action.Style.Destructive}
                    onAction={() => deleteReservation(reservation, vehicleTitle)}
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
