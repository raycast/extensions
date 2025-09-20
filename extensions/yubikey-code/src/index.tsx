import { Action, ActionPanel, Cache, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { ExecFileException } from "child_process";
import React, { useState } from "react";
import { getAccountIcon, getIconOverrides, getIconPack, IconSubmenu } from "./icons";
import { AccountDetail, executeCodeCommand, getAccountList, ykmanExecutable } from "./accounts";
import { getActiveApp, getUsageData, makeUsageSorter, updateUsage } from "./usage";
import { PasswordForm, testAuthentication, rememberPassword, setSessionPassword, forgetPassword } from "./auth";

interface Preference {
  ykmanPath: string;
  iconPackPath: string;
  primaryAction: string;
}

export enum ActionType {
  Copy = "copy",
  Paste = "paste",
  Reveal = "reveal",
}

export const preferences: Preference = getPreferenceValues();
export const cache = new Cache();
export const isCopyPrimary = preferences.primaryAction === ActionType.Copy;

const primaryActionType = isCopyPrimary ? ActionType.Copy : ActionType.Paste;
const secondaryActionType = isCopyPrimary ? ActionType.Paste : ActionType.Copy;

export default function Command() {
  const { iconPack, iconPackIsLoading, iconPackError } = getIconPack();
  const iconPackResult = getCachedData("iconPack", iconPackIsLoading, iconPackError, iconPack);

  const [overrides, setOverrides] = useState<number>(0);
  const iconOverrides = getIconOverrides(overrides);

  const [usages, setUsages] = useState<number>(0);
  const usageData = getUsageData(usages);
  const activeApp = getActiveApp();

  const [showPasswordForm, setShowPasswordForm] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [refreshAccounts, setRefreshAccounts] = useState<number>(0);

  const { isLoading, error, accounts, requiresAuth } = getAccountList(refreshAccounts);
  const accountResults = getCachedData("accounts", isLoading, error, accounts);

  if (requiresAuth || showPasswordForm) {
    return (
      <PasswordForm
        isLoading={authLoading}
        error={authError}
        onPasswordSubmit={async (password: string, remember: boolean) => {
          setAuthLoading(true);
          setAuthError("");

          try {
            const authResult = await testAuthentication(password);
            if (authResult.success) {
              setSessionPassword(password);

              if (remember) {
                const rememberResult = await rememberPassword(password);
                if (!rememberResult.success) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to save password",
                    message: rememberResult.error || "Unknown error",
                  });
                }
              }

              setShowPasswordForm(false);
              setRefreshAccounts((n) => n + 1);
              showToast({ style: Toast.Style.Success, title: "Authentication successful" });
            } else {
              setAuthError(authResult.error || "Authentication failed");
            }
          } catch {
            setAuthError("Authentication failed");
          } finally {
            setAuthLoading(false);
          }
        }}
      />
    );
  }

  if (!isLoading && accountResults.length === 0) {
    const description = error
      ? "The ykman command failed to list your accounts."
      : "You don't currently have any accounts. Add some using ykman or the Yubico Authenticator.";

    return (
      <List>
        <List.EmptyView title="No accounts found" description={description} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Accounts">
      {!isLoading &&
        accountResults
          .map((account) => {
            const { name, details, requiresTouch, key } = account;

            const usageCallback = () => {
              updateUsage(key, activeApp);
              setUsages((n) => n + 1);
            };

            return (
              <List.Item
                icon={getAccountIcon(iconPackResult, iconOverrides, account)}
                title={name}
                subtitle={details}
                key={key}
                accessories={[
                  {
                    icon: requiresTouch ? Icon.Fingerprint : Icon.LockUnlocked,
                    tooltip: requiresTouch ? "Touch Required" : "No Touch Required",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <PrimaryAction
                      accountKey={key}
                      requiresTouch={requiresTouch}
                      usageCallback={usageCallback}
                      onRequiresAuth={() => setShowPasswordForm(true)}
                    />
                    <SecondaryAction
                      accountKey={key}
                      requiresTouch={requiresTouch}
                      usageCallback={usageCallback}
                      onRequiresAuth={() => setShowPasswordForm(true)}
                    />
                    <Action.Push
                      title="Reveal Code"
                      icon={Icon.Eye}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                      target={
                        <AccountDetail
                          accountKey={key}
                          actionType={ActionType.Reveal}
                          requiresTouch={requiresTouch}
                          usageCallback={usageCallback}
                          onRequiresAuth={() => setShowPasswordForm(true)}
                        />
                      }
                    />
                    <IconSubmenu accountKey={key} iconPack={iconPack} onOverride={() => setOverrides((n) => n + 1)} />
                    <Action
                      title="Clear Saved Password"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                      onAction={async () => {
                        const result = await forgetPassword();
                        if (result.success) {
                          showToast({ style: Toast.Style.Success, title: "Password cleared" });
                          setShowPasswordForm(false);
                          setRefreshAccounts((n) => n + 1);
                        } else {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to clear password",
                            message: result.error,
                          });
                        }
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })
          .sort(makeUsageSorter(usageData, activeApp))}
    </List>
  );
}

function PrimaryAction(props: {
  accountKey: string;
  requiresTouch: boolean;
  usageCallback: () => void;
  onRequiresAuth?: () => void;
}): React.JSX.Element {
  const { accountKey, requiresTouch, usageCallback, onRequiresAuth } = props;
  const title = isCopyPrimary ? "Copy Code" : "Paste Code";
  const icon = isCopyPrimary ? Icon.CopyClipboard : Icon.Document;

  return requiresTouch ? (
    <Action.Push
      title={title}
      icon={icon}
      target={
        <AccountDetail
          accountKey={accountKey}
          actionType={primaryActionType}
          requiresTouch={requiresTouch}
          usageCallback={usageCallback}
          onRequiresAuth={onRequiresAuth}
        />
      }
    />
  ) : (
    <Action
      title={title}
      icon={icon}
      onAction={async () => {
        await executeCodeCommand(
          accountKey,
          primaryActionType,
          () => {},
          () => {},
          () => {},
          usageCallback,
          onRequiresAuth || (() => {})
        );
      }}
    />
  );
}

function SecondaryAction(props: {
  accountKey: string;
  requiresTouch: boolean;
  usageCallback: () => void;
  onRequiresAuth?: () => void;
}): React.JSX.Element {
  const { accountKey, requiresTouch, usageCallback, onRequiresAuth } = props;
  const title = isCopyPrimary ? "Paste Code" : "Copy Code";
  const icon = isCopyPrimary ? Icon.Document : Icon.CopyClipboard;

  return requiresTouch ? (
    <Action.Push
      title={title}
      icon={icon}
      target={
        <AccountDetail
          accountKey={accountKey}
          actionType={secondaryActionType}
          requiresTouch={requiresTouch}
          usageCallback={usageCallback}
          onRequiresAuth={onRequiresAuth}
        />
      }
    />
  ) : (
    <Action
      title={title}
      icon={icon}
      onAction={async () => {
        await executeCodeCommand(
          accountKey,
          secondaryActionType,
          () => {},
          () => {},
          () => {},
          usageCallback,
          onRequiresAuth || (() => {})
        );
      }}
    />
  );
}

function getCachedData<T>(cacheKey: string, isLoading: boolean, error: string | undefined, result: T): T {
  if (cache.has(cacheKey) && (isLoading || error)) {
    // if we have cached items, use them while waiting for fresh ones
    return JSON.parse(cache.get(cacheKey) || "");
  } else {
    // once the fresh items have successfully loaded, return the results
    return result;
  }
}

export function handleError(
  error: ExecFileException | NodeJS.ErrnoException,
  contextMessage: string,
  errorCallback: (error: string) => void,
  isLoadingCallback: (isLoading: boolean) => void
) {
  console.error(error);
  errorCallback(error.message);
  isLoadingCallback(false);

  let errorMessage = error.message;
  if (error.code && error.code === "ENOENT") {
    errorMessage = "ykman doesn't exist at " + ykmanExecutable();
  }

  showToast({ style: Toast.Style.Failure, title: contextMessage, message: errorMessage });
}
