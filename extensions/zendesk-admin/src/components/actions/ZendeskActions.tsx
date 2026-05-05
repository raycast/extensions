import { ActionPanel, Action, Icon, Keyboard, Color } from "@raycast/api";
import { getZendeskInstances, ZendeskInstance } from "../../utils/preferences";
import { getZendeskUrls } from "../../utils/zendeskUrls";
import {
  createEntityOpenAndCopyActions,
  createCopyActionWithShortcut,
  createOpenActionWithShortcut,
} from "../../utils/actionBuilders";
import {
  ZendeskUser,
  ZendeskOrganization,
  ZendeskTrigger,
  ZendeskDynamicContent,
  ZendeskMacro,
  ZendeskTicketField,
  ZendeskSupportAddress,
  ZendeskTicketForm,
  ZendeskGroup,
  ZendeskTicket,
  ZendeskView,
  ZendeskGroupMembership,
  ZendeskBrand,
  ZendeskAutomation,
  ZendeskCustomRole,
} from "../../api/zendesk";
import EditUserForm from "../forms/EditUserForm";
import AddTicketFieldOptionForm from "../forms/AddTicketFieldOptionForm";
import TicketFieldOptionsList from "../lists/TicketFieldOptionsList";
import CreateUserForm from "../forms/CreateUserForm";
import EntityTicketsList from "../lists/EntityTicketsList";
import UserMembershipList from "../lists/UserMembershipList";
import UserGroupMembershipsList from "../lists/UserGroupMembershipsList";

interface ZendeskActionsProps {
  item:
    | ZendeskUser
    | ZendeskOrganization
    | ZendeskTrigger
    | ZendeskDynamicContent
    | ZendeskMacro
    | ZendeskTicketField
    | ZendeskSupportAddress
    | ZendeskTicketForm
    | ZendeskGroup
    | ZendeskTicket
    | ZendeskView
    | ZendeskGroupMembership
    | ZendeskBrand
    | ZendeskAutomation
    | ZendeskCustomRole;
  searchType:
    | "users"
    | "organizations"
    | "triggers"
    | "dynamic_content"
    | "macros"
    | "ticket_fields"
    | "support_addresses"
    | "ticket_forms"
    | "groups"
    | "tickets"
    | "views"
    | "group_memberships"
    | "brands"
    | "automations"
    | "custom_roles";
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails?: boolean;
  onShowDetailsChange?: (show: boolean) => void;
  children?: React.ReactNode;
}

