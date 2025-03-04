import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { Card } from "../types/Card";
import { typeColors } from "../types/typeColors";

export function CardDetail({ card }: { card: Card }) {
  return (
    <Detail
      markdown={`# ${card.name}\n## Card Text\n ${card.desc}\n *** \n ## Card Price\n ${card
        .card_prices!.map((price) => {
          return `- **Cardmarket**: $${price.cardmarket_price}\n- **TCGPlayer**: $${price.tcgplayer_price}\n- **eBay**: $${price.ebay_price}\n- **Amazon**: $${price.amazon_price}\n- **CoolStuffInc**: $${price.coolstuffinc_price}
                `.trim();
        })
        .join("\n")}`}
      navigationTitle={`${card.name}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Card Type">
            <Detail.Metadata.TagList.Item
              text={`${card.type}`}
              color={typeColors[card.frameType] || Color.PrimaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
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
