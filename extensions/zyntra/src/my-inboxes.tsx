import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useForm, useLocalStorage } from "@raycast/utils";
import { EmailPreview, ZyntraClient } from "zyntramail-api";

const { apiKey, teamId } = getPreferenceValues<Preferences>();
const client = new ZyntraClient({ apiKey, teamId });

const useInboxes = () => useLocalStorage<string[]>("ZYNTRA-INBOXES");

export default function MyInboxes() {
  const { isLoading, value: inboxes = [], setValue: setInboxes } = useInboxes();

  return (
    <List>
      {!isLoading && !inboxes.length ? (
        <List.EmptyView
          icon={Icon.Info}
          title="You don't have any mailboxes yet."
          description="Please create your first mailbox to view emails."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Mailbox" target={<AddMailbox />} />
            </ActionPanel>
          }
        />
      ) : (
        inboxes.map((inbox) => (
          <List.Item
            key={inbox}
            icon={Icon.AtSymbol}
            title={inbox}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Envelope} title="Retrieve Emails" target={<Emails inbox={inbox} />} />
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add Mailbox"
                    target={<AddMailbox />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                  <Action
                    icon={Icon.Minus}
                    title="Remove Mailbox"
                    onAction={async () => {
                      await setInboxes(inboxes.filter((i) => i !== inbox));
                    }}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddMailbox() {
  const { isLoading, value: inboxes = [], setValue: setInboxes } = useInboxes();
  const { handleSubmit, itemProps, values } = useForm<{ name: string }>({
    async onSubmit() {
      const toast = await showToast(Toast.Style.Animated, "Adding", newInbox);
      await setInboxes([...inboxes, newInbox]);
      toast.style = Toast.Style.Success;
      toast.title = "Added";
      await popToRoot();
    },
    validation: {
      name(value) {
        if (!value?.trim()) return "The item is required";
        if (inboxes.includes(newInbox)) return "Mailbox already exists";
      },
    },
  });
  const newInbox = `${teamId}.${values.name}@zyntramail.com`;

  return (
    <Form
      navigationTitle={`My Inboxes > Add`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Mailbox" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Mailbox name" {...itemProps.name} />
      <Form.Description text={newInbox} />
    </Form>
  );
}

function Emails({ inbox }: { inbox: string }) {
  const {
    isLoading,
    data: emails,
    mutate,
  } = useCachedPromise(
    async (inbox: string) => {
      const emails = await client.getEmails(inbox);
      return emails;
    },
    [inbox],
    {
      initialData: [],
    },
  );
  return (
    <List navigationTitle={`My Inboxes > ${inbox} > Emails`} isLoading={isLoading}>
      {!isLoading && !emails.length ? (
        <List.EmptyView title="No emails yet" description="Send your first test email to get started!" />
      ) : (
        emails.map((email) => (
          <List.Item
            key={email.uuid}
            icon={Icon.AtSymbol}
            title={email.from}
            subtitle={email.subject}
            accessories={[{ date: new Date(email.receivedAt) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.AppWindowSidebarLeft}
                  title="Email Details"
                  target={<EmailDetails email={email} />}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Email"
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      title: "Confirm Deletion",
                      message: `Are you sure you want to delete "${email.uuid}"?`,
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting", email.uuid);
                          try {
                            await mutate(client.deleteEmail(email.uuid), {
                              optimisticUpdate(data) {
                                return data.filter((e) => e.uuid !== email.uuid);
                              },
                            });
                            toast.style = Toast.Style.Success;
                            toast.title = "Deleted";
                          } catch (error) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed";
                            toast.message = `${error}`;
                          }
                        },
                      },
                    })
                  }
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function EmailDetails({ email }: { email: EmailPreview }) {
  const { isLoading, data } = useCachedPromise(
    async (id: string) => {
      const email = await client.getEmailById(id);
      return email;
    },
    [email.uuid],
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data && (
        <>
          <List.Item
            icon={Icon.Text}
            title="Details"
            detail={
              <List.Item.Detail
                markdown={`
| - | - |
|---|---|
| To | ${data.to} |
| From | ${data.from} |
| Subject | ${data.subject} |
| Received At | ${new Date(data.receivedAt).toLocaleString()} |
`}
              />
            }
          />
          {data.headers && (
            <List.Section title="Headers">
              {Object.entries(data.headers).map(([key, value]) => (
                <List.Item
                  key={key}
                  icon={Icon.Heading}
                  title={key}
                  detail={
                    <List.Item.Detail
                      markdown={`\`\`\`json
${JSON.stringify(value, null, 2)}
\`\`\``}
                    />
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
