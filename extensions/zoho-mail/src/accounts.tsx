import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { getAccessToken, useFetch, withAccessToken } from "@raycast/utils";
import { provider } from "./oauth";
import { Account, EmailMessage, Folder, Result } from "./types";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { useState } from "react";
import { filesize } from "filesize";

export default withAccessToken(provider)(Accounts);

const PAGE_LIMIT = 20;
const getZohoHeaders = () => {
  const { token } = getAccessToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Zoho-oauthtoken ${token}`,
  };
};
const parseZohoResponse = async <T,>(response: Response) => {
  const result = (await response.json()) as
    | Result<T>
    | [
        number,
        {
          msg: string;
          errorCode: string;
          authFail: string;
          status: string;
        },
      ];
  if (Array.isArray(result)) throw new Error(result[1].errorCode);
  if (!response.ok) throw new Error(result.status.description);
  return result.data;
};

function Accounts() {
  const { isLoading, data: accounts } = useFetch("https://mail.zoho.com/api/accounts", {
    headers: getZohoHeaders(),
    parseResponse: parseZohoResponse<Account[]>,
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {accounts.map((account) => (
        <List.Section key={account.accountId} title={account.displayName}>
          {account.emailAddress.map((address) => (
            <List.Item
              key={address.mailId}
              icon={Icon.Envelope}
              title={address.mailId}
              accessories={[{ icon: address.isPrimary ? Icon.Crown : undefined }]}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Envelope} title="Emails" target={<Emails account={account} />} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function Emails({ account }: { account: Account }) {
  const [selectedFolderId, setSelectedFolderId] = useState("");

  const { isLoading: isLoadingFolders, data: folders } = useFetch(
    `https://mail.zoho.com/api/accounts/${account.accountId}/folders`,
    {
      headers: getZohoHeaders(),
      parseResponse: parseZohoResponse<Folder[]>,
      initialData: [],
    },
  );

  const {
    isLoading,
    data: emails,
    pagination,
    mutate,
  } = useFetch(
    (options: { page: number }) =>
      `https://mail.zoho.com/api/accounts/${account.accountId}/messages/view?folderId=${selectedFolderId}&limit=${PAGE_LIMIT}&start=${options.page * PAGE_LIMIT + 1}`,
    {
      headers: getZohoHeaders(),
      parseResponse: parseZohoResponse<EmailMessage[]>,
      mapResult(result) {
        return {
          data: result,
          hasMore: result.length === PAGE_LIMIT,
        };
      },
      initialData: [],
      execute: !!selectedFolderId,
    },
  );

  async function updateEmailReadStatus(messageId: number, mode: "markAsRead" | "markAsUnread") {
    const toast = await showToast(Toast.Style.Animated, "Updating", messageId.toString());
    try {
      await mutate(
        fetch(`https://mail.zoho.com/api/accounts/${account.accountId}/updatemessage`, {
          method: "PUT",
          headers: getZohoHeaders(),
          body: JSON.stringify({
            mode,
            messageId: [messageId],
          }),
        }).then(parseZohoResponse),
        {
          optimisticUpdate(data) {
            return data.map((e) =>
              e.messageId === messageId ? { ...e, status: mode === "markAsRead" ? "1" : "0" } : e,
            );
          },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Updated";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  }

  return (
    <List
      isLoading={isLoading || isLoadingFolders}
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Folder" onChange={setSelectedFolderId}>
          {folders.map((folder) => (
            <List.Dropdown.Item
              key={folder.folderId}
              icon="zoho-mail.png"
              title={folder.folderName}
              value={folder.folderId}
            />
          ))}
        </List.Dropdown>
      }
    >
      {emails.map((email) => (
        <List.Item
          key={email.messageId}
          icon={{ source: Icon.Envelope, tintColor: email.status === "0" ? Color.Blue : undefined }}
          title={email.fromAddress}
          subtitle={email.subject}
          accessories={[
            { text: filesize(email.size, { standard: "jedec" }) },
            { date: new Date(+email.receivedTime), tooltip: new Date(+email.receivedTime).toString() },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Text}
                title="View Email Content"
                target={<EmailContent accountId={account.accountId} email={email} />}
              />
              {email.status === "0" ? (
                <Action
                  icon={Icon.Eye}
                  title="Mark as Read"
                  onAction={() => updateEmailReadStatus(email.messageId, "markAsRead")}
                />
              ) : (
                <Action
                  icon={Icon.EyeDisabled}
                  title="Mark as Unread"
                  onAction={() => updateEmailReadStatus(email.messageId, "markAsUnread")}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function EmailContent({ accountId, email }: { accountId: number; email: EmailMessage }) {
  const { isLoading, data } = useFetch(
    `https://mail.zoho.com/api/accounts/${accountId}/folders/${email.folderId}/messages/${email.messageId}/content`,
    {
      headers: getZohoHeaders(),
      parseResponse: parseZohoResponse<{ content: string }>,
    },
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${email.subject} \n\n ${NodeHtmlMarkdown.translate(data?.content ?? "...")}`}
    />
  );
}
