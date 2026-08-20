import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { getAvatarIcon, useFetch, withAccessToken } from "@raycast/utils";
import { provider } from "./oauth";
import { Account, EmailMessage, Folder } from "./types";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { useState } from "react";
import { filesize } from "filesize";
import { API_URL, getZohoHeaders, PAGE_LIMIT, parseZohoResponse } from "./zoho";

export default withAccessToken(provider)(Accounts);

function Accounts() {
  const {
    isLoading,
    data: accounts,
    error,
  } = useFetch(API_URL + "/accounts", {
    headers: getZohoHeaders(),
    parseResponse: parseZohoResponse<Account[]>,
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {!isLoading && !accounts.length && !error ? (
        <List.EmptyView
          icon={Icon.TwoPeople}
          title="Please go online and add an account to get started"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://mailadmin.zoho.com/cpanel/home.do#dashboard" />
            </ActionPanel>
          }
        />
      ) : (
        accounts.map((account) => (
          <List.Section key={account.accountId} title={account.displayName}>
            {account.emailAddress.map((address) => (
              <List.Item
                key={address.mailId}
                icon={getAvatarIcon(`${address.mailId[0]} ${address.mailId[1]}`)}
                title={address.mailId}
                accessories={[
                  {
                    icon: account.role === "super_admin" && address.isPrimary ? Icon.Crown : undefined,
                    tooltip: "Super Administrator",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push icon={Icon.Envelope} title="Emails" target={<Emails account={account} />} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function Emails({ account }: { account: Account }) {
  const [selectedFolderId, setSelectedFolderId] = useState("");

  const { isLoading: isLoadingFolders, data: folders } = useFetch(`${API_URL}/accounts/${account.accountId}/folders`, {
    headers: getZohoHeaders(),
    parseResponse: parseZohoResponse<Folder[]>,
    initialData: [],
  });

  const {
    isLoading,
    data: emails,
    pagination,
    mutate,
  } = useFetch(
    (options: { page: number }) =>
      `${API_URL}/accounts/${account.accountId}/messages/view?folderId=${selectedFolderId}&limit=${PAGE_LIMIT}&start=${options.page * PAGE_LIMIT + 1}`,
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
        fetch(`${API_URL}/accounts/${account.accountId}/updatemessage`, {
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
      <List.Section title={account.displayName}>
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
      </List.Section>
    </List>
  );
}

function EmailContent({ accountId, email }: { accountId: number; email: EmailMessage }) {
  const { isLoading, data } = useFetch(
    `${API_URL}/accounts/${accountId}/folders/${email.folderId}/messages/${email.messageId}/content`,
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
