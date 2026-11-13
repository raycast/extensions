import { graphqlClient } from "../graphql";
import { distanceKm, parseDate, vehicleAddress, vehicleName } from "../ai";
import { resolveLocation } from "../location";

type Input = {
  /**
   * Start of the desired time range in ISO 8601 with the user's timezone offset, e.g. "2026-10-24T09:00:00+02:00".
   */
  start: string;
  /**
   * End of the desired time range in ISO 8601 with the user's timezone offset, e.g. "2026-10-24T12:00:00+02:00".
   */
  end: string;
  /**
   * Optional text to narrow the results, matched against vehicle name, brand, model, address and city (e.g. "e-tron", "Wien").
   */
  query?: string;
};

/**
 * Finds Zemtu vehicles that are free for the whole requested time range.
 * Results are sorted by distance to the user if their location is configured.
 */
export default async function tool(input: Input) {
  const start = parseDate(input.start, "start");
  const end = parseDate(input.end, "end");
  if (end <= start) throw new Error("The end must be after the start.");

  const [vehicles, location] = await Promise.all([
    graphqlClient.getVehicles(100, { start: start.toISOString(), end: end.toISOString() }),
    // A failed address lookup only means no distances, not a failed search
    resolveLocation().catch(() => null),
  ]);
  const query = input.query?.trim().toLowerCase();

  return vehicles
    .map((vehicle) => ({
      id: vehicle.id,
      name: vehicleName(vehicle),
      brand: vehicle.brand,
      model: vehicle.model,
      licensePlate: vehicle.licensePlate || undefined,
      address: vehicleAddress(vehicle),
      distanceKm: distanceKm(vehicle, location),
      stateOfChargePercent: vehicle.data.electricVehicleData?.stateOfCharge?.value ?? undefined,
      fuelLevelPercent: vehicle.data.fuelLevelData?.fuelLevel?.value ?? undefined,
      equipment: vehicle.capabilities?.filter(Boolean),
    }))
    .filter(
      (vehicle) =>
        !query || [vehicle.name, vehicle.brand, vehicle.model, vehicle.address].join(" ").toLowerCase().includes(query),
    )
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}
