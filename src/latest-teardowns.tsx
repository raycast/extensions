import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { useTeardowns } from "./api";
import TeardownDetail from "./teardown-detail";
import { Teardown } from "./types";

const categories = [
  "",
  "Developer Tools",
  "E-commerce",
  "Education",
  "Operations",
  "Marketing",
];

export default function LatestTeardowns() {
  const [category, setCategory] = useState("");
  const {
    data = [],
    isLoading,
    pagination,
  } = useTeardowns(category || undefined);

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search teardowns"
    >
      <List.Dropdown
        tooltip="Filter by category"
        value={category}
        onChange={setCategory}
      >
        {categories.map((value) => (
          <List.Dropdown.Item
            key={value || "all"}
            title={value || "All Categories"}
            value={value}
          />
        ))}
      </List.Dropdown>
      {data.map((teardown: Teardown) => (
        <List.Item
          key={teardown.slug}
          title={teardown.title}
          subtitle={teardown.excerpt}
          accessories={[
            { tag: teardown.category },
            { text: `${teardown.score.toFixed(1)}/10` },
          ]}
          detail={<TeardownDetail teardown={teardown} source="latest" />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Teardown"
                target={<TeardownDetail teardown={teardown} source="latest" />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
