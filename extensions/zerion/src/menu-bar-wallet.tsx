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
import { useWalletsMetadata } from "./shared/useWalletMetadata";

export default function Command() {
  const { data: address, isLoading } = usePromise(getMenuBarAddress);
  const { data: addresses, isLoading: addressesAreLoading } = usePromise(getAddresses);
  const { portfolio, isLoading: portfolioIsLoading } = useWalletPortfolio({ address: address?.toString() });

  const { data } = useWalletsMetadata(addresses);

  return (
    <MenuBarExtra
      icon={{ source: { light: "zerion_icon_bw_dark.svg", dark: "zerion_icon_bw_light.svg" } }}
      tooltip="My Portfolio"
      isLoading={isLoading || portfolioIsLoading || addressesAreLoading}
      title={
        isLoading || portfolioIsLoading || addressesAreLoading
          ? "Updating..."
          : !address
            ? "No Address Selected"
            : `$${portfolio?.totalValue ? Number(portfolio?.totalValue).toFixed(2) : "0.00"}`
      }
    >
      <MenuBarExtra.Section title="Select Address">
        {!addresses?.length ? (
          <MenuBarExtra.Item title="No Saved Addresses" />
        ) : (
          <>
            {addresses.map((item, index) => (
              <MenuBarExtra.Item
                key={item}
                icon={address === item ? Icon.Check : undefined}
                title={
                  data?.data?.[index]?.identities?.[0]?.handle ||
                  middleTruncate({ value: item, leadingLettersCount: 5 })
                }
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
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Zerion in Browser" onAction={() => open("https://app.zerion.io")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
