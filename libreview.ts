import { GlucoseReading } from "./types";
import fetch from "node-fetch";
import { format } from "date-fns";
import { getLibreViewCredentials } from "./preferences";

const API_BASE = "https://api.libreview.io";
const API_HEADERS = {
  "Content-Type": "application/json",
  Product: "llu.android",
  Version: "4.7.0",
  "Accept-Encoding": "gzip",
};

// Simple token cache
let authToken: string | null = null;
let tokenExpiry: number = 0;
const TOKEN_LIFETIME = 50 * 60 * 1000; // 50 minutes

export async function fetchGlucoseData(): Promise<GlucoseReading[]> {
  const { username, password } = getLibreViewCredentials();

  // Get or refresh token
  if (!authToken || Date.now() > tokenExpiry) {
    const authResponse = await fetch(`${API_BASE}/llu/auth/login`, {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify({ email: username, password: password }),
    });

    if (!authResponse.ok) {
      throw new Error("Authentication failed");
    }

    const authData = (await authResponse.json()) as { data: { authTicket: { token: string } } };
    authToken = authData.data.authTicket.token;
    tokenExpiry = Date.now() + TOKEN_LIFETIME;
  }

  // Get patient ID and glucose data in parallel
  const headers = { ...API_HEADERS, Authorization: `Bearer ${authToken}` };

  const [connectionsResponse, glucoseResponse] = await Promise.all([
    fetch(`${API_BASE}/llu/connections`, { headers }),
    fetch(`${API_BASE}/llu/connections`, { headers })
      .then((res) => res.json() as Promise<{ data: { patientId: string }[] }>)
      .then((data) => {
        const patientId = data.data[0]?.patientId;
        if (!patientId) throw new Error("No patient ID found");

        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 1);

        return fetch(
          `${API_BASE}/llu/connections/${patientId}/graph?period=day&startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`,
          { headers },
        );
      }),
  ]);

  if (!connectionsResponse.ok) {
    throw new Error("Failed to fetch connections");
  }

  const glucoseData = (await glucoseResponse.json()) as { data: { graphData: GlucoseReading[] } };

  // Sort readings by timestamp in descending order (newest first)
  const readings = glucoseData.data.graphData || [];
  return readings.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
}
