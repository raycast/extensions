import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  clearRememberedUserId,
  performLogin,
  storeRememberedUserId,
} from "../lib/auth";
import { COPY } from "../lib/constants";

interface LoginFormProps {
  onSuccess: (enctoken: string, userId: string) => Promise<void>;
  storedUserId?: string | null;
  rememberedUserId?: string | null;
}

export function LoginForm({
  onSuccess,
  storedUserId,
  rememberedUserId,
}: LoginFormProps) {
  const { pop } = useNavigation();
  const passwordRef = useRef<Form.PasswordField>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string>(
    storedUserId ?? rememberedUserId ?? "",
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(!!rememberedUserId);
  const [showPassword, setShowPassword] = useState(false);

  const hasAutofill = !!(storedUserId || rememberedUserId);

  useEffect(() => {
    if (hasAutofill) {
      passwordRef.current?.focus();
    }
  }, []);

  async function handleSubmit(values: { userId: string; totpCode: string }) {
    const { totpCode } = values;
    // Ensure uppercase even if the user typed lowercase and the UI hasn't caught up (though it should)
    const currentUserId = userId.toUpperCase();

    if (!currentUserId || !password || !totpCode) {
      await showToast({
        style: Toast.Style.Failure,
        title: "All fields are required",
      });
      return;
    }

    setIsLoading(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Logging in..." });
      const enctoken = await performLogin(currentUserId, password, totpCode);

      if (rememberMe) {
        await storeRememberedUserId(currentUserId);
      } else {
        await clearRememberedUserId();
      }

      await onSuccess(enctoken, currentUserId);
      pop();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message === "INVALID_CREDENTIALS") {
        await showToast({
          style: Toast.Style.Failure,
          title: COPY.TOAST_INVALID_CREDENTIALS,
        });
      } else if (message === "INVALID_TOTP") {
        await showToast({
          style: Toast.Style.Failure,
          title: COPY.TOAST_INVALID_TOTP,
        });
      } else if (message.includes("fetch")) {
        await showToast({
          style: Toast.Style.Failure,
          title: COPY.TOAST_NETWORK_ERROR,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: COPY.TOAST_LOGIN_FAILED,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Login" onSubmit={handleSubmit} />
          <Action
            title={showPassword ? "Hide Password" : "Show Password"}
            icon={showPassword ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["opt"], key: "e" }}
            onAction={() => setShowPassword((prev) => !prev)}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Why no OAuth?"
        text="OAuth costs ₹2000/mo. This free method logs you in directly via Zerodha's API. Credentials are never stored or sent to any server. Only your User ID is saved locally if you check 'Remember User ID'."
      />

      <Form.TextField
        id="userId"
        title="User ID"
        placeholder="e.g. AB1234"
        value={userId}
        onChange={(newValue) => setUserId(newValue.toUpperCase())}
      />

      <Form.Checkbox
        id="rememberMe"
        label="Remember User ID"
        value={rememberMe}
        onChange={setRememberMe}
      />

      {showPassword ? (
        <Form.TextField
          id="password_visible"
          title="Password"
          placeholder="Your Zerodha password"
          value={password}
          onChange={setPassword}
        />
      ) : (
        <Form.PasswordField
          ref={passwordRef}
          id="password_hidden"
          title="Password"
          placeholder="Your Zerodha password"
          value={password}
          onChange={setPassword}
        />
      )}
      <Form.Description
        text={
          process.platform === "win32"
            ? "Alt+E to show/hide password"
            : "⌥E to show/hide password"
        }
      />

      <Form.TextField
        id="totpCode"
        title="TOTP Code"
        placeholder="6-digit TOTP code"
      />
    </Form>
  );
}
