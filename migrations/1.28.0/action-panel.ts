import { JSCodeshift, Collection } from "jscodeshift";
import { isVariableDeclared, removeImport, addImport } from "../utils";

export default function ActionPanelTransform(
  j: JSCodeshift,
  root: Collection<any>
) {
  let needToAddImport = false;

  for (let name of [
    ["ActionPanelSubmenu", "Submenu"],
    ["ActionPanelSection", "Section"],
  ]) {
    root
      .find(j.JSXOpeningElement, {
        name: { name: name[0] },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.jsxOpeningElement(
          j.jsxMemberExpression(
            j.jsxIdentifier("ActionPanel"),
            j.jsxIdentifier(name[1])
          ),
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
        return j.jsxClosingElement(
          j.jsxMemberExpression(
            j.jsxIdentifier("ActionPanel"),
            j.jsxIdentifier(name[1])
          )
        );
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
          j.tsQualifiedName(
            j.tsQualifiedName(
              j.identifier("ActionPanel"),
              j.identifier(name[1])
            ),
            j.identifier("Props")
          ),
          p.node.typeParameters
        );
      });
    root
      .find(j.TSTypeReference, {
        typeName: {
          name: name[0] + "Children",
        },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.tsTypeReference(
          j.tsQualifiedName(
            j.tsQualifiedName(
              j.identifier("ActionPanel"),
              j.identifier(name[1])
            ),
            j.identifier("Children")
          ),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
    removeImport(j, root, name[0] + "Props");
    removeImport(j, root, name[0] + "Children");
  }

  for (let name of [
    ["ActionPanelProps", "Props"],
    ["ActionPanelChildren", "Children"],
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
          j.tsQualifiedName(j.identifier("ActionPanel"), j.identifier(name[1])),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
  }

  if (needToAddImport) {
    addImport(j, root, "Action");
  }
}
