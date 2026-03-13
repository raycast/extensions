import { API, FileInfo, Transform } from "jscodeshift";
const replaceThemeWithAppearance = (j, root) => {
  // Direct access replacement
  root
    .find(j.MemberExpression, {
      object: { name: "environment" },
      property: { name: "theme" },
    })
    .replaceWith(
      j.memberExpression(
        j.identifier("environment"),
        j.identifier("appearance")
      )
    );

  // Destructuring replacement
  root
    .find(j.VariableDeclarator, {
      id: {
        type: "ObjectPattern",
      },
      init: {
        name: "environment",
      },
    })
    .forEach((path) => {
      const objectPattern = path.value.id;
      const properties = objectPattern.properties;
      const themePropertyIndex = properties.findIndex(
        (property) => property.key.name === "theme"
      );

      if (themePropertyIndex !== -1) {
        const themeProperty = properties[themePropertyIndex];
        const newProperty = j.property(
          "init",
          j.identifier("appearance"),
          j.identifier(themeProperty.value.name)
        );
        properties.splice(themePropertyIndex, 1, newProperty);
      }
    });
};

const transform: Transform = (file: FileInfo, api: API) => {
  const j = api.jscodeshift;
  const root = j(file.source);
  replaceThemeWithAppearance(j, root);
  return root.toSource();
};

export default transform;
