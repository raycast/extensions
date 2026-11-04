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
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { graphqlClient } from "./graphql";
import { checkLocation, getLocationPreference } from "./location";
import { describeLoginError } from "./useAuth";

type Status = "pending" | "ok" | "warning" | "error" | "info" | "skipped";

interface Check {
  status: Status;
  message: string;
}

const STATUS_ICONS: Record<Status, Image.ImageLike> = {
  pending: { source: Icon.CircleProgress, tintColor: Color.SecondaryText },
  ok: { source: Icon.CheckCircle, tintColor: Color.Green },
  warning: { source: Icon.Warning, tintColor: Color.Yellow },
  error: { source: Icon.XMarkCircle, tintColor: Color.Red },
  info: { source: Icon.Info, tintColor: Color.SecondaryText },
  skipped: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
};

const PENDING: Check = { status: "pending", message: "Checking…" };
const SKIPPED: Check = { status: "skipped", message: "Skipped" };

const isDemoUrl = (url: string) => /^https?:\/\/demo\.zemtu\.com\/?$/i.test(url.trim());
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const checkUrl = async (): Promise<Check> => {
  const baseUrl = graphqlClient.getBaseUrl();
  try {
    if (!(await graphqlClient.isZemtuServer())) {
      return { status: "error", message: `Reachable, but this doesn't look like a Zemtu server (${baseUrl})` };
    }
    return isDemoUrl(baseUrl)
      ? { status: "warning", message: "Reachable – this is the Zemtu demo, not your provider" }
      : { status: "ok", message: "Reachable" };
  } catch {
    return {
      status: "error",
      message: "Zemtu could not be reached. Check the Zemtu URL in the preferences and your internet connection.",
    };
  }
};

// Always a fresh login, so a stored token can't hide a wrong password
const checkLogin = async (): Promise<Check> => {
  const { username, password } = getPreferenceValues<Preferences>();
  if (!username || !password) {
    return { status: "error", message: "Please enter your username and password in preferences" };
  }
  try {
    await graphqlClient.clearToken();
    await graphqlClient.authenticate();
    return { status: "ok", message: `Logged in as ${username}` };
  } catch (error) {
    return { status: "error", message: describeLoginError(error, graphqlClient.getBaseUrl()) };
  }
};

const checkVehicles = async (): Promise<Check> => {
  try {
    const vehicles = await graphqlClient.getVehicles(100);
    return vehicles.length > 0
      ? { status: "ok", message: `${vehicles.length} vehicles visible` }
      : { status: "warning", message: "Login works, but no vehicles are visible for this account" };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
};

const checkLocationPreference = async (): Promise<Check> => {
  const location = getLocationPreference();
  if (!location) return { status: "info", message: "Not set (optional) – vehicles are sorted by name" };
  try {
    const result = await checkLocation(location);
    if (!result) {
      return { status: "error", message: `Location not found – check the address in the preferences: ${location}` };
    }
    const coordinates = `${result.latitude}, ${result.longitude}`;
    return {
      status: "ok",
      message:
        result.type === "coordinates" ? `Coordinates ${coordinates}` : `Found: ${result.displayName ?? coordinates}`,
    };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
};

const canContinue = (check: Check) => check.status === "ok" || check.status === "warning";

// The result of a check that depends on an earlier one
const dependentResult = (previous: Check, result: Check | undefined): Check =>
  previous.status === "pending" ? PENDING : canContinue(previous) ? (result ?? PENDING) : SKIPPED;

interface SettingsChecksProps {
  navigationTitle?: string;
  onCheckAgain: () => void;
}

function SettingsChecks({ navigationTitle, onCheckAgain }: SettingsChecksProps) {
  const { data: urlResult } = usePromise(checkUrl);
  const url = urlResult ?? PENDING;
  const { data: loginResult } = usePromise(checkLogin, [], { execute: canContinue(url) });
  const login = dependentResult(url, loginResult);
  const { data: vehiclesResult } = usePromise(checkVehicles, [], { execute: canContinue(login) });
  const vehicles = dependentResult(login, vehiclesResult);
  // The location doesn't depend on the server, so it runs in parallel
  const { data: locationResult } = usePromise(checkLocationPreference);
  const location = locationResult ?? PENDING;

  const items = [
    { title: "Zemtu URL", check: url },
    { title: "Login", check: login },
    { title: "Location", check: location },
    { title: "Vehicles", check: vehicles },
  ];

  const isRunning = items.some(({ check }) => check.status === "pending");
  const hasProblems = items.some(({ check }) => check.status === "error" || check.status === "warning");

  return (
    <List isLoading={isRunning} isShowingDetail navigationTitle={navigationTitle}>
      <List.Section title={!isRunning && !hasProblems ? "✅ Everything is set up correctly" : "Check Settings"}>
        {items.map(({ title, check }) => (
          <List.Item
            key={title}
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
                  onAction={onCheckAgain}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

// `navigationTitle` is only set when another command pushes this view; as a command Raycast shows its title
export default function CheckSettings({ navigationTitle }: { navigationTitle?: string }) {
  const [runId, setRunId] = useState(0);

  // A new key starts all checks from scratch, so no result of the previous run stays visible
  return <SettingsChecks key={runId} navigationTitle={navigationTitle} onCheckAgain={() => setRunId((id) => id + 1)} />;
}
