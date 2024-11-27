import { API, FileInfo, Transform, ObjectProperty } from "jscodeshift";

const tryGetAccessoryTitle = (attribute) => {
  if (attribute?.name?.name === "accessoryTitle") {
    return attribute.value.expression || attribute.value;
  }
  return null;
};

const tryGetAccessoryIcon = (attribute) => {
  if (attribute?.name?.name === "accessoryIcon") {
    return attribute.value.expression || attribute.value;
  }
  return null;
};

const transform: Transform = (file: FileInfo, api: API) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.JSXOpeningElement)
    .find(j.JSXMemberExpression, {
      type: "JSXMemberExpression",
      object: { type: "JSXIdentifier", name: "List" },
      property: { type: "JSXIdentifier", name: "Item" },
    })
    .forEach((p) => {
      if (!p.parent.node.attributes) {
        return;
      }

      const objectExpressionProperties: ObjectProperty[] = [];
      for (let i = 0; i < p.parent.node.attributes.length; i++) {
        let shouldDeleteNode = false;
        const textValue = tryGetAccessoryTitle(p.parent.node.attributes[i]);
        if (textValue) {
          shouldDeleteNode = true;
          objectExpressionProperties.push(
            j.objectProperty(j.stringLiteral("text"), textValue)
          );
        }
        const iconValue = tryGetAccessoryIcon(p.parent.node.attributes[i]);
        if (iconValue) {
          shouldDeleteNode = true;
          objectExpressionProperties.push(
            j.objectProperty(j.stringLiteral("icon"), iconValue)
          );
        }
        if (shouldDeleteNode) {
          delete p.parent.node.attributes[i];
        }
      }

      if (objectExpressionProperties.length) {
        p.parent.node.attributes.push(
          j.jsxAttribute(
            j.jsxIdentifier("accessories"),
            j.jsxExpressionContainer(
              j.arrayExpression([
                j.objectExpression(objectExpressionProperties),
              ])
            )
          )
        );
      }
    });

  return root.toSource();
};

export default transform;
