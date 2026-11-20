import { Icon, LaunchType, MenuBarExtra, launchCommand, open, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getAddresses,
  getMenuBarAddress,
  middleTruncate,
  removeMenuBarAddress,
  setMenuBarAddress,
} from "./shared/utils";
import { useWalletPortfolio } from "./shared/useWalletPortfolio";
import { useWalletIdentities } from "./shared/useWalletIdentity";
import { getStoredApiKey } from "./shared/oauth";

export default function Command() {
  // The menu bar refreshes in the background, where the OAuth overlay can't
  // be shown — so it never triggers authorization itself. Signed out, it
  // offers a "Sign in" item that launches a view command instead.
  const { data: apiKey, isLoading: apiKeyIsLoading } = usePromise(getStoredApiKey);
  const hasApiKey = Boolean(apiKey);
  const { data: address, isLoading } = usePromise(getMenuBarAddress);
  const { data: addresses, isLoading: addressesAreLoading } = usePromise(getAddresses);
  const { portfolio, isLoading: portfolioIsLoading } = useWalletPortfolio({
    address: hasApiKey ? address?.toString() : undefined,
    apiKey,
  });

  const { identities } = useWalletIdentities(addresses);

  return (
    <MenuBarExtra
      icon={{ source: { light: "zerion_icon_bw_dark.svg", dark: "zerion_icon_bw_light.svg" } }}
      tooltip="My Portfolio"
      isLoading={apiKeyIsLoading || isLoading || portfolioIsLoading || addressesAreLoading}
      title={
        apiKeyIsLoading
          ? "Updating..."
          : !hasApiKey
            ? "Sign in to Zerion"
            : isLoading || portfolioIsLoading || addressesAreLoading
              ? "Updating..."
              : !address
                ? "No Address Selected"
                : `$${portfolio?.totalValue ? Number(portfolio?.totalValue).toFixed(2) : "0.00"}`
      }
    >
      {!hasApiKey ? (
        <MenuBarExtra.Section title="Sign-In Required">
          <MenuBarExtra.Item
            icon={Icon.Person}
            title="Sign in to Zerion…"
            onAction={() => launchCommand({ name: "my-wallets", type: LaunchType.UserInitiated })}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title="Select Address">
          {!addresses?.length ? (
            <MenuBarExtra.Item title="No Saved Addresses" />
          ) : (
            <>
              {addresses.map((item, index) => (
                <MenuBarExtra.Item
                  key={item}
                  icon={address === item ? Icon.Check : undefined}
                  title={identities?.[index]?.ens || middleTruncate({ value: item, leadingLettersCount: 5 })}
                  onAction={() => {
                    if (address === item) {
                      return;
                    }
                    setMenuBarAddress(item).then(() => {
                      launchCommand({ name: "menu-bar-wallet", type: LaunchType.UserInitiated });
                      showHUD("Click One more time to refresh the menu bar");
                    });
                  }}
                />
              ))}
              <MenuBarExtra.Item
                icon={!address ? Icon.Check : undefined}
                title="No Address"
                onAction={() => {
                  if (!address) {
                    return;
                  }
                  removeMenuBarAddress().then(() => {
                    launchCommand({ name: "menu-bar-wallet", type: LaunchType.UserInitiated });
                    showHUD("Click One more time to refresh the menu bar");
                  });
                }}
              />
            </>
          )}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Zerion in Browser" onAction={() => open("https://app.zerion.io")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
