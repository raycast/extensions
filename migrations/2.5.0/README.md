# 2.5.0

This migration catches up API deprecations introduced after 1.103.0:

- Rename `environment.commandName` and `environment.commandMode` to `entryPointName` and `entryPointMode`. Destructuring keeps existing local variable names.
- Rename the platform-specific shortcut key `windows` to `Windows`. The `"windows"` keyboard modifier stays unchanged.

The codemod follows imports from `@raycast/api`, including aliases and namespace imports. Shortcut objects must have a `Keyboard.Shortcut` type annotation/assertion or be passed directly (or through a local variable) to a Raycast component's `shortcut` prop. Reads of migrated local shortcut variables are updated too.

Review other shortcut definitions manually. Objects with both platform-key spellings, spreads, or dynamic keys are deliberately left unchanged to avoid altering precedence. If a shortcut binding has an unsafe initializer or reassignment, the whole binding is left unchanged, including its reads. Destructuring declarations and assignments preserve local names and defaults. The migration does not perform general data-flow analysis through helper functions or object aliases.

Run the focused tests from the `migrations` directory after installing dependencies:

```sh
node --test 2.5.0/index.test.cjs
```
