import { Icon, List } from "@raycast/api";
import { getAccessToken, useFetch, withAccessToken } from "@raycast/utils";
import { provider } from "./oauth";
import { Account, Result } from "./types";

export default withAccessToken(provider)(Accounts);

function Accounts() {
  const {token} = getAccessToken();
  const {isLoading, data: accounts} = useFetch("https://mail.zoho.com/api/accounts", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Zoho-oauthtoken ${token}`
    },
    async parseResponse(response) {
      const result = await response.json() as Result<Account[]>;
      if (!response.ok) throw new Error(result.status.description);
      return result.data;
    },
    initialData: []
  })
  return <List isLoading={isLoading}>
    {accounts.map(account => <List.Section key={account.accountId} title={account.displayName}>
      {account.emailAddress.map(address => <List.Item key={address.mailId} icon={Icon.Envelope} title={address.mailId} accessories={[{icon: address.isPrimary ? Icon.Crown : undefined}]} />)}
    </List.Section>)}
  </List>
}
