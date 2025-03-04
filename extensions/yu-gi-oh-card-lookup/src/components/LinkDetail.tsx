import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { LinkCard } from "../types/Card";
import { typeColors } from "../types/typeColors";
import { getAttributeIcon } from "../utils/attributeIcons";

export function LinkDetail({ card }: { card: LinkCard }) {
  return (
    <Detail
      markdown={`# ${card.name}\n## Card Text\n ${card.desc}\n \n[${Array.isArray(card.typeline) ? card.typeline.map((type) => `**${type}**`).join("/") : `**${card.typeline}**`}]\n *** \n ## Card Price\n ${card
        .card_prices!.map((price) => {
          return `- **Cardmarket**: $${price.cardmarket_price}\n- **TCGPlayer**: $${price.tcgplayer_price}\n- **eBay**: $${price.ebay_price}\n- **Amazon**: $${price.amazon_price}\n- **CoolStuffInc**: $${price.coolstuffinc_price}
                `.trim();
        })
        .join("\n")}`}
      navigationTitle={`${card.name}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Attack ⚔️" text={`${card.atk}`} />
          <Detail.Metadata.Label title="LINK 🔗" text={`${card.linkval}`} />
          <Detail.Metadata.TagList title="Card Type">
            <Detail.Metadata.TagList.Item
              text={`${card.type}`}
              color={typeColors[card.frameType] || Color.PrimaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Attribute"
            text={`${card.attribute}`}
            icon={{ source: getAttributeIcon(card.attribute) }}
          />
          <Detail.Metadata.Label title="Archetype" text={`${card.archetype}`} />
          <Detail.Metadata.TagList title="Link Markers">
            {card.linkmarkers.map((marker) => (
              <Detail.Metadata.TagList.Item key={marker} text={marker} />
            ))}
          </Detail.Metadata.TagList>
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
