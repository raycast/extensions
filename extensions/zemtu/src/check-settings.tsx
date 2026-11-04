import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { graphqlClient } from "./graphql";
import { checkLocation, getLocationPreference } from "./location";
import { describeLoginError } from "./useAuth";

type Status = "pending" | "ok" | "warning" | "error" | "info" | "skipped";

interface Check {
  status: Status;
  message: string;
}

type CheckId = "url" | "login" | "location" | "vehicles";

const STATUS_ICONS: Record<Status, Image.ImageLike> = {
  pending: { source: Icon.CircleProgress, tintColor: Color.SecondaryText },
  ok: { source: Icon.CheckCircle, tintColor: Color.Green },
  warning: { source: Icon.Warning, tintColor: Color.Yellow },
  error: { source: Icon.XMarkCircle, tintColor: Color.Red },
  info: { source: Icon.Info, tintColor: Color.SecondaryText },
  skipped: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
};

const ITEMS: Array<{ id: CheckId; title: string }> = [
  { id: "url", title: "Zemtu URL" },
  { id: "login", title: "Login" },
  { id: "location", title: "Location" },
  { id: "vehicles", title: "Vehicles" },
];

const isDemoUrl = (url: string) => /^https?:\/\/demo\.zemtu\.com\/?$/i.test(url.trim());

// `navigationTitle` is only set when another command pushes this view; as a command Raycast shows its title
export default function CheckSettings({ navigationTitle }: { navigationTitle?: string }) {
  const preferences = getPreferenceValues<Preferences>();

  const pending: Check = { status: "pending", message: "Checking…" };
  const [checks, setChecks] = useState<Record<CheckId, Check>>({
    url: pending,
    login: pending,
    location: pending,
    vehicles: pending,
  });
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const set = (id: CheckId, check: Check) => {
      if (!cancelled) setChecks((previous) => ({ ...previous, [id]: check }));
    };
    const skip = (id: CheckId) => set(id, { status: "skipped", message: "Skipped" });
    const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

    setChecks({ url: pending, login: pending, location: pending, vehicles: pending });

    // The location doesn't depend on the server, so it runs in parallel
    const locationCheck = (async () => {
      const location = getLocationPreference();
      if (!location) {
        return set("location", { status: "info", message: "Not set (optional) – vehicles are sorted by name" });
      }
      try {
        const result = await checkLocation(location);
        if (!result) {
          return set("location", {
            status: "error",
            message: `Location not found – check the address in the preferences: ${location}`,
          });
        }
        const coordinates = `${result.latitude}, ${result.longitude}`;
        const message =
          result.type === "coordinates" ? `Coordinates ${coordinates}` : `Found: ${result.displayName ?? coordinates}`;
        set("location", { status: "ok", message });
      } catch (error) {
        set("location", { status: "error", message: errorMessage(error) });
      }
    })();

    const serverChecks = (async () => {
      // 1. URL
      const baseUrl = graphqlClient.getBaseUrl();
      try {
        if (!(await graphqlClient.isZemtuServer())) {
          set("url", {
            status: "error",
            message: `Reachable, but this doesn't look like a Zemtu server (${baseUrl})`,
          });
          return ["login", "vehicles"].forEach((id) => skip(id as CheckId));
        }
        set(
          "url",
          isDemoUrl(baseUrl)
            ? { status: "warning", message: "Reachable – this is the Zemtu demo, not your provider" }
            : { status: "ok", message: "Reachable" },
        );
      } catch {
        set("url", {
          status: "error",
          message: "Zemtu could not be reached. Check the Zemtu URL in the preferences and your internet connection.",
        });
        return ["login", "vehicles"].forEach((id) => skip(id as CheckId));
      }

      // 2. Login – always a fresh login, so a cached token can't hide a wrong password
      if (!preferences.username || !preferences.password) {
        set("login", { status: "error", message: "Please enter your username and password in preferences" });
        return skip("vehicles");
      }
      try {
        await graphqlClient.clearToken();
        await graphqlClient.authenticate();
        set("login", { status: "ok", message: `Logged in as ${preferences.username}` });
      } catch (error) {
        set("login", { status: "error", message: describeLoginError(error, baseUrl) });
        return skip("vehicles");
      }

      // 3. Vehicles
      try {
        const vehicles = await graphqlClient.getVehicles(100);
        set(
          "vehicles",
          vehicles.length > 0
            ? { status: "ok", message: `${vehicles.length} vehicles visible` }
            : { status: "warning", message: "Login works, but no vehicles are visible for this account" },
        );
      } catch (error) {
        set("vehicles", { status: "error", message: errorMessage(error) });
      }
    })();

    Promise.all([locationCheck, serverChecks]);
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const isRunning = Object.values(checks).some((check) => check.status === "pending");
  const hasProblems = Object.values(checks).some((check) => check.status === "error" || check.status === "warning");

  return (
    <List isLoading={isRunning} isShowingDetail navigationTitle={navigationTitle}>
      <List.Section title={!isRunning && !hasProblems ? "✅ Everything is set up correctly" : "Check Settings"}>
        {ITEMS.map(({ id, title }) => {
          const check = checks[id];
          return (
            <List.Item
              key={id}
              title={title}
              icon={STATUS_ICONS[check.status]}
              detail={<List.Item.Detail markdown={`## ${title}\n\n${check.message}`} />}
              actions={
                <ActionPanel>
                  <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    icon={Icon.Clipboard}
                    content={`${title}: ${check.message}`}
                  />
                  <Action
                    title="Check Again"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => setRunId((id) => id + 1)}
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
