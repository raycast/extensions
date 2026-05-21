import { getDefaultStore } from "jotai";
import { zodVersionAtom } from "./atoms";
import { docsV3, DocsV3Item } from "./docs/zod-3";
import { docsV4, DocsV4Item, DocsV4ItemHeading } from "./docs/zod-4";

const defaultStore = getDefaultStore();
const zodVersion = defaultStore.get(zodVersionAtom);

function getFullUrl(slugOrId: string) {
  const v3Subdomain = zodVersion === "3" ? "v3." : "";
  const v3IdPath = zodVersion === "3" ? "?id=" : "";

  return `https://${v3Subdomain}zod.dev/${v3IdPath}${slugOrId}`;
}

interface ListItem {
  id: string;
  title: string;
  url: string;
  subtitle: string;
}

function normalizeHeadingId(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^\da-z-]+/g, "");
}

function flattenV4Heading(slug: string, headings: DocsV4ItemHeading[], parentTitle: string): ListItem[] {
  return headings.flatMap((heading) => {
    if (typeof heading === "string") {
      const encoded = normalizeHeadingId(heading);

      return [
        {
          id: `${slug}#${encoded}`,
          title: heading,
          url: `${getFullUrl(slug)}#${encoded}`,
          subtitle: parentTitle,
        },
      ];
    }

    const title = heading.title;
    const encoded = normalizeHeadingId(title);
    const nextParentTitle = parentTitle ? `${parentTitle} | ${title}` : title;

    return [
      {
        id: `${slug}#${encoded}`,
        title,
        url: `${getFullUrl(slug)}#${encoded}`,
        subtitle: parentTitle,
      },
      ...flattenV4Heading(slug, heading.headings ?? [], nextParentTitle),
    ];
  });
}

export function flattenV4Docs(docs: DocsV4Item[] = docsV4) {
  return docs.flatMap((item) => {
    const rootItem: ListItem = {
      id: item.slug || item.title,
      title: item.title,
      url: getFullUrl(item.slug),
      subtitle: "",
    };

    return [rootItem, ...(item.headings ? flattenV4Heading(item.slug, item.headings, item.title) : [])];
  });
}

export function flattenV3Docs(docs: DocsV3Item[] = docsV3, parentTitle = ""): ListItem[] {
  return docs.flatMap((item) => {
    if (item.children) {
      const nextParentTitle = parentTitle ? `${parentTitle} | ${item.title}` : item.title;
      return flattenV3Docs(item.children, nextParentTitle);
    }

    return [{ id: item.id, title: item.title, url: getFullUrl(item.id), subtitle: parentTitle }];
  });
}
