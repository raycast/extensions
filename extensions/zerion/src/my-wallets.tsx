import { Action, Icon, List, useNavigation } from "@raycast/api";
import { AddressLineByAddress } from "./components/AddressLine";
import { getAddresses } from "./shared/utils";
import { usePromise, withAccessToken } from "@raycast/utils";
import { AddressView } from "./components/AddressView";
import { zerionOAuth } from "./shared/oauth";
import { ApiErrorGate } from "./components/ApiKeyGate";
import { useState } from "react";

function Command() {
  const { data: addresses, isLoading, revalidate } = usePromise(getAddresses);
  const { push } = useNavigation();
  const [apiError, setApiError] = useState<unknown>();

  const errorGate = ApiErrorGate({ error: apiError });
  if (errorGate) {
    return errorGate;
  }

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
            onApiError={setApiError}
          />
        ))
      )}
    </List>
  );
}

export default withAccessToken(zerionOAuth)(Command);
