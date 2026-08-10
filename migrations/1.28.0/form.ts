import { JSCodeshift, Collection } from "jscodeshift";
import { removeImport, addImport } from "../utils";

export default function FormTransform(j: JSCodeshift, root: Collection<any>) {
  let needToAddImport = false;

  for (let name of [
    ["FormTextField", "TextField"],
    ["FormTextArea", "TextArea"],
    ["FormCheckbox", "Checkbox"],
    ["FormDatePicker", "DatePicker"],
    ["FormSeparator", "Separator"],
    ["FormDropdown", "Dropdown"],
    ["FormTagPicker", "TagPicker"],
  ]) {
    root
      .find(j.JSXOpeningElement, {
        name: { name: name[0] },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.jsxOpeningElement(
          j.jsxMemberExpression(j.jsxIdentifier("Form"), j.jsxIdentifier(name[1])),
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
        return j.jsxClosingElement(j.jsxMemberExpression(j.jsxIdentifier("Form"), j.jsxIdentifier(name[1])));
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
          j.tsQualifiedName(j.tsQualifiedName(j.identifier("Form"), j.identifier(name[1])), j.identifier("Props")),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
    removeImport(j, root, name[0] + "Props");
  }

  for (let name of [
    ["FormDropdownSection", "Dropdown", "Section"],
    ["FormDropdownItem", "Dropdown", "Item"],
    ["FormTagPickerItem", "TagPicker", "Item"],
  ]) {
    root
      .find(j.JSXOpeningElement, {
        name: { name: name[0] },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.jsxOpeningElement(
          j.jsxMemberExpression(
            j.jsxMemberExpression(j.jsxIdentifier("Form"), j.jsxIdentifier(name[1])),
            j.jsxIdentifier(name[2])
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
            j.jsxMemberExpression(j.jsxIdentifier("Form"), j.jsxIdentifier(name[1])),
            j.jsxIdentifier(name[2])
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
            j.tsQualifiedName(j.tsQualifiedName(j.identifier("Form"), j.identifier(name[1])), j.identifier(name[2])),
            j.identifier("Props")
          ),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
    removeImport(j, root, name[0] + "Props");
  }

  for (let name of [
    ["DropdownSection", "Dropdown", "Section"],
    ["DropdownItem", "Dropdown", "Item"],
    ["TagPickerItem", "TagPicker", "Item"],
  ]) {
    root
      .find(j.JSXOpeningElement, {
        name: { object: { name: "Form" }, property: { name: name[0] } },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.jsxOpeningElement(
          j.jsxMemberExpression(
            j.jsxMemberExpression(j.jsxIdentifier("Form"), j.jsxIdentifier(name[1])),
            j.jsxIdentifier(name[2])
          ),
          p.node.attributes,
          p.node.selfClosing
        );
      });
    root
      .find(j.JSXClosingElement, {
        name: { object: { name: "Form" }, property: { name: name[0] } },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.jsxClosingElement(
          j.jsxMemberExpression(
            j.jsxMemberExpression(j.jsxIdentifier("Form"), j.jsxIdentifier(name[1])),
            j.jsxIdentifier(name[2])
          )
        );
      });
  }

  for (let name of [
    ["FormValues", "Values"],
    ["FormProps", "Props"],
    ["FormItemProps", "ItemProps"],
  ]) {
    root
      .find(j.TSTypeReference, {
        typeName: {
          name: name[0],
        },
      })
      .replaceWith((p) => {
        needToAddImport = true;
        return j.tsTypeReference(j.tsQualifiedName(j.identifier("Form"), j.identifier(name[1])), p.node.typeParameters);
      });

    removeImport(j, root, name[0]);
  }

  if (needToAddImport) {
    addImport(j, root, "Form");
  }
}
