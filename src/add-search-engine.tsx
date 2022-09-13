import { Action, ActionPanel, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import { URL } from "node:url";
import { useForm } from "@raycast/utils";
import { SEARCH_TEMPLATE, SavedSite, SavedSites, writeSavedSites, getExistingTitlesAndUrls } from "./saved-sites";
import SearchSuggestions from "./search-the-web";
import { collator } from "./utils";

type FormData = SavedSite & { isDefault: boolean };

function getTitleErrorMessage(title: string, existingTitles: string[]) {
  if (title.length === 0) {
    return "Title may not be empty";
  }

  title = title.trim();
  if (title.length === 0) {
    return "Title may not consist solely of whitespace characters";
  }

  if (existingTitles.some((existing) => collator.compare(title, existing) === 0)) {
    return "A site with this title has already been saved";
  }

  return undefined;
}

// https://stackoverflow.com/a/43467144
function getUrlErrorMessage(url: string, existingUrls: string[]) {
  if (url.length === 0) {
    return "URL template may not be empty";
  }

  if (!url.includes(SEARCH_TEMPLATE)) {
    return `URL template is missing the template string "${SEARCH_TEMPLATE}"`;
  }

  try {
    new URL(url);
  } catch (_) {
    return 'Invalid URL (did you forget the "https://"?)';
  }

  if (existingUrls.some((existing) => collator.compare(url, existing) === 0)) {
    return "A site with this template URL has already been saved";
  }

  return undefined;
}

export default function Command({
  savedSites,
  setSavedSites,
  forceUpdate,
}: {
  savedSites: SavedSites;
  setSavedSites: (_: SavedSites) => void;
  forceUpdate?: () => void;
}) {
  const { pop, push } = useNavigation();
  const isInitialView = savedSites.items.length === 0;

  const existingTitlesAndUrls = useMemo(() => {
    return getExistingTitlesAndUrls(savedSites);
  }, [savedSites]);
  // const [existingTitles, setExistingTitles] = useState(getExistingTitles(savedSites));

  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit({ title, url, isDefault }) {
      savedSites.items.push({ title, url });
      savedSites.items.sort((ss1, ss2) => collator.compare(ss1.title, ss2.title));

      if (isDefault) {
        savedSites.defaultSiteTitle = title;
      }

      writeSavedSites(savedSites);
      setSavedSites(savedSites);

      showToast({
        style: Toast.Style.Success,
        title: `"${title}" was successfully added`,
      });

      pop();
      if (isInitialView) {
        push(<SearchSuggestions />);
      } else if (forceUpdate) {
        forceUpdate();
      }
    },
    validation: {
      title: (title) => getTitleErrorMessage(title ?? "", existingTitlesAndUrls.titles),
      url: (url) => getUrlErrorMessage(url ?? "", existingTitlesAndUrls.urls),
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
            `Since this is a URL template, write "${SEARCH_TEMPLATE}" where your search text should go; the "${SEARCH_TEMPLATE}" will be replaced with your (URL-encoded) search text. ` +
            "Examples:",
          `- https://www.google.com/search?q=${SEARCH_TEMPLATE}`,
          `- https://duckduckgo.com/?q=${SEARCH_TEMPLATE}`,
          `- https://en.wikipedia.org/wiki/${SEARCH_TEMPLATE}`,
        ].join("\n")}
        {...itemProps.url}
      ></Form.TextField>
      <Form.Checkbox
        key="default"
        title="Default?"
        label="Make this the default site for searches"
        info="This will override any previously assigned default"
        {...itemProps.isDefault}
      ></Form.Checkbox>
    </Form>
  );
}
