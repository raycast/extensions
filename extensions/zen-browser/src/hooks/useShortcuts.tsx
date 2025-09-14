import { Shortcut, ShortcutModel } from "../interfaces";
import { getShorcutsJsonPath } from "../util";
import fs, { existsSync } from "fs";
import { NotInstalledError } from "../components";
import { ReactNode } from "react";

const zenToAppleScriptKeyMod = {
  control: "control",
  alt: "option",
  shift: "shift",
  meta: "command",
  accel: "command",
};

type ZenModifierKey = keyof typeof zenToAppleScriptKeyMod;

export function useShortcuts(): { shortcuts: Shortcut[]; errorView: ReactNode } {
  const shortcutsPath = getShorcutsJsonPath();

  if (!existsSync(shortcutsPath)) {
    return { shortcuts: [], errorView: <NotInstalledError /> };
  }
  const file = fs.readFileSync(shortcutsPath, "utf8");
  const { shortcuts: shortcutModels } = JSON.parse(file) as { shortcuts: ShortcutModel[] };

  const shortcuts = shortcutModels
    .map((s) => {
      if (s.key) {
        const modifiers = [];
        for (const [key, value] of Object.entries(s.modifiers)) {
          if (value) {
            modifiers.push(zenToAppleScriptKeyMod[key as ZenModifierKey]);
          }
        }

        return {
          id: s.id,
          key: s.key,
          modifiers,
        };
      }
    })
    .filter(Boolean) as Shortcut[];

  return { shortcuts, errorView: undefined };
}
