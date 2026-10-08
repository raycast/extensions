import { List, Icon, Color } from "@raycast/api";
import { ZendeskSupportAddress } from "../../api/zendesk";
import { getVerificationStatusColor } from "../../utils/colors";
import { formatInstanceColor } from "../../utils/formatters";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";
import { ZendeskInstance } from "../../utils/preferences";

interface SupportAddressListItemProps {
  supportAddress: ZendeskSupportAddress;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
  brandName: string;
}

export function SupportAddressListItem({
  supportAddress,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
  brandName,
}: SupportAddressListItemProps) {
  // Check if any verification status is not verified
  const hasUnverifiedStatus =
    (supportAddress.cname_status && supportAddress.cname_status !== "verified") ||
    (supportAddress.domain_verification_status && supportAddress.domain_verification_status !== "verified") ||
    (supportAddress.spf_status && supportAddress.spf_status !== "verified") ||
    (supportAddress.forwarding_status && supportAddress.forwarding_status !== "verified");

  const accessories: List.Item.Accessory[] = [];

  // Add default star icon if it's the default address
  if (supportAddress.default) {
    accessories.push({ icon: Icon.Star });
  }

  // Add warning icon if there are unverified statuses
  if (hasUnverifiedStatus) {
    accessories.push({
      icon: {
        source: Icon.Warning,
        tintColor: Color.Yellow,
      },
      tooltip: "Unverified status detected",
    });
  }

  return (
    <List.Item
      key={supportAddress.id}
      title={supportAddress.email || "Unknown Email"}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              {instance && (
                <>
                  <List.Item.Detail.Metadata.TagList title="Instance">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={instance.subdomain}
                      color={formatInstanceColor(instance.color)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              {supportAddress.name && <List.Item.Detail.Metadata.Label title="Name" text={supportAddress.name} />}
              {supportAddress.email && (
                <List.Item.Detail.Metadata.Link
                  title="Email"
                  text={supportAddress.email}
                  target={`mailto:${supportAddress.email}`}
                />
              )}
              <List.Item.Detail.Metadata.Label title="ID" text={supportAddress.id.toString()} />
              {supportAddress.brand_id && <List.Item.Detail.Metadata.Label title="Brand" text={brandName} />}
              <List.Item.Detail.Metadata.Label
                title="Default"
                icon={
                  supportAddress.default
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.XMarkCircle }
                }
              />
              <List.Item.Detail.Metadata.Separator />
              {supportAddress.cname_status && (
                <List.Item.Detail.Metadata.TagList title="CNAME Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={supportAddress.cname_status}
                    color={getVerificationStatusColor(supportAddress.cname_status === "verified")}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              {supportAddress.dns_results && (
                <List.Item.Detail.Metadata.Label title="DNS Results" text={supportAddress.dns_results} />
              )}
              {supportAddress.domain_verification_code && (
                <List.Item.Detail.Metadata.Label
                  title="Domain Verification Code"
                  text={supportAddress.domain_verification_code}
                />
              )}
              {supportAddress.domain_verification_status && (
                <List.Item.Detail.Metadata.TagList title="Domain Verification Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={supportAddress.domain_verification_status}
                    color={getVerificationStatusColor(supportAddress.domain_verification_status === "verified")}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              {supportAddress.spf_status && (
                <List.Item.Detail.Metadata.TagList title="SPF Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={supportAddress.spf_status}
                    color={getVerificationStatusColor(supportAddress.spf_status === "verified")}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Separator />
              {supportAddress.forwarding_status && (
                <List.Item.Detail.Metadata.TagList title="Forwarding Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={supportAddress.forwarding_status}
                    color={getVerificationStatusColor(supportAddress.forwarding_status === "verified")}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Separator />
              {supportAddress.created_at && supportAddress.updated_at && (
                <TimestampMetadata created_at={supportAddress.created_at} updated_at={supportAddress.updated_at} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ZendeskActions
          item={supportAddress}
          searchType="support_addresses"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
