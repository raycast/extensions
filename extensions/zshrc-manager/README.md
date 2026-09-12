<p align="center">
  <img src="./assets/extension-icon.png" width="100" height="100" alt="Zshrc Manager Icon">
</p>

<h1 align="center">Zshrc Manager</h1>

<p align="center">
  <strong>A powerful Raycast extension for managing your <code>~/.zshrc</code> configuration file</strong>
</p>

<p align="center">
  View, organize, and edit your shell aliases, exports, functions, and more with an intuitive interface.
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-one-command-every-surface">Commands</a> •
  <a href="#-usage">Usage</a> •
  <a href="#️-configuration">Configuration</a> •
  <a href="#-development">Development</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## ✨ Features

<table>
  <tr>
    <td width="50">🏠</td>
    <td><strong>Unified Home</strong></td>
    <td>One search-first surface: recents, tools with a live health badge, category counts, and discovery — typing searches your whole config at once</td>
  </tr>
  <tr>
    <td>🖥️</td>
    <td><strong>Alias Management</strong></td>
    <td>Browse, add, edit, and search aliases organized by sections with full validation</td>
  </tr>
  <tr>
    <td>📦</td>
    <td><strong>Export Management</strong></td>
    <td>Manage environment variable exports with search by variable name or value</td>
  </tr>
  <tr>
    <td>⚙️</td>
    <td><strong>Advanced Config</strong></td>
    <td>View and manage functions, plugins, sources, evals, setopts, PATH entries, and keybindings</td>
  </tr>
  <tr>
    <td>🔍</td>
    <td><strong>Smart Search</strong></td>
    <td>Search across all content types with real-time filtering by section, name, command, or value</td>
  </tr>
  <tr>
    <td>📝</td>
    <td><strong>Section Management</strong></td>
    <td>View zshrc content organized by logical sections with detailed breakdowns</td>
  </tr>
  <tr>
    <td>💾</td>
    <td><strong>Backup & Restore</strong></td>
    <td>Automatic backups before edits with one-click restore functionality</td>
  </tr>
  <tr>
    <td>↩️</td>
    <td><strong>Undo History</strong></td>
    <td>Session-based undo/redo for all edit operations</td>
  </tr>
</table>

---

## 🚀 One Command, Every Surface

The **Zshrc Manager** command opens a single home surface. At rest it shows an overview; press `⏎` on a category to drill into a focused view (`Esc` returns home), or just start typing to search everything at once.

| Surface                 | What it holds                                                       | Reach it by                 |
| ----------------------- | ------------------------------------------------------------------- | --------------------------- |
| 🕘 **Recently Managed**  | Every entry you've touched here, ranked by frecency                 | Browse, at rest             |
| 🏥 **Health Check**      | Duplicates, conflicts and broken sources, with a live issue badge   | Tools row or `⌘⇧H`          |
| 💾 **Backup Manager**    | Restore or diff a previous version                                  | Tools row or `⌘⇧B`          |
| ↩️ **History**           | Undo and redo recent changes                                        | Tools row or `⌘⇧Y`          |
| 📁 **Browse**            | Sections, Aliases, Exports, Functions, Plugins, Sources, Evals, Setopts, PATH, FPATH, Keybindings — each with a count, each a focused view | `⏎` on a category           |
| 📚 **Discover**          | Curated alias collections you can add                               | Discover row, `⌘⇧L`, or inline under "Available to Add" while searching |

---

## 📖 Usage

### Getting Started

1. Install the extension from the Raycast Store
2. Open **Zshrc Manager** — the home surface shows your whole configuration at a glance
3. Type to search across every entry type (and the catalogue) at once
4. Use actions to add, edit, or copy content; `⌘⇧D` toggles the detail pane

<details>
<summary><strong>📝 Adding New Aliases</strong></summary>

1. Open **Aliases** from the home Browse section
2. Press `Cmd+N` or click "Add New Alias"
3. Enter the alias name and command
4. Select or create a section
5. Save to add to your zshrc file

```zsh
# Example: Add a quick git status alias
alias gs='git status'
```

</details>

<details>
<summary><strong>📦 Managing Exports</strong></summary>

1. Open **Exports** from the home Browse section
2. Press `Cmd+N` to add a new export
3. Enter the variable name (uppercase recommended) and value
4. Save to update your zshrc file

```zsh
# Example: Set your default editor
export EDITOR=code
```

