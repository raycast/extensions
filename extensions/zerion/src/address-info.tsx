import { Icon, List, Toast, showToast } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { AddressView } from "./components/AddressView";
import { useWalletMetadata } from "./shared/useWalletMetadata";
import { useState } from "react";

export default function Command(props: LaunchProps) {
  const [account] = useState(props.arguments.account);
  const { isLoading, address } = useWalletMetadata(account);
  if (isLoading) {
    return <List isLoading={true} filtering={false} />;
  }
  if (!address) {
    showToast({ style: Toast.Style.Failure, title: "Incorrect Address or Domain" });
    return (
      <List filtering={false}>
        <List.EmptyView icon={Icon.DeleteDocument} title="Incorrect Address:" description={`"${account}"`} />
      </List>
    );
  }
  return <AddressView addressOrDomain={account} />;
}
