import {
  ActionPanel,
  Detail,
  List,
  Action,
  Clipboard,
  closeMainWindow,
  Icon,
  popToRoot,
  showToast,
  Toast,
  Cache,
  getPreferenceValues,
  showHUD,
} from "@raycast/api";
import { cpus } from "os";
import { join as path_join } from "path";
import { execFile, ExecFileException } from "child_process";
import { useState, useEffect } from "react";

interface Preference {
  ykmanPath: string;
  primaryAction: string;
}

export enum ActionType {
  Copy = "copy",
  Paste = "paste",
  Reveal = "reveal",
}

const preferences: Preference = getPreferenceValues();
const isCopyPrimary = preferences.primaryAction === ActionType.Copy;
const primaryActionType = isCopyPrimary ? ActionType.Copy : ActionType.Paste;
const secondaryActionType = isCopyPrimary ? ActionType.Paste : ActionType.Copy;
const regex = /(.*)((\d{6,8})|(\[Requires Touch\]))/;
const cache = new Cache();

export interface Account {
  name: string;
  details: string;
  key: string;
  requiresTouch: boolean;
}

export default function Command() {
  let results: Account[] = [];

  // get fresh list of available accounts
  const { isLoading, error, accounts } = getAccountList();

  if (cache.has("accounts") && (isLoading || error)) {
    // if we have cached items, use them while waiting for fresh ones
    results = JSON.parse(cache.get("accounts") || "[]");
  } else {
    // once the fresh accounts have successfully loaded, update the results
    results = accounts;
  }

  if (!isLoading && results.length === 0) {
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
      {results.map((account, index) => {
        const { name, details, requiresTouch, key } = account;

        return (
          <List.Item
            icon={isCopyPrimary ? Icon.CopyClipboard : Icon.Document}
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
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function PrimaryAction(props: { accountKey: string; requiresTouch: boolean }): JSX.Element {
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

function SecondaryAction(props: { accountKey: string; requiresTouch: boolean }): JSX.Element {
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

function AccountDetail(props: { accountKey: string; actionType: ActionType; requiresTouch: boolean }): JSX.Element {
  const { accountKey, actionType, requiresTouch } = props;
  const { isLoading, result } = processAccountCode(accountKey, actionType);
  const displayText = requiresTouch && isLoading ? "Touch your YubiKey..." : result;

  return <Detail isLoading={isLoading} markdown={displayText} />;
}

function processAccountCode(key: string, actionType: ActionType) {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    executeCodeCommand(key, actionType, setError, setIsLoading, setResult);
  }, []);

  return { error, isLoading, result };
}

function executeCodeCommand(
  key: string,
  actionType: ActionType,
  errorCallback: (error: string) => void = () => null,
  isLoadingCallback: (isLoading: boolean) => void = () => null,
  resultCallback: (result: string) => void = () => null
) {
  execFile(ykmanExecutable(), ["oath", "accounts", "code", key, "-s"], (error, stdout) => {
    if (error) {
      handleError(error, "Failed to get code", errorCallback, isLoadingCallback);
      return;
    }

    isLoadingCallback(false);

    switch (actionType) {
      case ActionType.Copy:
        Clipboard.copy(stdout);
        showHUD("Copied to clipboard");
        popToRoot({ clearSearchBar: true });
        break;
      case ActionType.Paste:
        Clipboard.paste(stdout);
        closeMainWindow();
        popToRoot({ clearSearchBar: true });
        break;
      case ActionType.Reveal:
        resultCallback(`# ${stdout}`);
        break;
    }
  });
}

function getAccountList(): {
  accounts: Account[];
  isLoading: boolean;
  error: string | undefined;
} {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    execFile(ykmanExecutable(), ["oath", "accounts", "code"], (error, stdout) => {
      if (error) {
        handleError(error, "Failed to list accounts", setError, setIsLoading);
        return;
      }

      const accountResults = stdout
        .split("\n")
        .filter((account) => account.trim().length > 0)
        .map((accountDetails) => {
          const matches = accountDetails.match(regex);

          if (matches == null) {
            return { name: "error parsing account" } as Account;
          }

          const [, accountMatch, code] = matches;
          const account = accountMatch.trim();
          const [name, ...details] = account.split(":");
          return {
            name,
            details: details.join(":"),
            key: account,
            requiresTouch: code === "[Requires Touch]",
          } as Account;
        });

      cache.set("accounts", JSON.stringify(accountResults));
      setAccounts(accountResults);
      setIsLoading(false);
    });
  }, []);

  return { accounts, isLoading, error };
}

function ykmanExecutable(): string {
  if (preferences.ykmanPath && preferences.ykmanPath.length > 0) {
    return preferences.ykmanPath;
  } else {
    const brewPrefix = cpus()[0].model.includes("Apple") ? "/opt/homebrew" : "/usr/local";
    return path_join(brewPrefix, "bin/ykman");
  }
}

function handleError(
  error: ExecFileException,
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
