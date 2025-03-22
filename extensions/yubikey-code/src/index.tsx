import { Action, ActionPanel, Cache, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { ExecFileException } from "child_process";
import React, { useState } from "react";
import { getAccountIcon, getIconOverrides, getIconPack, IconSubmenu } from "./icons";
import { AccountDetail, executeCodeCommand, getAccountList, ykmanExecutable } from "./accounts";

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

  const { isLoading, error, accounts } = getAccountList();
  const accountResults = getCachedData("accounts", isLoading, error, accounts);

  const [overrides, setOverrides] = useState<number>(0);
  const iconOverrides = getIconOverrides(overrides);

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
      {accountResults.map((account, index) => {
        const { name, details, requiresTouch, key } = account;

        return (
          <List.Item
            icon={getAccountIcon(iconPackResult, iconOverrides, account)}
            title={name}
            subtitle={details}
            key={index}
            accessories={[
              {
                icon: requiresTouch ? Icon.Fingerprint : Icon.LockUnlocked,
                tooltip: requiresTouch ? "Touch Required" : "No Touch Required",
              },
            ]}
            actions={
              <ActionPanel>
                <PrimaryAction accountKey={key} requiresTouch={requiresTouch} />
                <SecondaryAction accountKey={key} requiresTouch={requiresTouch} />
                <Action.Push
                  title="Reveal Code"
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  target={
                    <AccountDetail accountKey={key} actionType={ActionType.Reveal} requiresTouch={requiresTouch} />
                  }
                />
                <IconSubmenu accountKey={key} iconPack={iconPack} onOverride={() => setOverrides(overrides + 1)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function PrimaryAction(props: { accountKey: string; requiresTouch: boolean }): React.JSX.Element {
  const { accountKey, requiresTouch } = props;
  const title = isCopyPrimary ? "Copy Code" : "Paste Code";
  const icon = isCopyPrimary ? Icon.CopyClipboard : Icon.Document;

  return requiresTouch ? (
    <Action.Push
      title={title}
      icon={icon}
      target={<AccountDetail accountKey={accountKey} actionType={primaryActionType} requiresTouch={requiresTouch} />}
    />
  ) : (
    <Action title={title} icon={icon} onAction={() => executeCodeCommand(accountKey, primaryActionType)} />
  );
}

function SecondaryAction(props: { accountKey: string; requiresTouch: boolean }): React.JSX.Element {
  const { accountKey, requiresTouch } = props;
  const title = isCopyPrimary ? "Paste Code" : "Copy Code";
  const icon = isCopyPrimary ? Icon.Document : Icon.CopyClipboard;

  return requiresTouch ? (
    <Action.Push
      title={title}
      icon={icon}
      target={<AccountDetail accountKey={accountKey} actionType={secondaryActionType} requiresTouch={requiresTouch} />}
    />
  ) : (
    <Action title={title} icon={icon} onAction={() => executeCodeCommand(accountKey, secondaryActionType)} />
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

  showToast({
    style: Toast.Style.Failure,
    title: contextMessage,
    message: errorMessage,
  });
}
