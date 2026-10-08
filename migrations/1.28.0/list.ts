import { JSCodeshift, Collection } from "jscodeshift";
import { removeImport, addImport } from "../utils";

export default function ListTransform(j: JSCodeshift, root: Collection<any>) {
  let needToAddImport = false;

  for (let name of [
    ["ListSection", "Section"],
    ["ListItem", "Item"],
  ]) {
    root
      .find(j.JSXOpeningElement, {
        name: { name: name[0] },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.jsxOpeningElement(
          j.jsxMemberExpression(j.jsxIdentifier("List"), j.jsxIdentifier(name[1])),
          p.node.attributes,
          p.node.selfClosing
        );
      });
    root
      .find(j.JSXClosingElement, {
        name: { name: name[0] },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.jsxClosingElement(j.jsxMemberExpression(j.jsxIdentifier("List"), j.jsxIdentifier(name[1])));
      });

    root
      .find(j.TSTypeReference, {
        typeName: {
          name: name[0] + "Props",
        },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.tsTypeReference(
          j.tsQualifiedName(j.tsQualifiedName(j.identifier("List"), j.identifier(name[1])), j.identifier("Props")),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
    removeImport(j, root, name[0] + "Props");
  }

  for (let name of [["ListProps", "Props"]]) {
    root
      .find(j.TSTypeReference, {
        typeName: {
          name: name[0],
        },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.tsTypeReference(j.tsQualifiedName(j.identifier("List"), j.identifier(name[1])), p.node.typeParameters);
      });

    removeImport(j, root, name[0]);
  }

  if (needToAddImport) {
    addImport(j, root, "List");
  }
}
