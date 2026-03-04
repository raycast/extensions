import { useState } from "react";
import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const BASE_URL = "https://isdown.app";

interface ServiceAttributes {
  name: string;
  status: "ok" | "minor" | "major" | "maintenance";
  isdown_url: string;
}

interface Service {
  id: string;
  attributes: ServiceAttributes;
}

interface SearchResult {
  data: Service[];
}

interface PopularService {
  name: string;
  url: string;
  status: "ok" | "minor" | "major" | "maintenance";
}

interface PopularResult {
  data: PopularService[];
}

function getStatusIcon(status: ServiceAttributes["status"]) {
  switch (status) {
    case "ok":
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    case "minor":
      return { source: Icon.CircleFilled, tintColor: Color.Orange };
    case "major":
      return { source: Icon.CircleFilled, tintColor: Color.Red };
    default:
      return { source: Icon.CircleFilled, tintColor: Color.Blue };
  }
}

function getStatusAccessory(status: ServiceAttributes["status"]): List.Item.Accessory {
  switch (status) {
    case "ok":
      return { text: { value: "Operational", color: Color.Green } };
    case "minor":
      return { text: { value: "Minor Outage", color: Color.Orange }, icon: Icon.ExclamationMark };
    case "major":
      return { text: { value: "Major Outage", color: Color.Red }, icon: Icon.ExclamationMark };
    default:
      return { text: { value: "Maintenance", color: Color.Blue } };
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading: isSearchLoading, data: searchData } = useFetch(`${BASE_URL}/api/v1/search.json?q=${encodeURIComponent(searchText)}`, {
    execute: searchText.length > 0,
    mapResult(result: SearchResult) {
      return { data: result.data };
    },
    keepPreviousData: true,
  });

  const { isLoading: isPopularLoading, data: popularData } = useFetch(`${BASE_URL}/api/public/v1/search/popular.json`, {
    execute: searchText.length === 0,
    mapResult(result: PopularResult) {
      return { data: result.data };
    },
  });

  const isLoading = isSearchLoading || isPopularLoading;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search cloud providers…"
      throttle
    >
      {searchText.length === 0 ? (
        <List.Section title="Popular Services">
          {(popularData ?? []).map((item) => (
            <List.Item
              key={item.url}
              title={item.name}
              icon={getStatusIcon(item.status)}
              actions={
                <ActionPanel title={`Check ${item.name} Status`}>
                  <Action.OpenInBrowser url={`${BASE_URL}${item.url}?utm_source=raycast`} />
                </ActionPanel>
              }
              accessories={[getStatusAccessory(item.status)]}
            />
          ))}
        </List.Section>
      ) : (
        <List.Section title="Search Results">
          {(searchData ?? []).map((item) => (
            <List.Item
              key={item.id}
              title={item.attributes.name}
              icon={getStatusIcon(item.attributes.status)}
              actions={
                <ActionPanel title={`Check ${item.attributes.name} Status`}>
                  <Action.OpenInBrowser url={`${item.attributes.isdown_url}?utm_source=raycast`} />
                </ActionPanel>
              }
              accessories={[getStatusAccessory(item.attributes.status)]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
