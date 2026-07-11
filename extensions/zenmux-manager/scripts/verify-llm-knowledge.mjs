import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const docsIndex = fs.readFileSync(
  path.join(root, "src", "zenmux-docs.ts"),
  "utf8",
);
const accountTool = fs.readFileSync(
  path.join(root, "src", "tools", "get-zenmux-account.ts"),
  "utf8",
);
const searchTool = fs.readFileSync(
  path.join(root, "src", "tools", "search-zenmux-docs.ts"),
  "utf8",
);
const accountSource = fs.readFileSync(
  path.join(root, "src", "zenmux.ts"),
  "utf8",
);
const routingPath = path.join(root, "src", "zenmux-doc-routing.ts");

const routing = fs.existsSync(routingPath)
  ? fs.readFileSync(routingPath, "utf8")
  : "";

/**
 * Extract a single curated docs entry block by its title field.
 * Each entry starts with `  {` and ends with `  },`.
 */
function entryBlock(title) {
  const titleMatch = `title: "${title}"`;
  const titleAt = docsIndex.indexOf(titleMatch);
  if (titleAt === -1) return undefined;
  const startAt = docsIndex.lastIndexOf("  {", titleAt);
  const endAt = docsIndex.indexOf("  },", titleAt);
  if (startAt === -1 || endAt === -1) return undefined;
  return docsIndex.slice(startAt, endAt + 4);
}

function entryHasAll(title, fragments) {
  const block = entryBlock(title);
  if (!block) {
    return { ok: false, missing: [`<entry not found: "${title}">`] };
  }
  const missing = fragments.filter((fragment) => !block.includes(fragment));
  return { ok: missing.length === 0, missing };
}

const docContracts = [
  {
    title: "Quick Start",
    requires: [
      "https://zenmux.ai/api/v1",
      "https://zenmux.ai/api/anthropic",
      "https://zenmux.ai/api/vertex-ai",
      "sk-ss-v1",
      "sk-ai-v1",
      "Platform API Key",
      "OpenAI Responses",
      "Anthropic Messages",
    ],
  },
  {
    title: "Subscription Plans",
    requires: [
      "5-hour rolling",
      "7-day rolling",
      "quota_5_hour",
      "quota_7_day",
      "quota_monthly",
      "sk-ss-v1",
    ],
  },
  {
    title: "Pay As You Go",
    requires: [
      "sk-ai-v1",
      "20% bonus",
      "https://zenmux.ai/platform/pay-as-you-go",
    ],
  },
  {
    title: "Cursor Integration",
    requires: [
      "Cursor Pro",
      "https://zenmux.ai/api/v1",
      "Override OpenAI Base URL",
      "sk-ai-v1",
      "Parameter messages is required",
      "unsupported tool definition",
    ],
  },
  {
    title: "Claude Code Integration",
    requires: [
      'ANTHROPIC_BASE_URL="https://zenmux.ai/api/anthropic"',
      "ANTHROPIC_AUTH_TOKEN",
      'ANTHROPIC_API_KEY=""',
      "claude-sonnet-4-6",
      "/status",
      "v2.0.7x",
    ],
  },
  {
    title: "Codex Integration",
    requires: [
      "~/.codex/config.toml",
      'wire_api = "responses"',
      "ZENMUX_API_KEY",
      "https://zenmux.ai/api/v1",
      "openai/gpt-5.2-codex",
    ],
  },
  {
    title: "Cline Integration",
    requires: [
      "OpenAI Compatible",
      "https://zenmux.ai/api/v1",
      "Model ID",
      "API Configuration",
    ],
  },
  {
    title: "Open WebUI Integration",
    requires: [
      "Admin Panel",
      "Connections",
      "OpenAI API",
      "https://zenmux.ai/api/v1",
    ],
  },
  {
    title: "Provider Routing",
    requires: [
      "model_slug:provider_slug",
      "provider.routing",
      "primary_factor",
      "anthropic/claude-3.7-sonnet:amazon-bedrock",
    ],
  },
  {
    title: "Fallback Mechanism",
    requires: ["provider.fallback", "5xx", "429"],
  },
  {
    title: "Platform API: Subscription Detail",
    requires: [
      "/api/v1/management/subscription/detail",
      "ZENMUX_PLATFORM_API_KEY",
      "quota_5_hour",
      "quota_7_day",
      "quota_monthly",
      "base_usd_per_flow",
      "effective_usd_per_flow",
    ],
  },
  {
    title: "Platform API: PAYG Balance",
    requires: [
      "/api/v1/management/payg/balance",
      "ZENMUX_PLATFORM_API_KEY",
      "total_credits",
      "bonus_credits",
    ],
  },
  {
    title: "Platform API: Generation Detail",
    requires: [
      "/api/v1/management/generation",
      "ZENMUX_PLATFORM_API_KEY",
      "3-5 minute",
    ],
  },
  {
    title: "Error Codes",
    requires: ["401", "403", "404", "429", "5xx"],
  },
];

