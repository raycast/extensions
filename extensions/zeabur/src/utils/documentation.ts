import fetch from "node-fetch";

export async function getLanguages() {
  const response = await fetch(
    "https://raw.githubusercontent.com/ridemountainpig/raycast-zeabur-docs-api/main/zeabur-docs-language.json",
  );
  const data = await response.json();
  return data;
}

export async function getDocumentation() {
  const response = await fetch(
    "https://raw.githubusercontent.com/ridemountainpig/raycast-zeabur-docs-api/main/zeabur-docs.json",
  );
  const data = await response.json();
  return data;
}
