import { useEffect, useState, useCallback } from "react";
import {
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  ActionPanel,
  Action,
  Color,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getSearchAttributes,
  listNamespaces,
  showConnectionError,
  setCurrentNamespace,
} from "./lib/temporal-client";
import { Preferences, NamespaceInfo } from "./lib/types";
import { getSelectedNamespace, setSelectedNamespace } from "./lib/storage";

interface SearchAttribute {
  name: string;
  type: string;
}

const TYPE_COLORS: Record<string, Color> = {
  KEYWORD: Color.Blue,
  TEXT: Color.Green,
  INT: Color.Orange,
  DOUBLE: Color.Orange,
  BOOL: Color.Purple,
  DATETIME: Color.Magenta,
  KEYWORD_LIST: Color.Blue,
};

const TYPE_ICONS: Record<string, Icon> = {
  KEYWORD: Icon.Tag,
  TEXT: Icon.Text,
  INT: Icon.Hashtag,
  DOUBLE: Icon.Hashtag,
  BOOL: Icon.CheckCircle,
  DATETIME: Icon.Calendar,
  KEYWORD_LIST: Icon.List,
};

export default function SearchAttributes() {
  const [selectedNamespace, setSelectedNamespaceState] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "system" | "custom">("all");
  const prefs = getPreferenceValues<Preferences>();

  // Fetch namespaces
  const { data: namespaces, isLoading: namespacesLoading } = useCachedPromise(
    async () => {
      try {
        return await listNamespaces();
      } catch {
        return [{ name: prefs.namespace, state: "Registered" }] as NamespaceInfo[];
      }
    },
    [],
    { keepPreviousData: true }
  );

  // Initialize namespace from storage or preferences
  useEffect(() => {
    async function initNamespace() {
      const stored = await getSelectedNamespace();
      const ns = stored || prefs.namespace;
      setSelectedNamespaceState(ns);
      setCurrentNamespace(ns);
    }
    initNamespace();
  }, [prefs.namespace]);

  // Handle namespace change
  const handleNamespaceChange = useCallback(async (namespace: string) => {
    setSelectedNamespaceState(namespace);
    setCurrentNamespace(namespace);
    await setSelectedNamespace(namespace);
    await showToast({
      style: Toast.Style.Success,
      title: "Namespace Changed",
      message: namespace,
    });
  }, []);

  // Fetch search attributes
  const {
    data: attributes,
    isLoading: attributesLoading,
    revalidate,
  } = useCachedPromise(
    async (namespace: string) => {
      if (!namespace) return null;
      return getSearchAttributes();
    },
    [selectedNamespace],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  const isLoading = attributesLoading || namespacesLoading || !selectedNamespace;

  const systemAttrs = attributes?.system || [];
  const customAttrs = attributes?.custom || [];

  const showSystem = filter === "all" || filter === "system";
  const showCustom = filter === "all" || filter === "custom";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search attributes..."
      searchBarAccessory={
        <AttributesDropdown
          namespaces={namespaces || []}
          selectedNamespace={selectedNamespace}
          filter={filter}
          onNamespaceChange={handleNamespaceChange}
          onFilterChange={setFilter}
        />
      }
    >
      {showSystem && systemAttrs.length > 0 && (
        <List.Section title="System Attributes" subtitle={String(systemAttrs.length)}>
          {systemAttrs.map((attr) => (
            <AttributeItem key={attr.name} attribute={attr} isSystem onRefresh={revalidate} />
          ))}
        </List.Section>
      )}

      {showCustom && customAttrs.length > 0 && (
        <List.Section title="Custom Attributes" subtitle={String(customAttrs.length)}>
          {customAttrs.map((attr) => (
            <AttributeItem
              key={attr.name}
              attribute={attr}
              isSystem={false}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}

      {showCustom && customAttrs.length === 0 && !isLoading && (
        <List.Section title="Custom Attributes">
          <List.Item
            title="No Custom Attributes"
            subtitle="Add custom search attributes via temporal CLI"
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Add Attribute Command"
                  content={`temporal operator search-attribute create --namespace "${selectedNamespace}" --name "CustomAttribute" --type "Keyword"`}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

// ============================================================================
// Components
// ============================================================================

interface AttributesDropdownProps {
  namespaces: NamespaceInfo[];
  selectedNamespace: string;
  filter: "all" | "system" | "custom";
  onNamespaceChange: (namespace: string) => void;
  onFilterChange: (filter: "all" | "system" | "custom") => void;
}

function AttributesDropdown({
  namespaces,
  selectedNamespace,
  filter,
  onNamespaceChange,
  onFilterChange,
}: AttributesDropdownProps) {
  const combinedValue = `${selectedNamespace}:${filter}`;

  const handleChange = (value: string) => {
    const [ns, f] = value.split(":");
    if (ns !== selectedNamespace) {
      onNamespaceChange(ns);
    }
    if (f !== filter) {
      onFilterChange(f as "all" | "system" | "custom");
    }
  };

  const filters = [
    { value: "all", title: "All Attributes" },
    { value: "system", title: "System Only" },
    { value: "custom", title: "Custom Only" },
  ];

  return (
    <List.Dropdown tooltip="Namespace & Filter" value={combinedValue} onChange={handleChange}>
      {namespaces.map((ns) => (
        <List.Dropdown.Section key={ns.name} title={ns.name}>
          {filters.map((f) => (
            <List.Dropdown.Item
              key={`${ns.name}:${f.value}`}
              title={f.title}
              value={`${ns.name}:${f.value}`}
              icon={
                ns.name === selectedNamespace && f.value === filter ? Icon.CheckCircle : undefined
              }
            />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}

interface AttributeItemProps {
  attribute: SearchAttribute;
  isSystem: boolean;
  onRefresh: () => void;
}

function AttributeItem({ attribute, isSystem, onRefresh }: AttributeItemProps) {
  const typeColor = TYPE_COLORS[attribute.type] || Color.SecondaryText;
  const typeIcon = TYPE_ICONS[attribute.type] || Icon.Tag;

  // Generate example query
  const exampleQuery = generateExampleQuery(attribute.name, attribute.type);

  return (
    <List.Item
      title={attribute.name}
      icon={{ source: typeIcon, tintColor: typeColor }}
      accessories={
        [
          { tag: { value: attribute.type, color: typeColor } },
          isSystem ? { tag: { value: "System", color: Color.SecondaryText } } : null,
        ].filter(Boolean) as List.Item.Accessory[]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Attribute Name" content={attribute.name} />
            <Action.CopyToClipboard
              title="Copy Example Query"
              content={exampleQuery}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

function generateExampleQuery(name: string, type: string): string {
  switch (type) {
    case "KEYWORD":
      return `${name} = "value"`;
    case "TEXT":
      return `${name} = "search text"`;
    case "INT":
    case "DOUBLE":
      return `${name} > 100`;
    case "BOOL":
      return `${name} = true`;
    case "DATETIME":
      return `${name} > "2024-01-01T00:00:00Z"`;
    case "KEYWORD_LIST":
      return `${name} = "value"`;
    default:
      return `${name} = "value"`;
  }
}
