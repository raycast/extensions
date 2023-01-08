import { loadAllAliases } from "./api/simplelogin_api";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AliasResponse } from "./models/alias";
import moment from "moment";

export default function Command() {
  const [aliases, setAliases] = useState<AliasResponse[]>([]);
  const [filteredAlias, setFilteredAlias] = useState<AliasResponse[] | undefined>(undefined);

  useEffect(() => {
    loadAllAliases().then((response) => {
      setAliases(response);
      setFilteredAlias(response);
    });
  }, []);

  function onDrinkTypeChange(newValue: string) {
    if (newValue == "all") {
      setFilteredAlias(aliases);
    } else if (newValue == "pinned") {
      setFilteredAlias(aliases.filter((alias) => alias.pinned));
    } else if (newValue == "others") {
      setFilteredAlias(aliases.filter((alias) => !alias.pinned));
    }
  }

  return (
    <List
      isLoading={aliases.length === 0}
      searchBarPlaceholder="Filter aliases by name..."
      isShowingDetail={filteredAlias != undefined && filteredAlias.length > 0}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Dropdown With Items"
          onChange={(newValue) => {
            onDrinkTypeChange(newValue);
          }}
        >
          <List.Dropdown.Item title="show all" value="all" key="all" />
          <List.Dropdown.Item title="show pinned" value="pinned" key="pinned" />
          <List.Dropdown.Item title="show not Pinned" value="others" key="others" />
        </List.Dropdown>
      }
    >
      <>
        {filteredAlias != undefined &&
          filteredAlias.length > 0 &&
          filteredAlias.map((alias) => {
            return (
              <List.Item
                key={alias.id + alias.email}
                title={alias.email}
                icon={Icon.Minus}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Name" text={alias.name ?? "n/a"} />
                        <List.Item.Detail.Metadata.Label
                          title="Note"
                          text={alias.note != null && alias.note?.length > 0 ? alias.note : "---"}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Metadata" />
                        <List.Item.Detail.Metadata.Label title="" />
                        <List.Item.Detail.Metadata.Label
                          title="Pinned"
                          text={alias.pinned ? "yes" : "no"}
                          icon={alias.pinned ? Icon.Pin : Icon.PinDisabled}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Enabled"
                          text={alias.enabled ? "yes" : "no"}
                          icon={alias.enabled ? Icon.Checkmark : Icon.XMarkCircle}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={moment(alias.creation_date).format("HH:mm DD.MM.YY")}
                          icon={Icon.Calendar}
                        />
                        <List.Item.Detail.Metadata.Label title="Disabled PGP" text={alias.disable_pgp ? "yes" : "no"} />
                        <List.Item.Detail.Metadata.Label title="Support PGP" text={alias.support_pgp ? "yes" : "no"} />
                        <List.Item.Detail.Metadata.Label
                          title="Amount forwarded"
                          text={"" + alias.nb_forward}
                          icon={Icon.ArrowClockwise}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Amount replied"
                          text={"" + alias.nb_reply}
                          icon={Icon.Forward}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Amount blocked"
                          text={"" + alias.nb_block}
                          icon={Icon.Eraser}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Contained in mailbox" />
                        <>
                          {alias.mailboxes.length > 0 &&
                            alias.mailboxes.map((mailbox) => (
                              <List.Item.Detail.Metadata.Label title="E-Mail" text={mailbox.email} />
                            ))}
                        </>
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={alias.email} shortcut={{ modifiers: ["cmd"], key: "." }} />
                  </ActionPanel>
                }
              />
            );
          })}
      </>
      <List.EmptyView icon={{ source: "https://placekitten.com/500/500" }} title="No alias found" />
    </List>
  );
}