export function ZendeskActions({
  item,
  searchType,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: ZendeskActionsProps) {
  const allInstances = getZendeskInstances();
  const urls = getZendeskUrls(instance);

  const renderViewTicketsAction = (
    entityType: "user" | "organization" | "group" | "recipient" | "form" | "brand" | "role",
    entityId?: string,
    entityEmail?: string,
    entityName?: string,
    customTitle?: string,
  ) => {
    const defaultTitle = `View ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}'s Tickets`;
    const title = customTitle || defaultTitle;

    return (
      <Action.Push
        title={title}
        icon={Icon.Ticket}
        target={
          <EntityTicketsList
            entityType={entityType}
            entityId={entityId}
            entityEmail={entityEmail}
            entityName={entityName}
            instance={instance}
          />
        }
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "t" },
          windows: { modifiers: ["ctrl"], key: "t" },
        }}
      />
    );
  };

  const renderOpenActions = () => {
    if (searchType === "users") {
      const user = item as ZendeskUser;
      const userUrl = urls.getUserProfile(user.id);
      return <>{createEntityOpenAndCopyActions(userUrl, "Open User Profile", "Copy User Profile Link")}</>;
    } else if (searchType === "organizations") {
      const organization = item as ZendeskOrganization;
      const orgUrl = urls.getOrganizationDetails(organization.id);
      return <>{createEntityOpenAndCopyActions(orgUrl, "Open Organization Details", "Copy Organization Link")}</>;
    } else if (searchType === "dynamic_content") {
      const dynamicContent = item as ZendeskDynamicContent;
      const defaultVariant = dynamicContent.variants?.find((v) => v.default === true);
      const dynamicContentUrl = urls.getDynamicContentItem(dynamicContent.id);
      return (
        <>
          {createEntityOpenAndCopyActions(
            dynamicContentUrl,
            "Open Dynamic Content Details",
            "Copy Dynamic Content Link",
          )}
          {defaultVariant &&
            createCopyActionWithShortcut(defaultVariant.content, "Copy Dynamic Text", {
              macOS: { modifiers: ["cmd"], key: "t" },
              windows: { modifiers: ["ctrl"], key: "t" },
            })}
          {createCopyActionWithShortcut(
            dynamicContent.placeholder,
            "Copy Placeholder",
            Keyboard.Shortcut.Common.CopyName,
          )}
        </>
      );
    } else if (searchType === "macros") {
      const macro = item as ZendeskMacro;
      const macroUrl = urls.getMacroDetails(macro.id);
      return <>{createEntityOpenAndCopyActions(macroUrl, "Open Macro Details", "Copy Macro Link")}</>;
    } else if (searchType === "triggers") {
      const trigger = item as ZendeskTrigger;
      const triggerUrl = urls.getTriggerDetails(trigger.id);
      return <>{createEntityOpenAndCopyActions(triggerUrl, "Open Trigger Details", "Copy Trigger Link")}</>;
    } else if (searchType === "ticket_fields") {
      const ticketField = item as ZendeskTicketField;
      const ticketFieldUrl = urls.getTicketFieldDetails(ticketField.id);
      return (
        <>{createEntityOpenAndCopyActions(ticketFieldUrl, "Open Ticket Field Details", "Copy Ticket Field Link")}</>
      );
    } else if (searchType === "support_addresses") {
      const supportAddress = item as ZendeskSupportAddress;
      return (
        <>
          {createCopyActionWithShortcut(
            supportAddress.email,
            "Copy Support Email Address",
            Keyboard.Shortcut.Common.CopyName,
          )}
        </>
      );
    } else if (searchType === "ticket_forms") {
      const ticketForm = item as ZendeskTicketForm;
      const ticketFormUrl = urls.getTicketFormDetails(ticketForm.id);
      const ticketFormConditionsUrl = urls.getTicketFormConditions(ticketForm.id);
      return (
        <>
          {createEntityOpenAndCopyActions(ticketFormUrl, "Open Ticket Form Details", "Copy Ticket Form Link")}
          {createOpenActionWithShortcut(
            ticketFormConditionsUrl,
            "Open Ticket Form Conditions",
            Keyboard.Shortcut.Common.Edit,
          )}
        </>
      );
    } else if (searchType === "groups") {
      const group = item as ZendeskGroup;
      const groupUrl = urls.getGroupDetails(group.id);
      return <>{createEntityOpenAndCopyActions(groupUrl, "Open Group Details", "Copy Group Link")}</>;
    } else if (searchType === "tickets") {
      const ticket = item as ZendeskTicket;
      const ticketUrl = urls.getTicketDetails(ticket.id);
      return <>{createEntityOpenAndCopyActions(ticketUrl, "Open Ticket", "Copy Ticket Link")}</>;
    } else if (searchType === "views") {
      const view = item as ZendeskView;
      const agentViewUrl = urls.getAgentView(view.id);
      const agentEditViewUrl = urls.getAdminViewEdit(view.id);
      return (
        <>
          {createEntityOpenAndCopyActions(agentViewUrl, "Open Agent View", "Copy Agent View Link")}
          {createOpenActionWithShortcut(agentEditViewUrl, "Open Edit View", Keyboard.Shortcut.Common.Edit)}
        </>
      );
    } else if (searchType === "brands") {
      const brand = item as ZendeskBrand;
      const brandUrl = urls.getBrandDetails(brand.id);
      return (
        <>
          {createEntityOpenAndCopyActions(brandUrl, "Open in Zendesk", "Copy Brand Link")}
          {brand.has_help_center &&
            brand.brand_url &&
            createOpenActionWithShortcut(brand.brand_url, "Open Help Center", {
              macOS: { modifiers: ["cmd"], key: "h" },
              windows: { modifiers: ["ctrl"], key: "h" },
            })}
        </>
      );
    } else if (searchType === "automations") {
      const automation = item as ZendeskAutomation;
      const automationUrl = urls.getAutomationDetails(automation.id);
      return <>{createEntityOpenAndCopyActions(automationUrl, "Open in Zendesk", "Copy Automation Link")}</>;
    } else if (searchType === "custom_roles") {
      const customRole = item as ZendeskCustomRole;
      const customRoleUrl = urls.getCustomRoleDetails(customRole.id);
      return <>{createEntityOpenAndCopyActions(customRoleUrl, "Open in Zendesk", "Copy Role Link")}</>;
    }
    return null;
  };

  const renderEntityActions = () => {
    if (searchType === "users") {
      const user = item as ZendeskUser;
      return (
        <>
          <Action.Push
            title="Edit User"
            icon={Icon.Pencil}
            target={<EditUserForm user={user} instance={instance} />}
            shortcut={Keyboard.Shortcut.Common.Edit}
          />
          <Action.Push
            title="Create User"
            icon={Icon.Plus}
            target={<CreateUserForm instance={instance} />}
            shortcut={Keyboard.Shortcut.Common.New}
          />
          {(user.role === "agent" || user.role === "admin") && (
            <Action.Push
              title="View User's Group Memberships"
              icon={Icon.Person}
              target={<UserGroupMembershipsList userId={user.id} userName={user.name} instance={instance} />}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "m" },
                windows: { modifiers: ["ctrl"], key: "m" },
              }}
            />
          )}
          {user.email && renderViewTicketsAction("user", undefined, user.email, user.name)}
        </>
      );
    } else if (searchType === "ticket_fields") {
      const ticketField = item as ZendeskTicketField;
      if (ticketField.type === "multiselect" || ticketField.type === "tagger") {
        return (
          <>
            <Action.Push
              title="Add New Option"
              icon={Icon.Plus}
              target={<AddTicketFieldOptionForm ticketField={ticketField} instance={instance} />}
              shortcut={Keyboard.Shortcut.Common.New}
            />
            <Action.Push
              title="View Options"
              icon={Icon.List}
              target={<TicketFieldOptionsList ticketField={ticketField} instance={instance} />}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "v" },
                windows: { modifiers: ["ctrl"], key: "v" },
              }}
            />
          </>
        );
      }
      return null;
    } else if (searchType === "organizations") {
      const organization = item as ZendeskOrganization;
      return <>{renderViewTicketsAction("organization", organization.id.toString(), undefined, organization.name)}</>;
    } else if (searchType === "support_addresses") {
      const supportAddress = item as ZendeskSupportAddress;
      return <>{renderViewTicketsAction("recipient", undefined, supportAddress.email, undefined)}</>;
    } else if (searchType === "ticket_forms") {
      const ticketForm = item as ZendeskTicketForm;
      return <>{renderViewTicketsAction("form", ticketForm.id.toString(), undefined, ticketForm.name)}</>;
    } else if (searchType === "groups") {
      const group = item as ZendeskGroup;
      return (
        <>
          <Action.Push
            title="View Group Memberships"
            icon={Icon.Person}
            target={
              <UserMembershipList entityType="group" entityId={group.id} entityName={group.name} instance={instance} />
            }
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "m" },
              windows: { modifiers: ["ctrl"], key: "m" },
            }}
          />
          {renderViewTicketsAction("group", group.id.toString(), undefined, group.name)}
        </>
      );
    } else if (searchType === "brands") {
      const brand = item as ZendeskBrand;
      return <>{renderViewTicketsAction("brand", brand.id.toString(), undefined, brand.name)}</>;
    } else if (searchType === "tickets") {
      const ticket = item as ZendeskTicket;
      // Only show action if there is a requester_id
      if (ticket.requester_id) {
        return (
          <>
            {renderViewTicketsAction(
              "user",
              ticket.requester_id.toString(),
              undefined,
              `Requester ${ticket.requester_id}`,
              "Open Requester Tickets",
            )}
          </>
        );
      }
      return null;
    } else if (searchType === "automations") {
      // Automations don't have specific entity actions like viewing tickets
      return null;
    } else if (searchType === "custom_roles") {
      const customRole = item as ZendeskCustomRole;
      return (
        <>
          <Action.Push
            title="View Role Members"
            icon={Icon.Person}
            target={
              <UserMembershipList
                entityType="role"
                entityId={customRole.id}
                entityName={customRole.name}
                instance={instance}
              />
            }
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "m" },
              windows: { modifiers: ["ctrl"], key: "m" },
            }}
          />
        </>
      );
    } else if (searchType === "group_memberships") {
      const membership = item as ZendeskGroupMembership;
      return (
        <>
          {createEntityOpenAndCopyActions(
            urls.getUserProfile(membership.user_id),
            "Open User Profile",
            "Copy User Profile Link",
          )}
          {createOpenActionWithShortcut(urls.getGroupDetails(membership.group_id), "Open Group Details", {
            macOS: { modifiers: ["cmd"], key: "g" },
            windows: { modifiers: ["ctrl"], key: "g" },
          })}
        </>
      );
    }
    return null;
  };

  const renderGeneralActions = () => {
    let generalConfigUrl = `https://${instance?.subdomain}.zendesk.com`;
    let configTitle = "Open General Config";

    const actions = [];

    if (searchType === "users") {
      generalConfigUrl = urls.getUserFilters();
      configTitle = "Open User List";
    } else if (searchType === "organizations") {
      generalConfigUrl = urls.getOrganizationsList();
      configTitle = "Open Organization List";
    } else if (searchType === "dynamic_content") {
      generalConfigUrl = urls.getDynamicContentList();
      configTitle = "Open Dynamic Content Config";
    } else if (searchType === "macros") {
      generalConfigUrl = urls.getMacrosList();
      configTitle = "Open Macros Config";
    } else if (searchType === "triggers") {
      generalConfigUrl = urls.getTriggersList();
      configTitle = "Open Triggers Config";
    } else if (searchType === "ticket_fields") {
      generalConfigUrl = urls.getTicketFieldsList();
      configTitle = "Open Ticket Fields Config";
    } else if (searchType === "support_addresses") {
      generalConfigUrl = urls.getSupportAddressesList();
      configTitle = "Open Support Addresses Config";
    } else if (searchType === "ticket_forms") {
      generalConfigUrl = urls.getTicketFormsList();
      configTitle = "Open Ticket Forms Config";
    } else if (searchType === "groups") {
      generalConfigUrl = urls.getGroupsList();
      configTitle = "Open Groups Config";
    } else if (searchType === "tickets") {
      generalConfigUrl = urls.getTicketsList();
      configTitle = "Open Ticket List";
    } else if (searchType === "views") {
      generalConfigUrl = urls.getViewsList();
      configTitle = "Open Views Config";
    } else if (searchType === "brands") {
      generalConfigUrl = urls.getBrandsList();
      configTitle = "Open Brands Config";
    } else if (searchType === "automations") {
      generalConfigUrl = urls.getAutomationsList();
      configTitle = "Open Automations Config";
    } else if (searchType === "custom_roles") {
      generalConfigUrl = urls.getCustomRolesList();
      configTitle = "Open Roles Config";
    }

    actions.push(
      <Action.OpenInBrowser
        key="general-config"
        title={configTitle}
        url={generalConfigUrl}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "g" },
          windows: { modifiers: ["ctrl"], key: "g" },
        }}
      />,
    );

    // Add show/hide details toggle if the props are provided
    if (showDetails !== undefined && onShowDetailsChange) {
      actions.push(
        <Action
          key="toggle-details"
          title={showDetails ? "Hide Details" : "Show Details"}
          icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
          onAction={() => onShowDetailsChange(!showDetails)}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "d" },
            windows: { modifiers: ["ctrl"], key: "d" },
          }}
        />,
      );
    }

    actions.push(
      <ActionPanel.Submenu key="change-instance" title="Change Instance" icon={Icon.House}>
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
          const key = index < 9 ? keyMap[index + 1] : undefined;

          return (
            <Action
              key={inst.subdomain}
              title={`${inst.subdomain}`}
              icon={instance?.subdomain === inst.subdomain ? { source: Icon.Dot, tintColor: Color.Green } : undefined}
              onAction={() => onInstanceChange(inst)}
              shortcut={
                key
                  ? {
                      macOS: { modifiers: ["cmd"], key },
                      windows: { modifiers: ["ctrl"], key },
                    }
                  : undefined
              }
            />
          );
        })}
      </ActionPanel.Submenu>,
    );

    return <>{actions}</>;
  };

  return (
    <ActionPanel>
      <ActionPanel.Section title="Open">{renderOpenActions()}</ActionPanel.Section>
      {renderEntityActions() && (
        <ActionPanel.Section title="Entity Actions">{renderEntityActions()}</ActionPanel.Section>
      )}
      <ActionPanel.Section title="General">{renderGeneralActions()}</ActionPanel.Section>
    </ActionPanel>
  );
}
