import { ActionPanel, Detail, Action, Icon, Color, getPreferenceValues } from "@raycast/api";
import { useAuth } from "./useAuth";
import { Vehicle } from "./graphql";
import { BookingForm } from "./reservation-create";
import { getTranslations } from "./translations";
import { formatCapability, mapsUrl, withImageHeight } from "./utils";

interface VehicleDetailProps {
  vehicle: Vehicle;
}

export function VehicleDetail({ vehicle }: VehicleDetailProps) {
  const { preferences } = useAuth();
  const userPreferences = getPreferenceValues<{ language: string }>();
  const translations = getTranslations(userPreferences.language || "en");
  const locale = userPreferences.language === "de" ? "de-DE" : "en-US";

  const vehicleTitle = vehicle.label || vehicle.captions?.[0] || `${vehicle.brand} ${vehicle.model}`;
  const brandModel = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  const fullAddress = [vehicle.address, [vehicle.zip, vehicle.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  const capabilities = (vehicle.capabilities ?? []).filter((c): c is string => Boolean(c));
  const supporters = (vehicle.supporters ?? []).filter((s) => s && (s.fullName || s.email));

  const electricData = vehicle.data.electricVehicleData;
  const fuelData = vehicle.data.fuelLevelData;
  const positionData = vehicle.data.floatingPosition;
  const stateOfCharge = electricData?.stateOfCharge?.value;
  const fuelLevel = fuelData?.fuelLevel?.value;

  // Current position if the vehicle is free-floating, otherwise its home base
  const position = positionData?.point ?? vehicle.homebase;
  const mapsLink = position ? mapsUrl(position, vehicleTitle) : undefined;

  const now = new Date();
  const reservations = (vehicle.reservations?.edges ?? []).map((edge) => edge.node);
  const isReservedNow = reservations.some((r) => new Date(r.start) <= now && new Date(r.bufferedEnd || r.end) > now);
  const nextReservation = reservations
    .filter((r) => new Date(r.start) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(locale, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isAvailable = vehicle.instantAvailability.usableNow && !isReservedNow;
  const levelColor = (value: number) => (value >= 50 ? Color.Green : value >= 20 ? Color.Yellow : Color.Red);

  const markdown = [
    vehicle.thumbnail ? `![${vehicleTitle}](${withImageHeight(vehicle.thumbnail, 220)})` : "",
    `# ${vehicleTitle}`,
    [brandModel, vehicle.city].filter(Boolean).join(" · "),
    vehicle.description ? `---\n\n${vehicle.description}` : "",
    vehicle.customText ? `> ${vehicle.customText.replace(/\n/g, "\n> ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={vehicleTitle}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title={translations.status}>
            <Detail.Metadata.TagList.Item
              text={
                isAvailable
                  ? translations.available
                  : isReservedNow
                    ? translations.reservedNow
                    : translations.notAvailable
              }
              color={isAvailable ? Color.Green : Color.Red}
            />
            {electricData?.charging ? (
              <Detail.Metadata.TagList.Item text={translations.charging} color={Color.Blue} />
            ) : null}
          </Detail.Metadata.TagList>
          {nextReservation ? (
            <Detail.Metadata.Label
              title={translations.nextReservation}
              text={formatDateTime(nextReservation.start)}
              icon={Icon.Calendar}
            />
          ) : null}
          {stateOfCharge != null ? (
            <Detail.Metadata.Label
              title={translations.stateOfCharge}
              text={{ value: `${stateOfCharge} %`, color: levelColor(stateOfCharge) }}
              icon={{
                source: electricData?.charging ? Icon.BatteryCharging : Icon.Battery,
                tintColor: levelColor(stateOfCharge),
              }}
            />
          ) : null}
          {fuelLevel != null ? (
            <Detail.Metadata.Label
              title={translations.fuelLevel}
              text={{ value: `${fuelLevel} %`, color: levelColor(fuelLevel) }}
              icon={{ source: Icon.Gauge, tintColor: levelColor(fuelLevel) }}
            />
          ) : null}

          <Detail.Metadata.Separator />
          {brandModel ? <Detail.Metadata.Label title={translations.vehicle} text={brandModel} icon={Icon.Car} /> : null}
          {vehicle.licensePlate ? (
            <Detail.Metadata.Label title={translations.licensePlate} text={vehicle.licensePlate} />
          ) : null}
          {vehicle.condition ? <Detail.Metadata.Label title={translations.condition} text={vehicle.condition} /> : null}
          {vehicle.carsharinggroup?.name ? (
            <Detail.Metadata.Label title={translations.carSharingGroup} text={vehicle.carsharinggroup.name} />
          ) : null}

          <Detail.Metadata.Separator />
          {fullAddress ? (
            <Detail.Metadata.Label title={translations.address} text={fullAddress} icon={Icon.Pin} />
          ) : null}
          {positionData?.address ? (
            <Detail.Metadata.Label title={translations.currentAddress} text={positionData.address} />
          ) : null}
          {vehicle.zoneObject?.label ? (
            <Detail.Metadata.Label title={translations.zone} text={vehicle.zoneObject.label} />
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

          {supporters.length > 0 ? (
            <>
              <Detail.Metadata.Separator />
              {supporters.map((supporter, index) => {
                const phone = supporter?.phoneNumberMobile || supporter?.phoneNumber;
                const name = supporter?.fullName || supporter?.email || "";
                const title = index === 0 ? translations.contact : "";
                return phone ? (
                  <Detail.Metadata.Link
                    key={supporter?.pk ?? index}
                    title={title}
                    text={`${name} · ${phone}`}
                    target={`tel:${phone.replace(/\s/g, "")}`}
                  />
                ) : supporter?.email ? (
                  <Detail.Metadata.Link
                    key={supporter?.pk ?? index}
                    title={title}
                    text={name}
                    target={`mailto:${supporter.email}`}
                  />
                ) : (
                  <Detail.Metadata.Label key={supporter?.pk ?? index} title={title} text={name} />
                );
              })}
            </>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title={translations.bookVehicle}
            icon={Icon.Calendar}
            target={<BookingForm vehicle={vehicle} />}
          />
          <Action.OpenInBrowser
            title={translations.openInBrowser}
            url={`${preferences.baseUrl}/instant_booking/${vehicle.pk}`}
            icon={Icon.Globe}
          />
          {mapsLink ? (
            <Action.OpenInBrowser
              title={translations.openInMaps}
              url={mapsLink}
              icon={Icon.Map}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "m" }, Windows: { modifiers: ["ctrl"], key: "m" } }}
            />
          ) : null}
          <Action.CopyToClipboard
            title={translations.copyAllDetails}
            content={[
              vehicleTitle,
              brandModel && `${translations.vehicle}: ${brandModel}`,
              vehicle.licensePlate && `${translations.licensePlate}: ${vehicle.licensePlate}`,
              fullAddress && `${translations.address}: ${fullAddress}`,
              `${translations.availableNow}: ${isAvailable ? translations.yes : translations.no}`,
              stateOfCharge != null && `${translations.stateOfCharge}: ${stateOfCharge}%`,
              fuelLevel != null && `${translations.fuelLevel}: ${fuelLevel}%`,
              vehicle.carsharinggroup?.name && `${translations.carSharingGroup}: ${vehicle.carsharinggroup.name}`,
            ]
              .filter(Boolean)
              .join("\n")}
          />
          {vehicle.licensePlate ? (
            <Action.CopyToClipboard title={translations.copyLicensePlate} content={vehicle.licensePlate} />
          ) : null}
          {fullAddress ? <Action.CopyToClipboard title={translations.copyAddress} content={fullAddress} /> : null}
          <Action.CopyToClipboard title={translations.copyVehicleId} content={vehicle.id} />
        </ActionPanel>
      }
    />
  );
}
