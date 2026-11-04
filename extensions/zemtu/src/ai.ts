import { Vehicle } from "./graphql";
import { haversineKm } from "./utils";
import { Coordinates } from "./location";

export const vehicleName = (vehicle: Pick<Vehicle, "label" | "captions" | "brand" | "model">) =>
  vehicle.label || vehicle.captions?.[0] || `${vehicle.brand} ${vehicle.model}`;

export const vehicleAddress = (vehicle: Pick<Vehicle, "address" | "zip" | "city">) =>
  [vehicle.address, [vehicle.zip, vehicle.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

// Distance from the user's location (see resolveLocation), if they set one
export const distanceKm = (vehicle: Vehicle, from: Coordinates | null): number | undefined => {
  const position = vehicle.data.floatingPosition?.point ?? vehicle.homebase;
  if (!from || !position) return undefined;
  return Math.round(haversineKm(from.latitude, from.longitude, position.latitude, position.longitude) * 10) / 10;
};

// Parses an ISO 8601 date coming from the AI and fails loudly instead of booking a wrong time
export const parseDate = (value: string, field: string): Date => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field} date "${value}". Use ISO 8601, e.g. 2026-10-24T09:00:00+02:00.`);
  }
  return date;
};

export const validateTimeRange = (start: Date, end: Date) => {
  if (end <= start) throw new Error("The end must be after the start.");
  // Small tolerance so "now" still works
  if (start.getTime() < Date.now() - 5 * 60 * 1000) throw new Error("The start is in the past.");
};

// Unambiguous date for confirmations, e.g. "Saturday, October 24, 2026, 09:00"
export const formatLongDateTime = (date: Date) =>
  date.toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
