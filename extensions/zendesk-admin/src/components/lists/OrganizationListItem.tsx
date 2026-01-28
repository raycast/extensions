import { List } from "@raycast/api";
import { ZendeskOrganization } from "../../api/zendesk";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";
import { ZendeskInstance } from "../../utils/preferences";

interface OrganizationListItemProps {
  organization: ZendeskOrganization;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function OrganizationListItem({
  organization,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: OrganizationListItemProps) {
  const hasDetailsOrNotes = organization.details || organization.notes;
  const hasTimestamps = organization.created_at || organization.updated_at;
  const hasAdditionalFields =
    organization.external_id ||
    organization.group_id ||
    (organization.organization_fields && Object.keys(organization.organization_fields).length > 0) ||
    (organization.tags && organization.tags.length > 0);

  // Build metadata sections with smart separators
  const metadataElements = [];

  // Basic info section
  metadataElements.push(
    <List.Item.Detail.Metadata.Label key="name" title="Name" text={organization.name} />,
    <List.Item.Detail.Metadata.Label key="id" title="ID" text={organization.id.toString()} />,
  );

  // Domains section
  if (organization.domain_names && organization.domain_names.length > 0) {
    metadataElements.push(
      <List.Item.Detail.Metadata.TagList key="domains" title="Domains">
        {organization.domain_names.map((domain) => (
          <List.Item.Detail.Metadata.TagList.Item key={domain} text={domain} />
        ))}
      </List.Item.Detail.Metadata.TagList>,
    );
  }

  // Details and Notes section
  if (hasDetailsOrNotes) {
    if (organization.details) {
      metadataElements.push(
        <List.Item.Detail.Metadata.Label key="details" title="Details" text={organization.details} />,
      );
    }
    if (organization.notes) {
      metadataElements.push(<List.Item.Detail.Metadata.Label key="notes" title="Notes" text={organization.notes} />);
    }
  }

  // Additional fields section
  if (hasAdditionalFields) {
    if (organization.external_id) {
      metadataElements.push(
        <List.Item.Detail.Metadata.Label key="external_id" title="External ID" text={organization.external_id} />,
      );
    }
    if (organization.group_id) {
      metadataElements.push(
        <List.Item.Detail.Metadata.Label key="group_id" title="Group ID" text={organization.group_id.toString()} />,
      );
    }
    if (organization.organization_fields && Object.keys(organization.organization_fields).length > 0) {
      metadataElements.push(
        <List.Item.Detail.Metadata.TagList key="org_fields" title="Organization Fields">
          {Object.entries(organization.organization_fields).map(([key, value]) => (
            <List.Item.Detail.Metadata.TagList.Item key={key} text={`${key}: ${value}`} />
          ))}
        </List.Item.Detail.Metadata.TagList>,
      );
    }
    if (organization.tags && organization.tags.length > 0) {
      metadataElements.push(
        <List.Item.Detail.Metadata.TagList key="tags" title="Tags">
          {organization.tags.map((tag) => (
            <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </List.Item.Detail.Metadata.TagList>,
      );
    }
  }

  // Timestamps section
  if (hasTimestamps && organization.created_at && organization.updated_at) {
    metadataElements.push(
      <TimestampMetadata key="timestamps" created_at={organization.created_at} updated_at={organization.updated_at} />,
    );
  }

  // Add separators between sections
  const finalElements: React.ReactNode[] = [];
  metadataElements.forEach((element, index) => {
    if (index > 0) {
      finalElements.push(<List.Item.Detail.Metadata.Separator key={`separator-${index}`} />);
    }
    finalElements.push(element);
  });

  return (
    <List.Item
      key={organization.id}
      title={organization.name || "Unknown Organization"}
      icon={undefined}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <>{finalElements}</>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ZendeskActions
          item={organization}
          searchType="organizations"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
