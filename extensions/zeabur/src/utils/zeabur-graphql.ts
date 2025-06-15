import fetch from "node-fetch";
import { Template, TemplateInfo } from "../type";

const api = "https://api.zeabur.com/graphql";

const getTemplateQuery = {
  operationName: "GetTemplates",
  variables: {},
  query:
    "query GetTemplates {\n  templates {\n    edges {\n      node {\n        code\n        name\n        description\n        iconURL\n        deploymentCnt\n        services {\n          name\n          template\n          marketplaceItem {\n            code\n            __typename\n          }\n          planMeta\n          planType\n          prebuiltItem {\n            icon\n            __typename\n          }\n          __typename\n        }\n        previewURL\n        variables {\n          desc\n          key\n          question\n          type\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}",
};

export async function getTemplates() {
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(getTemplateQuery),
  });

  const json = (await res.json()) as Template;
  const templates: TemplateInfo[] = json.data.templates.edges.map((edge) => {
    const node = edge.node;
    return {
      code: node.code,
      name: node.name,
      description: node.description,
      iconURL: node.iconURL,
    };
  });
  return templates;
}
