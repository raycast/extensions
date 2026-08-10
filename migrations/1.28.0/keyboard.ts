import { JSCodeshift, Collection } from "jscodeshift";
import { isVariableDeclared, removeImport, addImport } from "../utils";

export default function KeyboardTransform(j: JSCodeshift, root: Collection<any>) {
  if (isVariableDeclared(j, root, "Keyboard")) {
    throw new Error("Keyboard already defined");
  }

  let needToAddImport = false;

  for (let name of [
    ["KeyboardShortcut", "Shortcut"],
    ["KeyModifier", "KeyModifier"],
    ["KeyEquivalent", "KeyEquivalent"],
  ]) {
    root
      .find(j.TSTypeReference, {
        typeName: {
          name: name[0],
        },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.tsTypeReference(
          j.tsQualifiedName(j.identifier("Keyboard"), j.identifier(name[1])),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
  }

  if (needToAddImport) {
    addImport(j, root, "Keyboard");
  }
}
