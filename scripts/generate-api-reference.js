#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");

const START_CODE_BLOCK = "```typescript";
const END_CODE_BLOCK = "```";

function getFilename(title) {
  return title.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and");
}

async function readDocsJson() {
  const data = await fs.readFile(path.join(__dirname, "../docs/api-reference.json"), { encoding: "utf8" });
  return JSON.parse(data);
}

function findById(docs, id) {
  return docs.children.find((x) => x.id === id);
}

function getSubcategory(item) {
  const found = item.comment?.tags?.find((x) => x.tag === "subcategory");
  if (found) {
    return found.text.trim();
  }
  // NOTE try looking for the tag in signatures
  for (const signature of item.signatures || []) {
    const found = getSubcategory(signature);
    if (found) {
      return found;
    }
  }
  return null;
}

function getCommentText(item) {
  let text = item.comment?.shortText || item.comment?.text || "";
  if (!text && item.signatures?.length === 1) {
    text = getCommentText(item.signatures[0]);
  }
  if (!text) {
    console.warn("No comment text for", item.name);
  }
  return text.trim();
}

function getCommentReturns(item) {
  const text = item.comment?.returns || "";
  if (!text) {
    console.warn("No comment returns for", item.name);
  }
  return text.trim();
}

function getLinkName(name) {
  return name.toLowerCase().replace(/[^-a-z0-9.+_]/g, "-");
}

const BASE_URL = "../docs/api-reference/";

function generateLinkDestination(docs, name, location) {
  let found =
    docs.children.find((x) => x.name === name && x.kindString !== "Namespace") ||
    // FIXME this replaceAll is a real hack based on naming convention
    docs.children.find((x) => x.name === name.replaceAll(".", "") && x.kindString !== "Namespace");

  function getLink(found, name) {
    const category = docs.categories.find((category) => category.children.includes(found.id));
    if (!category) {
      throw new Error(`no category found for: ${name}`);
    }
    // TODO: relative link to avoid opening in new tabs
    const subcategory = getSubcategory(found);
    const pagePath = `${BASE_URL}${getFilename(category.title)}${subcategory ? `/${getFilename(subcategory)}` : ""}.md`;

    if (pagePath === location) {
      return `#${getLinkName(name)}`;
    }

    const relativePath = path.relative(path.dirname(location), `${pagePath}#${getLinkName(name)}`);
    return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
  }

  if (found) {
    return getLink(found, name);
  }
  const foundParent =
    // FIXME another hack to link to parent item based on naming convention
    docs.children.find((x) => x.name === name.split(".")[0] && x.kindString !== "Namespace");
  if (foundParent) {
    return getLink(foundParent, name.split(".")[0]);
  }
  console.warn("generateLinkDestination not found for", name);
  return null;
}

function replaceLinksInDescription(docs, desc, location) {
  return desc.replaceAll(/{@link ([^}]+)}/g, (match, p1) => {
    const link = generateLinkDestination(docs, p1, location);
    if (!link) {
      return p1;
    }
    return `[${p1}](${link})`;
  });
}

function replaceTypeLikeStringsInType(docs, type, location) {
  return type.replaceAll(/\b([A-Z][.A-Za-z]+)(\s|$)/g, (match, p1, p2) => {
    const link = generateLinkDestination(docs, p1, location);
    if (!link) {
      return `${p1}${p2}`;
    }
    return `[${p1}](${link})${p2}`;
  });
}

function getTypeString(docs, item) {
  if (item.type === "intrinsic") {
    return item.name;
  }
  if (item.type === "reference") {
    if (item.name === "JSXElementConstructor") {
      // just ignore because it's too noisy in markdown
      return [];
    }
    if (item.name === "ReactElement") {
      const props = item.typeArguments.find(({ type }) => type === "reference");
      if (props) {
        const comp = findReactComponentByReturnTypeProps(docs, props);
        if (comp) {
          return getNamespacedName(docs, comp);
        }
      }
    }
    if (item.typeArguments) {
      return `${item.name}<${item.typeArguments
        .flatMap((typeArgument) => getTypeString(docs, typeArgument))
        .join(", ")}>`;
    }
    return item.name;
  }
  if (item.type === "union") {
    return item.types.flatMap((type) => getTypeString(docs, type)).join(" | ");
  }
  if (item.type === "array") {
    return getTypeString(docs, item.elementType) + "[]";
  }
  if (item.type === "literal") {
    return JSON.stringify(item.value);
  }
  if (
    item.type === "reflection" &&
    item.declaration.signatures?.length === 1 &&
    item.declaration.signatures[0].kindString === "Call signature"
  ) {
    const sig = item.declaration.signatures[0];
    return `(${(sig.parameters || [])
      .flatMap(({ name, type }) => `${name}: ${getTypeString(docs, type)}`)
      .join(", ")}) => ${getTypeString(docs, sig.type)}`;
  }
  if (item.type === "reflection" && item.declaration.children?.length > 0) {
    return `{ ${item.declaration.children
      .map(({ name, type }) => `${name}: ${getTypeString(docs, type)}`)
      .join("; ")} }`;
  }
  throw new Error(`TODO: unsupported type in getTypeString: ${JSON.stringify(item)}`);
}

