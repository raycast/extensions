import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { getZendeskInstances } from "./utils/preferences";

type ZendeskProduct = "support" | "guide" | "admin" | "explore" | "sell" | "chat" | "talk";

const productTitles: Record<ZendeskProduct, string> = {
  support: "Support",
  guide: "Guide",
  admin: "Admin",
  explore: "Explore",
  sell: "Sell",
  chat: "Chat",
  talk: "Talk",
};

const productIcons: Record<ZendeskProduct, Icon> = {
  support: Icon.Message,
  guide: Icon.Book,
  admin: Icon.Gear,
  explore: Icon.BarChart,
  sell: Icon.Cart,
  chat: Icon.SpeechBubble,
  talk: Icon.Phone,
};

export default function OpenZendeskInstance() {
  const instances = getZendeskInstances();

  const getProductUrl = (subdomain: string, product: ZendeskProduct) => {
    switch (product) {
      case "support":
        return `https://${subdomain}.zendesk.com/agent`;
      case "guide":
        return `https://${subdomain}.zendesk.com/hc/admin`;
      case "admin":
        return `https://${subdomain}.zendesk.com/admin`;
      case "explore":
        return `https://${subdomain}.zendesk.com/explore`;
      case "sell":
        return `https://${subdomain}.zendesk.com/sell`;
      case "chat":
        return `https://${subdomain}.zendesk.com/chat`;
      case "talk":
        return `https://${subdomain}.zendesk.com/talk`;
    }
  };

  if (instances.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Zendesk Instances Configured"
          description="Please add your Zendesk instances in the extension preferences."
        />
      </List>
    );
  }

  return (
    <List>
      {instances.map((instance) => (
        <List.Item
          key={instance.subdomain}
          title={instance.name || "Unknown Instance"}
          subtitle={instance.subdomain}
          icon={{ source: Icon.House, tintColor: instance.color || Color.PrimaryText }}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {Object.entries(productTitles).map(([value, title], index) => {
                  const productKeyMap: { [key: number]: Keyboard.KeyEquivalent } = {
                    0: "s",
                    1: "g",
                    2: "d",
                    3: "e",
                    4: "m",
                    5: "c",
                    6: "t",
                  };
                  const key = productKeyMap[index] || "s";
                  const product = value as ZendeskProduct;

                  return (
                    <Action.OpenInBrowser
                      key={value}
                      title={`Open ${title}`}
                      icon={productIcons[product]}
                      url={getProductUrl(instance.subdomain, product)}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key },
                        windows: { modifiers: ["ctrl"], key },
                      }}
                    />
                  );
                })}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
