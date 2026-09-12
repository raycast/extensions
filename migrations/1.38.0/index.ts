import { API, FileInfo, Transform } from "jscodeshift";

const map = {
  TwoArrowsClockwise: "ArrowClockwise",
  EyeSlash: "EyeDisabled",
  SpeakerArrowDown: "SpeakerDown",
  SpeakerArrowUp: "SpeakerUp",
  SpeakerSlash: "SpeakerOff",
  TextDocument: "BlankDocument",
  XmarkCircle: "XMarkCircle",
};

const transform: Transform = (file: FileInfo, api: API) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  // replace the deprecated icons
  root
    .find(j.MemberExpression, {
      object: { type: "Identifier", name: "Icon" },
      property: { type: "Identifier" },
    })
    .forEach((p) => {
      if (p.node.property.type !== "Identifier") {
        return;
      }

      const newIcon = map[p.node.property.name];

      if (!newIcon) {
        return;
      }

      p.node.property.name = newIcon;
    });

  return root.toSource();
};

export default transform;
