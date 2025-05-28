import { Action, Icon, List, useNavigation } from "@raycast/api";
import { AddressLineByAddress } from "./components/AddressLine";
import { getAddresses } from "./shared/utils";
import { usePromise } from "@raycast/utils";
import { AddressView } from "./components/AddressView";

export default function Command() {
  const { data: addresses, isLoading, revalidate } = usePromise(getAddresses);
  const { push } = useNavigation();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter Wallets">
      {addresses?.length === 0 ? (
        <List.EmptyView
          icon={Icon.AddPerson}
          title="No Saved Wallets. Yet!"
          description="Search for any wallet and use the 'Save Wallet' command from the action menu"
        />
      ) : (
        addresses?.map((address) => (
          <AddressLineByAddress
            key={address}
            address={address}
            action={
              <Action
                onAction={() => push(<AddressView addressOrDomain={address} />)}
                title="Go to Wallet"
                icon={Icon.Eye}
              />
            }
            onChangeSavedStatus={revalidate}
          />
        ))
      )}
    </List>
  );
}