function getPropTypeString(docs, prop) {
  if (prop.type) {
    return getTypeString(docs, prop.type);
  }
  if (
    prop.kindString === "Method" &&
    prop.signatures?.length === 1 &&
    prop.signatures[0].kindString === "Call signature"
  ) {
    const sig = prop.signatures[0];
    return `(${(sig.parameters || [])
      .map(({ name, type }) => `${name}: ${getTypeString(docs, type)}`)
      .join(", ")}) => ${getTypeString(docs, sig.type)}`;
  }
  if (
    prop.kindString === "Constructor" &&
    prop.signatures?.length === 1 &&
    prop.signatures[0].kindString === "Constructor signature"
  ) {
    const sig = prop.signatures[0];
    return `(${(sig.parameters || [])
      .map(({ name, type }) => `${name}: ${getTypeString(docs, type)}`)
      .join(", ")}) => ${getTypeString(docs, sig.type)}`;
  }
  throw new Error(`TODO: unsupported prop in getPropTypeString: ${JSON.stringify(prop)}`);
}

function getParameterList(docs, item) {
  return (item.parameters || []).map((parameter) => [
    parameter.name,
    getTypeString(docs, parameter.type),
    !parameter.flags?.isOptional, // required
    (parameter.comment?.shortText || parameter.comment?.text || "").replace(/\s/g, " "),
  ]);
}

function getDefaultValue(item) {
  const found = item.comment?.tags?.find((x) => x.tag === "defaultvalue");
  if (found) {
    return found.text.trim();
  }
  return null;
}

function getRemarkValue(item) {
  const found = item.comment?.tags?.find((x) => x.tag === "remark" || x.tag === "remarks");
  if (found) {
    return found.text.trim();
  }
  return null;
}

// NOTE this function is tricky and not easy to read.
// there should be room for improvement.
function getNamespacedName(docs, item) {
  const walk = (target, children) => {
    const results = [];
    for (const child of children) {
      if (child.type?.queryType?.name === target.name) {
        results.push([child]);
      }
      if (child.kindString === "Namespace") {
        walk(target, child.children).forEach((result) => {
          const childResults = walk(child, docs.children);
          if (childResults.length) {
            childResults.forEach((childResult) => {
              results.push([...childResult, ...result]);
            });
          } else {
            results.push([child, ...result]);
          }
        });
      }
    }
    return results;
  };
  const candidates = walk(item, docs.children);
  if (candidates.length) {
    candidates.sort((a, b) => b.length - a.length);
    return candidates[0].map(({ name }) => name).join(".");
  }
  return item.name;
}

function findReactComponentByReturnTypeProps(docs, item) {
  return docs.children.find(
    (child) =>
      child.kindString === "Function" &&
      child.signatures.some(
        (signature) =>
          signature.type.name === "ReactElement" &&
          signature.type.typeArguments.some(
            (typeArgument) => typeArgument.type === "reference" && typeArgument.id === item.id
          )
      )
  );
}

function getPropList(docs, item) {
  if (!item.parameters) {
    return [];
  }
  const props = item.parameters.find((x) => x.name === "props" && x.type.type === "reference");
  const propList = findById(docs, props.type.id);
  return propList.children.map((prop) => [
    prop.name,
    getPropTypeString(docs, prop),
    !prop.flags?.isOptional, // required
    getDefaultValue(prop), // default
    (prop.comment?.shortText || prop.comment?.text || "").replace(/\s/g, " "),
  ]);
}

function getReturnType(docs, item) {
  return getTypeString(docs, item.type);
}

