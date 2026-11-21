# 2.10.0

Update extensions to the Node 26 and React 19.3 runtime:

- Pin `@types/node` to `26.6.5` and `@types/react` to `19.3.0`, adding them to dev dependencies if missing.
- Update explicitly declared `react` to `19.3.1`. Extensions without a direct React dependency use the version supplied by `@raycast/api`.
- Update `react-devtools` to `8.0.0` when already declared, preserving its optional installation.

Existing dependencies stay in their original sections. The migration runner applies `package-json.cjs` before installing the new API so npm resolves the updated peer dependencies together. The install also updates the extension's lockfile.

Run the focused tests from `migrations`:

```sh
node --test 2.10.0/package-json.test.cjs
```
