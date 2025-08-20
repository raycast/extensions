/**
 * Individual search result component that handles package display and actions
 * Normalizes different API response formats and provides install command actions
 */
import { Action, ActionPanel, Icon, Image, List, Toast, showToast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import type { ExtendedSearchResult } from "../types";

type HBType = "cask" | "formula";

export default function ResultItem({ item }: { item: ExtendedSearchResult }) {
  // Normalize package data from different API response formats (supports both direct and nested structures)
  const name: string = item?.content?.name ?? item?.name ?? "";
  const ecosystem: "homebrew" | "winget" = item?.content?.ecosystem ?? item?.ecosystem ?? "homebrew";
  const publisher: string | undefined = item?.content?.publisher ?? item?.publisher ?? undefined;
  const version: string = item?.metadata?.version ?? item?.version ?? "";
  const slug: string = item?.metadata?.slug ?? item?.slug ?? "";
  const homepage: string | undefined = item?.metadata?.homepage ?? item?.homepage ?? undefined;
  const hbType: HBType | undefined = item?.metadata?.hb_type ?? item?.hb_type ?? undefined;

  // Extract and clean package ID from various formats (handles prefixed IDs from search service)
  const pkgId: string = item?.metadata?.id ?? item?.package_id ?? "";
  const cleanId = pkgId || String(item?.id || "").replace(/^sw:(winget|homebrew):/, "");

  // Guard: title is required
  const title = name || cleanId || slug || "Unknown";
  const subtitle = cleanId || slug || "";

  // Generate appropriate install commands based on ecosystem and package type
  const primary =
    ecosystem === "winget"
      ? `winget install ${cleanId}`
      : hbType === "cask"
        ? `brew install --cask ${cleanId}`
        : `brew install ${cleanId}`;

  const alts =
    ecosystem === "winget"
      ? [{ title: "Copy WinGet Install (CMD/PowerShell)", cmd: `winget install ${cleanId}` }]
      : [
          { title: "Copy Brew Install", cmd: `brew install ${cleanId}` },
          { title: "Copy Brew Cask Install", cmd: `brew install --cask ${cleanId}` },
        ];

  // Accessories
  const accessories: List.Item.Accessory[] = [];
  if (version) accessories.push({ text: version, tooltip: "Version" });
  accessories.push({
    tag: {
      value: ecosystem === "winget" ? "WinGet" : "Homebrew",
      color: ecosystem === "winget" ? "#0078D4" : "#00B16A",
    },
  });
  if (publisher) accessories.push({ text: publisher, tooltip: "Publisher" });

  // Icon selection: prefer package homepage favicon, fallback to ecosystem-specific sources
  let icon: Image.ImageLike;
  if (homepage && /^https?:\/\//i.test(homepage)) {
    icon = getFavicon(homepage, { size: 64 });
  } else if (ecosystem === "winget") {
    icon = getFavicon(`https://winget.run/pkg/${encodeURIComponent(cleanId)}`, { size: 64 });
  } else {
    icon = getFavicon("https://formulae.brew.sh", { size: 128 });
  }

  return (
    <List.Item
      id={`${ecosystem}:${cleanId}`}
      title={title}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy Install Command">
            <Action.CopyToClipboard
              title="Copy Primary Install Command"
              content={primary}
              onCopy={() => showToast({ style: Toast.Style.Success, title: "Command copied" })}
              icon={Icon.Terminal}
            />
            {alts.map((a) => (
              <Action.CopyToClipboard
                key={a.title}
                title={a.title}
                content={a.cmd}
                onCopy={() => showToast({ style: Toast.Style.Success, title: "Command copied" })}
                icon={Icon.Clipboard}
              />
            ))}
          </ActionPanel.Section>

          <ActionPanel.Section title="Details">
            {cleanId && <Action.CopyToClipboard title="Copy Package ID" content={cleanId} />}
            {slug && <Action.CopyToClipboard title="Copy Slug" content={slug} />}
            {publisher && <Action.CopyToClipboard title="Copy Publisher" content={publisher} />}
            {version && <Action.CopyToClipboard title="Copy Version" content={version} />}
            {homepage && /^https?:\/\//i.test(homepage) && (
              <Action.OpenInBrowser title="Open Homepage" url={homepage} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
