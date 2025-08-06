import { List, ActionPanel, Action, Icon, Keyboard, Color } from "@raycast/api";
import { ZendeskBrand, ZendeskInstance } from "../../api/zendesk";
import { getZendeskInstances } from "../../utils/preferences";
import { getActiveStatusColor, getDefaultStatusColor, getHelpCenterStateColor } from "../../utils/colors";
import { InstanceMetadata, TimestampMetadata } from "../common/MetadataHelpers";
import EntityTicketsList from "./EntityTicketsList";

interface BrandListItemProps {
  brand: ZendeskBrand;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function BrandListItem({
  brand,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: BrandListItemProps) {
  const allInstances = getZendeskInstances();

  const accessories: List.Item.Accessory[] = [
    ...(brand.default ? [{ icon: Icon.CheckCircle, tooltip: "Default Brand" }] : []),
    ...(!showDetails ? [{ text: brand.subdomain || "No subdomain" }] : []),
  ];

  return (
    <List.Item
      key={brand.id}
      title={brand.name || "Unknown Brand"}
      icon={brand.logo ? { source: brand.logo.content_url } : Icon.Tag}
      accessories={accessories}
      detail={
        showDetails ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {instance && <InstanceMetadata instance={instance} />}

                <List.Item.Detail.Metadata.Label title="Brand ID" text={brand.id?.toString() || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Name" text={brand.name || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Subdomain" text={brand.subdomain || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Host Mapping" text={brand.host_mapping || "N/A"} />
                {brand.brand_url && (
                  <List.Item.Detail.Metadata.Link title="Brand URL" text={brand.brand_url} target={brand.brand_url} />
                )}

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.TagList title="Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={brand.active ? "Active" : "Inactive"}
                    color={getActiveStatusColor(brand.active)}
                  />
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.TagList title="Default">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={brand.default ? "Default" : "Not Default"}
                    color={getDefaultStatusColor(brand.default)}
                  />
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.TagList title="Help Center">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={brand.has_help_center ? "Enabled" : "Disabled"}
                    color={getActiveStatusColor(brand.has_help_center)}
                  />
                </List.Item.Detail.Metadata.TagList>

                {brand.help_center_state && (
                  <List.Item.Detail.Metadata.TagList title="Help Center State">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={brand.help_center_state}
                      color={getHelpCenterStateColor(brand.help_center_state)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                )}

                <List.Item.Detail.Metadata.Separator />

                {brand.ticket_form_ids && brand.ticket_form_ids.length > 0 && (
                  <List.Item.Detail.Metadata.TagList title="Ticket Forms">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={`${brand.ticket_form_ids.length} form(s)`}
                      color={Color.Blue}
                    />
                  </List.Item.Detail.Metadata.TagList>
                )}

                <List.Item.Detail.Metadata.Separator />

                <TimestampMetadata created_at={brand.created_at} updated_at={brand.updated_at} />
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
              url={`https://${instance?.subdomain}.zendesk.com/admin/account/brand_management/brands/${brand.id}`}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            {brand.has_help_center && brand.brand_url && (
              <Action.OpenInBrowser
                title="Open Help Center"
                url={brand.brand_url}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "h" },
                  windows: { modifiers: ["ctrl"], key: "h" },
                }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Brand Link"
              content={`https://${instance?.subdomain}.zendesk.com/admin/account/brand_management/brands/${brand.id}`}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Brand Actions">
            <Action.Push
              title="View Brand Tickets"
              icon={Icon.Ticket}
              target={<EntityTicketsList entityType="brand" entityId={brand.id.toString()} instance={instance} />}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "t" },
                windows: { modifiers: ["ctrl"], key: "t" },
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="General">
            <Action.OpenInBrowser
              title="Open General Configuration"
              url={`https://${instance?.subdomain}.zendesk.com/admin/account/brand_management/brands`}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "b" },
                windows: { modifiers: ["ctrl", "shift"], key: "b" },
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
