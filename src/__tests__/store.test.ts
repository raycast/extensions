import { glucoseStore } from "../store";
import { getLibreViewCredentials } from "../preferences";
import * as libreview from "../libreview";

jest.mock("../preferences", () => ({
  getLibreViewCredentials: () => ({
    username: "test@example.com",
    password: "password123",
    unit: "mmol",
  }),
}));

jest.mock("../libreview", () => ({
  fetchGlucoseData: jest.fn().mockResolvedValue([]),
}));

describe("GlucoseStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    glucoseStore.clearCache?.();
  });

  it("should return empty readings when no data exists", async () => {
    const readings = await glucoseStore.getReadings();
    expect(Array.isArray(readings)).toBe(true);
    expect(readings.length).toBe(0);
  });

  it("should fetch and cache readings", async () => {
    const mockReading = {
      Value: 5.5,
      ValueInMgPerDl: 99,
      Timestamp: new Date().toISOString(),
      unit: "mmol",
    };

    (libreview.fetchGlucoseData as jest.Mock).mockResolvedValue([mockReading]);

    const readings = await glucoseStore.getReadings();
    expect(readings).toEqual([mockReading]);
    expect(libreview.fetchGlucoseData).toHaveBeenCalledTimes(1);
  });
});
