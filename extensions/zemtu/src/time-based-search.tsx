import {
  ActionPanel,
  Action,
  Icon,
  Form,
  Image,
  List,
  Keyboard,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { graphqlClient } from "./graphql";
import { describeLoadError, useAuth } from "./useAuth";
import { VehicleDetail } from "./vehicle-detail";
import { BookingForm } from "./reservation-create";
import { ErrorEmptyView } from "./error-view";
import CheckSettings from "./check-settings";

// The server checks availability for the whole timespan (incl. buffers and future reservations)
const findFreeVehicles = (start: string, end: string) => graphqlClient.getVehicles(100, { start, end });

const formatRange = (start: Date, end: Date) => {
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" };
  return `${start.toLocaleString(undefined, options)} - ${end.toLocaleString(undefined, options)}`;
};

function SearchResults({ start, end }: { start: Date; end: Date }) {
  const { pop } = useNavigation();
  const {
    data: vehicles = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(findFreeVehicles, [start.toISOString(), end.toISOString()], {
    // Shown in the empty view below
    onError: () => undefined,
  });

  return (
    <List
      navigationTitle={`Available Vehicles: ${formatRange(start, end)}`}
      isLoading={isLoading}
      searchBarPlaceholder="Search available vehicles"
    >
      {error ? (
        <ErrorEmptyView description={describeLoadError(error)} onRetry={revalidate} />
      ) : isLoading ? null : (
        <List.EmptyView
          icon={Icon.Car}
          title="No vehicles available in this time range"
          description="Try a different time range"
          actions={
            <ActionPanel>
              <Action title="New Search" icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />
      )}
      {vehicles.map((vehicle) => {
        const title = vehicle.label || vehicle.captions?.[0] || `${vehicle.brand} ${vehicle.model}`;
        const stateOfCharge = vehicle.data.electricVehicleData?.stateOfCharge?.value;
        const fuelLevel = vehicle.data.fuelLevelData?.fuelLevel?.value;

        return (
          <List.Item
            key={vehicle.id}
            icon={
              vehicle.thumbnail ? { source: vehicle.thumbnail, mask: Image.Mask.Circle, fallback: Icon.Car } : Icon.Car
            }
            title={title}
            subtitle={`${vehicle.address}, ${vehicle.city} ${vehicle.zip}`}
            accessories={[
              { text: "🕐 Available in time range" },
              ...(stateOfCharge ? [{ text: `⚡ ${stateOfCharge}%` }] : []),
              ...(fuelLevel ? [{ text: `⛽ ${fuelLevel}%` }] : []),
              ...(vehicle.data.electricVehicleData?.charging ? [{ text: "🔌" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Eye}
                  target={<VehicleDetail vehicle={vehicle} initialStart={start} initialEnd={end} />}
                />
                <Action.Push
                  title="Book Vehicle"
                  icon={Icon.Calendar}
                  target={<BookingForm vehicle={vehicle} initialStart={start} initialEnd={end} />}
                />
                <Action.OpenInBrowser
                  title="Book in Browser"
                  icon={Icon.Globe}
                  url={`${graphqlClient.getBaseUrl()}/instant_booking/${vehicle.pk}`}
                />
                <Action
                  title="New Search"
                  icon={Icon.ArrowLeft}
                  shortcut={Keyboard.Shortcut.Common.New}
                  onAction={pop}
                />
                <Action.CopyToClipboard title="Copy Title" icon={Icon.Clipboard} content={title} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

// Start of the current half hour, so the search covers "from now on"
const currentHalfHour = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() < 30 ? 0 : 30, 0, 0);
  return date;
};

export default function TimeBasedSearch() {
  const { error, hasCredentials, retryLogin } = useAuth();
  const { push } = useNavigation();
  const [startTime, setStartTime] = useState(currentHalfHour);
  const [endTime, setEndTime] = useState(() => new Date(currentHalfHour().getTime() + 2 * 60 * 60 * 1000));

  if (!hasCredentials) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Authentication Required"
          text="Please enter your username and password in preferences"
        />
      </Form>
    );
  }

  if (error) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retryLogin} />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.Push
              title="Check Settings"
              icon={Icon.Checkmark}
              target={<CheckSettings navigationTitle="Check Settings" />}
            />
          </ActionPanel>
        }
      >
        <Form.Description title="Error" text={error} />
      </Form>
    );
  }

  const search = async () => {
    if (endTime <= startTime) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Time Range",
        message: "End date and time must be after start date and time",
      });
      return;
    }
    push(<SearchResults start={startTime} end={endTime} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search Vehicles" icon={Icon.MagnifyingGlass} onSubmit={search} />
        </ActionPanel>
      }
    >
      <Form.Description title="Time-Based Vehicle Search" text="Find vehicles available in a specific time range" />

      <Form.DatePicker
        id="start-time"
        title="Start Date and Time"
        value={startTime}
        onChange={(date) => date && setStartTime(date)}
        type={Form.DatePicker.Type.DateTime}
      />

      <Form.DatePicker
        id="end-time"
        title="End Date and Time"
        value={endTime}
        onChange={(date) => date && setEndTime(date)}
        type={Form.DatePicker.Type.DateTime}
      />
    </Form>
  );
}
