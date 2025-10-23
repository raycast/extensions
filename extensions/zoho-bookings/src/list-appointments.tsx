import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getValidToken, isAuthenticated } from "./oauth/zoho-provider";
import { getAppointments, Appointment, updateAppointment } from "./api/zoho-bookings";

type DateFilter = "today" | "tomorrow" | "this_week" | "next_week" | "this_month" | "next_month" | "all_upcoming";

export default function ListAppointmentsCommand() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notAuthenticated, setNotAuthenticated] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all_upcoming");

  useEffect(() => {
    loadAppointments();
  }, [dateFilter]);

  function formatDateForAPI(date: Date): string {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }

  function getDateRange(filter: DateFilter): { from: string; to: string } {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date;

    switch (filter) {
      case "today":
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "tomorrow":
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
        break;
      case "this_week": {
        const currentDay = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - currentDay);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        fromDate = startOfWeek;
        toDate = endOfWeek;
        break;
      }
      case "next_week": {
        const nextWeekStart = new Date(now);
        const daysUntilNextWeek = 7 - now.getDay();
        nextWeekStart.setDate(now.getDate() + daysUntilNextWeek);
        nextWeekStart.setHours(0, 0, 0, 0);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        nextWeekEnd.setHours(23, 59, 59, 999);
        fromDate = nextWeekStart;
        toDate = nextWeekEnd;
        break;
      }
      case "this_month":
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "next_month":
        fromDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
        break;
      case "all_upcoming":
      default:
        fromDate = now;
        toDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 23, 59, 59);
        break;
    }

    return {
      from: formatDateForAPI(fromDate),
      to: formatDateForAPI(toDate),
    };
  }

  async function loadAppointments() {
    try {
      setIsLoading(true);

      const authenticated = await isAuthenticated();
      if (!authenticated) {
        setNotAuthenticated(true);
        await showToast({
          style: Toast.Style.Failure,
          title: "Not Authenticated",
          message: "Please run the Setup Zoho Auth command first",
        });
        setIsLoading(false);
        return;
      }

      const token = await getValidToken();
      const { from, to } = getDateRange(dateFilter);

      const data = await getAppointments(token, from, to);

      if (Array.isArray(data) && data.length > 0) {
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.iso_start_time).getTime();
          const dateB = new Date(b.iso_start_time).getTime();
          return dateA - dateB;
        });
        setAppointments(sortedData);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load appointments",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancelAppointment(appointment: Appointment) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Cancelling appointment...",
      });

      const token = await getValidToken();
      await updateAppointment(token, appointment.booking_id, "cancel");

      await showToast({
        style: Toast.Style.Success,
        title: "Appointment Cancelled",
        message: `${appointment.service_name} has been cancelled`,
      });

      await loadAppointments();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to cancel appointment",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function getStatusColor(status: string): Color {
    switch (status.toLowerCase()) {
      case "upcoming":
        return Color.Green;
      case "confirmed":
        return Color.Green;
      case "yet_to_mark":
        return Color.Green;
      case "pending":
        return Color.Orange;
      case "cancel":
      case "cancelled":
        return Color.Red;
      case "completed":
        return Color.Blue;
      default:
        return Color.SecondaryText;
    }
  }

  function formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search appointments..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Date"
          value={dateFilter}
          onChange={(newValue) => setDateFilter(newValue as DateFilter)}
        >
          <List.Dropdown.Item title="All Upcoming" value="all_upcoming" />
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="Tomorrow" value="tomorrow" />
          <List.Dropdown.Item title="This Week" value="this_week" />
          <List.Dropdown.Item title="Next Week" value="next_week" />
          <List.Dropdown.Item title="This Month" value="this_month" />
          <List.Dropdown.Item title="Next Month" value="next_month" />
        </List.Dropdown>
      }
    >
      {notAuthenticated ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Not Authenticated"
          description="Please run the Setup Zoho Auth command to authenticate"
        />
      ) : appointments.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Appointments Found"
          description="You don't have any upcoming appointments"
        />
      ) : (
        appointments.map((appointment) => (
          <List.Item
            key={appointment.booking_id}
            icon={{ source: Icon.Calendar, tintColor: getStatusColor(appointment.status) }}
            title={appointment.service_name}
            subtitle={appointment.customer_name}
            accessories={[
              { text: formatDateTime(appointment.iso_start_time) },
              { tag: { value: appointment.status, color: getStatusColor(appointment.status) } },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<AppointmentDetail appointment={appointment} onCancel={handleCancelAppointment} />}
                />
                {appointment.status.toLowerCase() !== "cancel" &&
                  appointment.status.toLowerCase() !== "cancelled" &&
                  appointment.status.toLowerCase() !== "completed" && (
                    <Action
                      title="Cancel Appointment"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      onAction={() => handleCancelAppointment(appointment)}
                      shortcut={{ modifiers: ["cmd"], key: "x" }}
                    />
                  )}
                <Action.CopyToClipboard
                  title="Copy Customer Email"
                  content={appointment.customer_email}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                {appointment.customer_contact_no && (
                  <Action.CopyToClipboard
                    title="Copy Customer Phone"
                    content={appointment.customer_contact_no}
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadAppointments}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AppointmentDetail({
  appointment,
  onCancel,
}: {
  appointment: Appointment;
  onCancel: (appointment: Appointment) => Promise<void>;
}) {
  return (
    <List>
      <List.Item
        title="Booking ID"
        subtitle={appointment.booking_id}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Booking Id" content={appointment.booking_id} />
            {appointment.status.toLowerCase() !== "cancel" &&
              appointment.status.toLowerCase() !== "cancelled" &&
              appointment.status.toLowerCase() !== "completed" && (
                <ActionPanel.Section>
                  <Action
                    title="Cancel Appointment"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={() => onCancel(appointment)}
                    shortcut={{ modifiers: ["cmd"], key: "x" }}
                  />
                </ActionPanel.Section>
              )}
          </ActionPanel>
        }
      />
      <List.Item title="Service" subtitle={appointment.service_name} />
      <List.Item title="Duration" subtitle={appointment.duration} />
      <List.Item title="Customer" subtitle={appointment.customer_name} />
      <List.Item title="Email" subtitle={appointment.customer_email} />
      {appointment.customer_contact_no && <List.Item title="Phone" subtitle={appointment.customer_contact_no} />}
      <List.Item title="Staff" subtitle={appointment.staff_name} />
      {appointment.staff_email && <List.Item title="Staff Email" subtitle={appointment.staff_email} />}
      <List.Item title="Start Time" subtitle={appointment.start_time} />
      <List.Item title="End Time" subtitle={appointment.end_time} />
      <List.Item title="Status" subtitle={appointment.status.toUpperCase()} />
      <List.Item title="Booking Type" subtitle={appointment.booking_type} />
      <List.Item title="Cost" subtitle={`${appointment.currency} ${appointment.cost}`} />
      <List.Item title="Payment Status" subtitle={appointment.payment_status} />
      {appointment.due !== "0.0" && <List.Item title="Due" subtitle={`${appointment.currency} ${appointment.due}`} />}
      <List.Item title="Booked On" subtitle={appointment.booked_on} />
      <List.Item title="Workspace" subtitle={appointment.workspace_name} />
      {appointment.notes && <List.Item title="Notes" subtitle={appointment.notes} />}
      {appointment.summary_url && (
        <List.Item
          title="Summary URL"
          subtitle={appointment.summary_url}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={appointment.summary_url} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
