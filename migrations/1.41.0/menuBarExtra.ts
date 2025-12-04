import { Collection, JSCodeshift } from "jscodeshift";

export default function MenuBarExtraTransform(
  j: JSCodeshift,
  root: Collection<any>
) {
  let replacedSeparator = false;

  root.findJSXElements("MenuBarExtra").forEach((p) => {
    const childNodes = j(p).childNodes();
    if (childNodes.length === 0) {
      return;
    }

    childNodes
      .find(j.JSXOpeningElement)
      .find(j.JSXMemberExpression, {
        type: "JSXMemberExpression",
        object: { type: "JSXIdentifier", name: "MenuBarExtra" },
        property: { type: "JSXIdentifier", name: "Separator" },
      })
      .forEach((p) => {
        const parentJSXElement = p.parent.parent;
        if (!parentJSXElement) {
          return;
        }

        j(parentJSXElement).insertBefore(
          j.jsxClosingElement(
            j.jsxMemberExpression(
              j.jsxIdentifier("MenuBarExtra"),
              j.jsxIdentifier("Section")
            )
          )
        );

        j(parentJSXElement).insertBefore(
          j.jsxOpeningElement(
            j.jsxMemberExpression(
              j.jsxIdentifier("MenuBarExtra"),
              j.jsxIdentifier("Section")
            )
          )
        );

        j(parentJSXElement).remove();

        replacedSeparator = true;
      });

    if (replacedSeparator) {
      const firstChild = childNodes.at(0).get();
      firstChild.insertBefore(
        j.jsxOpeningElement(
          j.jsxMemberExpression(
            j.jsxIdentifier("MenuBarExtra"),
            j.jsxIdentifier("Section")
          )
        )
      );

      const lastChild = childNodes.at(childNodes.length - 1).get();
      lastChild.insertBefore(
        j.jsxClosingElement(
          j.jsxMemberExpression(
            j.jsxIdentifier("MenuBarExtra"),
            j.jsxIdentifier("Section")
          )
        )
      );
    }
  });
}
