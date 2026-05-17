import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useMemo, useState, useCallback } from "react";

import {
  EcosystemId,
  OutdatedPackage,
  listInstalledPackages,
  isEcosystemAvailable,
} from "./ecosystems";

type EcosystemEntry = {
  id: EcosystemId;
  name: string;
  available: boolean;
  packages: OutdatedPackage[];
  error?: string;
};

const ECOSYSTEM_NAMES: Record<EcosystemId, string> = {
  brew: "Homebrew",
  npm: "npm (global)",
  yarn: "yarn (global)",
  pnpm: "pnpm (global)",
  pip: "pip (Python)",
  pipx: "pipx (Python apps)",
  cargo: "cargo (Rust)",
  gem: "gem (Ruby)",
  mas: "Mac App Store",
  go: "go (Go tools)",
};

async function loadInstalledPackages(
  ecosystemIds: EcosystemId[],
): Promise<EcosystemEntry[]> {
  return Promise.all(
    ecosystemIds.map(async (id) => {
      try {
        const available = await isEcosystemAvailable(id);
        if (!available) {
          return {
            id,
            name: ECOSYSTEM_NAMES[id],
            available: false,
            packages: [],
          };
        }

        const packages = await listInstalledPackages(id);
        return { id, name: ECOSYSTEM_NAMES[id], available: true, packages };
      } catch (err: any) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          id,
          name: ECOSYSTEM_NAMES[id],
          available: false,
          packages: [],
          error: message,
        };
      }
    }),
  );
}

function EcosystemDetailView(
  props: Readonly<{
    ecosystem: EcosystemEntry;
    onRefresh: () => void;
  }>,
) {
  const { ecosystem, onRefresh } = props;

  if (!ecosystem.available) {
    return (
      <Detail
        markdown={`## ${ecosystem.name}\n\n⚠️ Not installed or not available on this system.`}
        actions={
          <ActionPanel>
            <Action
              title="Back"
              icon={Icon.ArrowLeft}
              onAction={() => {
                // navigation handled by Raycast
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (ecosystem.packages.length === 0) {
    return (
      <Detail
        markdown={`## ${ecosystem.name}\n\nNo installed packages found.`}
      />
    );
  }

  const header = "| Package | Version | Website |\n|---|---|---|";
  const rows = ecosystem.packages.map((pkg) => {
    const nameLink = pkg.website
      ? `[${pkg.name}](${pkg.website})`
      : `\`${pkg.name}\``;
    const website = pkg.website ? "📦" : "-";
    return `| ${nameLink} | \`${pkg.current}\` | ${website} |`;
  });

  const markdown = `## Installed packages — ${ecosystem.name}

**Total:** ${ecosystem.packages.length} package(s)

${header}
${rows.join("\n")}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const prefs = getPreferenceValues() as Record<string, any>;
  const enabledEcosystems = useMemo(
    () =>
      (
        [
          "brew",
          "npm",
          "yarn",
          "pnpm",
          "pip",
          "pipx",
          "cargo",
          "gem",
          "mas",
          "go",
        ] as EcosystemId[]
      ).filter(
        (id) => prefs[`enable${id.charAt(0).toUpperCase() + id.slice(1)}`],
      ),
    [],
  );

  const [ecosystems, setEcosystems] = useState<EcosystemEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<EcosystemId | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const results = await loadInstalledPackages(enabledEcosystems);
    setEcosystems(results);
    setIsLoading(false);
  }, [enabledEcosystems]);

  useEffect(() => {
    void refresh();
  }, []);

  const totalInstalled = ecosystems.reduce(
    (sum, e) => sum + e.packages.length,
    0,
  );
  const availableCount = ecosystems.filter((e) => e.available).length;
  const unavailableCount = ecosystems.filter((e) => !e.available).length;

  if (selectedId) {
    const selected = ecosystems.find((e) => e.id === selectedId);
    if (selected) {
      return (
        <EcosystemDetailView
          ecosystem={selected}
          onRefresh={() => void refresh()}
        />
      );
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Installed Packages"
      searchBarPlaceholder="Filter ecosystems…"
    >
      <List.Section
        title="Summary"
        subtitle={`${availableCount} available, ${unavailableCount} not found`}
      >
        <List.Item
          title="Total Installed Packages"
          subtitle={`${totalInstalled} package(s) across ${availableCount} manager(s)`}
          icon={Icon.Box}
          accessories={[
            {
              tag: {
                value: `${availableCount}/${enabledEcosystems.length}`,
                color: Color.Blue,
              },
            },
          ]}
        />
      </List.Section>

      <List.Section title="Package Managers">
        {ecosystems.map((ecosystem) => {
          const icon = ecosystem.available
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.Warning, tintColor: Color.Red };

          return (
            <List.Item
              key={ecosystem.id}
              title={ecosystem.name}
              subtitle={
                ecosystem.available
                  ? `${ecosystem.packages.length} package(s)`
                  : "Not installed"
              }
              icon={icon}
              accessories={[
                {
                  tag: {
                    value: ecosystem.available
                      ? `${ecosystem.packages.length}`
                      : "N/A",
                    color: ecosystem.available ? Color.Green : Color.Red,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  {ecosystem.available && ecosystem.packages.length > 0 && (
                    <Action
                      title="View Details"
                      icon={Icon.Eye}
                      onAction={() => setSelectedId(ecosystem.id)}
                    />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void refresh()}
                  />
                  <Action
                    title="Open Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
