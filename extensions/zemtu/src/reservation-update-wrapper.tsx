import { List } from "@raycast/api";
import { Reservation } from "./graphql";
import { ErrorEmptyView } from "./error-view";
import { ReservationUpdateForm } from "./reservation-update";
import { describeLoadError } from "./useAuth";
import { useVehicles } from "./useVehicles";

interface ReservationUpdateWrapperProps {
  reservation: Reservation;
  onSaved?: () => void;
}

export function ReservationUpdateWrapper({ reservation, onSaved }: ReservationUpdateWrapperProps) {
  // Usually served from the cache, so the form opens without waiting for the API
  const { data: vehicles, isLoading, error, revalidate } = useVehicles();
  const vehicle = vehicles.find((v) => v.id === reservation.vehicle.id);

  if (vehicle) {
    return <ReservationUpdateForm reservation={reservation} vehicle={vehicle} onSaved={onSaved} />;
  }

  return (
    <List isLoading={isLoading}>
      {isLoading ? null : (
        <ErrorEmptyView
          description={error ? describeLoadError(error) : "This vehicle is no longer available to your account."}
          onRetry={revalidate}
        />
      )}
    </List>
  );
}
