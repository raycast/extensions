import { JSCodeshift, Collection } from "jscodeshift";
import { isVariableDeclared, removeImport, addImport } from "../utils";

export default function StorageTransform(
  j: JSCodeshift,
  root: Collection<any>
) {
  if (isVariableDeclared(j, root, "LocalStorage")) {
    throw new Error("LocalStorage already defined");
  }

  let needToAddImport = false;

  for (let name of [
    ["allLocalStorageItems", "allItems"],
    ["getLocalStorageItem", "getItem"],
    ["setLocalStorageItem", "setItem"],
    ["removeLocalStorageItem", "removeItem"],
    ["clearLocalStorage", "clear"],
  ]) {
    root
      .find(j.CallExpression, {
        callee: {
          name: name[0],
        },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.callExpression(
          j.memberExpression(
            j.identifier("LocalStorage"),
            j.identifier(name[1]),
            false
          ),
          p.node.arguments
        );
      });

    removeImport(j, root, name[0]);
  }

  for (let name of [
    ["LocalStorageValue", "Value"],
    ["LocalStorageValues", "Values"],
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
          j.tsQualifiedName(
            j.identifier("LocalStorage"),
            j.identifier(name[1])
          ),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
  }

  if (needToAddImport) {
    addImport(j, root, "LocalStorage");
  }
}
