import { JSCodeshift, Collection } from "jscodeshift";
import { isVariableDeclared, removeImport, addImport } from "../utils";

export default function ClipboardTransform(
  j: JSCodeshift,
  root: Collection<any>
) {
  if (isVariableDeclared(j, root, "Clipboard")) {
    throw new Error("Clipboard already defined");
  }

  let needToAddImport = false;

  for (let name of [
    ["copyTextToClipboard", "copy"],
    ["clearClipboard", "clear"],
    ["pasteText", "paste"],
  ]) {
    root
      .find(j.CallExpression, {
        callee: {
          name: name[0],
        },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.callExpression(
          j.memberExpression(
            j.identifier("Clipboard"),
            j.identifier(name[1]),
            false
          ),
          p.node.arguments
        );
      });

    removeImport(j, root, name[0]);
  }

  if (needToAddImport) {
    addImport(j, root, "Clipboard");
  }
}
