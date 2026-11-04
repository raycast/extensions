import {
  ActionPanel,
  Detail,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  popToRoot,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { graphqlClient, Reservation } from "./graphql";
import { ReservationUpdateWrapper } from "./reservation-update-wrapper";
import { formatCapability, mapsUrl, withImageHeight } from "./utils";

interface ReservationDetailProps {
  reservation: Reservation;
  onChange?: () => void;
}

export function ReservationDetail({ reservation, onChange }: ReservationDetailProps) {
  const { vehicle } = reservation;
  const startDate = new Date(reservation.start);
  const endDate = new Date(reservation.end);
  const now = new Date();

  const vehicleTitle = vehicle.label || vehicle.captions?.[0] || `Vehicle ${vehicle.id}`;
  const brandModel = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  const fullAddress = [vehicle.address, [vehicle.zip, vehicle.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const capabilities = (vehicle.capabilities ?? []).filter(Boolean);
  const mapsLink = fullAddress ? mapsUrl(fullAddress) : undefined;

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  const formatTime = (date: Date) => date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const timeRange = isSameDay
    ? `${formatDate(startDate)} · ${formatTime(startDate)} – ${formatTime(endDate)}`
    : `${formatDate(startDate)} ${formatTime(startDate)} – ${formatDate(endDate)} ${formatTime(endDate)}`;

  // "3 h", "1 h 30 min", "2 days 4 h"
  const formatDuration = (ms: number) => {
    const totalMinutes = Math.round(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    return [
      days ? `${days} ${days === 1 ? "day" : "days"}` : "",
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
      ? { text: "Ongoing", color: Color.Green }
      : now > endDate
        ? { text: "Ended", color: Color.SecondaryText }
        : { text: "Upcoming", color: Color.Blue };
  const startsIn = startDate > now ? `in ${formatDuration(startDate.getTime() - now.getTime())}` : "";

  const stateLabel =
    reservation.state === "OPENED" ? "Confirmed" : reservation.state === "PROTECTED" ? "Protected" : reservation.state;

  const markdown = [
    vehicle.thumbnail ? `![${vehicleTitle}](${withImageHeight(vehicle.thumbnail, 200)})` : "",
    `# ${vehicleTitle}`,
    `**${timeRange}**`,
    [brandModel, startsIn].filter(Boolean).join(" · "),
  ]
    .filter(Boolean)
    .join("\n\n");

  const deleteReservation = async () => {
    // Deleting can't be undone, so ask first
    const confirmed = await confirmAlert({
      title: "Delete this reservation?",
      message: `${vehicleTitle}\n${timeRange}`,
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

      onChange?.();
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Error Deleting" });
    }
  };

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Reservation: ${vehicleTitle}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={timing.text} color={timing.color} />
            <Detail.Metadata.TagList.Item
              text={stateLabel}
              color={reservation.state === "PROTECTED" ? Color.Orange : Color.Green}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Start"
            text={`${formatDate(startDate)}, ${formatTime(startDate)}`}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label
            title="End"
            text={`${formatDate(endDate)}, ${formatTime(endDate)}`}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label title="Duration" text={duration} icon={Icon.Clock} />
          {reservation.fishingPin ? (
            <Detail.Metadata.Label title="Fishing Pin" text={reservation.fishingPin} icon={Icon.Key} />
          ) : null}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Vehicle" text={brandModel || vehicleTitle} icon={Icon.Car} />
          {vehicle.licensePlate ? <Detail.Metadata.Label title="License Plate" text={vehicle.licensePlate} /> : null}
          {fullAddress ? <Detail.Metadata.Label title="Address" text={fullAddress} icon={Icon.Pin} /> : null}
          {mapsLink ? <Detail.Metadata.Link title="" text="Open in Maps" target={mapsLink} /> : null}

          {capabilities.length > 0 ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Equipment">
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
            title="Edit Reservation"
            icon={Icon.Pencil}
            target={<ReservationUpdateWrapper reservation={reservation} onSaved={onChange} />}
          />
          {/* Concealed because it contains the PIN, so it stays out of the clipboard history */}
          <Action.CopyToClipboard
            title="Copy All Details"
            icon={Icon.Clipboard}
            concealed
            content={[
              `Reservation: ${vehicleTitle}`,
              timeRange,
              `Duration: ${duration}`,
              `Status: ${stateLabel}`,
              vehicle.licensePlate && `License Plate: ${vehicle.licensePlate}`,
              fullAddress && `Address: ${fullAddress}`,
              reservation.fishingPin && `Fishing Pin: ${reservation.fishingPin}`,
            ]
              .filter(Boolean)
              .join("\n")}
          />
          {mapsLink ? (
            <Action.OpenInBrowser
              title="Open in Maps"
              url={mapsLink}
              icon={Icon.Map}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "m" }, Windows: { modifiers: ["ctrl"], key: "m" } }}
            />
          ) : null}
          {reservation.fishingPin ? (
            <Action.CopyToClipboard title="Copy PIN" concealed content={reservation.fishingPin} icon={Icon.Key} />
          ) : null}
          <Action.CopyToClipboard title="Copy Reservation ID" icon={Icon.Clipboard} content={reservation.id} />
          <Action
            title="Delete Reservation"
            icon={Icon.Trash}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
            style={Action.Style.Destructive}
            onAction={deleteReservation}
          />
        </ActionPanel>
      }
    />
  );
}
