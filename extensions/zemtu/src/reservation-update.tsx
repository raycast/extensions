import { ActionPanel, Action, Form, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { graphqlClient, Reservation, Vehicle } from "./graphql";

interface UpdateFormProps {
  reservation: Reservation;
  vehicle: Vehicle;
  onSaved?: () => void;
}

export function ReservationUpdateForm({ reservation, vehicle, onSaved }: UpdateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wasBusinessTrip = reservation.purpose === "BUSINESS";

  // Start with the saved values, so changing only the time keeps the note and purpose
  const [formData, setFormData] = useState({
    startDateTime: new Date(reservation.start),
    endDateTime: new Date(reservation.end),
    note: reservation.note ?? "",
    isBusinessTrip: wasBusinessTrip,
  });

  const vehicleTitle = vehicle.label || vehicle.captions?.[0] || `${vehicle.brand} ${vehicle.model}`;
  const isValidRange = formData.endDateTime > formData.startDateTime;

  // Other reservations of this vehicle, including the buffer time after them.
  // The server has the final say when saving.
  const hasConflict = (vehicle.reservations?.edges ?? []).some(({ node }) => {
    if (node.id === reservation.id) return false;
    return (
      formData.startDateTime < new Date(node.bufferedEnd || node.end) && formData.endDateTime > new Date(node.start)
    );
  });

  const availabilityText = !isValidRange
    ? "Invalid Time Range"
    : hasConflict
      ? "Vehicle Not Available"
      : "Vehicle Available";

  async function handleSubmit() {
    if (isSubmitting) return;

    const problem = !isValidRange
      ? "End date and time must be after start date and time"
      : hasConflict
        ? "Vehicle Not Available"
        : null;

    if (problem) {
      await showToast({ style: Toast.Style.Failure, title: "Validation Error", message: problem });
      return;
    }

    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating Reservation", message: vehicleTitle });

      // The vehicle stays the same, and this mutation doesn't accept the vehicle's global id anyway
      await graphqlClient.updateReservation(reservation.id, {
        startTime: formData.startDateTime.toISOString(),
        endTime: formData.endDateTime.toISOString(),
        // Keep whatever the server has unless the user actually changed the checkbox
        purpose:
          formData.isBusinessTrip === wasBusinessTrip
            ? reservation.purpose
            : formData.isBusinessTrip
              ? "BUSINESS"
              : "PERSONAL",
        note: formData.note,
      });

      await showToast({ style: Toast.Style.Success, title: "Reservation Updated", message: vehicleTitle });

      onSaved?.();
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Update Failed" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={`Edit Reservation: ${vehicleTitle}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Vehicle" text={`${vehicleTitle} • ${vehicle.licensePlate}`} />

      <Form.Description title="Location" text={`${vehicle.address}, ${vehicle.city} ${vehicle.zip}`} />

      <Form.Separator />

      <Form.DatePicker
        id="startDateTime"
        title="Start Date and Time"
        value={formData.startDateTime}
        onChange={(date) => {
          if (date) setFormData((prev) => ({ ...prev, startDateTime: date }));
        }}
        type={Form.DatePicker.Type.DateTime}
      />

      <Form.DatePicker
        id="endDateTime"
        title="End Date and Time"
        value={formData.endDateTime}
        onChange={(date) => {
          if (date) setFormData((prev) => ({ ...prev, endDateTime: date }));
        }}
        type={Form.DatePicker.Type.DateTime}
      />

      <Form.Description title="Availability" text={availabilityText} />

      <Form.Separator />

      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Optional note for booking"
        value={formData.note}
        onChange={(value) => setFormData((prev) => ({ ...prev, note: value }))}
      />

      <Form.Checkbox
        id="isBusinessTrip"
        label="Business Trip"
        value={formData.isBusinessTrip}
        onChange={(value) => setFormData((prev) => ({ ...prev, isBusinessTrip: value }))}
      />
    </Form>
  );
}
