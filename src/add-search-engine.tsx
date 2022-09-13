import { Action, ActionPanel, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useMemo } from "react";
import { URL } from "node:url";
import { useFetch, useForm } from "@raycast/utils";
import { SavedSite, SavedSites, writeSavedSites, getExistingTitles } from "./saved-sites";
import SearchSuggestions from "./search-the-web";

const collator = new Intl.Collator(undefined, { sensitivity: "accent" });

function getTitleErrorMessage(title: string, existingTitles: string[]) {
  if (title.length === 0) {
    return "Title may not be empty";
  }

  title = title.trim();
  if (title.length === 0) {
    return "Title may not consist solely of whitespace characters";
  }

  if (existingTitles.some((existing) => collator.compare(title, existing) === 0)) {
    return "A saved search with this title already exists";
  }

  return undefined;
}

// https://stackoverflow.com/a/43467144
function getUrlErrorMessage(url: string) {
  if (url.length === 0) {
    return "URL template may not be empty";
  }

  if (!url.includes("{}")) {
    return 'URL template is missing the template string "{}"';
  }

  try {
    new URL(url);
  } catch (_) {
    return 'Invalid URL (did you forget the "https://"?)';
  }

  return undefined;
}

export default function Command({
  savedSites,
  setSavedSites,
}: {
  savedSites: SavedSites;
  setSavedSites: (_: SavedSites) => void;
}) {
  const { pop, push } = useNavigation();
  const isInitialView = savedSites.items.length === 0;

  const existingTitles = useMemo(() => {
    return getExistingTitles(savedSites);
  }, [savedSites]);
  // const [existingTitles, setExistingTitles] = useState(getExistingTitles(savedSites));

  const { handleSubmit, itemProps } = useForm<SavedSite>({
    onSubmit(data: { title: string; url: string }) {
      const { title } = data;
      savedSites.items.push(data);
      savedSites.items.sort((ss1, ss2) => collator.compare(ss1.title, ss2.title));

      writeSavedSites(savedSites);
      setSavedSites(savedSites);

      showToast({
        style: Toast.Style.Success,
        title: `"${title}" was successfully added`,
      });

      pop();
      if (isInitialView) {
        push(<SearchSuggestions />);
      }
    },
    validation: {
      title: (title) => getTitleErrorMessage(title ?? "", existingTitles),
      url: (url) => getUrlErrorMessage(url ?? ""),
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Search" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Add new search"
        text="Specify the title and the URL template of the website you want to be able to search."
      />
      <Form.Separator></Form.Separator>
      <Form.TextField
        key="title"
        title="Title"
        placeholder="Search engine or website title"
        {...itemProps.title}
      ></Form.TextField>
      <Form.TextField
        key="url"
        title="URL"
        placeholder="URL Template"
        info={[
          "The URL template to use for searching this site. " +
            'Since this is a URL template, write "{}" where your search text should go; the "{}" will be replaced with your (URL-encoded) search text. ' +
            "Examples:",
          "- https://www.google.com/search?q={}",
          "- https://duckduckgo.com/?q={}",
          "- https://en.wikipedia.org/wiki/{}",
        ].join("\n")}
        {...itemProps.url}
      ></Form.TextField>
    </Form>
  );
}
