import { JSCodeshift, Collection } from "jscodeshift";
import { isVariableDeclared, removeImport, addImport } from "../utils";

export default function ActionTransform(j: JSCodeshift, root: Collection<any>) {
  if (isVariableDeclared(j, root, "Action")) {
    throw new Error("Action already defined");
  }

  let needToAddImport = false;

  for (let name of [
    ["CopyToClipboardAction", "CopyToClipboard"],
    ["OpenAction", "Open"],
    ["OpenInBrowserAction", "OpenInBrowser"],
    ["OpenWithAction", "OpenWith"],
    ["PasteAction", "Paste"],
    ["PushAction", "Push"],
    ["ShowInFinderAction", "ShowInFinder"],
    ["SubmitFormAction", "SubmitForm"],
    ["TrashAction", "Trash"],
  ]) {
    root
      .find(j.JSXOpeningElement, {
        name: { name: name[0] },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.jsxOpeningElement(
          j.jsxMemberExpression(
            j.jsxIdentifier("Action"),
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
            j.jsxIdentifier("Action"),
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
            j.tsQualifiedName(j.identifier("Action"), j.identifier(name[1])),
            j.identifier("Props")
          ),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
    removeImport(j, root, name[0] + "Props");
  }

  root
    .find(j.JSXOpeningElement, {
      name: { name: "ActionPanelItem" },
    })
    .replaceWith((p) => {
      needToAddImport = true;
      return j.jsxOpeningElement(
        j.jsxIdentifier("Action"),
        p.node.attributes,
        p.node.selfClosing
      );
    });
  root
    .find(j.JSXOpeningElement, {
      name: { object: { name: "ActionPanel" }, property: { name: "Item" } },
    })
    .replaceWith((p) => {
      needToAddImport = true;
      return j.jsxOpeningElement(
        j.jsxIdentifier("Action"),
        p.node.attributes,
        p.node.selfClosing
      );
    });
  root
    .find(j.JSXClosingElement, {
      name: { name: "ActionPanelItem" },
    })
    .replaceWith((p) => {
      needToAddImport = true;
      return j.jsxClosingElement(j.jsxIdentifier("Action"));
    });
  root
    .find(j.JSXClosingElement, {
      name: { object: { name: "ActionPanel" }, property: { name: "Item" } },
    })
    .replaceWith((p) => {
      needToAddImport = true;
      return j.jsxClosingElement(j.jsxIdentifier("Action"));
    });

  root
    .find(j.TSTypeReference, {
      typeName: {
        name: "ActionPanelItemProps",
      },
    })
    .replaceWith((p) => {
      needToAddImport = true;
      return j.tsTypeReference(
        j.tsQualifiedName(j.identifier("Action"), j.identifier("Props")),
        p.node.typeParameters
      );
    });

  removeImport(j, root, "ActionPanelItem");
  removeImport(j, root, "ActionPanelItemProps");

  if (needToAddImport) {
    addImport(j, root, "Action");
  }
}
