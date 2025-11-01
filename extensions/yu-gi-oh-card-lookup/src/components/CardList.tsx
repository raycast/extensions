import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { CardDetail } from "./CardDetail";
import { Card, LinkCard, MonsterCard, PendulumCard, SpellTrapCard } from "../types/Card";
import { useState } from "react";
import { typeColors } from "../types/typeColors";
import { MonsterDetail } from "./MonsterDetail";
import { PendulumDetail } from "./PendulumDetail";
import { SpellTrapDetail } from "./SpellTrapDetail";
import { LinkDetail } from "./LinkDetail";

interface CardListProps {
  isLoading: boolean;
  data: Card[] | undefined;
  searchText: string;
  setSearchText: (text: string) => void;
}

export function CardList({ isLoading, data, searchText, setSearchText }: CardListProps) {
  const [selectedType, setSelectedType] = useState("All");

  // Filter the data based on the selected type
  const filteredData = selectedType === "All" ? data : data?.filter((card: Card) => card.type === selectedType);

  // Function to return the correct component based on card type
  const getDetailView = (card: Card) => {
    if (
      card.frameType === "normal" ||
      card.frameType === "effect" ||
      card.frameType === "ritual" ||
      card.frameType === "fusion" ||
      card.frameType === "synchro" ||
      card.frameType === "xyz"
    ) {
      return <MonsterDetail card={card as MonsterCard} />;
    }

    if (card.frameType === "link") {
      return <LinkDetail card={card as LinkCard} />; //TODO
    }

    if (
      card.frameType === "normal_pendulum" ||
      card.frameType === "effect_pendulum" ||
      card.frameType === "ritual_pendulum" ||
      card.frameType === "fusion_pendulum" ||
      card.frameType === "synchro_pendulum" ||
      card.frameType === "xyz_pendulum"
    ) {
      return <PendulumDetail card={card as PendulumCard} />; //TODO: Implement proper Pendulum handling
    }

    if (card.frameType === "spell" || card.frameType === "trap") {
      return <SpellTrapDetail card={card as SpellTrapCard} />;
    }

    return <CardDetail card={card} />;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Card..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Card Type" storeValue onChange={setSelectedType}>
          <List.Dropdown.Item title="All" value="All" />
          <List.Dropdown.Item title="Effect Monster" value="Effect Monster" />
          <List.Dropdown.Item title="Flip Effect Monster" value="Flip Effect Monster" />
          <List.Dropdown.Item title="Fusion Monster" value="Fusion Monster" />
          <List.Dropdown.Item title="Gemini Monster" value="Gemini Monster" />
          <List.Dropdown.Item title="Link Monster" value="Link Monster" />
          <List.Dropdown.Item title="Normal Monster" value="Normal Monster" />
          <List.Dropdown.Item title="Normal Tuner Monster" value="Normal Tuner Monster" />
          <List.Dropdown.Item title="Pendulum Effect Fusion Monster" value="Pendulum Effect Fusion Monster" />
          <List.Dropdown.Item title="Pendulum Effect Monster" value="Pendulum Effect Monster" />
          <List.Dropdown.Item title="Pendulum Effect Ritual Monster" value="Pendulum Effect Ritual Monster" />
          <List.Dropdown.Item title="Pendulum Flip Effect Monster" value="Pendulum Flip Effect Monster" />
          <List.Dropdown.Item title="Pendulum Normal Monster" value="Pendulum Normal Monster" />
          <List.Dropdown.Item title="Pendulum Tuner Effect Monster" value="Pendulum Tuner Effect Monster" />
          <List.Dropdown.Item title="Ritual Effect Monster" value="Ritual Effect Monster" />
          <List.Dropdown.Item title="Ritual Monster" value="Ritual Monster" />
          <List.Dropdown.Item title="Skill Card" value="Skill Card" />
          <List.Dropdown.Item title="Spell Card" value="Spell Card" />
          <List.Dropdown.Item title="Spirit Monster" value="Spirit Monster" />
          <List.Dropdown.Item title="Synchro Monster" value="Synchro Monster" />
          <List.Dropdown.Item title="Synchro Pendulum Effect Monster" value="Synchro Pendulum Effect Monster" />
          <List.Dropdown.Item title="Synchro Tuner Monster" value="Synchro Tuner Monster" />
          <List.Dropdown.Item title="Token" value="Token" />
          <List.Dropdown.Item title="Toon Monster" value="Toon Monster" />
          <List.Dropdown.Item title="Trap Card" value="Trap Card" />
          <List.Dropdown.Item title="Tuner Monster" value="Tuner Monster" />
          <List.Dropdown.Item title="Union Effect Monster" value="Union Effect Monster" />
          <List.Dropdown.Item title="XYZ Monster" value="XYZ Monster" />
          <List.Dropdown.Item title="XYZ Pendulum Effect Monster" value="XYZ Pendulum Effect Monster" />
        </List.Dropdown>
      }
    >
      {searchText === "" && (!filteredData || filteredData.length === 0) ? (
        <List.EmptyView icon={{ source: "card-back.png" }} title="Try searching for a card." />
      ) : (
        filteredData?.map((card: Card) => (
          <List.Item
            key={card.id}
            title={card.name}
            accessories={[
              {
                tag: {
                  value: card.type,
                  color: typeColors[card.frameType] || Color.PrimaryText,
                },
                icon: Icon.CircleFilled,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Card Details" target={getDetailView(card)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
