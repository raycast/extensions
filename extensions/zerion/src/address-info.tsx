import { Icon, List } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { AddressView } from "./components/AddressView";
import { useWalletIdentity } from "./shared/useWalletIdentity";
import { zerionOAuth } from "./shared/oauth";
import { useState } from "react";

function Command(props: LaunchProps) {
  const [account] = useState(props.arguments.account);
  const { isLoading, address } = useWalletIdentity(account);
  if (isLoading) {
    return <List isLoading={true} filtering={false} />;
  }
  if (!address) {
    showFailureToast(new Error(account), { title: "Incorrect Address or Domain" });
    return (
      <List filtering={false}>
        <List.EmptyView icon={Icon.DeleteDocument} title="Incorrect Address:" description={`"${account}"`} />
      </List>
    );
  }
  return <AddressView addressOrDomain={account} />;
}

export default withAccessToken(zerionOAuth)(Command);
