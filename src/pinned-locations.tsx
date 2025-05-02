import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Country, HolidayTypeFilter, PinnedState } from "./types";
import { loadAllPinnedStates, loadPinnedCountries, unpinCountry, unpinState } from "./services/pinManager";
import { CountryHolidaysTemplate } from "./views/countryHolidayTemplate";
import { showFailureToast } from "@raycast/utils";

export default function PinnedLocationsCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [pinnedCountries, setPinnedCountries] = useState<Country[]>([]);
  const [pinnedStates, setPinnedStates] = useState<Record<string, PinnedState[]>>({});
  const [state, setState] = useState<{ filter: HolidayTypeFilter | undefined; searchText: string }>({
    filter: undefined,
    searchText: "",
  });

  const loadCountries = async () => {
    const pinnedCountriesData = await loadPinnedCountries();
    setPinnedCountries(pinnedCountriesData);
  };

  const loadStates = async () => {
    const pinnedStatesData = await loadAllPinnedStates();
    setPinnedStates(pinnedStatesData);
  };

  useEffect(() => {
    const fetchPinnedLocations = async () => {
      try {
        setIsLoading(true);
        await loadCountries();
        await loadStates();
      } catch (error) {
        showFailureToast(error, { title: "Failed to load pinned locations" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPinnedLocations();
  }, []);

  const handleUnpinCountry = async (country: Country) => {
    await unpinCountry(country);
    await loadCountries();
    setState((previous) => ({ ...previous, searchText: "" }));
  };

  const handleUnpinState = async (countryCode: string, stateCode: string) => {
    await unpinState(countryCode, stateCode);
    await loadStates();
    setState((previous) => ({ ...previous, searchText: "" }));
  };

  const renderPinnedRegions = () => {
    return Object.entries(pinnedStates).flatMap(([countryCode, states]) =>
      states.map(({ stateCode, stateName, country }) => (
        <List.Item
          title={stateName || "Unknown Region"}
          icon={country.emoji}
          key={stateCode}
          detail={
            <CountryHolidaysTemplate
              filter={state.filter}
              stateCode={stateCode}
              countryCode={countryCode}
              opts={{ relativeOrdering: true }}
            />
          }
          accessories={[{ text: `${country.alpha3}` }]}
          actions={
            <ActionPanel>
              <Action
                title="Unpin Region"
                icon={{ source: Icon.TackDisabled }}
                onAction={async () => {
                  await handleUnpinState(countryCode, stateCode);
                }}
              />
            </ActionPanel>
          }
        />
      )),
    );
  };

  const renderPinnedCountries = () => {
    return pinnedCountries.map((country) => (
      <List.Item
        title={country.name || "Unknown Country"}
        icon={country.emoji}
        key={country.alpha2}
        detail={
          <CountryHolidaysTemplate
            filter={state.filter}
            countryCode={country.alpha2}
            opts={{ relativeOrdering: true }}
          />
        }
        actions={
          <ActionPanel>
            <Action
              title="Unpin Country"
              icon={{ source: Icon.TackDisabled }}
              onAction={async () => {
                await handleUnpinCountry(country);
              }}
            />
          </ActionPanel>
        }
      />
    ));
  };

  if (!isLoading && pinnedCountries.length === 0 && Object.keys(pinnedStates).length === 0) {
    return <Detail markdown="# No pinned locations found." />;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarPlaceholder="Search for a location..."
      searchText={state.searchText}
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
      filtering={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Holiday Type"
          value={state.filter}
          onChange={(newValue) => setState((previous) => ({ ...previous, filter: newValue as HolidayTypeFilter }))}
        >
          <List.Dropdown.Item title="All" value={""} />
          <List.Dropdown.Item title="Public" value={HolidayTypeFilter.Public} />
          <List.Dropdown.Item title="Bank" value={HolidayTypeFilter.Bank} />
          <List.Dropdown.Item title="Optional" value={HolidayTypeFilter.Optional} />
          <List.Dropdown.Item title="School" value={HolidayTypeFilter.School} />
          <List.Dropdown.Item title="Observance" value={HolidayTypeFilter.Observance} />
        </List.Dropdown>
      }
    >
      {pinnedCountries.length > 0 && <List.Section title="Pinned Countries">{renderPinnedCountries()}</List.Section>}
      {Object.keys(pinnedStates).length > 0 && (
        <List.Section title="Pinned Regions">{renderPinnedRegions()}</List.Section>
      )}
    </List>
  );
}