</details>

<details>
<summary><strong>🔍 Searching Content</strong></summary>

- Use the search bar in any command
- Search by name, command, section, or value
- Results update in real-time as you type
- The landing view searches across all entry types at once — and every result can be edited, deleted, or copied in place

</details>

---

## ⚙️ Configuration

### Built-in Section Formats

The extension automatically detects sections using these patterns:

| Format    | Example                         | Description               |
| --------- | ------------------------------- | ------------------------- |
| Labeled   | `# Section: Name`               | Simple labeled sections   |
| Dashed    | `# --- Name --- #`              | Dashed delimiter sections |
| Bracketed | `# [Name]`                      | Bracketed sections        |
| Hash      | `## Name`                       | Double-hash sections      |
| Tags      | `# @start Name` / `# @end Name` | Custom start/end tags     |
| Functions | `myFunc() { ... }`              | Function definitions      |

<details>
<summary><strong>🔧 Custom Section Patterns</strong></summary>

Configure custom patterns in Raycast Preferences:

1. Open **Raycast Preferences**
2. Go to **Extensions → Zshrc Manager**
3. Configure your custom patterns

#### Custom Header Pattern

- **Enable Custom Header Pattern**: Toggle to enable
- **Custom Header Pattern**: Regex with one capture group for section name

```regex
# Example: Match "# My Section"
^#\s+(.+)$
```

#### Custom Start/End Patterns

- **Enable Custom Start/End Patterns**: Toggle to enable
- **Custom Start Pattern**: Regex with one capture group
- **Custom End Pattern**: Regex for end markers

```regex
# Start pattern
^#\s*start\s+(.+)$

# End pattern
^#\s*end\s+(.+)$
```

#### Pattern Requirements

- Patterns must include exactly **one capture group** `(...)` for the section name
- Patterns are automatically anchored to the start of the line (`^`)
- Matching is case-insensitive
- Invalid patterns are ignored, falling back to defaults

</details>

---

## ⌨️ Keyboard Shortcuts

| Shortcut      | Action                          |
| ------------- | ------------------------------- |
| `Cmd+N`       | Add new alias/export            |
| `Cmd+R`       | Refresh data                    |
| `Cmd+O`       | Open ~/.zshrc in default editor |
| `Cmd+C`       | Copy selected content           |
| `Cmd+Z`       | Undo last change                |
| `Cmd+Shift+Z` | Redo                            |

---

## 📋 Requirements

| Requirement        | Details                             |
| ------------------ | ----------------------------------- |
| 🐚 **Shell**       | Zsh (Z shell)                       |
| 📄 **File**        | `~/.zshrc` configuration file       |
| 🔐 **Permissions** | Read/write access to home directory |

---

## 🛡️ Error Handling

| Scenario             | Behavior                                 |
| -------------------- | ---------------------------------------- |
| 📁 File Not Found    | Graceful fallback with cached data       |
| 🔒 Permission Errors | Clear error messages with suggestions    |
| 📏 Large Files       | Automatic content truncation (1MB limit) |
| ✅ Validation        | Input validation for aliases and exports |
| 💾 Backups           | Automatic `.zshrc.bak` before writes     |

---

## 🔧 Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Testing
npm run test
npm run test:coverage

# Linting
npm run lint
npm run fix-lint
```

<details>
<summary><strong>📁 Project Structure</strong></summary>

```
src/
├── __tests__/          # Test files (mirror src structure)
├── components/         # Reusable UI components
├── data/               # Static data (templates)
├── hooks/              # React hooks for state management
├── lib/                # Core business logic
├── types/              # TypeScript type definitions
├── utils/              # Pure utility functions
└── *.tsx               # UI components (commands)
```

</details>

---

## 🤝 Contributing

We welcome contributions!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

---

## 📄 License

MIT License

---

## 🔗 Links

| Resource         | Link                                                          |
| ---------------- | ------------------------------------------------------------- |
| 🐛 Issues        | [GitHub Issues](https://github.com/raycast/extensions/issues) |
| 📚 Documentation | [Raycast Developer Docs](https://developers.raycast.com)      |
| 📝 Changelog     | [CHANGELOG.md](./CHANGELOG.md)                                |
| ⚠️ Limitations   | [LIMITATIONS.md](./LIMITATIONS.md)                            |

---

<p align="center">
  Made with ❤️ for the Raycast community
</p>
