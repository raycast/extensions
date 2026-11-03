import { ActionPanel, Action, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { graphqlClient, Reservation, Vehicle } from "./graphql";
import { getTranslations } from "./translations";
import { getPreferenceValues } from "@raycast/api";

interface UpdateFormProps {
  reservation: Reservation;
  vehicle: Vehicle;
}

interface AvailabilityStatus {
  isAvailable: boolean;
  isChecking: boolean;
  message: string;
}

export function ReservationUpdateForm({ reservation, vehicle }: UpdateFormProps) {
  const preferences = getPreferenceValues<{ language: string }>();
  const translations = getTranslations(preferences.language || "en");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityStatus>({
    isAvailable: true,
    isChecking: false,
    message: "",
  });

  const vehicleTitle = vehicle.label || vehicle.captions?.[0] || `${vehicle.brand} ${vehicle.model}`;

  // Initialize form with existing reservation data
  const [formData, setFormData] = useState({
    startDateTime: new Date(reservation.start),
    endDateTime: new Date(reservation.end),
    note: "", // Note will be fetched from reservation details if available
    isBusinessTrip: false, // Default, could be inferred from reservation data
  });

  // Check vehicle availability for the selected time period (excluding current reservation)
  const checkAvailability = async (startTime: Date, endTime: Date) => {
    if (!startTime || !endTime || endTime <= startTime) {
      setAvailability({
        isAvailable: false,
        isChecking: false,
        message: translations.invalidTimeRange || "Invalid time range",
      });
      return;
    }

    setAvailability((prev) => ({ ...prev, isChecking: true }));

    try {
      // Check against existing reservations (excluding the current one being updated)
      const existingReservations = vehicle.reservations?.edges || [];

      const hasConflict = existingReservations.some((edge) => {
        const res = edge.node;
        // Skip the current reservation being updated
        if (res.id === reservation.id) {
          return false;
        }

        const reservationStart = new Date(res.start);
        const reservationEnd = new Date(res.end);

        // Check for time overlap
        return startTime < reservationEnd && endTime > reservationStart;
      });

      if (hasConflict) {
        setAvailability({
          isAvailable: false,
          isChecking: false,
          message: translations.vehicleNotAvailable || "Vehicle not available for selected time",
        });
      } else {
        setAvailability({
          isAvailable: true,
          isChecking: false,
          message: translations.vehicleAvailable || "Vehicle available for selected time",
        });
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      setAvailability({
        isAvailable: false,
        isChecking: false,
        message: translations.availabilityCheckFailed || "Could not check availability",
      });
    }
  };

  // Check availability when dates change
  useEffect(() => {
    if (formData.startDateTime && formData.endDateTime) {
      const timeoutId = setTimeout(() => {
        checkAvailability(formData.startDateTime, formData.endDateTime);
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [formData.startDateTime, formData.endDateTime]);

  async function handleSubmit() {
    // Validation
    if (formData.endDateTime <= formData.startDateTime) {
      await showToast({
        style: Toast.Style.Failure,
        title: translations.validationError,
        message: translations.endAfterStart,
      });
      return;
    }

    // Check if vehicle is available
    if (!availability.isAvailable) {
      await showToast({
        style: Toast.Style.Failure,
        title: translations.validationError,
        message: translations.vehicleNotAvailable,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: translations.updatingReservation,
        message: `${translations.updateReservation} ${vehicleTitle}`,
      });

      // Format dates as ISO strings for the API
      const startTimeISO = formData.startDateTime.toISOString();
      const endTimeISO = formData.endDateTime.toISOString();

      const updatedReservation = await graphqlClient.updateReservation(reservation.id, {
        vehicleId: vehicle.id,
        startTime: startTimeISO,
        endTime: endTimeISO,
        purpose: formData.isBusinessTrip ? "BUSINESS" : "PERSONAL",
        note: formData.note,
      });

      await showToast({
        style: Toast.Style.Success,
        title: translations.reservationUpdated,
        message: `${vehicleTitle} ${translations.reservationUpdated}`,
      });

      console.log("Reservation updated:", updatedReservation);

      // Navigate back to root after successful update
      await popToRoot();
    } catch (error) {
      console.error("Update error:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: translations.updateFailed,
        message: error instanceof Error ? error.message : translations.unknownError,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={`${translations.editReservation}: ${vehicleTitle}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={translations.saveChanges} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title={translations.vehicle} text={`${vehicleTitle} • ${vehicle.licensePlate}`} />

      <Form.Description title={translations.location} text={`${vehicle.address}, ${vehicle.city} ${vehicle.zip}`} />

      <Form.Separator />

      <Form.DatePicker
        id="startDateTime"
        title={translations.startDateTime}
        value={formData.startDateTime}
        onChange={(date) => {
          if (date) {
            setFormData((prev) => ({
              ...prev,
              startDateTime: date,
            }));
          }
        }}
        type={Form.DatePicker.Type.DateTime}
      />

      <Form.DatePicker
        id="endDateTime"
        title={translations.endDateTime}
        value={formData.endDateTime}
        onChange={(date) => {
          if (date) {
            setFormData((prev) => ({
              ...prev,
              endDateTime: date,
            }));
          }
        }}
        type={Form.DatePicker.Type.DateTime}
      />

      {availability.isChecking ? (
        <Form.Description title={translations.availability} text={translations.checkingAvailability} />
      ) : (
        <Form.Description title={translations.availability} text={availability.message} />
      )}

      <Form.Separator />

      <Form.TextArea
        id="note"
        title={translations.note}
        placeholder={translations.optionalNoteBooking}
        value={formData.note}
        onChange={(value) => setFormData((prev) => ({ ...prev, note: value }))}
      />

      <Form.Checkbox
        id="isBusinessTrip"
        label={translations.businessTrip}
        value={formData.isBusinessTrip}
        onChange={(value) => setFormData((prev) => ({ ...prev, isBusinessTrip: value }))}
      />
    </Form>
  );
}
