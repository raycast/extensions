import { Action, ActionPanel, Icon, List } from "@raycast/api";
import EditSearchEngine from "./edit-search-engine";
import { SavedSitesState } from "./saved-sites";
import { strEq } from "./utils";
import { useState } from "react";

export default function ManageSavedSites(props: { savedSitesState: SavedSitesState }) {
  const { savedSitesState } = props;
  const [savedSites] = savedSitesState;
  const [selectedSiteTitle, setSelectedSiteTitle] = useState("");

  const defaultSiteTitle = savedSites.defaultSiteTitle ?? "";
  console.log("rendered manage", savedSites);

  return (
    <List
      onSelectionChange={(newTitle) => {
        if (newTitle !== undefined) {
          setSelectedSiteTitle(newTitle);
        }
      }}
    >
      {savedSites.items.map(({ title, url }, i) => {
        const isDefaultSite = strEq(title, defaultSiteTitle);
        return (
          <List.Item
            title={title}
            subtitle={url}
            id={title}
            key={i}
            accessories={isDefaultSite ? [{ icon: Icon.Star, text: "Default site" }] : undefined}
            actions={
              <ActionPanel>
                <Action.Push
                  target={
                    <EditSearchEngine
                      {...{ title, url, savedSitesState }}
                      isDefault={isDefaultSite}
                      operation={{ mode: "edit", index: i }}
                    />
                  }
                  title={selectedSiteTitle === "" ? "Edit" : `Edit "${selectedSiteTitle}"`}
                  icon={Icon.Pencil}
                ></Action.Push>
              </ActionPanel>
            }
          ></List.Item>
        );
      })}
    </List>
  );
}
