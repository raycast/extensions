import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  dataCenter: string;
}

const preferences = getPreferenceValues<Preferences>();

function getBookingsBaseUrl(): string {
  return `https://www.zohoapis.${preferences.dataCenter}/bookings/v1/json`;
}

export async function makeZohoRequest<T>(
  endpoint: string,
  accessToken: string,
  options: { headers?: Record<string, string>; method?: string; body?: string } = {}
): Promise<T> {
  const url = `${getBookingsBaseUrl()}${endpoint}`;

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

export interface Appointment {
  booking_id: string;
  service_id: string;
  service_name: string;
  service_description: string;
  staff_id: string;
  staff_name: string;
  staff_email: string;
  staff_contact_number: string;
  staff_designation: string;
  customer_name: string;
  customer_email: string;
  customer_contact_no: string;
  start_time: string;
  end_time: string;
  iso_start_time: string;
  iso_end_time: string;
  duration: string;
  status: string;
  booking_type: string;
  time_zone: string;
  workspace_id: string;
  workspace_name: string;
  cost: string;
  cost_paid: string;
  due: string;
  currency: string;
  payment_status: string;
  booked_on: string;
  last_updated_time: string;
  triggered_by: string;
  triggered_from: string;
  booked_ip_address: string;
  customer_notification: string;
  customer_booking_time_zone: string;
  customer_booking_start_time: string;
  summary_url: string;
  pre_buffer: number;
  post_buffer: number;
  notes: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string | number;
  currency: string;
  service_type: string;
  assigned_staffs: string[];
  let_customer_select_staff: boolean;
  buffertime: string;
  pre_buffer: number;
  post_buffer: number;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  designation: string;
  photo_url: string;
  booking_url: string;
  workspace_id: string;
}

export interface AppointmentsResponse {
  response: {
    returnvalue: {
      response: Appointment[];
      next_page_available: boolean;
      page: number;
    };
    status: string;
  };
}

export interface ServicesResponse {
  response: {
    returnvalue: {
      data: Service[];
    };
    status: string;
  };
}

export async function getAppointments(accessToken: string, from?: string, to?: string): Promise<Appointment[]> {
  const url = `${getBookingsBaseUrl()}/fetchappointment`;

  const formData: Record<string, string> = {};
  if (from) formData.from_time = from;
  if (to) formData.to_time = to;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
    body: new URLSearchParams({ data: JSON.stringify(formData) }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as AppointmentsResponse;
  return result.response.returnvalue.response || [];
}

export async function getServices(accessToken: string): Promise<Service[]> {
  const response = await makeZohoRequest<ServicesResponse>("/services", accessToken);

  return response.response.returnvalue.data || [];
}

export interface UpdateAppointmentResponse {
  response: {
    returnvalue: {
      message: string;
    };
    status: string;
  };
}

export async function updateAppointment(
  accessToken: string,
  bookingId: string,
  action: "cancel" | "noshow" | "completed"
): Promise<void> {
  const url = `${getBookingsBaseUrl()}/updateappointment`;

  const formData = new URLSearchParams();
  formData.append("booking_id", bookingId);
  formData.append("action", action);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update appointment (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as UpdateAppointmentResponse;
  if (result.response.status !== "success") {
    throw new Error("Failed to update appointment");
  }
}
