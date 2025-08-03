import { List, showToast, Toast } from "@raycast/api";
import { SearchTypeSelector, SearchType } from "./components/common/SearchTypeSelector";

import { useState, useEffect } from "react";
import { getZendeskInstances, ZendeskInstance } from "./utils/preferences";
import { useDebounce } from "./hooks/useDebounce";
import {
  searchZendeskUsers,
  ZendeskUser,
  searchZendeskOrganizations,
  ZendeskOrganization,
  searchZendeskTriggers,
  ZendeskTrigger,
  searchZendeskTriggerCategories,
  ZendeskTriggerCategory,
  searchZendeskDynamicContent,
  ZendeskDynamicContent,
  searchZendeskMacros,
  ZendeskMacro,
  searchZendeskTicketFields,
  ZendeskTicketField,
  searchZendeskSupportAddresses,
  ZendeskSupportAddress,
  searchZendeskTicketForms,
  ZendeskTicketForm,
  searchZendeskGroups,
  ZendeskGroup,
  searchZendeskTickets,
  ZendeskTicket,
  searchZendeskViews,
  ZendeskView,
  searchZendeskBrands,
  ZendeskBrand,
  searchZendeskAutomations,
  ZendeskAutomation,
  searchZendeskCustomRoles,
  ZendeskCustomRole,
} from "./api/zendesk";

import { TicketListItem } from "./components/lists/TicketListItem";
import { BrandListItem } from "./components/lists/BrandListItem";
import { CustomRoleListItem } from "./components/lists/CustomRoleListItem";
import { AutomationListItem } from "./components/lists/AutomationListItem";
import { ViewListItem } from "./components/lists/ViewListItem";
import { TicketFormListItem } from "./components/lists/TicketFormListItem";
import { GroupListItem } from "./components/lists/GroupListItem";
import { MacroListItem } from "./components/lists/MacroListItem";
import { TicketFieldListItem } from "./components/lists/TicketFieldListItem";
import { DynamicContentListItem } from "./components/lists/DynamicContentListItem";
import { OrganizationListItem } from "./components/lists/OrganizationListItem";
import { UserListItem } from "./components/lists/UserListItem";
import { TriggerListItem } from "./components/lists/TriggerListItem";
import { SupportAddressListItem } from "./components/lists/SupportAddressListItem";
import { groupDynamicContentResults, GroupedDynamicContentResult } from "./utils/dynamicContentGrouping";

