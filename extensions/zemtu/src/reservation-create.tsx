import { ActionPanel, Action, Form, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { graphqlClient, Vehicle } from "./graphql";

interface BookingFormProps {
  vehicle: Vehicle;
  // Time range the user already searched for; otherwise the form suggests the next free slot
  initialStart?: Date;
  initialEnd?: Date;
  onBooked?: () => void;
}

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

const getInitialTimes = (initialStart?: Date, initialEnd?: Date) => {
  const now = Date.now();
  // A searched start that already passed (the search defaults to "now") moves to the next half-hour slot
  const start =
    initialStart && initialStart.getTime() > now ? initialStart : roundToHalfHour(new Date(now + 30 * 60 * 1000));
  const end =
    initialEnd && initialEnd > start ? initialEnd : roundToHalfHour(new Date(start.getTime() + 2 * 60 * 60 * 1000));
  return { start, end };
};

// The server knows every reservation and buffer time, the vehicle's own list only the next few
const checkVehicleFree = (vehicleId: string, start: string, end: string) =>
  graphqlClient.isVehicleFree(vehicleId, start, end);

export function BookingForm({ vehicle, initialStart, initialEnd, onBooked }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => {
    const { start, end } = getInitialTimes(initialStart, initialEnd);
    return { startDateTime: start, endDateTime: end, note: "", isBusinessTrip: false };
  });

  const vehicleTitle = vehicle.label || vehicle.captions?.[0] || `${vehicle.brand} ${vehicle.model}`;
  const isValidRange = formData.endDateTime > formData.startDateTime;

  const {
    data: isFree,
    isLoading: isChecking,
    error: availabilityError,
  } = usePromise(
    checkVehicleFree,
    [vehicle.id, formData.startDateTime.toISOString(), formData.endDateTime.toISOString()],
    {
      execute: isValidRange,
      // Shown in the form below
      onError: () => undefined,
    },
  );

  const availabilityText = !isValidRange
    ? "Invalid Time Range"
    : isChecking
      ? "Checking Availability"
      : availabilityError
        ? "Availability Check Failed"
        : isFree
          ? "Vehicle Available"
          : "Vehicle Not Available";

  async function handleSubmit() {
    if (isSubmitting) return;

    const problem = !isValidRange
      ? "End date and time must be after start date and time"
      : formData.startDateTime <= new Date()
        ? "Booking must be in the future"
        : isChecking
          ? "Still checking availability, please try again in a moment"
          : isFree === false && !availabilityError
            ? "Vehicle Not Available"
            : null;

    if (problem) {
      await showToast({ style: Toast.Style.Failure, title: "Validation Error", message: problem });
      return;
    }

    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating Booking", message: vehicleTitle });

      await graphqlClient.createBooking({
        vehicleId: vehicle.id,
        startTime: formData.startDateTime.toISOString(),
        endTime: formData.endDateTime.toISOString(),
        purpose: formData.isBusinessTrip ? "BUSINESS" : "PERSONAL",
        note: formData.note,
      });

      await showToast({ style: Toast.Style.Success, title: "Booking Created", message: vehicleTitle });

      onBooked?.();
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Booking Failed" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={`Book Vehicle: ${vehicleTitle}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Booking" icon={Icon.Calendar} onSubmit={handleSubmit} />
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
