const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");

const migrate = require("./package-json.cjs");

test("updates declared packages in place and preserves unrelated dependencies", () => {
  const manifest = {
    dependencies: {
      "@raycast/api": "^2.9.0",
      react: "18.2.0",
      other: "^1.0.0",
    },
    devDependencies: {
      "@types/node": "22.19.17",
      "@types/react": "19.0.10",
      "react-devtools": "6.1.1",
    },
  };
  migrate(manifest);
  assert.deepEqual(manifest, {
    dependencies: {
      "@raycast/api": "^2.9.0",
      react: "19.3.1",
      other: "^1.0.0",
    },
    devDependencies: {
      "@types/node": "26.6.5",
      "@types/react": "19.3.0",
      "react-devtools": "8.0.0",
    },
  });
  const once = structuredClone(manifest);
  migrate(manifest);
  assert.deepEqual(manifest, once);
});

test("adds missing types without installing React or DevTools directly", () => {
  const manifest = { dependencies: { "@raycast/api": "^2.9.0" } };
  migrate(manifest);
  assert.deepEqual(manifest, {
    dependencies: { "@raycast/api": "^2.9.0" },
    devDependencies: { "@types/node": "26.6.5", "@types/react": "19.3.0" },
  });
});

test("updates duplicate and optional declarations without moving them", () => {
  const manifest = {
    dependencies: { "@types/node": "20.0.0", "@types/react": "18.0.0" },
    devDependencies: { "@types/react": "19.0.0" },
    optionalDependencies: { "react-devtools": "6.1.1", react: "19.0.0" },
  };
  migrate(manifest);
  assert.deepEqual(manifest, {
    dependencies: { "@types/node": "26.6.5", "@types/react": "19.3.0" },
    devDependencies: { "@types/react": "19.3.0" },
    optionalDependencies: { "react-devtools": "8.0.0", react: "19.3.1" },
  });
});

for (const currentVersion of ["2.9.0", "1.93.0"]) {
  test(`the runner installs compatible dependency pins when migrating from ${currentVersion}`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ray-migration-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const bin = path.join(root, "node_modules", ".bin");
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        dependencies: { "@raycast/api": "^2.9.0", react: "19.0.0" },
        devDependencies: {
          "@types/node": "22.19.17",
          "@types/react": "19.0.10",
          "react-devtools": "6.1.1",
        },
      })
    );
    fs.writeFileSync(
      path.join(root, "package-lock.json"),
      JSON.stringify({
        packages: { "node_modules/@raycast/api": { version: currentVersion } },
      })
    );
    const npmScript = path.join(root, "npm-stub.cjs");
    fs.writeFileSync(
      npmScript,
      `
    const fs = require("node:fs");
    const assert = require("node:assert/strict");
    const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const args = process.argv.slice(2);
    if (args[0] === "list") {
      console.log("react-devtools@8.0.0");
      return;
    }
    if (args.includes("--save-dev")) {
      for (const spec of args) {
        if (spec.startsWith("@types/")) {
          const separator = spec.lastIndexOf("@");
          manifest.devDependencies[spec.slice(0, separator)] = spec.slice(separator + 1);
        }
      }
      fs.writeFileSync("package.json", JSON.stringify(manifest));
      return;
    }
    assert.equal(manifest.dependencies["@raycast/api"], "^2.10.0");
    assert.equal(manifest.dependencies.react, "19.3.1");
    assert.equal(manifest.devDependencies["@types/node"], "26.6.5");
    assert.equal(manifest.devDependencies["@types/react"], "19.3.0");
    assert.equal(manifest.devDependencies["react-devtools"], "8.0.0");
    assert.deepEqual(process.argv.slice(2), ["install"]);
    fs.writeFileSync("installed.json", JSON.stringify(manifest));
  `
    );
    const lintScript = path.join(root, "ray-stub.cjs");
    fs.writeFileSync(
      lintScript,
      `
    const assert = require("node:assert/strict");
    assert.deepEqual(process.argv.slice(2), ["lint", "--fix"]);
    assert.ok(require("node:fs").existsSync("installed.json"));
  `
    );
    for (const [name, script] of [
      ["npm", npmScript],
      ["ray", lintScript],
    ]) {
      if (process.platform === "win32") {
        fs.writeFileSync(
          path.join(bin, name + ".cmd"),
          `@"${process.execPath}" "${script}" %*\r\n`
        );
      } else {
        fs.writeFileSync(
          path.join(bin, name),
          `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`,
          { mode: 0o755 }
        );
      }
    }
    const result = spawnSync(
      process.execPath,
      [path.resolve(__dirname, "../bin/migrate.js"), root],
      {
        encoding: "utf8",
        env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH },
      }
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.ok(fs.existsSync(path.join(root, "installed.json")), result.stdout);
    assert.match(result.stdout, /2\.10\.0/);
    const installed = JSON.parse(
      fs.readFileSync(path.join(root, "installed.json"), "utf8")
    );
    const final = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8")
    );
    assert.deepEqual(final, installed);
  });
}
