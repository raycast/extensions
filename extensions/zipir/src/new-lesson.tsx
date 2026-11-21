import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { createLesson, getFormats, lessonUrl, toastFailure } from "./api";

type Mode = "text" | "url";

export default function NewLesson() {
  const { pop } = useNavigation();
  const { data: formats, isLoading } = usePromise(() => getFormats(), []);
  const [mode, setMode] = useState<Mode>("text");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Form
      isLoading={isLoading || submitting}
      navigationTitle="New Zıpır lesson"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Lesson"
            icon={Icon.Plus}
            onSubmit={async (values: { source?: string; url?: string; format?: string }) => {
              const text = values.source?.trim();
              const url = values.url?.trim();
              if (!text && !url) {
                await showToast({ style: Toast.Style.Failure, title: "Give a text or a URL" });
                return;
              }
              setSubmitting(true);
              const toast = await showToast({ style: Toast.Style.Animated, title: "Creating the lesson" });
              try {
                const lesson = await createLesson({
                  ...(url ? { url } : { text: text as string }),
                  ...(values.format && values.format !== "auto" ? { format: values.format } : {}),
                });
                await toast.hide();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Lesson created",
                  message: "The storyboard comes first; nothing renders until you approve it.",
                });
                pop();
                await open(lessonUrl(lesson.id));
              } catch (error) {
                await toast.hide();
                toastFailure(error);
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Zıpır reads the source, builds a storyboard with a citation on every scene, and renders only after you approve it." />
      <Form.Dropdown id="mode" title="Source" value={mode} onChange={(value: string) => setMode(value as Mode)}>
        <Form.Dropdown.Item value="text" title="Pasted text" icon={Icon.Text} />
        <Form.Dropdown.Item value="url" title="A public web page" icon={Icon.Globe} />
      </Form.Dropdown>
      {mode === "text" ? (
        <Form.TextArea
          id="source"
          title="Document text"
          placeholder="Paste the procedure, the policy or the lesson notes…"
          enableMarkdown={false}
        />
      ) : (
        <Form.TextField
          id="url"
          title="Page URL"
          placeholder="https://…"
          info="A public page; its readable text becomes the document."
        />
      )}
      <Form.Dropdown id="format" title="Format" defaultValue="auto">
        <Form.Dropdown.Item value="auto" title="Let Zıpır choose" icon={Icon.Wand} />
        {(formats ?? []).map((format) => (
          <Form.Dropdown.Item key={format.id} value={format.id} title={format.title || format.id} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Rendering a lesson uses the account's included video minutes. Editing a single scene does not start a render." />
    </Form>
  );
}
