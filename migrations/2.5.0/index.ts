import { API, FileInfo } from "jscodeshift";

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const imports = new Map<string, { name: string; scope: any }>();
  let changed = false;

  function lookup(path: any, name: string) {
    for (let scope = path.scope; scope; scope = scope.parent) {
      // ast-types bundled with jscodeshift 0.15 cannot scan `catch {}`.
      if (scope.path.node.type === "CatchClause" && !scope.path.node.param)
        continue;
      if (scope.declares(name)) {
        // Older ast-types folds block bindings into their enclosing scope.
        // Ambiguous bindings must not be mistaken for the imported API.
        return scope.getBindings()[name].length === 1 ? scope : null;
      }
    }
    return null;
  }

  root
    .find(j.ImportDeclaration, { source: { value: "@raycast/api" } })
    .forEach((path) => {
      for (const specifier of path.node.specifiers || []) {
        if (!specifier.local) continue;
        if (specifier.type === "ImportSpecifier") {
          imports.set(specifier.local.name, {
            name: specifier.imported.name,
            scope: lookup(path, specifier.local.name),
          });
        } else if (specifier.type === "ImportNamespaceSpecifier") {
          imports.set(specifier.local.name, {
            name: "*",
            scope: lookup(path, specifier.local.name),
          });
        }
      }
    });

  function keyName(node: any): string | undefined {
    if (node.type === "Identifier" || node.type === "JSXIdentifier") {
      return node.name;
    }
    if (typeof node.value === "string") return node.value;
  }

  function propertyName(node: any): string | undefined {
    if (node.computed && node.key.type === "Identifier") return;
    return keyName(node.key);
  }

  function memberName(node: any): string | undefined {
    if (node.computed && node.property.type === "Identifier") return;
    return keyName(node.property);
  }

  // Resolve imports through their lexical bindings so shadowed variables and
  // similarly named APIs from other packages are left alone.
  function apiName(path: any): string | undefined {
    const node = path.node;
    if (node.type === "Identifier" || node.type === "JSXIdentifier") {
      const imported = imports.get(node.name);
      if (
        imported &&
        imported.scope &&
        lookup(path, node.name) === imported.scope
      ) {
        return imported.name;
      }
    } else if (
      node.type === "MemberExpression" ||
      node.type === "OptionalMemberExpression" ||
      node.type === "JSXMemberExpression" ||
      node.type === "TSQualifiedName"
    ) {
      const object = apiName(
        path.get(node.type === "TSQualifiedName" ? "left" : "object"),
      );
      const name =
        node.type === "TSQualifiedName"
          ? keyName(node.right)
          : memberName(node);
      if (object && name) return object === "*" ? name : `${object}.${name}`;
    }
  }

  function renameKey(node: any, name: string) {
    if (node.type === "Identifier") node.name = name;
    else node.value = name;
    changed = true;
  }

  const environmentNames: Record<string, string> = {
    commandName: "entryPointName",
    commandMode: "entryPointMode",
  };

  function migrateEnvironmentMember(path: any) {
    const name = memberName(path.node);
    if (
      apiName(path.get("object")) === "environment" &&
      name &&
      Object.prototype.hasOwnProperty.call(environmentNames, name)
    ) {
      renameKey(path.node.property, environmentNames[name]);
    }
  }
  root.find(j.MemberExpression).forEach(migrateEnvironmentMember);
  root.find(j.OptionalMemberExpression).forEach(migrateEnvironmentMember);

  function migratePattern(pattern: any) {
    for (const property of pattern.properties) {
      if (property.type !== "Property" && property.type !== "ObjectProperty")
        continue;
      const name = propertyName(property);
      if (
        !name ||
        !Object.prototype.hasOwnProperty.call(environmentNames, name)
      )
        continue;
      // Preserve local names, defaults, and assignment targets when expanding
      // shorthand: { commandName } becomes { entryPointName: commandName }.
      property.key = j.identifier(environmentNames[name]);
      property.computed = false;
      property.shorthand = false;
      changed = true;
    }
  }
  root.find(j.VariableDeclarator).forEach((path) => {
    if (
      path.node.id.type === "ObjectPattern" &&
      path.node.init &&
      apiName(path.get("init")) === "environment"
    ) {
      migratePattern(path.node.id);
    }
  });
  root.find(j.AssignmentExpression).forEach((path) => {
    if (
      path.node.left.type === "ObjectPattern" &&
      apiName(path.get("right")) === "environment"
    ) {
      migratePattern(path.node.left);
    }
  });

  function isShortcutType(path: any): boolean {
    return (
      path.node?.type === "TSTypeReference" &&
      apiName(path.get("typeName")) === "Keyboard.Shortcut"
    );
  }

  function isShortcutAttribute(path: any): boolean {
    if (
      path.node?.type !== "JSXAttribute" ||
      path.node.name.name !== "shortcut"
    )
      return false;
    const component = apiName(path.parent.get("name"));
    return (
      !!component && /^(Action|ActionPanel|MenuBarExtra)(\.|$)/.test(component)
    );
  }

  const shortcutBindings: { name: string; scope: any }[] = [];
  function addShortcutBinding(path: any) {
    if (!lookup(path, path.node.name)) return;
    if (
      !shortcutBindings.some(
        (binding) =>
          binding.scope &&
          binding.name === path.node.name &&
          binding.scope === lookup(path, path.node.name),
      )
    ) {
      shortcutBindings.push({
        name: path.node.name,
        scope: lookup(path, path.node.name),
      });
    }
  }
  root.find(j.Identifier).forEach((path) => {
    if (
      path.node.typeAnnotation &&
      isShortcutType(path.get("typeAnnotation", "typeAnnotation"))
    ) {
      addShortcutBinding(path);
    }
  });
  root.find(j.JSXAttribute).forEach((path) => {
    if (
      !isShortcutAttribute(path) ||
      path.node.value?.type !== "JSXExpressionContainer"
    )
      return;
    const expression = path.get("value", "expression");
    if (expression.node.type === "Identifier") addShortcutBinding(expression);
  });

  function isShortcutReference(path: any): boolean {
    return (
      path.node.type === "Identifier" &&
      shortcutBindings.some(
        (binding) =>
          binding.scope &&
          binding.name === path.node.name &&
          binding.scope === lookup(path, path.node.name),
      )
    );
  }

  function isShortcutObject(path: any): boolean {
    const parent = path.parent;
    if (
      (parent.node.type === "TSAsExpression" ||
        parent.node.type === "TSSatisfiesExpression") &&
      isShortcutType(parent.get("typeAnnotation"))
    )
      return true;
    if (
      parent.node.type === "VariableDeclarator" &&
      isShortcutReference(parent.get("id"))
    )
      return true;
    if (
      parent.node.type === "AssignmentExpression" &&
      isShortcutReference(parent.get("left"))
    )
      return true;
    return (
      parent.node.type === "JSXExpressionContainer" &&
      isShortcutAttribute(parent.parent)
    );
  }

  function shortcutObjectBinding(path: any) {
    let parent = path.parent;
    while (
      parent.node.type === "TSAsExpression" ||
      parent.node.type === "TSSatisfiesExpression"
    )
      parent = parent.parent;
    const binding =
      parent.node.type === "VariableDeclarator"
        ? parent.get("id")
        : parent.node.type === "AssignmentExpression"
          ? parent.get("left")
          : undefined;
    return binding?.node.type === "Identifier" ? binding : undefined;
  }

  function canMigrateShortcutObject(node: any): boolean {
    if (node.type !== "ObjectExpression") return false;
    // Spreads, dynamic keys, and existing Windows keys can affect precedence.
    return !node.properties.some(
      (property: any) =>
        property.type === "SpreadElement" ||
        property.type === "SpreadProperty" ||
        ((property.type === "Property" || property.type === "ObjectProperty") &&
          (propertyName(property) === "Windows" ||
            (property.computed &&
              !(
                "value" in property.key &&
                typeof property.key.value === "string"
              )))),
    );
  }

  function sameBinding(
    path: any,
    binding: { name: string; scope: any },
  ): boolean {
    return (
      path.node.type === "Identifier" &&
      !!binding.scope &&
      path.node.name === binding.name &&
      lookup(path, path.node.name) === binding.scope
    );
  }

  // An assertion on the initializer also identifies subsequent assignments.
  root
    .find(j.ObjectExpression)
    .filter(isShortcutObject)
    .forEach((path) => {
      const binding = shortcutObjectBinding(path);
      if (binding) addShortcutBinding(binding);
    });
  const objects = root.find(j.ObjectExpression).filter(isShortcutObject);
  const unsafeBindings: { name: string; scope: any }[] = [];
  objects.forEach((path) => {
    const reference = shortcutObjectBinding(path);
    if (!reference) return;
    const binding = {
      name: reference.node.name,
      scope: lookup(reference, reference.node.name),
    };
    if (unsafeBindings.some((other) => sameBinding(reference, other))) return;

    function safeValue(node: any): boolean {
      while (
        node.type === "TSAsExpression" ||
        node.type === "TSSatisfiesExpression"
      )
        node = node.expression;
      return canMigrateShortcutObject(node);
    }

    // A read belongs to the whole binding, not to a particular assignment.
    // Plan before editing: every initializer and reassignment must be safe.
    let declared = false;
    let safe = !!binding.scope;
    root.find(j.VariableDeclarator).forEach((declaration) => {
      if (!sameBinding(declaration.get("id"), binding)) return;
      declared = true;
      if (declaration.node.init && !safeValue(declaration.node.init))
        safe = false;
    });
    root.find(j.AssignmentExpression).forEach((assignment) => {
      if (!sameBinding(assignment.get("left"), binding)) return;
      if (assignment.node.operator !== "=" || !safeValue(assignment.node.right))
        safe = false;
    });
    if (!declared || !safe) unsafeBindings.push(binding);
  });

  const migratedBindings: { name: string; scope: any }[] = [];
  objects.forEach((path) => {
    const reference = shortcutObjectBinding(path);
    if (
      reference &&
      unsafeBindings.some((binding) => sameBinding(reference, binding))
    )
      return;
    if (!canMigrateShortcutObject(path.node)) return;
    const properties = path.node.properties.filter(
      (property) =>
        property.type === "Property" || property.type === "ObjectProperty",
    );
    for (const property of properties) {
      if (propertyName(property) !== "windows") continue;
      property.key = j.identifier("Windows");
      property.computed = false;
      property.shorthand = false;
      changed = true;
      const binding = shortcutObjectBinding(path);
      if (binding) {
        migratedBindings.push({
          name: binding.node.name,
          scope: lookup(binding, binding.node.name),
        });
      }
    }
  });

  // Keep reads of a renamed local shortcut consistent with its definition.
  function isMigratedShortcut(path: any): boolean {
    return (
      path.node.type === "Identifier" &&
      migratedBindings.some(
        (binding) =>
          binding.scope &&
          binding.name === path.node.name &&
          binding.scope === lookup(path, path.node.name),
      )
    );
  }
  function migrateShortcutMember(path: any) {
    if (
      memberName(path.node) === "windows" &&
      isMigratedShortcut(path.get("object"))
    ) {
      renameKey(path.node.property, "Windows");
    }
  }
  root.find(j.MemberExpression).forEach(migrateShortcutMember);
  root.find(j.OptionalMemberExpression).forEach(migrateShortcutMember);
  function migrateShortcutPattern(pattern: any) {
    for (const property of pattern.properties) {
      if (
        (property.type === "Property" || property.type === "ObjectProperty") &&
        propertyName(property) === "windows"
      ) {
        property.key = j.identifier("Windows");
        property.computed = false;
        property.shorthand = false;
        changed = true;
      }
    }
  }
  root.find(j.VariableDeclarator).forEach((path) => {
    if (
      path.node.id.type === "ObjectPattern" &&
      path.node.init &&
      isMigratedShortcut(path.get("init"))
    )
      migrateShortcutPattern(path.node.id);
  });
  root.find(j.AssignmentExpression).forEach((path) => {
    if (
      path.node.left.type === "ObjectPattern" &&
      isMigratedShortcut(path.get("right"))
    )
      migrateShortcutPattern(path.node.left);
  });

  return changed ? root.toSource() : null;
}