function getExampleCode(item) {
  const items = item.comment?.tags?.filter((x) => x.tag === "example");
  if (items?.length === 1) {
    return items[0].text.trim();
  }
  if (items?.length > 1) {
    return (
      "{% tabs %}\n" +
      items
        .map(({ text }) => {
          const [title, ...body] = text.trim().split("\n");
          return `{% tab title="${title}" %}\n` + body.join("\n") + "\n{% endtab %}";
        })
        .join("\n") +
      "\n{% endtabs %}"
    );
  }
  return null;
}

function formatTypeString(docs, type, location) {
  // FIXME there should be better way like doing it while constructing type string
  type = replaceTypeLikeStringsInType(docs, type, location);
  // escape "<" because of <code>
  type = type.replaceAll("<", "&lt;");
  // FIXME this replaceAll might be too hacky
  if (type.startsWith("(")) {
    // assuming signature
    return "<code>" + type.replaceAll(" | ", " \\| ") + "</code>";
  }
  return "<code>" + type.replaceAll(" | ", "</code>" + " or " + "<code>") + "</code>";
}

function generateFunctionSignatureMarkdown(docs, signature, location) {
  const parameters = getParameterList(docs, signature);
  const returnType = getReturnType(docs, signature);
  const signatureText = `${returnType.startsWith("Promise") ? "async " : ""}function ${signature.name}(${parameters
    .map(([name, type]) => `${name}: ${type}`)
    .join(", ")}): ${returnType}`;
  let text = `
### ${signature.name}

${replaceLinksInDescription(docs, getCommentText(signature), location)}
`;
  const remark = getRemarkValue(signature);
  if (remark) {
    text += `
${replaceLinksInDescription(docs, remark, location)}
`;
  }
  text += `
#### Signature

${START_CODE_BLOCK}
${signatureText}
${END_CODE_BLOCK}
`;
  const exampleCode = getExampleCode(signature);
  if (exampleCode) {
    text += `
#### Example

${exampleCode}
`;
  } else {
    console.warn("No example code found for", signature.name);
  }
  if (parameters.length) {
    text += `
#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
${parameters
  .map(
    ([name, type, required, desc]) =>
      `| ${name} | ${formatTypeString(docs, type, location)} | ${required ? "Yes" : "No"} | ${replaceLinksInDescription(
        docs,
        desc,
        location
      )} |`
  )
  .join("\n")}
`;
  }
  if (returnType !== "void") {
    text += `
#### Return

${replaceLinksInDescription(docs, getCommentReturns(signature), location)}
`;
  }
  return text;
}

function generateReactComponentSignatureMarkdown(docs, signature, item, location) {
  const name = getNamespacedName(docs, item);
  const props = getPropList(docs, signature);
  let text = `
### ${name}

${replaceLinksInDescription(docs, getCommentText(signature), location)}
`;
  const remark = getRemarkValue(signature);
  if (remark) {
    text += `
${replaceLinksInDescription(docs, remark, location)}
`;
  }
  const exampleCode = getExampleCode(signature);
  if (exampleCode) {
    text += `
#### Example

${exampleCode}
`;
  } else {
    console.warn("No example code found for", item.name);
  }
  text += `
#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
${props
  .map(
    ([name, type, required, def, desc]) =>
      `| ${name} | ${formatTypeString(docs, type, location)} | ${required ? "Yes" : "No"} | ${replaceLinksInDescription(
        docs,
        def || "-",
        location
      )} | ${replaceLinksInDescription(docs, desc, location)} |`
  )
  .join("\n")}
`;
  return text;
}

function generateInterfaceMarkdown(docs, item, location) {
  let properties = [];
  if (item.children) {
    properties = [
      ...properties,
      ...item.children.map((prop) => [
        prop.name,
        getPropTypeString(docs, prop),
        !prop.flags?.isOptional, // required
        getCommentText(prop).replace(/\s/g, " "),
      ]),
    ];
  }
  if (item.indexSignature) {
    // FIXME maybe we should factor out this logic to a function
    properties = [
      ...properties,
      [
        `[${item.indexSignature.parameters[0].name}: ${getTypeString(docs, item.indexSignature.parameters[0].type)}]`,
        getTypeString(docs, item.indexSignature.type),
        !item.indexSignature.flags?.isOptional, // required
        getCommentText(item.indexSignature).replace(/\s/g, " "),
      ],
    ];
  }
  let text = `
### ${item.name}

${replaceLinksInDescription(docs, getCommentText(item), location)}
`;
  const remark = getRemarkValue(item);
  if (remark) {
    text += `
${replaceLinksInDescription(docs, remark, location)}
`;
  }
  const exampleCode = getExampleCode(item);
  if (exampleCode) {
    text += `
#### Example

${exampleCode}
`;
  } else {
    console.warn("No example code found for", item.name);
  }
  if (properties.length) {
    text += `
#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
${properties
  .map(
    ([name, type, required, desc]) =>
      `| ${name} | ${formatTypeString(docs, type, location)} | ${required ? "Yes" : "No"} | ${replaceLinksInDescription(
        docs,
        desc,
        location
      )} |`
  )
  .join("\n")}
`;
  }
  return text;
}

