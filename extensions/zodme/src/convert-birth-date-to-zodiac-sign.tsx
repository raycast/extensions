import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useState, useMemo } from "react";
import { getZodiacSign, parseDate } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { zodiac, date, isEmpty } = useMemo(() => {
    const trimmed = searchText.trim();
    const empty = trimmed === "";
    const parsed = parseDate(searchText);
    const zodiac = parsed ? getZodiacSign(parsed.getMonth() + 1, parsed.getDate()) : null;
    return {
      zodiac,
      date: parsed ?? null,
      isEmpty: empty,
    };
  }, [searchText]);

  const emptyView = isEmpty ? (
    <List.EmptyView icon={Icon.Calendar} title="Enter a date" />
  ) : (
    <List.EmptyView
      icon={Icon.Calendar}
      title="Unrecognized date format"
      description="Try: March 21, 3/21, 21 March, or 2024-03-21"
    />
  );

  const formattedDate = date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : undefined;
  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a birth date (e.g. March 21)"
      throttle
      isShowingDetail={!!zodiac}
    >
      {zodiac ? (
        <List.Item
          icon={zodiac.icon}
          title={zodiac.name}
          detail={<List.Item.Detail markdown={zodiac.description} />}
          accessories={formattedDate ? [{ icon: Icon.Calendar, text: formattedDate }] : undefined}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={zodiac.name} />
              <Action.CopyToClipboard content={zodiac.description} title="Copy Description" />
            </ActionPanel>
          }
        />
      ) : (
        emptyView
      )}
    </List>
  );
}
