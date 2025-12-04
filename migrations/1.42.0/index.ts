import { API, FileInfo } from "jscodeshift";
import { renameJSXProp } from "../utils";

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  renameJSXProp(j, root, "Grid", "enableFiltering", "filtering");

  return root.toSource();
}
