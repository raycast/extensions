import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { PendulumCard } from "../types/Card";
import { typeColors } from "../types/typeColors";
import { getAttributeIcon } from "../utils/attributeIcons";

export function PendulumDetail({ card }: { card: PendulumCard }) {
  return (
    <Detail
      markdown={`# ${card.name}\n## Pendulum Text\n ${card.pend_desc}\n *** \n## Card Text\n ${card.monster_desc} \n[${Array.isArray(card.typeline) ? card.typeline.map((type) => `**${type}**`).join("/") : `**${card.typeline}**`}]\n *** \n ## Card Price\n ${card
        .card_prices!.map((price) => {
          return `- **Cardmarket**: $${price.cardmarket_price}\n- **TCGPlayer**: $${price.tcgplayer_price}\n- **eBay**: $${price.ebay_price}\n- **Amazon**: $${price.amazon_price}\n- **CoolStuffInc**: $${price.coolstuffinc_price}
                `.trim();
        })
        .join("\n")}`}
      navigationTitle={`${card.name}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Attack ⚔️" text={`${card.atk}`} />
          <Detail.Metadata.Label title="Defense 🛡️" text={`${card.def}`} />
          <Detail.Metadata.TagList title="Card Type">
            <Detail.Metadata.TagList.Item
              text={`${card.type}`}
              color={typeColors[card.frameType] || Color.PrimaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Scale" text={`${card.scale}`} icon={{ source: "pendulum-scale.png" }} />
          <Detail.Metadata.Label title="Level/Rank" text={`${card.level}`} icon={{ source: "level-icon.png" }} />
          <Detail.Metadata.Label
            title="Attribute"
            text={`${card.attribute}`}
            icon={{ source: getAttributeIcon(card.attribute) }}
          />
          <Detail.Metadata.Label title="Archetype" text={`${card.archetype}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View in YGOProDeck" url={`${card.ygoprodeck_url}`} />
        </ActionPanel>
      }
    />
  );
}
