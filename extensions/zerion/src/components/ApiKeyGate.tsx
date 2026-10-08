import { Action, ActionPanel, Detail, Icon, LaunchType, LocalStorage, environment, launchCommand } from "@raycast/api";
import { useEffect, useState } from "react";
import { DASHBOARD_URL, isApiErrorWithStatus } from "../shared/api";
import { zerionOAuth } from "../shared/oauth";
import { markSessionRestored, useSessionRevoked } from "../shared/session";

const RATE_LIMITED_MARKDOWN = `
# Zerion API Rate Limit Reached

Your API key has hit its request quota.

- Per-second limits recover in moments — try again shortly
- If the monthly quota is exhausted, it resets with the new billing month
- Manage your API keys, check usage, or upgrade your plan at [dashboard.zerion.io](${DASHBOARD_URL})
`;

const SIGNING_IN_MARKDOWN = `
# Signing In Again…

The Zerion API rejected the stored key — it may have been revoked or disabled.

A browser window is opening so you can sign in with Zerion again.
`;

const SIGNED_IN_MARKDOWN = `
# Signed In

You're connected again. Reopen the command to continue.
`;

const SIGN_IN_FAILED_MARKDOWN = `
# Sign-In Needed

The Zerion API rejected the stored key. Either the sign-in attempt didn't finish, or the key it granted doesn't work — check your keys at the dashboard if this keeps happening.

Use the action below to try again.
`;

// Guards against a consent loop: if the dashboard grants a key that the API
// rejects, auto-reauthorizing would reopen the browser consent page forever.
const REAUTH_GUARD_KEY = "zerion-last-auto-reauth";
const REAUTH_GUARD_WINDOW_MS = 60_000;

export function RateLimitedView() {
  return (
    <Detail
      markdown={RATE_LIMITED_MARKDOWN}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Manage API Keys in Dashboard" url={DASHBOARD_URL} icon={Icon.Key} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Shown on 401: the api layer has already cleared the stored tokens, so this
 * view re-runs the OAuth flow and relaunches the current command once the
 * user is signed in again.
 */
export function SignInAgainView() {
  const [state, setState] = useState<"authorizing" | "done" | "failed">("authorizing");

  const signIn = async () => {
    setState("authorizing");
    try {
      await zerionOAuth.authorize();
      markSessionRestored();
    } catch {
      setState("failed");
      return;
    }
    try {
      // Remount the command so withAccessToken picks up the fresh key.
      await launchCommand({ name: environment.entryPointName, type: LaunchType.UserInitiated });
    } catch {
      // Commands with required arguments can't be relaunched blind.
      setState("done");
    }
  };

  useEffect(() => {
    (async () => {
      const lastAutoReauth = await LocalStorage.getItem<number>(REAUTH_GUARD_KEY);
      if (typeof lastAutoReauth === "number" && Date.now() - lastAutoReauth < REAUTH_GUARD_WINDOW_MS) {
        // A sign-in just completed and still hit a 401 — the granted key is
        // bad. Auto-retrying would loop; wait for an explicit user action.
        setState("failed");
        return;
      }
      await LocalStorage.setItem(REAUTH_GUARD_KEY, Date.now());
      signIn();
    })();
  }, []);

  const markdown =
    state === "authorizing" ? SIGNING_IN_MARKDOWN : state === "done" ? SIGNED_IN_MARKDOWN : SIGN_IN_FAILED_MARKDOWN;

  return (
    <Detail
      markdown={markdown}
      actions={
        state === "failed" ? (
          <ActionPanel>
            <Action title="Sign in with Zerion" onAction={signIn} icon={Icon.Person} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

/**
 * The gate view to render instead of the screen for auth/quota API errors, or
 * null for anything else (including no error).
 *
 * A revoked key is caught two ways: through the screen's own request errors,
 * and through the session flag the api layer raises on any 401 — so a 401 on
 * a nested request (Token Details, Recent Activity) reaches the gate too.
 */
export function useApiErrorGate(error?: unknown) {
  const sessionRevoked = useSessionRevoked();
  if (sessionRevoked || isApiErrorWithStatus(error, 401)) {
    return <SignInAgainView />;
  }
  if (isApiErrorWithStatus(error, 429)) {
    return <RateLimitedView />;
  }
  return null;
}
