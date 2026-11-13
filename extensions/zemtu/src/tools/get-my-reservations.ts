import { graphqlClient } from "../graphql";
import { vehicleAddress, vehicleName } from "../ai";

/**
 * Lists the user's current and upcoming Zemtu reservations.
 */
export default async function tool() {
  const reservations = await graphqlClient.getReservations();

  // The access PIN is deliberately not passed to the AI
  return reservations.map((reservation) => ({
    id: reservation.id,
    vehicleId: reservation.vehicle.id,
    vehicle: vehicleName({
      label: reservation.vehicle.label ?? "",
      captions: reservation.vehicle.captions,
      brand: reservation.vehicle.brand ?? "",
      model: reservation.vehicle.model ?? "",
    }),
    licensePlate: reservation.vehicle.licensePlate || undefined,
    address: vehicleAddress({
      address: reservation.vehicle.address ?? "",
      zip: reservation.vehicle.zip ?? "",
      city: reservation.vehicle.city ?? "",
    }),
    start: reservation.start,
    end: reservation.end,
    state: reservation.state,
  }));
}
