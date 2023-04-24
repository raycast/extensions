import { Collection, JSCodeshift } from "jscodeshift";
import { renameJSXProp } from "../utils";

export default function ListTransform(j: JSCodeshift, root: Collection<any>) {
  renameJSXProp(j, root, "List", "enableFiltering", "filtering");
}
