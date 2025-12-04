import { API, FileInfo } from "jscodeshift";
import GridTransform from "./grid";
import ListTransform from "./List";
import MenuBarExtraTransform from "./menuBarExtra";

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  GridTransform(j, root);
  ListTransform(j, root);
  MenuBarExtraTransform(j, root);

  return root.toSource();
}
