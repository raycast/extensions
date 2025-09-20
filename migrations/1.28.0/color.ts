import { JSCodeshift, Collection } from "jscodeshift";
import { removeImport, addImport } from "../utils";

export default function ColorTransform(j: JSCodeshift, root: Collection<any>) {
  let needToAddImport = false;

  for (let name of [
    ["DynamicColor", "DynamicColor"],
    ["ColorLike", "ColorLike"],
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
          j.tsQualifiedName(j.identifier("Color"), j.identifier(name[1])),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
  }

  if (needToAddImport) {
    addImport(j, root, "Color");
  }
}
