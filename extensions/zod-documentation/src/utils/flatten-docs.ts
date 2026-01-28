import { docs } from "../docs";
import { getFullUrl } from "./get-full-url";

export interface Item {
  id: string;
  title: string;
  url: string;
  subtitle: string;
}

export function flattenDocs(documentation: typeof docs, parentTitle = "") {
  return documentation
    .map((item): Item[] => {
      if (item.children) {
        return flattenDocs(item.children, parentTitle ? `${parentTitle} | ${item.title}` : item.title).flat();
      } else {
        return [
          {
            id: item.id,
            title: item.title,
            url: getFullUrl(item.id),
            subtitle: parentTitle,
          },
        ];
      }
    })
    .flat();
}
