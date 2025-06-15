import { JSCodeshift, Collection } from "jscodeshift";
import { isVariableDeclared, removeImport, addImport } from "../utils";

export default function ToastTransform(j: JSCodeshift, root: Collection<any>) {
  let needToAddImport = false;

  for (let name of [
    ["ToastOptions", "Options"],
    ["ToastActionOptions", "ActionOptions"],
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
          j.tsQualifiedName(j.identifier("Toast"), j.identifier(name[1])),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
  }

  for (let name of [["ToastStyle", "Style"]]) {
    root
      .find(j.Identifier, {
        name: name[0],
      })
      .filter((path) => path.parent.value.type !== "ImportSpecifier")
      .replaceWith((p) => {
        needToAddImport = true;
        return j.memberExpression(j.identifier("Toast"), j.identifier(name[1]));
      });

    removeImport(j, root, name[0]);
  }

  root
    .find(j.CallExpression, {
      callee: { name: "showToast" },
    })
    .replaceWith((p) => {
      const args = [
        j.objectProperty(j.stringLiteral("style"), p.node.arguments[0] as any),
        j.objectProperty(j.stringLiteral("title"), p.node.arguments[1] as any),
      ];
      if (p.node.arguments[2]) {
        args.push(
          j.objectProperty(
            j.stringLiteral("message"),
            p.node.arguments[2] as any
          )
        );
      }
      return j.callExpression(j.identifier("showToast"), [
        j.objectExpression(args),
      ]);
    });

  let needToAddShowImport = false;
  root
    .find(j.NewExpression, {
      callee: { name: "Toast" },
    })
    .replaceWith((p) => {
      needToAddShowImport = true;

      return j.awaitExpression(
        j.callExpression(j.identifier("showToast"), p.node.arguments)
      );
    });

  if (needToAddImport) {
    addImport(j, root, "Toast");
  }
  if (needToAddShowImport) {
    addImport(j, root, "showToast");
  }
}
