import { Action, ActionPanel, Detail, LocalStorage, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

const APP_KEY = "pk_KXfH3HJRedDKyEiZ";
const DEVICE_CODE_URL = "https://enter.pollinations.ai/api/device/code";
const DEVICE_TOKEN_URL = "https://enter.pollinations.ai/api/device/token";
const DEVICE_VERIFY_URL = "https://enter.pollinations.ai/device";
export const TOKEN_STORAGE_KEY = "pollinations_token";

type Status = "loading" | "waiting" | "success" | "error";

export default function ConnectCommand() {
  const [userCode, setUserCode] = useState<string | null>(null);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function startFlow() {
      try {
        const res = await fetch(DEVICE_CODE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: APP_KEY, scope: "generate balance" }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        setUserCode(data.user_code);
        setDeviceCode(data.device_code);
        setStatus("waiting");
        open(DEVICE_VERIFY_URL);
      } catch {
        setStatus("error");
        await showToast({ style: Toast.Style.Failure, title: "Connection failed", message: "Try again" });
      }
    }
    startFlow();
  }, []);

  useEffect(() => {
    if (status !== "waiting" || !deviceCode) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(DEVICE_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_code: deviceCode }),
        });
        const data = await res.json();
        if (data.access_token) {
          clearInterval(interval);
          await LocalStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
          setStatus("success");
          await showToast({ style: Toast.Style.Success, title: "Connected!", message: "Your pollen is ready 🌸" });
          setTimeout(() => popToRoot(), 1500);
        }
      } catch {
        // keep polling
      }
    }, 5000);

    pollRef.current = interval;
    return () => clearInterval(interval);
  }, [status, deviceCode]);

  const markdown =
    status === "loading"
      ? "# 🌸 Connecting...\n\nRequesting authorization code..."
      : status === "error"
        ? "# ❌ Connection Failed\n\nCould not reach Pollinations. Check your internet connection and try again."
        : status === "success"
          ? "# ✅ Connected!\n\nYour pollen balance is ready. You can close this."
          : [
              "# 🌸 Connect to Pollinations AI",
              "",
              "Your authorization code:",
              "",
              `## \`${userCode}\``,
              "",
              "---",
              "",
              "1. The browser has opened **enter.pollinations.ai/device**",
              "2. Enter the code above",
              "3. Sign in with GitHub and approve",
              "",
              "_Waiting for approval — this page will close automatically._",
            ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {status === "waiting" && (
            <Action title="Open Browser Again" onAction={() => open(DEVICE_VERIFY_URL)} />
          )}
        </ActionPanel>
      }
    />
  );
}
