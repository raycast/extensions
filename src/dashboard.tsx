import { List, Action, ActionPanel, Icon, Form, showToast, Toast, LocalStorage, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { glucoseStore } from "./store";
import { GlucoseReading } from "./types";
import { format } from "date-fns";
import { getLibreViewCredentials } from "./preferences";
import { isLoggedOut as checkLoggedOut, attemptLogin } from "./auth";

export default function Command() {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const { unit } = getLibreViewCredentials();

  const fetchData = async () => {
    try {
      const loggedOutState = await checkLoggedOut();
      if (loggedOutState) {
        const loginSuccess = await attemptLogin();
        if (!loginSuccess) {
          setIsLoggedOut(true);
          return;
        }
      }
      setIsLoggedOut(false);

      setIsLoading(true);
      const data = await glucoseStore.getReadings(false);
      setReadings(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error instanceof Error && error.message.includes("Missing LibreView credentials")) {
        setIsLoggedOut(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Safely manage LocalStorage
    const setDashboardActive = async () => {
      try {
        await LocalStorage.setItem("dashboard-active", "true");
      } catch (error) {
        console.error("Error setting dashboard active state:", error);
      }
    };

    setDashboardActive();

    return () => {
      // Safely cleanup
      const cleanupDashboard = async () => {
        try {
          await LocalStorage.removeItem("dashboard-active");
        } catch (error) {
          console.error("Error cleaning up dashboard state:", error);
        }
      };
      cleanupDashboard();
    };
  }, []);

  const getValueColor = (value: number): string => {
    const lowThreshold = unit === "mmol" ? 3.9 : 70;
    const highThreshold = unit === "mmol" ? 10.0 : 180;

    if (value < lowThreshold) return "#EAB308"; // Yellow for low
    if (value > highThreshold) return "#EF4444"; // Red for high
    return "#10B981"; // Green for normal
  };

  const calculateStats = () => {
    if (readings.length === 0) return null;

    const values = readings.map((r) => (unit === "mmol" ? r.Value : r.ValueInMgPerDl));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const lowThreshold = unit === "mmol" ? 3.9 : 70;
    const highThreshold = unit === "mmol" ? 10.0 : 180;

    const low = readings.filter((r) => (unit === "mmol" ? r.Value : r.ValueInMgPerDl) < lowThreshold).length;
    const high = readings.filter((r) => (unit === "mmol" ? r.Value : r.ValueInMgPerDl) > highThreshold).length;
    const normal = readings.length - low - high;

    return {
      average: avg.toFixed(1),
      timeInRange: ((normal / readings.length) * 100).toFixed(1),
      lowPercentage: ((low / readings.length) * 100).toFixed(1),
      highPercentage: ((high / readings.length) * 100).toFixed(1),
    };
  };

  const stats = calculateStats();

  if (isLoggedOut) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Login"
              onSubmit={async (values) => {
                try {
                  await LocalStorage.setItem("username", values.email);
                  await LocalStorage.setItem("password", values.password);
                  await LocalStorage.setItem("unit", values.unit || "mmol");

                  const loginSuccess = await attemptLogin();
                  if (loginSuccess) {
                    try {
                      setIsLoggedOut(false);
                      await fetchData();
                      await LocalStorage.setItem("menubar-enabled", "true");
                      popToRoot();

                      await showToast({
                        style: Toast.Style.Success,
                        title: "Login Successful",
                        message: "Loading your glucose data...",
                      });
                    } catch (error) {
                      console.error("Error after login:", error);
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Error Loading Data",
                        message: error instanceof Error ? error.message : "Unknown error",
                      });
                    }
                  } else {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Login Failed",
                      message: "Please check your credentials",
                    });
                  }
                } catch (error) {
                  console.error("Login error:", error);
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Login Error",
                    message: error instanceof Error ? error.message : "Unknown error",
                  });
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="email" title="Email" placeholder="Enter your LibreView email" autoFocus />
        <Form.PasswordField id="password" title="Password" placeholder="Enter your LibreView password" />
        <Form.Dropdown id="unit" title="Glucose Unit" defaultValue="mmol">
          <Form.Dropdown.Item value="mmol" title="mmol/L" />
          <Form.Dropdown.Item value="mgdl" title="mg/dL" />
        </Form.Dropdown>
      </Form>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search glucose readings...">
      <List.Section title="Statistics (Last 24h)">
        {stats && (
          <>
            <List.Item title={`Average: ${stats.average} ${unit === "mmol" ? "mmol/L" : "mg/dL"}`} icon={Icon.Circle} />
            <List.Item title={`Time in Range: ${stats.timeInRange}%`} icon={Icon.Circle} />
            <List.Item title={`Below Range: ${stats.lowPercentage}%`} icon={Icon.Circle} />
            <List.Item title={`Above Range: ${stats.highPercentage}%`} icon={Icon.Circle} />
            <List.Item title={`Last Updated: ${format(new Date(), "MMM d, h:mm a")}`} icon={Icon.Clock} />
          </>
        )}
      </List.Section>

      <List.Section title="Readings">
        {readings.map((reading, index) => {
          const value = unit === "mmol" ? reading.Value : reading.ValueInMgPerDl;

          // Use the same trend calculation as menubar
          const trend =
            index > 0
              ? unit === "mmol"
                ? value > readings[index - 1].Value + 0.3
                  ? "↑"
                  : value < readings[index - 1].Value - 0.3
                    ? "↓"
                    : "→"
                : value > readings[index - 1].ValueInMgPerDl + 5
                  ? "↑"
                  : value < readings[index - 1].ValueInMgPerDl - 5
                    ? "↓"
                    : "→"
              : "→";

          return (
            <List.Item
              key={reading.Timestamp}
              title={`${value.toFixed(1)} ${unit === "mmol" ? "mmol/L" : "mg/dL"} ${trend}`}
              subtitle={format(new Date(reading.Timestamp), "MMM d, h:mm a")}
              icon={{ source: Icon.Circle, tintColor: getValueColor(value) }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Reading"
                    content={`${value.toFixed(1)} ${unit === "mmol" ? "mmol/L" : "mg/dL"}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Time"
                    content={format(new Date(reading.Timestamp), "MMM d, h:mm a")}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