function generateTypeAliasMarkdown(docs, item, location) {
  const signature = `${item.name}: ${getTypeString(docs, item.type)}`;
  let text = `
### ${item.name}

${START_CODE_BLOCK}
${signature}
${END_CODE_BLOCK}

${replaceLinksInDescription(docs, getCommentText(item), location)}
`;
  const remark = getRemarkValue(item);
  if (remark) {
    text += `
${replaceLinksInDescription(docs, remark, location)}
`;
  }
  const exampleCode = getExampleCode(item);
  if (exampleCode) {
    text += `
#### Example

${exampleCode}
`;
  } else {
    console.warn("No example code found for", item.name);
  }
  return text;
}

function generateClassMarkdown(docs, item, location) {
  const constructors = item.children
    .filter((child) => child.kindString === "Constructor")
    .map((prop) => [prop.name, getPropTypeString(docs, prop), getCommentText(prop).replace(/\s/g, " ")]);
  const accessors = item.children
    .filter((child) => child.kindString === "Accessor")
    .map((prop) => [prop.name, getReturnType(docs, prop.getSignature[0]), getCommentText(prop).replace(/\s/g, " ")]);
  const methods = item.children
    .filter((child) => child.kindString === "Method")
    .map((prop) => [prop.name, getPropTypeString(docs, prop), getCommentText(prop).replace(/\s/g, " ")]);
  let text = `
### ${item.name}

${replaceLinksInDescription(docs, getCommentText(item), location)}
`;
  const remark = getRemarkValue(item);
  if (remark) {
    text += `
${replaceLinksInDescription(docs, remark, location)}
`;
  }
  const exampleCode = getExampleCode(item);
  if (exampleCode) {
    text += `
#### Example

${exampleCode}
`;
  } else {
    console.warn("No example code found for", item.name);
  }
  text += `
#### Constructors

| Name | Type | Description |
| :--- | :--- | :--- |
${constructors
  .map(
    ([name, type, desc]) =>
      `| ${name} | ${formatTypeString(docs, type, location)} | ${replaceLinksInDescription(docs, desc, location)} |`
  )
  .join("\n")}
`;
  if (accessors.length) {
    text += `
#### Accessors

| Name | Type | Description |
| :--- | :--- | :--- |
${accessors
  .map(
    ([name, type, desc]) =>
      `| ${name} | ${formatTypeString(docs, type, location)} | ${replaceLinksInDescription(docs, desc, location)} |`
  )
  .join("\n")}
`;
  }
  if (methods.length) {
    text += `
#### Methods

| Name | Type | Description |
| :--- | :--- | :--- |
${methods
  .map(
    ([name, type, desc]) =>
      `| ${name} | ${formatTypeString(docs, type, location)} | ${replaceLinksInDescription(docs, desc, location)} |`
  )
  .join("\n")}
`;
  }
  return text;
}

function generateEnumerationMarkdown(docs, item, location) {
  const members = item.children.map((child) => [child.name, child.defaultValue]);
  let text = `
### ${item.name}

${replaceLinksInDescription(docs, getCommentText(item), location)}
`;
  const remark = getRemarkValue(item);
  if (remark) {
    text += `
${replaceLinksInDescription(docs, remark, location)}
`;
  }
  const exampleCode = getExampleCode(item);
  if (exampleCode) {
    text += `
#### Example

${exampleCode}
`;
  } else {
    console.warn("No example code found for", item.name);
  }
  text += `
#### Enumeration members

| Name | Value |
| :--- | :--- |
${members.map(([name, value]) => `| ${name} | ${value} |`).join("\n")}
`;
  return text;
}

function generateVariableMarkdown(docs, item, location) {
  const signature = `${item.name}: ${getTypeString(docs, item.type)} = ${item.defaultValue}`;
  let text = `
### ${item.name}

${START_CODE_BLOCK}
${signature}
${END_CODE_BLOCK}

${replaceLinksInDescription(docs, getCommentText(item), location)}
`;
  const remark = getRemarkValue(item);
  if (remark) {
    text += `
${replaceLinksInDescription(docs, remark, location)}
`;
  }
  const exampleCode = getExampleCode(item);
  if (exampleCode) {
    text += `
#### Example

${exampleCode}
`;
  } else {
    console.warn("No example code found for", item.name);
  }
  return text;
}

