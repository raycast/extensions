import { List, ActionPanel, Action, Icon, Keyboard, Color } from "@raycast/api";
import { ZendeskAutomation, ZendeskInstance } from "../../api/zendesk";
import { getZendeskInstances } from "../../utils/preferences";
import { getBooleanIcon } from "../../utils/colors";
import { InstanceMetadata, TimestampMetadata } from "../common/MetadataHelpers";

interface AutomationListItemProps {
  automation: ZendeskAutomation;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function AutomationListItem({
  automation,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: AutomationListItemProps) {
  const allInstances = getZendeskInstances();

  const accessories: List.Item.Accessory[] = [
    ...(!automation.active ? [{ icon: Icon.CircleDisabled, tooltip: "Inactive" }] : []),
  ];

  return (
    <List.Item
      key={automation.id}
      title={automation.title || "Untitled Automation"}
      accessories={accessories}
      detail={
        showDetails ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {instance && <InstanceMetadata instance={instance} />}

                <List.Item.Detail.Metadata.Label title="Automation ID" text={automation.id?.toString() || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Title" text={automation.title || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Position" text={automation.position?.toString() || "N/A"} />

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.Label title="Active" icon={getBooleanIcon(automation.active)} />

                <List.Item.Detail.Metadata.Separator />

                <TimestampMetadata created_at={automation.created_at} updated_at={automation.updated_at} />
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open in Zendesk"
              url={`https://${instance?.subdomain}.zendesk.com/admin/objects-rules/rules/automations/${automation.id}`}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.CopyToClipboard
              title="Copy Automation Link"
              content={`https://${instance?.subdomain}.zendesk.com/admin/objects-rules/rules/automations/${automation.id}`}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="General">
            <Action.OpenInBrowser
              title="Open General Configuration"
              url={`https://${instance?.subdomain}.zendesk.com/admin/objects-rules/rules/automations`}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "n" },
                windows: { modifiers: ["ctrl", "shift"], key: "n" },
              }}
            />
            <Action
              title={showDetails ? "Hide Details" : "Show Details"}
              icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
              onAction={() => onShowDetailsChange(!showDetails)}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "d" },
                windows: { modifiers: ["ctrl"], key: "d" },
              }}
            />
            <ActionPanel.Submenu title="Change Instance" icon={Icon.House}>
              {allInstances.map((inst, index) => {
                const keyMap: { [key: number]: Keyboard.KeyEquivalent } = {
                  0: "0",
                  1: "1",
                  2: "2",
                  3: "3",
                  4: "4",
                  5: "5",
                  6: "6",
                  7: "7",
                  8: "8",
                  9: "9",
                };
                const key = index < 9 ? keyMap[index + 1] : keyMap[0];

                return (
                  <Action
                    key={inst.subdomain}
                    title={`${inst.subdomain}`}
                    icon={
                      instance?.subdomain === inst.subdomain ? { source: Icon.Dot, tintColor: Color.Green } : undefined
                    }
                    onAction={() => onInstanceChange(inst)}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key },
                      windows: { modifiers: ["ctrl"], key },
                    }}
                  />
                );
              })}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
