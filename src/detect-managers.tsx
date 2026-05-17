import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";

import { EcosystemId, isEcosystemAvailable } from "./ecosystems";

type ManagerInfo = {
  id: EcosystemId;
  name: string;
  website: string;
  installed?: boolean;
  installCommand: string;
  description: string;
};

const MANAGERS: ManagerInfo[] = [
  {
    id: "brew",
    name: "Homebrew",
    website: "https://brew.sh",
    description: "The missing package manager for macOS",
    installCommand:
      '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
  },
  {
    id: "npm",
    name: "npm",
    website: "https://npmjs.com",
    description: "JavaScript package manager",
    installCommand: "brew install node",
  },
  {
    id: "yarn",
    name: "yarn",
    website: "https://yarnpkg.com",
    description: "Fast, reliable, and secure JavaScript package manager",
    installCommand: "brew install yarn",
  },
  {
    id: "pnpm",
    name: "pnpm",
    website: "https://pnpm.io",
    description: "Fast, disk space efficient package manager",
    installCommand: "npm install -g pnpm",
  },
  {
    id: "pip",
    name: "pip",
    website: "https://pip.pypa.io",
    description: "Python package installer",
    installCommand: "brew install python3",
  },
  {
    id: "pipx",
    name: "pipx",
    website: "https://pipx.pypa.io",
    description: "Install and run Python applications in isolated environments",
    installCommand: "brew install pipx",
  },
  {
    id: "cargo",
    name: "cargo",
    website: "https://doc.rust-lang.org/cargo",
    description: "Rust package manager",
    installCommand: "brew install rust",
  },
  {
    id: "gem",
    name: "gem",
    website: "https://rubygems.org",
    description: "Ruby package manager",
    installCommand: "brew install ruby",
  },
  {
    id: "mas",
    name: "mas",
    website: "https://github.com/mas-cli/mas",
    description: "Mac App Store command line interface",
    installCommand: "brew install mas",
  },
  {
    id: "go",
    name: "go",
    website: "https://golang.org",
    description: "Go programming language and tools",
    installCommand: "brew install go",
  },
];

async function detectManagers(): Promise<ManagerInfo[]> {
  return Promise.all(
    MANAGERS.map(async (m) => ({
      ...m,
      installed: await isEcosystemAvailable(m.id),
    })),
  );
}

function ManagerDetailView(props: { manager: ManagerInfo }) {
  const { manager } = props;

  const markdown = `# ${manager.name}

${manager.description}

## Website
[Open Website](${manager.website})

## Installation

To install ${manager.name}, run the following command in your terminal:

\`\`\`bash
${manager.installCommand}
\`\`\`

${
  manager.id === "brew"
    ? "\n⚠️ **Homebrew is essential** — most other tools can be installed via Homebrew. Install it first if you haven't already."
    : `\n💡 **Tip:** If you don't have Homebrew installed yet, Homebrew is the easiest way to install most tools on macOS.`
}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={manager.installCommand}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.OpenInBrowser title="Open Website" url={manager.website} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [managers, setManagers] = useState<ManagerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<EcosystemId | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const detected = await detectManagers();
    setManagers(detected);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, []);

  const installed = managers.filter((m) => m.installed);
  const notInstalled = managers.filter((m) => !m.installed);

  if (selectedId) {
    const selected = managers.find((m) => m.id === selectedId);
    if (selected) {
      return <ManagerDetailView manager={selected} />;
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Detected Managers"
      searchBarPlaceholder="Search managers…"
    >
      <List.Section
        title={`Installed (${installed.length}/${managers.length})`}
        subtitle="Ready to use"
      >
        {installed.length === 0 ? (
          <List.Item
            title="No managers detected"
            subtitle="Install one or more to get started"
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          />
        ) : (
          installed.map((m) => (
            <List.Item
              key={m.id}
              title={m.name}
              subtitle={m.description}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[
                { tag: { value: "Installed", color: Color.Green } },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() => setSelectedId(m.id)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void refresh()}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>

      {notInstalled.length > 0 && (
        <List.Section
          title={`Not Installed (${notInstalled.length})`}
          subtitle="Click to view installation instructions"
        >
          {notInstalled.map((m) => (
            <List.Item
              key={m.id}
              title={m.name}
              subtitle={m.description}
              icon={{ source: Icon.Download, tintColor: Color.Red }}
              accessories={[
                { tag: { value: "Not installed", color: Color.Red } },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Installation Instructions"
                    icon={Icon.Download}
                    onAction={() => setSelectedId(m.id)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Install Command"
                    content={m.installCommand}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser title="Open Website" url={m.website} />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void refresh()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Info">
        <List.Item
          title="Universal Updater"
          subtitle="Manage all your package managers from one place"
          icon={Icon.Info}
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