const checks = [];

for (const contract of docContracts) {
  const result = entryHasAll(contract.title, contract.requires);
  checks.push({
    name: `Doc entry "${contract.title}" has answer-ready facts`,
    passed: result.ok,
    detail: result.ok ? undefined : `missing: ${result.missing.join(", ")}`,
  });
}

// ---------- search tool format and wiring ----------

const searchToolChecks = [
  {
    name: "Search tool emits Curated answer-ready facts header",
    passed: searchTool.includes("== Curated answer-ready facts =="),
  },
  {
    name: "Search tool emits live official docs header",
    passed: searchTool.includes("== Official docs fetched over HTTPS =="),
  },
  {
    name: "Search tool tells the model to reproduce values verbatim",
    passed: searchTool.includes(
      "Reproduce values inside `Answer-ready facts`, `Copy-paste snippet`, and fetched official docs verbatim",
    ),
  },
  {
    name: "Search tool tells the model curated entries beat fetched excerpts",
    passed: searchTool.includes(
      "If a curated entry contradicts a fetched doc excerpt, prefer the curated entry",
    ),
  },
  {
    name: "Search tool no longer defers to source for exact syntax",
    passed: !searchTool.includes(
      "If the user needs exact syntax beyond the summaries",
    ),
  },
  {
    name: "Search tool does not import a bundled docs corpus",
    passed:
      !searchTool.includes("zenmux-doc-corpus") &&
      !fs.existsSync(path.join(root, "src", "zenmux-doc-corpus.ts")),
  },
  {
    name: "Search tool imports the routing table",
    passed:
      searchTool.includes('from "../zenmux-doc-routing"') &&
      searchTool.includes("routingMatches"),
  },
  {
    name: "Search tool is async",
    passed: searchTool.includes("export default async function searchZenMuxDocs"),
  },
  {
    name: "Search tool uses runtime fetch",
    passed: searchTool.includes("await fetch(doc.rawUrl"),
  },
  {
    name: "Search tool uses Raycast Cache fallback",
    passed:
      searchTool.includes('import { Cache } from "@raycast/api"') &&
      searchTool.includes('source: "cache"'),
  },
];
checks.push(...searchToolChecks);

// ---------- AI instructions ----------

const ai = packageJson.ai.instructions;
const aiChecks = [
  {
    name: "AI instructions enforce one-shot answer shape",
    passed: ai.includes("ANSWER SHAPE") && ai.includes("KEY-TYPE BOUNDARY"),
  },
  {
    name: "AI instructions distinguish model API keys from Platform API keys",
    passed: ai.includes(
      "Never tell users to use a Platform API Key for Cursor",
    ),
  },
  {
    name: "AI instructions forbid the `weekly quota` paraphrase",
    passed: ai.includes(
      "the 7-day window is rolling, not calendar weekly",
    ),
  },
  {
    name: "AI instructions describe the two public-safe retrieval tiers",
    passed:
      ai.includes("Curated answer-ready facts") &&
      ai.includes("Official docs fetched over HTTPS") &&
      ai.includes("Raycast Cache") &&
      ai.includes("TIER PRECEDENCE"),
  },
  {
    name: "AI instructions list extended integration coverage",
    passed:
      ai.includes("Hermes Agent") &&
      ai.includes("RikkaHub") &&
      ai.includes("Cherry Studio"),
  },
];
checks.push(...aiChecks);

// ---------- account tool ----------

checks.push({
  name: "Account tool warns Platform API key is account-only",
  passed: accountTool.includes(
    "Platform API keys are only for account and usage management endpoints",
  ),
});

checks.push(
  {
    name: "Platform API key preference keeps stable stored key",
    passed:
      packageJson.preferences.some(
        (preference) =>
          preference.name === "managementApiKey" &&
          preference.type === "password" &&
          preference.required === true,
      ) &&
      accountSource.includes("managementApiKey: platformApiKey") &&
      accountSource.includes("getPreferenceValues<Preferences>()"),
  },
  {
    name: "Account fetching does not read Platform API keys from environment variables",
    passed: !accountSource.includes("process.env"),
  },
);

// ---------- routing manifest ----------

const routingTriggers = [
  "hermes",
  "rikkahub",
  "sider",
  "obsidian",
  "openclaw",
  "neovate",
  "gemini cli",
  "opencode",
  "cherry studio",
  "dify",
  "claude code",
  "cursor",
  "codex",
  "cline",
  "open webui",
];

