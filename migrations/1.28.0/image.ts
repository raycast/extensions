import { JSCodeshift, Collection } from "jscodeshift";
import { removeImport, addImport } from "../utils";

export default function ImageTransform(j: JSCodeshift, root: Collection<any>) {
  let needToAddImport = false;

  for (let name of [
    ["ImageLike", "ImageLike"],
    ["ImageSource", "ImageSource"],
    ["ImageMask", "ImageMask"],
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
          j.tsQualifiedName(j.identifier("Image"), j.identifier(name[1])),
          p.node.typeParameters
        );
      });

    removeImport(j, root, name[0]);
  }

  for (let name of [["ImageMask", "Mask"]]) {
    root
      .find(j.Identifier, {
        name: name[0],
      })
      .filter((path) => path.parent.value.type !== "ImportSpecifier")
      .replaceWith((p) => {
        needToAddImport = true;
        return j.memberExpression(j.identifier("Image"), j.identifier(name[1]));
      });

    removeImport(j, root, name[0]);
  }

  if (needToAddImport) {
    addImport(j, root, "Image");
  }
}
