import React, { useEffect, useState } from "react";
import { Clipboard, closeMainWindow, Detail, popToRoot, showHUD } from "@raycast/api";
import { ActionType, cache, handleError, preferences } from "./index";
import { cpus } from "os";
import { join as path_join } from "path";
import { executeWithAuth, getSessionPassword } from "./auth";

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
  usageCallback: () => void;
  onRequiresAuth?: () => void;
}): React.JSX.Element {
  const { accountKey, actionType, requiresTouch, usageCallback, onRequiresAuth } = props;
  const { isLoading, result, requiresAuth } = processAccountCode(accountKey, actionType, usageCallback);

  useEffect(() => {
    if (requiresAuth && onRequiresAuth) {
      onRequiresAuth();
    }
  }, [requiresAuth, onRequiresAuth]);

  if (requiresAuth) {
    return <Detail isLoading={true} markdown="Authentication required..." />;
  }

  const displayText = requiresTouch && isLoading ? "Touch your YubiKey..." : result;

  return <Detail isLoading={isLoading} markdown={displayText} />;
}

export function getAccountList(refreshTrigger?: number): {
  accounts: Account[];
  isLoading: boolean;
  error: string | undefined;
  requiresAuth: boolean;
} {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [requiresAuth, setRequiresAuth] = useState<boolean>(false);

  useEffect(() => {
    async function fetchAccounts() {
      setIsLoading(true);
      setError(undefined);

      try {
        const sessionPassword = getSessionPassword();
        const result = await executeWithAuth(["oath", "accounts", "code"], sessionPassword || undefined);

        if (result.success && result.output) {
          const accountResults = result.output
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
          setRequiresAuth(false);
        } else if (result.requiresPassword) {
          setRequiresAuth(true);
          setIsLoading(false);
        } else {
          setError(result.error || "Failed to list accounts");
          setIsLoading(false);
        }
      } catch (err) {
        handleError(err as Error, "Failed to list accounts", setError, setIsLoading);
      }
    }

    fetchAccounts();
  }, [refreshTrigger]);

  return { accounts, isLoading, error, requiresAuth };
}

function processAccountCode(key: string, actionType: ActionType, usageCallback: () => void) {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [result, setResult] = useState<string>("");
  const [requiresAuth, setRequiresAuth] = useState<boolean>(false);

  useEffect(() => {
    const executeCode = async () => {
      await executeCodeCommand(
        key,
        actionType,
        (error) => setError(error),
        (loading) => setIsLoading(loading),
        (result) => setResult(result),
        usageCallback,
        () => setRequiresAuth(true)
      );
    };
    executeCode();
  }, [key, actionType, usageCallback]);

  return { error, isLoading, result, requiresAuth };
}

export async function executeCodeCommand(
  key: string,
  actionType: ActionType,
  errorCallback: (error: string) => void = () => null,
  isLoadingCallback: (isLoading: boolean) => void = () => null,
  resultCallback: (result: string) => void = () => null,
  usageCallback: () => void = () => {},
  requiresAuthCallback: () => void = () => null
) {
  try {
    const sessionPassword = getSessionPassword();
    const result = await executeWithAuth(["oath", "accounts", "code", key, "-s"], sessionPassword || undefined);

    if (result.success && result.output) {
      isLoadingCallback(false);
      usageCallback();

      switch (actionType) {
        case ActionType.Copy:
          Clipboard.copy(result.output.trim());
          showHUD("Copied to clipboard");
          popToRoot({ clearSearchBar: true });
          break;
        case ActionType.Paste:
          Clipboard.paste(result.output.trim());
          closeMainWindow();
          popToRoot({ clearSearchBar: true });
          break;
        case ActionType.Reveal:
          resultCallback(`# ${result.output}`);
          break;
      }
    } else if (result.requiresPassword) {
      requiresAuthCallback();
    } else {
      errorCallback(result.error || "Failed to get code");
    }
  } catch (error) {
    handleError(error as Error, "Failed to get code", errorCallback, isLoadingCallback);
  }
}

export function ykmanExecutable(): string {
  if (preferences.ykmanPath && preferences.ykmanPath.length > 0) {
    return preferences.ykmanPath;
  } else {
    const brewPrefix = cpus()[0].model.includes("Apple") ? "/opt/homebrew" : "/usr/local";
    return path_join(brewPrefix, "bin/ykman");
  }
}