checks.push({
  name: "Doc routing module exists",
  passed: routing.length > 0,
});

checks.push({
  name: "Routing manifest builds raw GitHub markdown URLs",
  passed:
    routing.includes("raw.githubusercontent.com/ZenMux/zenmux-doc") &&
    routing.includes("docs_source/en"),
});

checks.push({
  name: "Routing manifest exposes public docs URLs",
  passed:
    routing.includes("https://docs.zenmux.ai") &&
    routing.includes("rawUrl"),
});

for (const trigger of routingTriggers) {
  checks.push({
    name: `Routing table has trigger: ${trigger}`,
    passed: routing.includes(`"${trigger}"`),
  });
}

// ---------- mocked runtime retrieval ----------

checks.push({
  name: "Mocked Hermes runtime docs retrieval returns setup facts",
  passed: runHermesRuntimeSmokeTest(),
});

const failures = checks.filter((check) => !check.passed);

if (failures.length > 0) {
  console.error("LLM knowledge verification failed:");
  for (const failure of failures) {
    console.error(
      `- ${failure.name}${failure.detail ? ` (${failure.detail})` : ""}`,
    );
  }
  process.exit(1);
}

console.log(`LLM knowledge verification passed (${checks.length} checks).`);

function runHermesRuntimeSmokeTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zenmux-verify-"));
  const mockApiPath = path.join(tempDir, "raycast-api.mjs");
  const smokePath = path.join(tempDir, "smoke.mjs");
  const bundlePath = path.join(tempDir, "bundle.mjs");

  try {
    fs.writeFileSync(
      mockApiPath,
      [
        "const store = new Map();",
        "export const Color = {",
        '  Green: "green",',
        '  Red: "red",',
        '  SecondaryText: "secondaryText",',
        '  Yellow: "yellow",',
        "};",
        "export class Cache {",
        "  get(key) { return store.get(key); }",
        "  set(key, value) { store.set(key, value); }",
        "}",
        "export function getPreferenceValues() { return {}; }",
      ].join("\n"),
    );

    const hermesMarkdown = [
      "---",
      "head: []",
      "---",
      "# Hermes Agent Integration with ZenMux",
      "",
      "Run `hermes model` and select **Custom endpoint (enter URL manually)**.",
      "",
      "1. **API Base URL**: `https://zenmux.ai/api/v1`",
      "2. **API Key**: Paste your ZenMux API Key, for example `sk-ss-v1-xxx`",
      "3. **Model name**: `openai/gpt-5.2`",
    ].join("\n");
    const searchToolPath = path.join(
      root,
      "src",
      "tools",
      "search-zenmux-docs.ts",
    );
    fs.writeFileSync(
      smokePath,
      [
        "globalThis.fetch = async (url) => {",
        '  if (!String(url).includes("best-practices/hermes-agent.md")) {',
        '    throw new Error("unexpected fetch url: " + url);',
        "  }",
        "  return {",
        "    ok: true,",
        "    status: 200,",
        '    statusText: "OK",',
        `    text: async () => ${JSON.stringify(hermesMarkdown)},`,
        "  };",
        "};",
        "",
        `const { default: searchZenMuxDocs } = await import(${JSON.stringify(searchToolPath)});`,
        'const result = await searchZenMuxDocs({ query: "How to configure Hermes?" });',
        "for (const expected of [",
        '  "best-practices/hermes-agent.md",',
        '  "Official docs fetched over HTTPS",',
        '  "live HTTPS fetch",',
        '  "https://zenmux.ai/api/v1",',
        '  "hermes model",',
        '  "Custom endpoint",',
        "]) {",
        "  if (!result.includes(expected)) {",
        '    throw new Error("missing expected output: " + expected + "\\n" + result);',
        "  }",
        "}",
      ].join("\n"),
    );

    execFileSync(
      path.join(root, "node_modules", ".bin", "esbuild"),
      [
        smokePath,
        "--bundle",
        "--platform=node",
        "--format=esm",
        `--alias:@raycast/api=${mockApiPath}`,
        `--outfile=${bundlePath}`,
      ],
      { stdio: "pipe" },
    );

    execFileSync(process.execPath, [bundlePath], { stdio: "pipe" });
    return true;
  } catch (error) {
    console.error(getErrorOutput(error));
    return false;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function getErrorOutput(error) {
  if (error && typeof error === "object" && "stderr" in error) {
    const stderr = error.stderr?.toString();
    const stdout = error.stdout?.toString();
    return [stdout, stderr].filter(Boolean).join("\n");
  }
  return error instanceof Error ? error.message : String(error);
}
