import { ActionPanel, List, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { type ZefixEntry, ZefixLanguage, ZefixLegalForm, zefixLegalForms, zefixSearch } from "./zefix";

// noinspection JSUnusedGlobalSymbols
export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([] as ZefixEntry[]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("de" as ZefixLanguage);
  const [legalForms, setLegalForms] = useState([] as ZefixLegalForm[]);

  useEffect(() => {
    zefixLegalForms().then((results) => setLegalForms(results));
  }, []);

  useEffect(() => {
    if (searchText === "" || [...searchText].length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    zefixSearch({ name: searchText, languageKey: language })
      .then((result) => setResults(result.list))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [searchText, language]);

  return (
    <List
      searchText={searchText}
      searchBarPlaceholder="Type at least three characters to search…"
      onSearchTextChange={setSearchText}
      isLoading={loading}
      isShowingDetail
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Language"
          storeValue={true}
          onChange={(newValue) => {
            setLanguage(newValue as ZefixLanguage);
          }}
        >
          <List.Dropdown.Section title="Results Language">
            {["de", "en", "fr", "it"].map((lang) => (
              <List.Dropdown.Item key={lang} title={lang} value={lang} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {results.map((item) => (
        <List.Item
          icon="list-icon.png"
          title={item.name}
          subtitle={`${item.legalSeat} (${item.uidFormatted})`}
          detail={entryDetail(item, legalForms, language)}
          actions={entryActions(item)}
        />
      ))}
    </List>
  );
}

function entryDetail(item: ZefixEntry, legalForms: ZefixLegalForm[], language: ZefixLanguage) {
  return (
    <List.Item.Detail
      // markdown={`# ${item.name}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Legal Name" text={item.name} />
          <List.Item.Detail.Metadata.Label
            title="Legal Form"
            text={legalForms.find((f) => f.id == item.legalFormId)?.name[language]}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="UID"
            text={item.uidFormatted}
            target={`https://www.uid.admin.ch/Detail.aspx?uid_id=${item.uid}`}
          />
          <List.Item.Detail.Metadata.Label title="MWST ID" text={`${item.uidFormatted} MWST`} />
          <List.Item.Detail.Metadata.Label title="CH-ID" text={item.chidFormatted} />
          <List.Item.Detail.Metadata.Label title="EHRA-ID" text={item.ehraid.toString()} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Last update"
            text={item.shabDate}
            target={`https://shab.ch/#!/search/publications?uids=${item.uidFormatted}`}
          />

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Cantonal Cazette"
            target={item.cantonalExcerptWeb}
            text={`Open cantonal cazette of ${item.legalSeat}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function entryActions(item: ZefixEntry) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Name" content={item.name} />
      <Action.CopyToClipboard title="Copy UID" content={item.uidFormatted} />
      <Action.CopyToClipboard title="Copy VAT ID" content={`${item.uidFormatted} MWST`} />
    </ActionPanel>
  );
}
