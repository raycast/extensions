export default async function fetch(url: string, options?: any) {
  if (url.includes("/auth/login")) {
    return {
      ok: true,
      json: async () => ({ data: { authTicket: { token: "test-token" } } }),
    };
  }
  if (url.includes("/patients")) {
    return {
      ok: true,
      json: async () => ({
        data: [
          {
            patientId: "test-patient-id",
            glucoseData: [],
          },
        ],
      }),
    };
  }
  if (url.includes("/glucoseMeasurements")) {
    return {
      ok: true,
      json: async () => ({
        data: {
          graphData: [],
          connection: { patientId: "test-patient-id" },
        },
      }),
    };
  }
  return {
    ok: true,
    json: async () => ({ data: { graphData: [] } }),
  };
}
