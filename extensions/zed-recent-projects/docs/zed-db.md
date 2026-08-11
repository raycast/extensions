# Zed Database Documentation

This document describes the Zed editor's SQLite database structure, specifically the workspace-related tables used by this extension.

## Database Location

The Zed database is located at:

- **macOS:** `~/Library/Application Support/Zed/db/{version}/db.sqlite`
- **Windows:** `%LOCALAPPDATA%\Zed\db\{version}\db.sqlite`

Where `{version}` corresponds to the Zed build:

| Build        | Version Folder |
| ------------ | -------------- |
| Zed          | `0-stable`     |
| Zed Preview  | `0-preview`    |
| Zed Dev      | `0-dev`        |

## Schema Version

The database schema version can be queried from the `migrations` table:

```sql
SELECT MAX(step) FROM migrations WHERE domain = 'WorkspaceDb';
```

### Supported Versions

This extension supports **v34+** of the WorkspaceDb schema.

The v34 schema uses the `remote_connections` table with support for named connections and dev containers, and includes the `paths_order` field for multi-folder workspace support.

> **Note:** Older schema versions (v33 and below) are no longer supported. Users with older versions will see a message asking them to update Zed.

## Schema (v34+)

### `workspaces` Table

Stores workspace metadata including paths, window state, and dock configuration.

```sql
CREATE TABLE IF NOT EXISTS "workspaces" (
  workspace_id INTEGER PRIMARY KEY,
  paths TEXT,
  paths_order TEXT,
  remote_connection_id INTEGER REFERENCES remote_connections (id),
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  window_state TEXT,
  window_x REAL,
  window_y REAL,
  window_width REAL,
  window_height REAL,
  display BLOB,
  left_dock_visible INTEGER,
  left_dock_active_panel TEXT,
  right_dock_visible INTEGER,
  right_dock_active_panel TEXT,
  bottom_dock_visible INTEGER,
  bottom_dock_active_panel TEXT,
  left_dock_zoom INTEGER,
  right_dock_zoom INTEGER,
  bottom_dock_zoom INTEGER,
  fullscreen INTEGER,
  centered_layout INTEGER,
  session_id TEXT,
  window_id INTEGER
) STRICT;
```

**Key columns for this extension:**

| Column                 | Type    | Description                                           |
| ---------------------- | ------- | ----------------------------------------------------- |
| `workspace_id`         | INTEGER | Unique workspace identifier                           |
| `paths`                | TEXT    | Newline-separated list of folder paths                |
| `paths_order`          | TEXT    | Comma-separated indices defining path display order   |
| `remote_connection_id` | INTEGER | Foreign key to `remote_connections` (NULL for local)  |
| `timestamp`            | TEXT    | Last opened timestamp                                 |
| `session_id`           | TEXT    | Current session ID (for detecting open windows)       |
| `window_id`            | INTEGER | Window ID within session (for detecting open windows) |

### `remote_connections` Table

Stores SSH, WSL, and dev container connection information.

```sql
CREATE TABLE remote_connections (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  host TEXT,
  port INTEGER,
  user TEXT,
  distro TEXT,
  name TEXT,
  container_id TEXT
);
```

| Column         | Type    | Description                                         |
| -------------- | ------- | --------------------------------------------------- |
| `id`           | INTEGER | Unique connection identifier                        |
| `kind`         | TEXT    | Connection type: `"ssh"` or `"wsl"`                 |
| `host`         | TEXT    | Hostname for SSH connections                        |
| `port`         | INTEGER | Port number (optional)                              |
| `user`         | TEXT    | Username for connection                             |
| `distro`       | TEXT    | WSL distribution name (for WSL connections)         |
| `name`         | TEXT    | User-friendly connection name (optional)            |
| `container_id` | TEXT    | Dev container identifier (for container connections)|

## Multi-Folder Workspaces

Zed supports multi-folder workspaces where multiple directories are opened in a single window.

### Path Storage

Paths are stored as newline-separated strings in the `paths` column:

```
/Users/username/Projects/project-folder-1
/Users/username/Projects/project-folder-2
/Users/username/Projects/project-folder-3
```

### Path Ordering

The `paths_order` column contains comma-separated indices that define the display order:

| `paths_order` | Meaning                         |
| ------------- | ------------------------------- |
| `0`           | Single folder                   |
| `0,1`         | Two folders in original order   |
| `0,1,2`       | Three folders in original order |
| `1,0`         | Two folders, second shown first |

### Example Data

**Single folder workspace:**

```
paths: "/Users/username/Projects/my-project"
paths_order: "0"
```

**Multi-folder workspace (3 folders):**

```
paths: "/Users/username/Projects/folder1
/Users/username/Projects/folder2
/Users/username/Projects/folder3"
paths_order: "0,1,2"
```

**Remote SSH workspace (2 folders):**

```
paths: "/home/username/dev/project1
/home/username/dev/project2"
paths_order: "0,1"
remote_connection_id: 1  -- references remote_connections table
```

## Query for Fetching Workspaces

```sql
SELECT
  CASE
    WHEN remote_connection_id IS NULL THEN 'local'
    ELSE 'remote'
  END as type,
  workspace_id as id,
  paths,
  paths_order,
  timestamp,
  window_id,
  session_id,
  host,
  user,
  port,
  kind,
  distro,
  name
FROM workspaces
LEFT JOIN remote_connections ON remote_connection_id = remote_connections.id
WHERE paths IS NOT NULL AND paths != ''
ORDER BY timestamp DESC
```

## Detecting Open Windows

To detect which workspaces are currently open, the extension:

1. Reads `session_id` from `kv_store` table
2. Reads `session_window_stack` from `kv_store` to get active window IDs
3. Matches workspaces where `session_id` matches and `window_id` is in the active set

```sql
SELECT key, value FROM kv_store
WHERE key IN ('session_id', 'session_window_stack')
```
