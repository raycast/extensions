import { Action, Tool } from "@raycast/api";
import { graphqlClient } from "../graphql";
import { formatLongDateTime, getAiContext, parseDate, validateTimeRange, vehicleAddress, vehicleName } from "../ai";

type Input = {
  /**
   * The vehicle's `id` as returned by the find-available-vehicles tool. Never guess it.
   */
  vehicleId: string;
  /**
   * Start of the reservation in ISO 8601 with the user's timezone offset, e.g. "2026-10-24T09:00:00+02:00".
   */
  start: string;
  /**
   * End of the reservation in ISO 8601 with the user's timezone offset, e.g. "2026-10-24T12:00:00+02:00".
   */
  end: string;
  /**
   * "BUSINESS" only if the user explicitly says it is a business trip, otherwise "PERSONAL".
   */
  purpose?: "PERSONAL" | "BUSINESS";
  /**
   * Optional note for the reservation.
   */
  note?: string;
};

const findVehicle = async (vehicleId: string) => {
  const vehicle = (await graphqlClient.getVehicles(100)).find((v) => v.id === vehicleId);
  if (!vehicle) throw new Error(`No vehicle with id "${vehicleId}". Use find-available-vehicles to get a valid id.`);
  return vehicle;
};

/**
 * Always asks the user before anything is booked: shows vehicle, exact dates and purpose.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { translations, locale } = getAiContext();
  const start = parseDate(input.start, "start");
  const end = parseDate(input.end, "end");
  validateTimeRange(start, end);
  const vehicle = await findVehicle(input.vehicleId);

  return {
    style: Action.Style.Regular,
    message: translations.confirmBooking,
    info: [
      { name: translations.vehicle, value: vehicleName(vehicle) },
      { name: translations.licensePlate, value: vehicle.licensePlate || undefined },
      { name: translations.address, value: vehicleAddress(vehicle) || undefined },
      { name: translations.start, value: formatLongDateTime(start, locale) },
      { name: translations.end, value: formatLongDateTime(end, locale) },
      {
        name: translations.purpose,
        value: input.purpose === "BUSINESS" ? translations.purposeBusiness : translations.purposePersonal,
      },
      { name: translations.note, value: input.note || undefined },
    ],
  };
};

/**
 * Books a Zemtu vehicle for the given time range. Only runs after the user confirmed it.
 */
export default async function tool(input: Input) {
  const start = parseDate(input.start, "start");
  const end = parseDate(input.end, "end");
  validateTimeRange(start, end);

  // Re-check right before booking: the vehicle may have been taken in the meantime
  const available = await graphqlClient.getVehicles(100, { start: start.toISOString(), end: end.toISOString() });
  if (!available.some((v) => v.id === input.vehicleId)) {
    throw new Error("This vehicle is not available for the requested time range. Nothing was booked.");
  }

  const reservation = await graphqlClient.createBooking({
    vehicleId: input.vehicleId,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    purpose: input.purpose ?? "PERSONAL",
    note: input.note,
  });

  return {
    reservationId: reservation.id,
    vehicle: reservation.vehicle.label,
    licensePlate: reservation.vehicle.licensePlate || undefined,
    start: reservation.start,
    end: reservation.end,
    state: reservation.state,
  };
}