export default function SearchZendesk() {
  const allInstances = getZendeskInstances();

  // Helper function to get category name from category ID
  const getCategoryName = (categoryId: string | null | undefined): string => {
    if (!categoryId) return "Unidentified";
    const category = allTriggerCategories.find((cat) => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  // Helper function to get brand name from brand ID
  const getBrandName = (brandId: number | null | undefined): string => {
    if (!brandId) return "Unidentified";
    const brand = allBrands.find((brand) => brand.id === brandId);
    return brand ? brand.name : `Brand ${brandId}`;
  };

  const [currentInstance, setCurrentInstance] = useState<ZendeskInstance | undefined>(allInstances[0]);
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, 350);
  const [results, setResults] = useState<
    | ZendeskUser[]
    | ZendeskOrganization[]
    | ZendeskTrigger[]
    | ZendeskDynamicContent[]
    | ZendeskMacro[]
    | ZendeskTicketField[]
    | ZendeskSupportAddress[]
    | ZendeskTicketForm[]
    | ZendeskGroup[]
    | ZendeskTicket[]
    | ZendeskView[]
    | ZendeskBrand[]
    | ZendeskAutomation[]
    | ZendeskCustomRole[]
    | ZendeskTriggerCategory[]
  >([]);
  const [groupedDynamicContentResults, setGroupedDynamicContentResults] = useState<GroupedDynamicContentResult[]>([]);
  const [hasGroupedResults, setHasGroupedResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>("tickets");

  const [allDynamicContent, setAllDynamicContent] = useState<ZendeskDynamicContent[]>([]);
  const [dynamicContentLoaded, setDynamicContentLoaded] = useState(false);
  const [allSupportAddresses, setAllSupportAddresses] = useState<ZendeskSupportAddress[]>([]);
  const [supportAddressesLoaded, setSupportAddressesLoaded] = useState(false);
  const [allGroups, setAllGroups] = useState<ZendeskGroup[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [allAutomations, setAllAutomations] = useState<ZendeskAutomation[]>([]);
  const [automationsLoaded, setAutomationsLoaded] = useState(false);
  const [allCustomRoles, setAllCustomRoles] = useState<ZendeskCustomRole[]>([]);
  const [customRolesLoaded, setCustomRolesLoaded] = useState(false);
  const [allTriggerCategories, setAllTriggerCategories] = useState<ZendeskTriggerCategory[]>([]);
  const [triggerCategoriesLoaded, setTriggerCategoriesLoaded] = useState(false);
  const [allBrands, setAllBrands] = useState<ZendeskBrand[]>([]);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    setResults([]);
    setSearchText("");
    if (searchType === "dynamic_content") {
      setDynamicContentLoaded(false);
      setAllDynamicContent([]);
    } else if (searchType === "support_addresses") {
      setSupportAddressesLoaded(false);
      setAllSupportAddresses([]);
      setBrandsLoaded(false);
      setAllBrands([]);
    } else if (searchType === "brands") {
      setBrandsLoaded(false);
      setAllBrands([]);
    } else if (searchType === "groups") {
      setGroupsLoaded(false);
      setAllGroups([]);
    } else if (searchType === "automations") {
      setAutomationsLoaded(false);
      setAllAutomations([]);
    } else if (searchType === "custom_roles") {
      setCustomRolesLoaded(false);
      setAllCustomRoles([]);
    } else if (searchType === "triggers") {
      setTriggerCategoriesLoaded(false);
      setAllTriggerCategories([]);
    }
  }, [currentInstance, searchType]);

  useEffect(() => {
    if (searchType === "dynamic_content") {
      if (!dynamicContentLoaded) {
        performSearch();
      } else {
        const { groupedResults, hasGroups } = groupDynamicContentResults(allDynamicContent, debouncedSearchText);
        setGroupedDynamicContentResults(groupedResults);
        setHasGroupedResults(hasGroups);
        // For backward compatibility, also set flat results
        const flatResults = groupedResults.flatMap((group) => group.items);
        setResults(flatResults);
      }
    } else if (searchType === "support_addresses") {
      if (!supportAddressesLoaded) {
        performSearch();
      } else {
        const filteredResults = allSupportAddresses.filter(
          (item) =>
            item.name.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
            item.email.toLowerCase().includes(debouncedSearchText.toLowerCase()),
        );
        setResults(filteredResults);
      }
    } else if (searchType === "groups") {
      if (!groupsLoaded) {
        performSearch();
      } else {
        const filteredResults = allGroups.filter((item) =>
          item.name.toLowerCase().includes(debouncedSearchText.toLowerCase()),
        );
        setResults(filteredResults);
      }
    } else if (searchType === "automations") {
      if (!automationsLoaded) {
        performSearch();
      } else {
        const filteredResults = allAutomations.filter((item) =>
          item.title.toLowerCase().includes(debouncedSearchText.toLowerCase()),
        );
        setResults(filteredResults);
      }
    } else if (searchType === "custom_roles") {
      if (!customRolesLoaded) {
        performSearch();
      } else {
        const filteredResults = allCustomRoles.filter((item) =>
          item.name.toLowerCase().includes(debouncedSearchText.toLowerCase()),
        );
        setResults(filteredResults);
      }
    } else if (searchType === "brands") {
      if (!brandsLoaded) {
        performSearch();
      } else {
        const filteredResults = allBrands.filter(
          (item) =>
            item.name.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
            item.subdomain.toLowerCase().includes(debouncedSearchText.toLowerCase()),
        );
        setResults(filteredResults);
      }
    } else {
      performSearch();
    }
  }, [
    debouncedSearchText,
    searchType,
    currentInstance,
    dynamicContentLoaded,
    supportAddressesLoaded,
    groupsLoaded,
    automationsLoaded,
    customRolesLoaded,
    brandsLoaded,
  ]);

  async function performSearch() {
    if (!currentInstance) {
      showToast(Toast.Style.Failure, "Configuration Error", "No Zendesk instances configured.");
      return;
    }

    setIsLoading(true);
    try {
      if (searchType === "dynamic_content") {
        if (!dynamicContentLoaded) {
          setAllDynamicContent([]);
          let allDynamicContentItems: ZendeskDynamicContent[] = [];
          await searchZendeskDynamicContent(debouncedSearchText, currentInstance, (page) => {
            allDynamicContentItems = [...allDynamicContentItems, ...page];
            setAllDynamicContent(allDynamicContentItems);
            setResults(allDynamicContentItems);
          });
          setDynamicContentLoaded(true);
          setIsLoading(false);
        } else {
          const { groupedResults, hasGroups } = groupDynamicContentResults(allDynamicContent, debouncedSearchText);
          setGroupedDynamicContentResults(groupedResults);
          setHasGroupedResults(hasGroups);
          // For backward compatibility, also set flat results
          const flatResults = groupedResults.flatMap((group) => group.items);
          setResults(flatResults);
        }
      } else if (searchType === "support_addresses") {
        if (!supportAddressesLoaded) {
          // Load brands if not already loaded
          if (!brandsLoaded) {
            setAllBrands([]);
            await searchZendeskBrands(currentInstance, (page) => {
              setAllBrands((prev) => [...prev, ...page]);
            });
            setBrandsLoaded(true);
          }

          setAllSupportAddresses([]);
          let allAddresses: ZendeskSupportAddress[] = [];
          await searchZendeskSupportAddresses(currentInstance, (page) => {
            allAddresses = [...allAddresses, ...page];
            setAllSupportAddresses(allAddresses);
          });
          setSupportAddressesLoaded(true);
          setResults(allAddresses);
          setIsLoading(false);
        } else {
          const filteredResults = allSupportAddresses.filter(
            (item) =>
              item.name.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
              item.email.toLowerCase().includes(debouncedSearchText.toLowerCase()),
          );
          setResults(filteredResults);
        }
      } else if (searchType === "groups") {
        if (!groupsLoaded) {
          setAllGroups([]);
          const fetchedGroups = await searchZendeskGroups(currentInstance);
          setAllGroups(fetchedGroups);
          setResults(fetchedGroups);
          setGroupsLoaded(true);
          setIsLoading(false);
        } else {
          const filteredResults = allGroups.filter((item) =>
            item.name.toLowerCase().includes(debouncedSearchText.toLowerCase()),
          );
          setResults(filteredResults);
        }
      } else if (searchType === "automations") {
        if (!automationsLoaded) {
          setAllAutomations([]);
          const fetchedAutomations = await searchZendeskAutomations(debouncedSearchText, currentInstance);
          setAllAutomations(fetchedAutomations);
          setResults(fetchedAutomations);
          setAutomationsLoaded(true);
          setIsLoading(false);
        } else {
          const filteredResults = allAutomations.filter((item) =>
            item.title.toLowerCase().includes(debouncedSearchText.toLowerCase()),
          );
          setResults(filteredResults);
        }
      } else if (searchType === "custom_roles") {
        if (!customRolesLoaded) {
          setAllCustomRoles([]);
          const fetchedCustomRoles = await searchZendeskCustomRoles(debouncedSearchText, currentInstance);
          setAllCustomRoles(fetchedCustomRoles);
          setResults(fetchedCustomRoles);
          setCustomRolesLoaded(true);
          setIsLoading(false);
        } else {
          const filteredResults = allCustomRoles.filter((item) =>
            item.name.toLowerCase().includes(debouncedSearchText.toLowerCase()),
          );
          setResults(filteredResults);
        }
      } else {
        let searchResults:
          | ZendeskUser[]
          | ZendeskOrganization[]
          | ZendeskTrigger[]
          | ZendeskDynamicContent[]
          | ZendeskMacro[]
          | ZendeskTicketField[]
          | ZendeskSupportAddress[]
          | ZendeskTicketForm[]
          | ZendeskGroup[]
          | ZendeskTicket[]
          | ZendeskView[]
          | ZendeskBrand[]
          | ZendeskAutomation[]
          | ZendeskCustomRole[] = [];
        if (searchType === "users") {
          searchResults = await searchZendeskUsers(debouncedSearchText, currentInstance);
        } else if (searchType === "organizations") {
          searchResults = await searchZendeskOrganizations(debouncedSearchText, currentInstance);
        } else if (searchType === "macros") {
          searchResults = await searchZendeskMacros(debouncedSearchText, currentInstance);
        } else if (searchType === "ticket_fields") {
          searchResults = await searchZendeskTicketFields(debouncedSearchText, currentInstance);
        } else if (searchType === "ticket_forms") {
          searchResults = await searchZendeskTicketForms(debouncedSearchText, currentInstance);
        } else if (searchType === "tickets") {
          searchResults = await searchZendeskTickets(debouncedSearchText, currentInstance);
        } else if (searchType === "views") {
          searchResults = await searchZendeskViews(debouncedSearchText, currentInstance);
        } else if (searchType === "triggers") {
          // Load trigger categories if not already loaded
          if (!triggerCategoriesLoaded) {
            setAllTriggerCategories([]);
            await searchZendeskTriggerCategories(currentInstance, (page) => {
              setAllTriggerCategories((prev) => [...prev, ...page]);
            });
            setTriggerCategoriesLoaded(true);
          }
          searchResults = await searchZendeskTriggers(debouncedSearchText, currentInstance);
        } else if (searchType === "brands") {
          if (!brandsLoaded) {
            setAllBrands([]);
            let allBrandsItems: ZendeskBrand[] = [];
            await searchZendeskBrands(currentInstance, (page) => {
              allBrandsItems = [...allBrandsItems, ...page];
              setAllBrands(allBrandsItems);
              setResults(allBrandsItems);
            });
            setBrandsLoaded(true);
            setIsLoading(false);
          } else {
            const filteredResults = allBrands.filter(
              (item) =>
                item.name.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
                item.subdomain.toLowerCase().includes(debouncedSearchText.toLowerCase()),
            );
            setResults(filteredResults);
          }
        } else if (searchType === "automations") {
          searchResults = await searchZendeskAutomations(debouncedSearchText, currentInstance);
        } else if (searchType === "custom_roles") {
          searchResults = await searchZendeskCustomRoles(debouncedSearchText, currentInstance);
        }
        setResults(searchResults);
        setIsLoading(false);
      }
    } catch (error: unknown) {
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(Toast.Style.Failure, "Search Failed", errorMessage);
      setResults([]);
      setIsLoading(false);
    }
  }

  return (
    <List
      isShowingDetail={showDetails}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        searchType === "users"
          ? "Search Zendesk users by name, email, etc."
          : searchType === "organizations"
            ? "Search Zendesk organizations by name, domain, etc."
            : searchType === "dynamic_content"
              ? "Search Zendesk dynamic content by name or content"
              : searchType === "macros"
                ? "Search Zendesk macros by name or description"
                : searchType === "ticket_fields"
                  ? "Search ticket fields by title"
                  : searchType === "support_addresses"
                    ? "Search support addresses by name or email"
                    : searchType === "ticket_forms"
                      ? "Search ticket forms by name"
                      : searchType === "groups"
                        ? "Search groups by name"
                        : searchType === "tickets"
                          ? "Search tickets by subject, description, etc."
                          : searchType === "views"
                            ? "Search views by title"
                            : searchType === "brands"
                              ? "Search brands by name or subdomain"
                              : searchType === "automations"
                                ? "Search automations by name"
                                : searchType === "custom_roles"
                                  ? "Search roles by name"
                                  : "Search Zendesk triggers by name"
      }
      throttle
      searchBarAccessory={<SearchTypeSelector value={searchType} onChange={setSearchType} />}
    >
      {(results || []).length === 0 && !isLoading && searchText.length > 0 && (
        <List.EmptyView title="No Results Found" description="Try a different search query." />
      )}
      {(results || []).length === 0 && !isLoading && searchText.length === 0 && (
        <List.EmptyView
          title={`Start Typing to Search ${searchType === "users" ? "Users" : searchType === "organizations" ? "Organizations" : searchType === "dynamic_content" ? "Dynamic Content" : searchType === "macros" ? "Macros" : searchType === "ticket_fields" ? "Ticket Fields" : searchType === "support_addresses" ? "Support Addresses" : searchType === "ticket_forms" ? "Ticket Forms" : searchType === "groups" ? "Groups" : searchType === "tickets" ? "Tickets" : searchType === "views" ? "Views" : searchType === "brands" ? "Brands" : searchType === "automations" ? "Automations" : searchType === "custom_roles" ? "Roles" : "Triggers"}`}
          description={`Enter a name, email, or other keyword to find Zendesk ${searchType}.`}
        />
      )}
      {searchType === "triggers"
        ? (() => {
            const triggers = results as ZendeskTrigger[];

            const groupedTriggers = triggers.reduce(
              (acc, trigger) => {
                const categoryName = getCategoryName(trigger.category_id);
                if (!acc[categoryName]) {
                  acc[categoryName] = [];
                }
                acc[categoryName].push(trigger);
                return acc;
              },
              {} as Record<string, ZendeskTrigger[]>,
            );

            // Sort categories: identified categories first, then "Unidentified"
            const sortedCategories = Object.keys(groupedTriggers).sort((a, b) => {
              if (a === "Unidentified") return 1;
              if (b === "Unidentified") return -1;
              return a.localeCompare(b);
            });

            return sortedCategories.map((categoryName) => (
              <List.Section key={categoryName} title={categoryName}>
                {groupedTriggers[categoryName].map((trigger) => (
                  <TriggerListItem
                    key={trigger.id}
                    trigger={trigger}
                    instance={currentInstance}
                    onInstanceChange={setCurrentInstance}
                    showDetails={showDetails}
                    onShowDetailsChange={setShowDetails}
                    categoryName={getCategoryName(trigger.category_id)}
                  />
                ))}
              </List.Section>
            ));
          })()
        : searchType === "support_addresses"
          ? (() => {
              const supportAddresses = results as ZendeskSupportAddress[];

              const groupedSupportAddresses = supportAddresses.reduce(
                (acc, supportAddress) => {
                  const brandName = getBrandName(supportAddress.brand_id);
                  if (!acc[brandName]) {
                    acc[brandName] = [];
                  }
                  acc[brandName].push(supportAddress);
                  return acc;
                },
                {} as Record<string, ZendeskSupportAddress[]>,
              );

              // Sort brands: identified brands first, then "Unidentified"
              const sortedBrands = Object.keys(groupedSupportAddresses).sort((a, b) => {
                if (a === "Unidentified") return 1;
                if (b === "Unidentified") return -1;
                return a.localeCompare(b);
              });

              return sortedBrands.map((brandName) => (
                <List.Section key={brandName} title={brandName}>
                  {groupedSupportAddresses[brandName].map((supportAddress) => (
                    <SupportAddressListItem
                      key={supportAddress.id}
                      supportAddress={supportAddress}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                      brandName={getBrandName(supportAddress.brand_id)}
                    />
                  ))}
                </List.Section>
              ));
            })()
          : searchType === "dynamic_content" && hasGroupedResults && groupedDynamicContentResults.length > 0
            ? groupedDynamicContentResults.map((group) => (
                <List.Section
                  key={group.title}
                  title={group.title}
                  subtitle={`${group.items.length} item${group.items.length !== 1 ? "s" : ""}`}
                >
                  {group.items.map((dynamicContent) => (
                    <DynamicContentListItem
                      key={dynamicContent.id}
                      dynamicContent={dynamicContent}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  ))}
                </List.Section>
              ))
            : (results || []).map((item) => {
                if (searchType === "users") {
                  const user = item as ZendeskUser;
                  return (
                    <UserListItem
                      key={user.id}
                      user={user}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "organizations") {
                  const organization = item as ZendeskOrganization;
                  return (
                    <OrganizationListItem
                      key={organization.id}
                      organization={organization}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "dynamic_content") {
                  const dynamicContent = item as ZendeskDynamicContent;
                  return (
                    <DynamicContentListItem
                      key={dynamicContent.id}
                      dynamicContent={dynamicContent}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "macros") {
                  const macro = item as ZendeskMacro;
                  return (
                    <MacroListItem
                      key={macro.id}
                      macro={macro}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "ticket_fields") {
                  const ticketField = item as ZendeskTicketField;
                  return (
                    <TicketFieldListItem
                      key={ticketField.id}
                      ticketField={ticketField}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "ticket_forms") {
                  const ticketForm = item as ZendeskTicketForm;
                  return (
                    <TicketFormListItem
                      key={ticketForm.id}
                      ticketForm={ticketForm}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "groups") {
                  const group = item as ZendeskGroup;
                  return (
                    <GroupListItem
                      key={group.id}
                      group={group}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "tickets") {
                  const ticket = item as ZendeskTicket;
                  return (
                    <TicketListItem
                      key={ticket.id}
                      ticket={ticket}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "views") {
                  const view = item as ZendeskView;
                  return (
                    <ViewListItem
                      key={view.id}
                      view={view}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "brands") {
                  const brand = item as ZendeskBrand;
                  return (
                    <BrandListItem
                      key={brand.id}
                      brand={brand}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "automations") {
                  const automation = item as ZendeskAutomation;
                  return (
                    <AutomationListItem
                      key={automation.id}
                      automation={automation}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                } else if (searchType === "custom_roles") {
                  const customRole = item as ZendeskCustomRole;
                  return (
                    <CustomRoleListItem
                      key={customRole.id}
                      customRole={customRole}
                      instance={currentInstance}
                      onInstanceChange={setCurrentInstance}
                      showDetails={showDetails}
                      onShowDetailsChange={setShowDetails}
                    />
                  );
                }
              })}
    </List>
  );
}
