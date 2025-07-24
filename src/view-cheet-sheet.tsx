import { ActionPanel, List, Action, Icon } from "@raycast/api";

const keybindings = [
  {
    category: "Cursor Movement",
    commands: [
      { title: "CTRL + A", description: "Jump to beginning of line" },
      { title: "CTRL + E", description: "Jump to end of line" },
      { title: "ALT + B", description: "Move backward one word" },
      { title: "ALT + F", description: "Move forward one word" },
      { title: "CTRL + B", description: "Move backward one character" },
      { title: "CTRL + F", description: "Move forward one character" },
      { title: "CTRL + XX", description: "Toggle between cursor and beginning of line" },
    ],
  },
  {
    category: "Text Editing",
    commands: [
      { title: "CTRL + W", description: "Delete word before cursor" },
      { title: "ALT + D", description: "Delete word after cursor" },
      { title: "CTRL + U", description: "Delete from cursor to beginning of line" },
      { title: "CTRL + K", description: "Delete from cursor to end of line" },
      { title: "CTRL + H", description: "Delete character before cursor (backspace)" },
      { title: "CTRL + D", description: "Delete character at cursor" },
      { title: "CTRL + T", description: "Swap current and previous characters" },
      { title: "ALT + T", description: "Swap current and previous words" },
      { title: "ALT + U", description: "Uppercase word after cursor" },
      { title: "ALT + L", description: "Lowercase word after cursor" },
      { title: "ALT + C", description: "Capitalize word after cursor" },
    ],
  },
  {
    category: "History",
    commands: [
      { title: "CTRL + R", description: "Search command history (reverse)" },
      { title: "CTRL + S", description: "Search command history (forward)" },
      { title: "CTRL + P", description: "Previous command (same as up arrow)" },
      { title: "CTRL + N", description: "Next command (same as down arrow)" },
      { title: "CTRL + O", description: "Execute current history line and move to next" },
      { title: "ALT + R", description: "Revert changes to current line" },
      { title: "!!", description: "Repeat last command" },
      { title: "!n", description: "Execute command number n from history" },
      { title: "!string", description: "Execute most recent command starting with 'string'" },
    ],
  },
  {
    category: "Process Control",
    commands: [
      { title: "CTRL + C", description: "Interrupt/kill current process" },
      { title: "CTRL + Z", description: "Suspend current process" },
      { title: "CTRL + L", description: "Clear screen" },
      { title: "CTRL + \\", description: "Send SIGQUIT to current process" },
      { title: "CTRL + G", description: "Cancel current editing command" },
    ],
  },
  {
    category: "Cut & Paste",
    commands: [
      { title: "CTRL + Y", description: "Paste (yank) previously cut text" },
      { title: "ALT + Y", description: "Cycle through kill ring (after CTRL+Y)" },
      { title: "CTRL + _", description: "Undo last editing command" },
    ],
  },
  {
    category: "Completion & Expansion",
    commands: [
      { title: "TAB", description: "Auto-complete commands and filenames" },
      { title: "TAB TAB", description: "Show all possible completions" },
      { title: "ALT + ?", description: "List possible completions" },
      { title: "ALT + *", description: "Insert all possible completions" },
      { title: "ALT + /", description: "Complete filename" },
      { title: "CTRL + X CTRL + E", description: "Edit command line in default editor" },
    ],
  },
];

export default function Command() {
  return (
    <List>
      {keybindings.map((category) => (
        <List.Section key={category.category} title={category.category}>
          {category.commands.map((cmd) => (
            <List.Item
              key={cmd.title}
              icon={Icon.Terminal}
              title={cmd.title}
              subtitle={cmd.description}
              keywords={cmd.description.split(" ").concat(cmd.title.split(" "))}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={cmd.title} title="Copy Shortcut" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
