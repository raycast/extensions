import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { Card, MonsterCard, PendulumCard, LinkCard, SpellTrapCard } from "../types/Card";

export function useCardSearch() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data } = useFetch<Card[]>(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${searchText}`, {
    keepPreviousData: true,
    execute: searchText.trim().length > 3,
    parseResponse: async (response) => {
      const json = await response.json();
      return json.data ?? [];
    },
    mapResult: (result) => ({
      data: result.map((card) => {
        if (
          card.frameType === "effect" ||
          card.frameType === "normal" ||
          card.frameType === "fusion" ||
          card.frameType === "synchro" ||
          card.frameType === "xyz" ||
          card.frameType === "ritual"
        ) {
          const monsterCard = card as MonsterCard;
          return {
            id: monsterCard.id.toString(),
            name: monsterCard.name,
            type: monsterCard.type,
            humanReadableCardType: monsterCard.humanReadableCardType,
            frameType: monsterCard.frameType,
            desc: monsterCard.desc,
            archetype: monsterCard.archetype || "N/A",
            ygoprodeck_url: monsterCard.ygoprodeck_url,
            card_sets: monsterCard.card_sets || [],
            card_prices: monsterCard.card_prices || [],
            typeline: monsterCard.typeline || [],
            atk: monsterCard.atk,
            def: monsterCard.def,
            level: monsterCard.level,
            attribute: monsterCard.attribute,
          } as MonsterCard;
        }

        if (
          card.frameType === "normal_pendulum" ||
          card.frameType === "effect_pendulum" ||
          card.frameType === "ritual_pendulum" ||
          card.frameType === "fusion_pendulum" ||
          card.frameType === "synchro_pendulum" ||
          card.frameType === "xyz_pendulum"
        ) {
          const pendulumCard = card as PendulumCard;
          return {
            id: pendulumCard.id.toString(),
            name: pendulumCard.name,
            type: pendulumCard.type,
            humanReadableCardType: pendulumCard.humanReadableCardType,
            frameType: pendulumCard.frameType,
            desc: pendulumCard.desc,
            archetype: pendulumCard.archetype || "N/A",
            ygoprodeck_url: pendulumCard.ygoprodeck_url,
            card_sets: pendulumCard.card_sets || [],
            card_prices: pendulumCard.card_prices || [],
            typeline: pendulumCard.typeline || [],
            atk: pendulumCard.atk,
            def: pendulumCard.def,
            level: pendulumCard.level,
            attribute: pendulumCard.attribute,
            pend_desc: pendulumCard.pend_desc,
            monster_desc: pendulumCard.monster_desc,
            scale: pendulumCard.scale,
          } as PendulumCard;
        }

        if (card.frameType === "link") {
          const linkCard = card as LinkCard;
          return {
            id: linkCard.id.toString(),
            name: linkCard.name,
            type: linkCard.type,
            humanReadableCardType: linkCard.humanReadableCardType,
            frameType: linkCard.frameType,
            desc: linkCard.desc,
            archetype: linkCard.archetype || "N/A",
            ygoprodeck_url: linkCard.ygoprodeck_url,
            card_sets: linkCard.card_sets || [],
            card_prices: linkCard.card_prices || [],
            typeline: linkCard.typeline || [],
            atk: linkCard.atk,
            attribute: linkCard.attribute,
            linkval: linkCard.linkval,
            linkmarkers: linkCard.linkmarkers || [],
          } as LinkCard;
        }

        if (card.frameType === "spell" || card.frameType === "trap") {
          const spellTrapCard = card as SpellTrapCard;
          return {
            id: spellTrapCard.id.toString(),
            name: spellTrapCard.name,
            type: spellTrapCard.type,
            frameType: spellTrapCard.frameType,
            desc: spellTrapCard.desc,
            archetype: spellTrapCard.archetype || "N/A",
            ygoprodeck_url: spellTrapCard.ygoprodeck_url,
            card_sets: spellTrapCard.card_sets || [],
            card_prices: spellTrapCard.card_prices || [],
            race: spellTrapCard.race,
          } as SpellTrapCard;
        }

        // Default fallback for unknown frame types
        return {
          id: card.id.toString(),
          name: card.name,
          type: card.type,
          frameType: card.frameType,
          desc: card.desc,
          ygoprodeck_url: card.ygoprodeck_url,
          card_sets: card.card_sets || [],
          card_prices: card.card_prices || [],
        } as Card;
      }),
    }),
  });

  return { isLoading, data, searchText, setSearchText };
}
