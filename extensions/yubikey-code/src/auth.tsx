import React, { useState } from "react";
import { Action, ActionPanel, Form } from "@raycast/api";
import { execFile } from "child_process";
import { ykmanExecutable } from "./accounts";

// Keep password in memory only during session
let sessionPassword: string | null = null;

export interface AuthResult {
  success: boolean;
  error?: string;
  requiresPassword?: boolean;
}

export function clearSessionPassword() {
  sessionPassword = null;
}

export function getSessionPassword(): string | null {
  return sessionPassword;
}

export function setSessionPassword(password: string) {
  sessionPassword = password;
}

export function checkPasswordProtection(): Promise<AuthResult> {
  return new Promise((resolve) => {
    execFile(ykmanExecutable(), ["oath", "info"], (error, stdout, stderr) => {
      if (error) {
        if (
          stderr.includes("Failed to connect to YubiKey") ||
          stderr.includes("Failed opening device") ||
          stderr.includes("No YubiKey detected")
        ) {
          resolve({
            success: false,
            error:
              "YubiKey not connected or accessible. Please ensure your YubiKey is properly connected and not in use by another application.",
          });
        } else {
          resolve({ success: false, error: stderr || error.message || "Failed to check YubiKey OATH info" });
        }
        return;
      }

      const isPasswordProtected = stdout.includes("Password protection: enabled");
      const isRemembered = stdout.includes("remembered by ykman");

      if (isPasswordProtected && !isRemembered) {
        resolve({ success: false, requiresPassword: true });
      } else {
        resolve({ success: true });
      }
    });
  });
}

export function testAuthentication(password: string): Promise<AuthResult> {
  return new Promise((resolve) => {
    execFile(ykmanExecutable(), ["oath", "accounts", "list", "-p", password], (error, _stdout, stderr) => {
      if (error) {
        if (
          stderr.includes("password") ||
          stderr.includes("Password") ||
          error.message.includes("password") ||
          error.message.includes("Password")
        ) {
          resolve({ success: false, error: "Invalid password", requiresPassword: true });
        } else {
          resolve({ success: false, error: stderr || error.message || "Authentication failed" });
        }
        return;
      }
      resolve({ success: true });
    });
  });
}

export function checkIfPasswordRequired(): Promise<AuthResult> {
  return new Promise((resolve) => {
    checkPasswordProtection()
      .then((result) => resolve(result))
      .catch((error) => resolve({ success: false, error: error.message || "Failed to check authentication status" }));
  });
}

export function rememberPassword(password: string): Promise<AuthResult> {
  return new Promise((resolve) => {
    execFile(ykmanExecutable(), ["oath", "access", "remember", "-p", password], (error, _stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr || error.message || "Failed to save password" });
      } else {
        resolve({ success: true });
      }
    });
  });
}

export function forgetPassword(): Promise<AuthResult> {
  return new Promise((resolve) => {
    execFile(ykmanExecutable(), ["oath", "access", "forget"], (error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        clearSessionPassword();
        resolve({ success: true });
      }
    });
  });
}

export async function executeWithAuth(
  command: string[],
  password?: string
): Promise<{ success: boolean; output?: string; error?: string; requiresPassword?: boolean }> {
  try {
    if (!password) {
      const protectionCheck = await checkPasswordProtection();
      if (!protectionCheck.success) {
        return { success: false, error: protectionCheck.error, requiresPassword: protectionCheck.requiresPassword };
      }
      if (protectionCheck.requiresPassword) {
        return { success: false, requiresPassword: true, error: "Password required" };
      }
    }

    let finalCommand = [...command];
    if (password) {
      finalCommand = [...command, "-p", password];
    }

    return new Promise((resolve) => {
      execFile(ykmanExecutable(), finalCommand, (error, stdout, stderr) => {
        if (error) {
          if (
            stderr.includes("password") ||
            stderr.includes("Password") ||
            error.message.includes("password") ||
            error.message.includes("Password")
          ) {
            resolve({
              success: false,
              requiresPassword: true,
              error: password ? "Invalid password" : "Password required",
            });
          } else if (
            stderr.includes("Failed to connect to YubiKey") ||
            stderr.includes("Failed opening device") ||
            stderr.includes("No YubiKey detected")
          ) {
            resolve({
              success: false,
              error:
                "YubiKey not connected or accessible. Please ensure your YubiKey is properly connected and not in use by another application.",
            });
          } else {
            resolve({ success: false, error: stderr || error.message || "Command failed" });
          }
        } else {
          resolve({ success: true, output: stdout.trim() });
        }
      });
    });
  } catch (error) {
    return { success: false, error: (error as Error).message || "Unexpected error" };
  }
}

export function PasswordForm(props: {
  onPasswordSubmit: (password: string, remember: boolean) => void;
  isLoading?: boolean;
  error?: string;
}): React.JSX.Element {
  const { onPasswordSubmit, isLoading, error } = props;
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const handleSubmit = () => {
    if (password.trim()) {
      onPasswordSubmit(password, remember);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Authenticate" onSubmit={handleSubmit} icon="🔐" />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter your YubiKey password"
        value={password}
        onChange={setPassword}
      />
      <Form.Checkbox
        id="remember"
        title="Remember Password"
        label="Save password using ykman's secure storage"
        value={remember}
        onChange={setRemember}
      />
      {error && <Form.Description text={`Error: ${error}`} />}
    </Form>
  );
}
