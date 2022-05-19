# Lifecycle

When a command is opened in Raycast, the command code is executed right away. If the extension exports a default function, this function will automatically be called. If you return a React component in the exported default function, it will automatically be rendered as the root component. For commands that don't need a user interface (`mode` property set to "`no-view"` in the manifest), you can export an async function and perform API methods using async/await.

```typescript
// Returns the main React component for a view command
export default function Command() {
  return <Detail markdown="# Hello" />;
}
```

```typescript
// Runs async. code in a non-view command
export default async () => {
  await showHUD("Hello");
};
```

You can inspect the [Environment](../api-reference/environment.md) for extension information and paths or access [Preference Properties](../api-reference/preferences.md) for user-entered values that are passed to the command.

When the command is unloaded (typically by popping back to root search for view commands or after the script finishes for non-view commands), Raycast unloads the entire command from memory. Note that there are memory limits for commands, and if those limits are exceeded, the command gets terminated, and users will see an error message.
