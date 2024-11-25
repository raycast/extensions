import { getLibreViewCredentials } from "../preferences";
import { getPreferenceValues } from "@raycast/api";

jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
}));

describe("Preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return preferences without conversion when units match", () => {
    (getPreferenceValues as jest.Mock).mockReturnValue({
      username: "test@example.com",
      password: "password123",
      unit: "mmol",
      alertsEnabled: true,
      lowThreshold: "3.9",
      highThreshold: "10.0",
    });

    const prefs = getLibreViewCredentials();
    expect(prefs.lowThreshold).toBe("3.9");
    expect(prefs.highThreshold).toBe("10.0");
  });

  it("should convert thresholds when unit is mgdl", () => {
    (getPreferenceValues as jest.Mock).mockReturnValue({
      username: "test@example.com",
      password: "password123",
      unit: "mgdl",
      alertsEnabled: true,
      lowThreshold: "3.9",
      highThreshold: "10.0",
    });

    const prefs = getLibreViewCredentials();
    expect(prefs.lowThreshold).toBe("70");
    expect(prefs.highThreshold).toBe("180");
  });
});
