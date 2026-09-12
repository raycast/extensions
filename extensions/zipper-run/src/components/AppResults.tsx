import { Detail, List } from "@raycast/api";
import { AppResultsProps } from "../api/types";

export const AppResults = ({ appResults, isLoading }: AppResultsProps & { isLoading: boolean }) => {
  const data = appResults;

  if (typeof data === "string") {
    return <Detail markdown={`### Applet Results \n${data}`} isLoading={isLoading} />;
  }

  if (typeof data === "object" && !Array.isArray(data) && !Object.values(data).some((val) => typeof val === "object")) {
    const markdown = objectToMarkdown(data);
    return <Detail markdown={markdown} isLoading={isLoading} />;
  } else if (typeof data === "object") {
    return (
      <List isShowingDetail isLoading={isLoading}>
        {generateListItems(data)}
      </List>
    );
  }

  return null;
};

export const objectToMarkdown = (data: Record<string, string | object | []>): string => {
  return Object.entries(data)
    .map(([key, value]) => {
      if (typeof value === "string" && isImageUrl(value)) {
        return `<img src="${value}" alt="${key}" width="300" height="300" />`;
      }
      return `**${key}:** ${value}`;
    })
    .join("\n\n");
};

export const generateListItems = (results: object | string | []) => {
  return Object.entries(results).map(([key, value]) => {
    if (key === "__meta") return null;

    let detail;
    if (typeof value === "object") {
      detail = <List.Item.Detail markdown={`\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``} />;
    } else {
      detail = <List.Item.Detail markdown={String(value)} />;
    }

    return <List.Item key={key} title={key} detail={detail} />;
  });
};

const isImageUrl = (url: string): boolean => {
  return /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/.test(url);
};
