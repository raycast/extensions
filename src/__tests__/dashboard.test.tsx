import React from "react";
import { render, act } from "@testing-library/react";
import Command from "../dashboard";

// Mock libreview to return empty data
jest.mock("../libreview", () => ({
  fetchGlucoseData: jest.fn().mockResolvedValue([]),
}));

// Mock auth to return logged in state
jest.mock("../auth", () => ({
  isLoggedOut: jest.fn().mockResolvedValue(false),
  attemptLogin: jest.fn().mockResolvedValue(true),
}));

// Complete mock of all Raycast components used in dashboard
jest.mock("@raycast/api", () => ({
  List: function List(props: any) {
    return <div data-testid="list">{props.children}</div>;
  },
  ActionPanel: function ActionPanel(props: any) {
    return <div>{props.children}</div>;
  },
  Action: {
    CopyToClipboard: function CopyToClipboard(props: any) {
      return <div>{props.title}</div>;
    },
  },
  Icon: {
    Person: "person",
    Circle: "circle",
    Clock: "clock",
    Gear: "gear",
  },
  getPreferenceValues: () => ({
    username: "test@example.com",
    password: "password123",
    unit: "mmol",
  }),
  openExtensionPreferences: jest.fn(),
  showToast: jest.fn(),
  Toast: {
    Style: {
      Failure: "failure",
      Success: "success",
    },
  },
}));

// Add List components that dashboard uses
const api = jest.requireMock("@raycast/api");
api.List.Item = function Item(props: any) {
  return <div>{props.title}</div>;
};
api.List.Section = function Section(props: any) {
  return (
    <div>
      {props.title}
      {props.children}
    </div>
  );
};
api.List.EmptyView = function EmptyView(props: any) {
  return <div>{props.title}</div>;
};

describe("Dashboard", () => {
  it("should render without crashing", async () => {
    await act(async () => {
      render(<Command />);
    });
  });
});
