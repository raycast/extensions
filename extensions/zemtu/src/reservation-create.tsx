import { ActionPanel, Action, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { graphqlClient, Vehicle } from "./graphql";
import { getTranslations } from "./translations";
import { getPreferenceValues } from "@raycast/api";

interface BookingFormProps {
  vehicle: Vehicle;
}

interface AvailabilityStatus {
  isAvailable: boolean;
  isChecking: boolean;
  message: string;
}

export function BookingForm({ vehicle }: BookingFormProps) {
  const preferences = getPreferenceValues<{ language: string }>();
  const translations = getTranslations(preferences.language || "en");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityStatus>({
    isAvailable: true,
    isChecking: false,
    message: "",
  });

  const vehicleTitle = vehicle.label || vehicle.captions?.[0] || `${vehicle.brand} ${vehicle.model}`;

  // Helper function to round time to nearest half hour
  const roundToHalfHour = (date: Date): Date => {
    const rounded = new Date(date);
    const minutes = rounded.getMinutes();

    if (minutes <= 15) {
      rounded.setMinutes(0);
    } else if (minutes <= 45) {
      rounded.setMinutes(30);
    } else {
      rounded.setMinutes(0);
      rounded.setHours(rounded.getHours() + 1);
    }

    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
  };

  // Helper function to get next available start time (max 30 minutes from now)
  const getNextAvailableStartTime = (): Date => {
    const now = new Date();
    const maxStartTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    return roundToHalfHour(maxStartTime);
  };

  // Get current date and time for defaults
  const now = new Date();

  // Default start time is next available half-hour slot (max 30 minutes from now)
  const defaultStartTime = getNextAvailableStartTime();

  // Default end time is 2 hours after start time, rounded to half hour
  const defaultEndTime = roundToHalfHour(new Date(defaultStartTime.getTime() + 2 * 60 * 60 * 1000));

  const [formData, setFormData] = useState({
    startDateTime: defaultStartTime,
    endDateTime: defaultEndTime,
    note: "",
    isBusinessTrip: false,
  });

  // Check vehicle availability for the selected time period
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
      // Check against existing reservations
      const existingReservations = vehicle.reservations?.edges || [];

      const hasConflict = existingReservations.some((edge) => {
        const reservation = edge.node;
        const reservationStart = new Date(reservation.start);
        const reservationEnd = new Date(reservation.end);

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
    // Check if end is after start
    if (formData.endDateTime <= formData.startDateTime) {
      await showToast({
        style: Toast.Style.Failure,
        title: translations.validationError,
        message: translations.endAfterStart,
      });
      return;
    }

    // Check if booking is in the future
    if (formData.startDateTime <= now) {
      await showToast({
        style: Toast.Style.Failure,
        title: translations.validationError,
        message: translations.bookingInFuture,
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
        title: translations.creatingBooking,
        message: `${translations.bookingVehicle} ${vehicleTitle}`,
      });

      // Format dates as ISO strings for the API
      const startTimeISO = formData.startDateTime.toISOString();
      const endTimeISO = formData.endDateTime.toISOString();

      const booking = await graphqlClient.createBooking({
        vehicleId: vehicle.id,
        startTime: startTimeISO,
        endTime: endTimeISO,
        purpose: formData.isBusinessTrip ? "BUSINESS" : "PERSONAL",
        note: formData.note,
      });

      await showToast({
        style: Toast.Style.Success,
        title: translations.bookingCreated,
        message: `${vehicleTitle} ${translations.successfullyBooked}`,
      });

      console.log("Booking created:", booking);

      // Navigate back to root after successful booking
      await popToRoot();
    } catch (error) {
      console.error("Booking error:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: translations.bookingFailed,
        message: error instanceof Error ? error.message : translations.unknownError,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={`${translations.bookVehicle}: ${vehicleTitle}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={translations.createBooking} onSubmit={handleSubmit} />
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
