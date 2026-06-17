import { API, FileInfo, Transform } from "jscodeshift";
import { renameJSXProp } from "../utils";

// https://astexplorer.net/#/gist/16933aa3bbb241249cc33c65329da028/c548ce21d18d22015c5ab5a02c9984df496bd9fa
const transform: Transform = (file: FileInfo, api: API) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  renameJSXProp(
    j,
    root,
    ["Action", "CopyToClipboard"],
    "transient",
    "concealed"
  );

  root
    .find(j.CallExpression, {
      callee: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "Clipboard" },
        property: { name: "copy" },
      },
    })
    .find(j.Property, { key: { name: "transient" } })
    .forEach((p) => {
      if (p.node.key.type !== "Identifier") {
        return;
      }
      p.node.key.name = "concealed";
    });
  return root.toSource();
};

export default transform;
