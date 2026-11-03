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
import { getTranslations } from "./translations";
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

const isDemoUrl = (url: string) => /^https?:\/\/demo\.zemtu\.com\/?$/i.test(url.trim());

export default function CheckSettings() {
  const preferences = getPreferenceValues<{ baseUrl: string; username: string; password: string; language: string }>();
  const t = getTranslations(preferences.language || "en");

  const pending: Check = { status: "pending", message: t.checking };
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
    const skip = (id: CheckId) => set(id, { status: "skipped", message: t.skipped });
    const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

    setChecks({ url: pending, login: pending, location: pending, vehicles: pending });

    // The location doesn't depend on the server, so it runs in parallel
    const locationCheck = (async () => {
      const location = getLocationPreference();
      if (!location) return set("location", { status: "info", message: t.locationNotSet });
      try {
        const result = await checkLocation(location);
        if (!result) return set("location", { status: "error", message: `${t.locationNotFound}: ${location}` });
        const message =
          result.type === "coordinates"
            ? t.locationCoordinates.replace("{value}", `${result.latitude}, ${result.longitude}`)
            : t.locationAddress.replace("{value}", result.displayName ?? `${result.latitude}, ${result.longitude}`);
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
          set("url", { status: "error", message: `${t.urlNotZemtu} (${baseUrl})` });
          return ["login", "vehicles"].forEach((id) => skip(id as CheckId));
        }
        set("url", isDemoUrl(baseUrl) ? { status: "warning", message: t.urlDemo } : { status: "ok", message: t.urlOk });
      } catch {
        set("url", { status: "error", message: t.serverUnreachable });
        return ["login", "vehicles"].forEach((id) => skip(id as CheckId));
      }

      // 2. Login – always a fresh login, so a cached token can't hide a wrong password
      if (!preferences.username || !preferences.password) {
        set("login", { status: "error", message: t.pleaseEnterCredentials });
        return skip("vehicles");
      }
      try {
        graphqlClient.clearToken();
        await graphqlClient.authenticate();
        set("login", { status: "ok", message: t.loginOk.replace("{user}", preferences.username) });
      } catch (error) {
        set("login", { status: "error", message: describeLoginError(error, baseUrl, t) });
        return skip("vehicles");
      }

      // 3. Vehicles
      try {
        const vehicles = await graphqlClient.getVehicles(100);
        set(
          "vehicles",
          vehicles.length > 0
            ? { status: "ok", message: t.vehiclesFound.replace("{count}", String(vehicles.length)) }
            : { status: "warning", message: t.noVehiclesVisible },
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

  const items: Array<{ id: CheckId; title: string }> = [
    { id: "url", title: t.checkUrl },
    { id: "login", title: t.checkLogin },
    { id: "location", title: t.checkLocation },
    { id: "vehicles", title: t.checkVehicles },
  ];

  const isRunning = Object.values(checks).some((check) => check.status === "pending");
  const hasProblems = Object.values(checks).some((check) => check.status === "error" || check.status === "warning");

  return (
    <List isLoading={isRunning} isShowingDetail navigationTitle={t.checkSettings}>
      <List.Section title={!isRunning && !hasProblems ? `✅ ${t.allChecksPassed}` : t.checkSettings}>
        {items.map(({ id, title }) => {
          const check = checks[id];
          return (
            <List.Item
              key={id}
              title={title}
              icon={STATUS_ICONS[check.status]}
              detail={<List.Item.Detail markdown={`## ${title}\n\n${check.message}`} />}
              actions={
                <ActionPanel>
                  {check.status === "error" || check.status === "warning" ? (
                    <Action title={t.openPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
                  ) : null}
                  <Action
                    title={t.checkAgain}
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => setRunId((id) => id + 1)}
                  />
                  {check.status === "error" || check.status === "warning" ? null : (
                    <Action title={t.openPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
                  )}
                  <Action.CopyToClipboard title={t.copyTitle} content={`${title}: ${check.message}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
