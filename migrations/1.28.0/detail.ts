import { JSCodeshift, Collection } from "jscodeshift";
import { removeImport, addImport } from "../utils";

export default function DetailTransform(j: JSCodeshift, root: Collection<any>) {
  let needToAddImport = false;

  for (let name of [["DetailProps", "Props"]]) {
    root
      .find(j.TSTypeReference, {
        typeName: {
          name: name[0],
        },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.tsTypeReference(
          j.tsQualifiedName(j.identifier("Detail"), j.identifier(name[1])),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
  }

  if (needToAddImport) {
    addImport(j, root, "Detail");
  }
}
