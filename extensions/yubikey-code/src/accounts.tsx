import React, { useEffect, useState } from "react";
import { Clipboard, closeMainWindow, Detail, popToRoot, showHUD } from "@raycast/api";
import { ActionType, cache, handleError, preferences } from "./index";
import { execFile } from "child_process";
import { cpus } from "os";
import { join as path_join } from "path";

const regex = /(.*)((\d{6,8})|(\[Requires Touch]))/;

export interface Account {
  name: string;
  details: string;
  key: string;
  requiresTouch: boolean;
}

export function AccountDetail(props: {
  accountKey: string;
  actionType: ActionType;
  requiresTouch: boolean;
}): React.JSX.Element {
  const { accountKey, actionType, requiresTouch } = props;
  const { isLoading, result } = processAccountCode(accountKey, actionType);
  const displayText = requiresTouch && isLoading ? "Touch your YubiKey..." : result;

  return <Detail isLoading={isLoading} markdown={displayText} />;
}

export function getAccountList(): {
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

function processAccountCode(key: string, actionType: ActionType) {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    executeCodeCommand(key, actionType, setError, setIsLoading, setResult);
  }, []);

  return { error, isLoading, result };
}

export function executeCodeCommand(
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
        Clipboard.copy(stdout.trim());
        showHUD("Copied to clipboard");
        popToRoot({ clearSearchBar: true });
        break;
      case ActionType.Paste:
        Clipboard.paste(stdout.trim());
        closeMainWindow();
        popToRoot({ clearSearchBar: true });
        break;
      case ActionType.Reveal:
        resultCallback(`# ${stdout}`);
        break;
    }
  });
}

export function ykmanExecutable(): string {
  if (preferences.ykmanPath && preferences.ykmanPath.length > 0) {
    return preferences.ykmanPath;
  } else {
    const brewPrefix = cpus()[0].model.includes("Apple") ? "/opt/homebrew" : "/usr/local";
    return path_join(brewPrefix, "bin/ykman");
  }
}
