import { List, Icon } from "@raycast/api";
import { Reservation } from "./graphql";
import { ReservationUpdateForm } from "./reservation-update";
import { useVehicles } from "./useVehicles";

interface ReservationUpdateWrapperProps {
  reservation: Reservation;
}

export function ReservationUpdateWrapper({ reservation }: ReservationUpdateWrapperProps) {
  // Usually served from the cache, so the form opens without waiting for the API
  const { data: vehicles, isLoading, error } = useVehicles();
  const vehicle = vehicles.find((v) => v.id === reservation.vehicle.id);
  const errorMessage = error?.message;

  if (vehicle) {
    return <ReservationUpdateForm reservation={reservation} vehicle={vehicle} />;
  }

  if (isLoading) {
    return (
      <List isLoading={true}>
        <List.Item title="Loading vehicle data..." icon={Icon.Car} />
      </List>
    );
  }

  return (
    <List>
      <List.Item
        title="Error loading vehicle data"
        subtitle={errorMessage || "Vehicle not found"}
        icon={Icon.ExclamationMark}
      />
    </List>
  );
}
