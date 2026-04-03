import {
  Form,
  Action,
  ActionPanel,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { shortenUrl, handleApiError } from "./api";

interface ShortenFormValues {
  url: string;
  vanity: string;
  maxViews: string;
}

function isValidUrl(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

export default function ShortenUrlCommand() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: ShortenFormValues) {
    const url = values.url.trim();
    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a URL",
      });
      return;
    }

    if (!isValidUrl(url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please enter a valid URL",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await shortenUrl(url, {
        vanity: values.vanity?.trim() || undefined,
        maxViews: values.maxViews ? parseInt(values.maxViews, 10) : undefined,
      });

      await Clipboard.copy(result.url);
      await showToast({
        style: Toast.Style.Success,
        title: "URL shortened!",
        message: result.url,
      });
      await popToRoot();
    } catch (error) {
      await handleApiError(error, "Shorten URL");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Shorten URL" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/very/long/url"
        info="The URL you want to shorten"
      />
      <Form.TextField
        id="vanity"
        title="Vanity (optional)"
        placeholder="my-custom-slug"
        info="A custom slug for your shortened URL"
      />
      <Form.TextField
        id="maxViews"
        title="Max Views (optional)"
        placeholder="e.g. 100"
        info="Maximum number of views before the link is deleted"
      />
    </Form>
  );
}
