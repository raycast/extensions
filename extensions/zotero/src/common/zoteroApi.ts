import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

import he from "he";

interface Preferences {
  api_token: string;
  user_id: string;
}

export type QueryResultItem = {
  id: string;
  bib: string;
  title: string;
  subtitle: string;
  url: string;
  link: string;
  raw_link: string;
  accessoryTitle: string;
  icon: string;
};

function removeTags(str: string) {
  if (str === null || str === "") return false;
  else str = he.decode(str.toString());
  return str.replace(/(<([^>]+)>)/gi, "");
}

const parseQuery = (q: string) => {
  const queryItems = q.split(" ");
  const qs = queryItems.filter((c) => !c.startsWith("."));
  const ts = queryItems.filter((c) => c.startsWith("."));

  let qss = "";
  if (qs.length) {
    qss = qs.join(" ");
  }

  let tss = "";
  if (ts.length) {
    tss = ts.map((x) => encodeURIComponent(x.substring(1))).join("%20||%20");
  }

  return { qss, tss };
};

const parseResponse = (item) => {
  let name = "";
  if (item.data.publicationTitle) {
    name = name + item.data.publicationTitle.split(":")[0];
  }
  const date = new Date(item.data.date);

  return {
    id: `${item.key}`,
    bib: `${removeTags(item.bib)}`,
    title: `${item.data.title.substring(0, 60)}`,
    subtitle: `${item.meta.creatorSummary}`,
    raw_link: `${item.links.alternate.href}`,
    link: `${item.data.url}`,
    url: `zotero://select/items/0_${item.key}`,
    accessoryTitle: `${name} ${!isNaN(date.getFullYear()) ? date.getFullYear() : ""}`,
    icon: `paper.png`,
  };
};

export const searchResources = async (q: string): Promise<QueryResultItem[]> => {
  const preferences: Preferences = getPreferenceValues();
  const requestOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.api_token}`,
    },
  };
  const { qss, tss } = parseQuery(q);
  const query = `https://api.zotero.org/users/${preferences.user_id}/items?v=3&include=bib,data&q=${encodeURIComponent(
    qss
  )}&itemType=-attachment%20||%20note&sort=dateAdded&start=0&limit=20&tag=${tss}`;

  const response = await fetch(query, requestOptions);
  if (response.status !== 200) {
    const data = (await response.json()) as { message?: unknown } | undefined;
    throw new Error(`${data?.message || "Not OK"}`);
  }
  const data = (await response.json()) as Array<any>;
  return data.map(parseResponse);
};
