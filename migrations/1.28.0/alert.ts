import { JSCodeshift, Collection } from "jscodeshift";
import { isVariableDeclared, removeImport, addImport } from "../utils";

export default function AlertTransform(j: JSCodeshift, root: Collection<any>) {
  if (isVariableDeclared(j, root, "Alert")) {
    throw new Error("Alert already defined");
  }

  let needToAddImport = false;

  for (let name of [
    ["AlertOptions", "Options"],
    ["AlertActionOptions", "ActionOptions"],
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
          j.tsQualifiedName(j.identifier("Alert"), j.identifier(name[1])),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
  }

  for (let name of [["AlertActionStyle", "ActionStyle"]]) {
    root
      .find(j.Identifier, {
        name: name[0],
      })
      .filter((path) => path.parent.value.type !== "ImportSpecifier")
      .replaceWith((p) => {
        needToAddImport = true;
        return j.memberExpression(j.identifier("Alert"), j.identifier(name[1]));
      });

    removeImport(j, root, name[0]);
  }

  if (needToAddImport) {
    addImport(j, root, "Alert");
  }
}
