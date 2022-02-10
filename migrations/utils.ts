import { JSCodeshift, Collection } from "jscodeshift";

export function isVariableDeclared(
  j: JSCodeshift,
  root: Collection<any>,
  variable: string
) {
  return (
    root
      .find(j.Identifier, {
        name: variable,
      })
      .filter(
        (path) =>
          path.parent.value.type !== "MemberExpression" &&
          path.parent.value.type !== "QualifiedTypeIdentifier" &&
          path.parent.value.type !== "JSXMemberExpression"
      )
      .size() > 0
  );
}

export function removeImport(
  j: JSCodeshift,
  root: Collection<any>,
  name: string
) {
  root
    .find(j.ImportDeclaration, { source: { value: "@raycast/api" } })
    .replaceWith((p) =>
      j.importDeclaration(
        p.node.specifiers.filter((x) => x.local?.name !== name),
        p.node.source,
        p.node.importKind
      )
    );
}

export function addImport(j: JSCodeshift, root: Collection<any>, name: string) {
  root
    .find(j.ImportDeclaration, { source: { value: "@raycast/api" } })
    .replaceWith((p) => {
      if (p.node.specifiers.some((x) => x.local?.name === name)) {
        return p.node;
      }
      return j.importDeclaration(
        p.node.specifiers.concat(j.importSpecifier(j.identifier(name))),
        p.node.source,
        p.node.importKind
      );
    });
}
