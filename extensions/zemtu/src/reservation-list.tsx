import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  Keyboard,
  Alert,
  confirmAlert,
  Color,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { graphqlClient, Reservation } from "./graphql";
import { useAuth } from "./useAuth";
import { ReservationDetail } from "./reservation-detail";
import { getTranslations } from "./translations";
import FindVehiclesCommand from "./vehicle-list";
import { ReservationUpdateWrapper } from "./reservation-update-wrapper";
import CheckSettings from "./check-settings";

export default function Command() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  const { isLoading: isAuthLoading, isAuthenticated, error, hasCredentials, preferences, t } = useAuth();
  const userPreferences = getPreferenceValues<{ language: string }>();
  const translations = getTranslations(userPreferences.language || "en");

  useEffect(() => {
    async function loadReservations() {
      if (!isAuthenticated) return;

      try {
        setIsLoadingReservations(true);
        // console.log("Loading reservations...");
        const reservationsData = await graphqlClient.getReservations();
        // console.log("Reservations loaded:", reservationsData);

        setReservations(reservationsData);
      } catch (err) {
        console.error("Error loading reservations:", err);
        // Error handling is managed by useAuth hook
      } finally {
        setIsLoadingReservations(false);
      }
    }

    loadReservations();
  }, [isAuthenticated]);

  const isLoading = isAuthLoading || isLoadingReservations;

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

  // Show error state
  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={t.error}
          description={error}
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

  // Show reservations
  return (
    <List isLoading={isLoading}>
      {reservations.length === 0 && !isLoading ? (
        <List.Item
          icon={Icon.Calendar}
          title={translations.noReservations}
          subtitle={translations.noReservationsSubtitle}
          actions={
            <ActionPanel>
              <Action.Push
                title={translations.findVehicles}
                icon={Icon.Car}
                target={<FindVehiclesCommand />}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "return" },
                  Windows: { modifiers: ["ctrl"], key: "return" },
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        reservations.map((reservation) => {
          const startDate = new Date(reservation.start);
          const endDate = new Date(reservation.end);
          const vehicleTitle = reservation.vehicle.captions?.[0] || `${translations.vehicle} ${reservation.vehicle.id}`;

          // Use proper locale for date formatting
          const locale = userPreferences.language === "de" ? "de-DE" : "en-US";

          // Format dates naturally
          const startDateStr = startDate.toLocaleDateString(locale);
          const endDateStr = endDate.toLocaleDateString(locale);
          const startTimeStr = startDate.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
          const endTimeStr = endDate.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

          // Check if start and end are on the same day
          const isSameDay = startDateStr === endDateStr;

          // Check if the date is today
          const today = new Date();
          const todayStr = today.toLocaleDateString(locale);
          const isToday = startDateStr === todayStr;

          // Use "Heute" for today's date, otherwise use the actual date
          const displayStartDate = isToday ? translations.today : startDateStr;
          const displayEndDate = endDateStr === todayStr ? translations.today : endDateStr;

          const dateTimeText = isSameDay
            ? `${displayStartDate} ${translations.from} ${startTimeStr} ${translations.to} ${endTimeStr} ${translations.oclock}`
            : `${translations.on} ${displayStartDate} ${translations.from} ${startTimeStr} ${translations.to} ${displayEndDate} ${endTimeStr} ${translations.oclock}`;

          return (
            <List.Item
              key={reservation.id}
              icon={reservation.state === "OPENED" ? Icon.Car : Icon.Lock}
              title={vehicleTitle}
              accessories={[{ text: dateTimeText }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={translations.showDetails}
                    icon={Icon.Eye}
                    target={<ReservationDetail reservation={reservation} />}
                  />
                  <Action.Push
                    title={translations.editReservation}
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<ReservationUpdateWrapper reservation={reservation} />}
                  />
                  <Action.CopyToClipboard
                    title={translations.copyReservationDetails}
                    content={`${translations.reservation}: ${vehicleTitle}\n${translations.start}: ${startDate.toLocaleDateString(locale)} ${startDate.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}\n${translations.end}: ${endDate.toLocaleDateString(locale)} ${endDate.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}\n${translations.status}: ${reservation.state}`}
                  />
                  <Action.OpenInBrowser
                    title={translations.openInBrowser}
                    url={`${preferences.baseUrl}/reservations/${reservation.id}`}
                  />
                  <Action
                    title={translations.deleteReservation}
                    icon={Icon.Trash}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      // Deleting can't be undone, so ask first
                      const confirmed = await confirmAlert({
                        title: translations.deleteConfirmTitle,
                        message: `${vehicleTitle}\n${dateTimeText}`,
                        icon: Icon.Trash,
                        primaryAction: { title: translations.deleteAction, style: Alert.ActionStyle.Destructive },
                        dismissAction: { title: translations.cancel },
                      });
                      if (!confirmed) return;

                      try {
                        const toast = await showToast({
                          style: Toast.Style.Animated,
                          title: translations.deletingReservation,
                        });

                        await graphqlClient.deleteReservation(reservation.id);

                        toast.style = Toast.Style.Success;
                        toast.title = translations.reservationDeleted;

                        // Aktualisiere die Reservierungsliste
                        setReservations(reservations.filter((r) => r.id !== reservation.id));
                      } catch (error) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: translations.errorDeleting,
                          message: error instanceof Error ? error.message : String(error),
                        });
                      }
                    }}
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
