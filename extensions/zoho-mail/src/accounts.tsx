import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getAccessToken, useFetch, withAccessToken } from "@raycast/utils";
import { provider } from "./oauth";
import { Account, EmailMessage, Result } from "./types";

export default withAccessToken(provider)(Accounts);

const parseZohoResponse = async <T,>(response: Response) => {
  const result = await response.json() as Result<T> | [
  number, {
    msg: string
    errorCode: string
    authFail: string
    status: string
  }
];
  if (Array.isArray(result)) throw new Error(result[1].errorCode);
  if (!response.ok) throw new Error(result.status.description);
  return result.data;
}

function Accounts() {
  const {token} = getAccessToken();
  const {isLoading, data: accounts} = useFetch("https://mail.zoho.com/api/accounts", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Zoho-oauthtoken ${token}`
    },
    parseResponse: parseZohoResponse<Account[]>,
    initialData: []
  })

  return <List isLoading={isLoading}>
    {accounts.map(account => <List.Section key={account.accountId} title={account.displayName}>
      {account.emailAddress.map(address => <List.Item key={address.mailId} icon={Icon.Envelope} title={address.mailId} accessories={[{icon: address.isPrimary ? Icon.Crown : undefined}]} actions={<ActionPanel>
        <Action.Push icon={Icon.Envelope} title="Emails" target={<Emails account={account} />} />
      </ActionPanel>} />)}
    </List.Section>)}
  </List>
}

function Emails({account}:{account: Account}) {
  const {token} = getAccessToken();
  const {isLoading, data: emails} = useFetch(`https://mail.zoho.com/api/accounts/${account.accountId}/messages/view`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Zoho-oauthtoken ${token}`
    },
        parseResponse: parseZohoResponse<EmailMessage[]>,
    initialData: []
  })

  return <List isLoading={isLoading}>
{emails.map(email => <List.Item key={email.messageId} icon={{ source:Icon.Envelope, tintColor: email.status==="0" ? Color.Blue : undefined}} title={email.subject} />)}
  </List>
}