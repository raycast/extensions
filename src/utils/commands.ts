/**
 * Command generation utilities for WinGet and Homebrew package managers
 * Provides consistent install command formatting across ecosystems
 */
import type { Ecosystem } from "../types";

export function wingetInstall(id: string) {
  // WinGet install command works across cmd, PowerShell, and bash
  return `winget install ${id}`;
}

export function brewInstall(id: string) {
  return `brew install ${id}`;
}

export function brewCaskInstall(id: string) {
  return `brew install --cask ${id}`;
}

export function buildPrimaryCommand(ecosystem: Ecosystem, id: string) {
  return ecosystem === "winget" ? wingetInstall(id) : brewInstall(id);
}

export function buildAltCommands(ecosystem: Ecosystem, id: string) {
  if (ecosystem === "winget") {
    return [{ title: "Copy WinGet Install (CMD/PowerShell)", cmd: wingetInstall(id) }];
  }
  return [
    { title: "Copy Brew Install", cmd: brewInstall(id) },
    { title: "Copy Brew Cask Install", cmd: brewCaskInstall(id) },
  ];
}