async function applyToTemplateFile(docs, title, subcategory, items) {
  const location = subcategory
    ? `../docs/api-reference/${getFilename(title)}/${getFilename(subcategory)}.md`
    : `../docs/api-reference/${getFilename(title)}.md`;

  let text = "";
  const kinds = ["Function", "Variable", "Class", "Interface", "Enumeration", "Type alias"];
  for (const kind of kinds) {
    for (const item of items.filter((item) => item.kindString === kind)) {
      if (item.kindString === "Function") {
        for (const signature of item.signatures || []) {
          if (signature.type.name === "ReactElement") {
            text += generateReactComponentSignatureMarkdown(docs, signature, item, location);
          } else {
            text += generateFunctionSignatureMarkdown(docs, signature, location);
          }
        }
      } else if (item.kindString === "Interface") {
        if (item.name.endsWith("Props")) {
          // ignore
        } else {
          text += generateInterfaceMarkdown(docs, item, location);
        }
      } else if (item.kindString === "Type alias") {
        text += generateTypeAliasMarkdown(docs, item, location);
      } else if (item.kindString === "Class") {
        text += generateClassMarkdown(docs, item, location);
      } else if (item.kindString === "Enumeration") {
        text += generateEnumerationMarkdown(docs, item, location);
      } else if (item.kindString === "Variable") {
        text += generateVariableMarkdown(docs, item);
      }
    }
  }
  const filepath = path.join(__dirname, location);
  const startMarker = `
## API Reference
`;

  //Generate .md file if it doesn't exist
  try {
    await fs.access(filepath);
  } catch (error) {
    const content = `# ${subcategory}
${startMarker}`;
    await fs.writeFile(filepath, content);
  }

  let markdown = await fs.readFile(filepath, { encoding: "utf8" });
  const re = new RegExp(`${startMarker}(.|\n)*`);
  if (markdown.match(re)) {
    markdown = markdown.replace(re, `${startMarker}${text}`);
    await fs.writeFile(filepath, markdown);
  } else {
    console.warn("template marker not available for", title, subcategory);
  }

  if (subcategory) {
    return `  * [${subcategory}](api-reference/${getFilename(title)}/${getFilename(subcategory)}.md)\n`;
  }
  return "";
}

async function parseCategory(docs, title, children) {
  const subCategoryMap = new Map();
  for (const id of children) {
    const item = findById(docs, id);
    if (item) {
      const subcategory = getSubcategory(item);
      subCategoryMap.set(subcategory, [...(subCategoryMap.get(subcategory) || []), item]);
    }
  }

  // sort subcategories alphabetically
  const subCategories = Array.from(subCategoryMap, ([subcategory, items]) => ({ subcategory, items })).sort((a, b) =>
    a.subcategory > b.subcategory ? 1 : -1
  );

  let tableOfContent = `* [${title}](api-reference/${getFilename(title)}${
    subCategories.length > 1 ? "/README" : ""
  }.md)\n`;

  for (const { subcategory, items } of subCategories) {
    tableOfContent += await applyToTemplateFile(docs, title, subcategory, items);
  }

  return tableOfContent;
}

async function updateTableOfContent(tableOfContent) {
  const startMarker = `
## API Reference
`;
  const endMarker = `\\*\\*\\*`;
  const filepath = path.join(__dirname, `../docs/SUMMARY.md`);

  let markdown = await fs.readFile(filepath, { encoding: "utf8" });
  const re = new RegExp(`${startMarker}(.|\n)*\\*\\*\\*`);
  if (markdown.match(re)) {
    markdown = markdown.replace(re, `${startMarker}\n${tableOfContent}\n***`);
    await fs.writeFile(filepath, markdown);
  } else {
    console.warn("template marker not available for SUMMARY.md");
  }
}

const SKIP_CATEGORIES = ["Other"];

async function main() {
  const docs = await readDocsJson();
  let tableOfContent = "";

  for (const category of docs.categories.sort((a, b) => (a.title > b.title ? 1 : -1))) {
    if (!SKIP_CATEGORIES.includes(category.title)) {
      tableOfContent += await parseCategory(docs, category.title, category.children);
    }
  }

  await updateTableOfContent(tableOfContent);
}

main();
