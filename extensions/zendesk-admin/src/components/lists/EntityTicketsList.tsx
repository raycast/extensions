import { Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { ZendeskInstance } from "../../utils/preferences";
import { searchZendeskTickets, ZendeskTicket } from "../../api/zendesk";
import { TicketListItem } from "./TicketListItem";
import { useDebounce } from "../../hooks/useDebounce";
import { truncateText } from "../../utils/formatters";

interface EntityTicketsListProps {
  entityType: "user" | "group" | "organization" | "brand" | "form" | "recipient" | "role";
  entityId?: string;
  entityEmail?: string;
  entityName?: string;
  instance: ZendeskInstance | undefined;
}

type SortOrder = "created_at_desc" | "created_at_asc" | "updated_at_desc" | "updated_at_asc" | "status" | "priority";

export default function EntityTicketsList({
  entityType,
  entityId,
  entityEmail,
  entityName,
  instance,
}: EntityTicketsListProps) {
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, 350);
  const [tickets, setTickets] = useState<ZendeskTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>("updated_at_desc");
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    if (instance && (entityId || entityEmail)) {
      performSearch();
    } else {
      setIsLoading(false);
    }
  }, [debouncedSearchText, sortOrder, instance, entityId, entityEmail]);

  async function performSearch() {
    if (!instance) {
      showFailureToast(new Error("No Zendesk instances configured."), { title: "Configuration Error" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const fetchedTickets = await searchZendeskTickets(debouncedSearchText, instance, {
        userEmail: entityType === "user" && entityEmail ? entityEmail : undefined,
        userId: entityType === "user" && entityId ? entityId : undefined,
        groupId: entityType === "group" ? entityId : undefined,
        organizationId: entityType === "organization" ? entityId : undefined,
        brandId: entityType === "brand" ? entityId : undefined,
        formId: entityType === "form" ? entityId : undefined,
        recipient: entityType === "recipient" ? entityEmail : undefined,
        roleId: entityType === "role" ? entityId : undefined,
      });
      const sortedTickets = sortTickets(fetchedTickets, sortOrder);
      setTickets(sortedTickets);
    } catch (error: unknown) {
      showFailureToast(error, { title: "Search Failed" });
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }

  const sortTickets = (ticketsToSort: ZendeskTicket[], order: SortOrder): ZendeskTicket[] => {
    return [...ticketsToSort].sort((a, b) => {
      switch (order) {
        case "created_at_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_at_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "updated_at_desc":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case "updated_at_asc":
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case "status":
          return a.status.localeCompare(b.status);
        case "priority": {
          const priorityOrder: { [key: string]: number } = { urgent: 4, high: 3, normal: 2, low: 1, undefined: 0 };
          return (priorityOrder[b.priority || "undefined"] || 0) - (priorityOrder[a.priority || "undefined"] || 0);
        }
        default:
          return 0;
      }
    });
  };

  const getNavigationTitle = () => {
    const entityIdentifier = entityName || entityId || entityEmail || "Unknown";
    const entityTypeLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);

    return `Tickets for ${entityTypeLabel}: ${truncateText(entityIdentifier)}`;
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search tickets...`}
      throttle
      isShowingDetail={showDetails}
      navigationTitle={getNavigationTitle()}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort Tickets"
          value={sortOrder}
          onChange={(newValue) => setSortOrder(newValue as SortOrder)}
        >
          <List.Dropdown.Section title="Sort Order">
            <List.Dropdown.Item title="Updated At (Newest First)" value="updated_at_desc" icon={Icon.ArrowDown} />
            <List.Dropdown.Item title="Updated At (Oldest First)" value="updated_at_asc" icon={Icon.ArrowUp} />
            <List.Dropdown.Item title="Created At (Newest First)" value="created_at_desc" icon={Icon.ArrowDown} />
            <List.Dropdown.Item title="Created At (Oldest First)" value="created_at_asc" icon={Icon.ArrowUp} />
            <List.Dropdown.Item title="Status" value="status" icon={Icon.Circle} />
            <List.Dropdown.Item title="Priority" value="priority" icon={Icon.Star} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {tickets.length === 0 && !isLoading && searchText.length === 0 && (
        <List.EmptyView
          title="No tickets found for this entity."
          description="Try a different search query or check the entity's details."
        />
      )}
      {tickets.length === 0 && !isLoading && searchText.length > 0 && (
        <List.EmptyView title="No matching tickets found." description="Try a different search query." />
      )}
      {tickets.map((ticket) => (
        <TicketListItem
          key={ticket.id}
          ticket={ticket}
          instance={instance}
          onInstanceChange={() => {
            /* No-op for now, instance change not directly supported here */
          }}
          showDetails={showDetails}
          onShowDetailsChange={setShowDetails}
        />
      ))}
    </List>
  );
}
