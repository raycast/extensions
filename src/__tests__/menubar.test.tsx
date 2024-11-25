import React from "react";
import { render, act } from "@testing-library/react";
import * as auth from "../auth";
import Command from "../menubar";
import { showToast } from "@raycast/api";

jest.mock("../auth", () => ({
  isLoggedOut: jest.fn().mockResolvedValue(false),
}));

jest.mock("../libreview", () => ({
  fetchGlucoseData: jest.fn().mockResolvedValue([]),
}));

jest.mock("../store", () => ({
  glucoseStore: {
    getReadings: jest.fn(),
  },
}));

// Mock with exact structure needed by menubar.tsx
jest.mock("@raycast/api", () => ({
  MenuBarExtra: (props: any) => <div>{props.title || "Menu Bar"}</div>,
  getPreferenceValues: jest.fn().mockReturnValue({
    username: "test@example.com",
    password: "password123",
    unit: "mmol",
    alertsEnabled: false,
  }),
  Icon: {
    Circle: "circle",
    Person: "person",
    XmarkCircle: "xmark.circle",
    ExclamationMark: "exclamationmark",
    ArrowClockwise: "arrow.clockwise",
    List: "list",
    Terminal: "terminal",
    Gear: "gear",
  },
  Color: {
    SecondaryText: "#999",
    Red: "#FF0000",
    Green: "#00FF00",
    Yellow: "#FFFF00",
  },
  Toast: {
    Style: {
      Failure: "failure",
      Success: "success",
    },
  },
  showToast: jest.fn(),
  openExtensionPreferences: jest.fn(),
  popToRoot: jest.fn(),
  open: jest.fn(),
}));

describe("MenuBar Command", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    render(<Command />);
  });

  it("should handle glucose alerts when enabled", async () => {
    const mockReading = {
      Value: 3.5,
      ValueInMgPerDl: 63,
      Timestamp: new Date().toISOString(),
      unit: "mmol",
    };

    const store = jest.requireMock("../store");
    store.glucoseStore.getReadings.mockResolvedValue([mockReading]);

    jest.requireMock("@raycast/api").getPreferenceValues.mockReturnValue({
      username: "test@example.com",
      password: "password123",
      unit: "mmol",
      alertsEnabled: true,
      lowThreshold: "3.9",
      highThreshold: "10.0",
    });

    await act(async () => {
      render(<Command />);
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: expect.stringContaining("Low Glucose Alert"),
      }),
    );
  });
});
