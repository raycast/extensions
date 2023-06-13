import { Collection, JSCodeshift } from "jscodeshift";

/**
 * Transforms usages of `itemSize={Grid.ItemSize.Small}`, `itemSize={Grid.ItemSize.Medium}` and
 * `itemSize={Grid.ItemSize.Large}` to `columns={8}`, `columns={5}` and `columns={3}`
 * respectively.
 */
export default function GridTransform(j: JSCodeshift, root: Collection<any>) {
  root
    .find(j.JSXAttribute, {
      name: { type: "JSXIdentifier", name: "itemSize" },
      value: {
        expression: {
          type: "MemberExpression",
          object: {
            type: "MemberExpression",
            object: { name: "Grid" },
            property: { name: "ItemSize" },
          },
        },
      },
    })
    .forEach((p) => {
      if (
        p.value.value?.type !== "JSXExpressionContainer" ||
        p.value.value.expression.type !== "MemberExpression" ||
        p.value.value.expression.property.type !== "Identifier"
      ) {
        return;
      }

      switch (p.value.value.expression.property.name) {
        case "Small": {
          p.value.value.expression = j.literal(8);
          p.node.name.name = "columns";
          return;
        }
        case "Medium": {
          p.value.value.expression = j.literal(5);
          p.node.name.name = "columns";
          return;
        }
        case "Large": {
          p.value.value.expression = j.literal(3);
          p.node.name.name = "columns";
          return;
        }
        default: {
          return;
        }
      }
    });
}
