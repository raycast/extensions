import {
  ActionPanel,
  Detail,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  popToRoot,
  getPreferenceValues,
  Keyboard,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { getTranslations } from "./translations";
import { graphqlClient, Reservation } from "./graphql";
import { ReservationUpdateWrapper } from "./reservation-update-wrapper";
import { formatCapability, mapsUrl, withImageHeight } from "./utils";

interface ReservationDetailProps {
  reservation: Reservation;
}

export function ReservationDetail({ reservation }: ReservationDetailProps) {
  const userPreferences = getPreferenceValues<{ language: string }>();
  const translations = getTranslations(userPreferences.language || "en");
  const locale = userPreferences.language === "de" ? "de-DE" : "en-US";

  const { vehicle } = reservation;
  const startDate = new Date(reservation.start);
  const endDate = new Date(reservation.end);
  const now = new Date();

  const vehicleTitle = vehicle.label || vehicle.captions?.[0] || `${translations.vehicle} ${vehicle.id}`;
  const brandModel = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  const fullAddress = [vehicle.address, [vehicle.zip, vehicle.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const capabilities = (vehicle.capabilities ?? []).filter(Boolean);
  const mapsLink = fullAddress ? mapsUrl(fullAddress) : undefined;

  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  const formatTime = (date: Date) => date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const oclock = userPreferences.language === "de" ? ` ${translations.oclock}` : "";

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const timeRange = isSameDay
    ? `${formatDate(startDate)} · ${formatTime(startDate)} – ${formatTime(endDate)}${oclock}`
    : `${formatDate(startDate)} ${formatTime(startDate)} – ${formatDate(endDate)} ${formatTime(endDate)}${oclock}`;

  // "3 h", "1 h 30 min", "2 Tage 4 h"
  const formatDuration = (ms: number) => {
    const totalMinutes = Math.round(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    return [
      days ? `${days} ${days === 1 ? translations.day : translations.days}` : "",
      hours ? `${hours} h` : "",
      minutes ? `${minutes} min` : "",
    ]
      .filter(Boolean)
      .join(" ");
  };
  const duration = formatDuration(endDate.getTime() - startDate.getTime());

  // Where the reservation stands in time
  const timing =
    now >= startDate && now <= endDate
      ? { text: translations.ongoing, color: Color.Green }
      : now > endDate
        ? { text: translations.ended, color: Color.SecondaryText }
        : { text: translations.upcoming, color: Color.Blue };
  const startsIn =
    startDate > now ? `${translations.inHours} ${formatDuration(startDate.getTime() - now.getTime())}` : "";

  const stateLabel =
    reservation.state === "OPENED"
      ? translations.stateOpened
      : reservation.state === "PROTECTED"
        ? translations.stateProtected
        : reservation.state;

  const markdown = [
    vehicle.thumbnail ? `![${vehicleTitle}](${withImageHeight(vehicle.thumbnail, 200)})` : "",
    `# ${vehicleTitle}`,
    `**${timeRange}**`,
    [brandModel, startsIn].filter(Boolean).join(" · "),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${translations.reservation}: ${vehicleTitle}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title={translations.status}>
            <Detail.Metadata.TagList.Item text={timing.text} color={timing.color} />
            <Detail.Metadata.TagList.Item
              text={stateLabel}
              color={reservation.state === "PROTECTED" ? Color.Orange : Color.Green}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title={translations.start}
            text={`${formatDate(startDate)}, ${formatTime(startDate)}`}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label
            title={translations.end}
            text={`${formatDate(endDate)}, ${formatTime(endDate)}`}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label title={translations.duration} text={duration} icon={Icon.Clock} />
          {reservation.fishingPin ? (
            <Detail.Metadata.Label title={translations.fishingPin} text={reservation.fishingPin} icon={Icon.Key} />
          ) : null}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={translations.vehicle} text={brandModel || vehicleTitle} icon={Icon.Car} />
          {vehicle.licensePlate ? (
            <Detail.Metadata.Label title={translations.licensePlate} text={vehicle.licensePlate} />
          ) : null}
          {fullAddress ? (
            <Detail.Metadata.Label title={translations.address} text={fullAddress} icon={Icon.Pin} />
          ) : null}
          {mapsLink ? <Detail.Metadata.Link title="" text={translations.openInMaps} target={mapsLink} /> : null}

          {capabilities.length > 0 ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title={translations.equipment}>
                {capabilities.map((capability) => (
                  <Detail.Metadata.TagList.Item key={capability} text={formatCapability(capability)} />
                ))}
              </Detail.Metadata.TagList>
            </>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title={translations.editReservation}
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<ReservationUpdateWrapper reservation={reservation} />}
          />
          {mapsLink ? (
            <Action.OpenInBrowser
              title={translations.openInMaps}
              url={mapsLink}
              icon={Icon.Map}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "m" }, Windows: { modifiers: ["ctrl"], key: "m" } }}
            />
          ) : null}
          {reservation.fishingPin ? (
            <Action.CopyToClipboard title={translations.copyPin} content={reservation.fishingPin} icon={Icon.Key} />
          ) : null}
          <Action.CopyToClipboard
            title={translations.copyAllDetails}
            content={[
              `${translations.reservation}: ${vehicleTitle}`,
              timeRange,
              `${translations.duration}: ${duration}`,
              `${translations.status}: ${stateLabel}`,
              vehicle.licensePlate && `${translations.licensePlate}: ${vehicle.licensePlate}`,
              fullAddress && `${translations.address}: ${fullAddress}`,
              reservation.fishingPin && `${translations.fishingPin}: ${reservation.fishingPin}`,
            ]
              .filter(Boolean)
              .join("\n")}
          />
          <Action.CopyToClipboard title={translations.copyReservationId} content={reservation.id} />
          <Action
            title={translations.deleteReservation}
            icon={Icon.Trash}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
            style={Action.Style.Destructive}
            onAction={async () => {
              // Deleting can't be undone, so ask first
              const confirmed = await confirmAlert({
                title: translations.deleteConfirmTitle,
                message: `${vehicleTitle}\n${timeRange}`,
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

                // Zurück zur Reservierungsliste navigieren
                await popToRoot();
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
}
