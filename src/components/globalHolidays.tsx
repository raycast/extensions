import { useEffect, useState } from "react";
import moment from "moment";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { Country, HolidayTypeFilter } from "../types";
import { CountryHolidaysTemplate } from "../views/countryHolidayTemplate";
import { RegionalHolidays } from "./regionalHolidays";
import Holidays from "date-holidays";
import { loadPinnedCountries, pinCountry, unpinCountry } from "../services/pinManager";
import { useCountries } from "../services/countriesCache";

const checkForStates = async (countryCode: string): Promise<boolean> => {
  const holidays = new Holidays();
  try {
    const states = holidays.getStates(countryCode);
    return states && Object.keys(states).length > 0;
  } catch (error) {
    console.error(`Error checking states for country code: ${countryCode}`, error);
    return false;
  }
};

export default function GlobalHolidays({
  dateFilter,
  opts,
}: { dateFilter?: (holidayDate: moment.Moment) => boolean; opts?: { reverse?: boolean } } = {}) {
  const countries = useCountries();
  const [pinnedCountries, setPinnedCountries] = useState<Country[]>([]);
  const [unpinnedCountries, setUnpinnedCountries] = useState<Country[]>([]);
  const [state, setState] = useState<{ filter: HolidayTypeFilter | undefined; searchText: string }>({
    filter: undefined,
    searchText: "",
  });
  const [countriesWithStates, setCountriesWithStates] = useState<{ [key: string]: boolean }>({});
  const { push } = useNavigation();

  const loadCountries = async () => {
    const pinnedCountriesData = await loadPinnedCountries();
    setPinnedCountries(
      countries.filter((country) => pinnedCountriesData.some((pinned) => pinned.alpha2 === country.alpha2)),
    );
    setUnpinnedCountries(
      countries.filter((country) => !pinnedCountriesData.some((pinned) => pinned.alpha2 === country.alpha2)),
    );
  };

  const handlePinCountry = async (country: Country) => {
    await pinCountry(country);
    await loadCountries(); // Ensure the state is updated after pinning
    setState((previous) => ({ ...previous, searchText: country.name }));
  };

  const handleUnpinCountry = async (country: Country) => {
    await unpinCountry(country);
    await loadCountries(); // Ensure the state is updated after unpinning
    setState((previous) => ({ ...previous, searchText: country.name }));
  };

  useEffect(() => {
    (async () => {
      await loadCountries();
      const stateResults = await Promise.all(
        countries.map(async (country) => {
          const hasStates = await checkForStates(country.alpha2);
          return { code: country.alpha2, hasStates };
        }),
      );

      const resultsMap = stateResults.reduce(
        (acc, { code, hasStates }) => {
          acc[code] = hasStates;
          return acc;
        },
        {} as { [key: string]: boolean },
      );
      setCountriesWithStates(resultsMap);
    })();
  }, [countries]);

  return (
    <List
      isLoading={!pinnedCountries || !unpinnedCountries}
      searchBarPlaceholder="Search for a country"
      isShowingDetail={true}
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
      <List.Section title="Pinned Countries">
        {pinnedCountries.map((country) => (
          <List.Item
            title={country.name}
            icon={country.emoji}
            key={country.alpha2}
            detail={
              <CountryHolidaysTemplate
                dateFilter={dateFilter}
                filter={state.filter}
                countryCode={country.alpha2}
                opts={{ reverse: opts?.reverse }}
              />
            }
            accessories={countriesWithStates[country.alpha2] ? [{ icon: { source: Icon.Folder } }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Unpin"
                  icon={{ source: Icon.TackDisabled }}
                  onAction={() => {
                    handleUnpinCountry(country);
                  }}
                />
                {countriesWithStates[country.alpha2] && (
                  <Action
                    title="View State Holidays"
                    icon={{ source: Icon.Folder }}
                    onAction={() => {
                      push(<RegionalHolidays countryCode={country.alpha2} dateFilter={dateFilter} />);
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Unpinned Countries">
        {unpinnedCountries.map((country) => (
          <List.Item
            title={country.name}
            icon={country.emoji}
            key={country.alpha2}
            detail={
              <CountryHolidaysTemplate
                dateFilter={dateFilter}
                filter={state.filter}
                countryCode={country.alpha2}
                opts={{ reverse: opts?.reverse }}
              />
            }
            accessories={countriesWithStates[country.alpha2] ? [{ icon: { source: Icon.Folder } }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Pin"
                  icon={{ source: Icon.Tack }}
                  onAction={() => {
                    handlePinCountry(country);
                  }}
                />
                {countriesWithStates[country.alpha2] && (
                  <Action
                    title="View State Holidays"
                    icon={{ source: Icon.Folder }}
                    onAction={() => {
                      push(<RegionalHolidays countryCode={country.alpha2} dateFilter={dateFilter} />);
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
