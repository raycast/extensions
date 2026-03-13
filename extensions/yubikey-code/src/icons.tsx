import React, { useEffect, useState } from "react";
import fs from "node:fs";
import { cache, handleError, isCopyPrimary, preferences } from "./index";
import { Action, ActionPanel, Color, Icon, Image, LocalStorage } from "@raycast/api";
import { Account } from "./accounts";
import Values = LocalStorage.Values;

export interface IconPack {
  icons: IconInfo[];
}

interface IconInfo {
  filename: string;
  issuer: string[];
}

type IconOverrides = Map<string, string>;

const overrideKey = "iconOverride-";

export function IconSubmenu(props: {
  accountKey: string;
  iconPack: IconPack | undefined;
  onOverride: () => void;
}): React.JSX.Element | null {
  const { accountKey, iconPack, onOverride } = props;
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (!iconPack) {
    return null;
  }

  return (
    <ActionPanel.Submenu
      title="Select Icon"
      icon={Icon.Image}
      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      onOpen={() => setIsOpen(true)}
    >
      <Action
        icon={{ source: Icon.Xmark, tintColor: Color.Red }}
        title="Reset Icon"
        onAction={() => {
          LocalStorage.removeItem(getOverrideKey(accountKey));
          setIsOpen(false);
          onOverride();
        }}
      />
      {
        // only load icons when the submenu is open to avoid slowdown
        isOpen
          ? iconPack.icons.map((icon) => (
              <Action
                icon={{ source: getIconPath(icon.filename) }}
                title={icon.issuer[0]}
                onAction={() => {
                  LocalStorage.setItem(getOverrideKey(accountKey), icon.filename);
                  setIsOpen(false);
                  onOverride();
                }}
                key={icon.filename}
              />
            ))
          : null
      }
    </ActionPanel.Submenu>
  );
}

export function getIconPack(): {
  iconPack: IconPack | undefined;
  iconPackIsLoading: boolean;
  iconPackError: string | undefined;
} {
  const [iconPackError, setError] = useState<string>();
  const [iconPackIsLoading, setIsLoading] = useState<boolean>(true);
  const [iconPack, setIconPack] = useState<IconPack>();

  useEffect(() => {
    if (!preferences.iconPackPath || preferences.iconPackPath.length < 1) {
      cache.remove("iconPack"); // clear cache if no iconPackPath is provided
      return;
    }

    fs.readFile(preferences.iconPackPath + "/pack.json", "utf8", (readError, jsonString) => {
      if (readError) {
        handleError(readError, "Failed to load icon pack", setError, setIsLoading);
        return;
      }
      try {
        const iconPackResult: IconPack = JSON.parse(jsonString);

        cache.set("iconPack", jsonString);

        setIconPack(iconPackResult);
        setIsLoading(false);
      } catch (parseError) {
        handleError(Error(String(parseError)), "Failed to load icon pack", setError, setIsLoading);
      }
    });
  }, []);

  return { iconPack, iconPackIsLoading, iconPackError };
}

export function getIconOverrides(overrides: number): IconOverrides | undefined {
  const [iconOverrides, setIconOverrides] = useState<IconOverrides>();

  async function fetchIconOverrides() {
    const allItems = await LocalStorage.allItems<Values>();

    const iconMap = new Map<string, string>();
    for (const [key, value] of Object.entries(allItems)) {
      if (key.startsWith(overrideKey)) {
        iconMap.set(key, value);
      }
    }

    setIconOverrides(iconMap);
  }

  useEffect(() => {
    fetchIconOverrides();
  }, [overrides]);

  return iconOverrides;
}

export function getAccountIcon(
  iconPack: IconPack | undefined,
  iconOverrides: IconOverrides | undefined,
  account: Account
): Image.ImageLike {
  if (!iconPack) {
    // continue returning these icons for users that don't select an icon pack to keep the experience consistent
    return isCopyPrimary ? Icon.CopyClipboard : Icon.Document;
  }

  const overrideFilename = iconOverrides && iconOverrides.get(getOverrideKey(account.key));
  if (overrideFilename) {
    return {
      source: getIconPath(overrideFilename),
      fallback: Icon.Person,
    };
  }

  const icon = iconPack.icons.find((icon) => {
    return icon.issuer.some((issuer) => issuer.toLowerCase() === account.name.toLowerCase());
  });

  if (icon) {
    return {
      source: getIconPath(icon.filename),
      fallback: Icon.Person,
    };
  } else {
    return Icon.Person;
  }
}

export function getIconPath(filename: string) {
  return preferences.iconPackPath + "/" + filename;
}

export function getOverrideKey(accountKey: string): string {
  return overrideKey + accountKey;
}
