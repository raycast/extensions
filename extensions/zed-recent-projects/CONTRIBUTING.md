## Testing

1. Make sure Zed Stable or Zed Preview is installed.

2. Locate the SQLite3 database file for Zed Editor, e.g.:

   `/Users/<username>/Library/Application Support/Zed/db/0-stable/db.sqlite` - Zed Stable MacOS
   `/Users/<username>/Library/Application Support/Zed/db/0-preview/db.sqlite` - Zed Preview MacOS
   `C:\Users\<username>\AppData\Local\Zed\db\0-stable\db.sqlite` - Zed Stable Windows
   `C:\Users\<username>\AppData\Local\Zed\db\0-preview\db.sqlite` - Zed Preview Windows

3. Check the latest applied migration for `WorkspaceDb`:

   ```shell
   sqlite3 --readonly "/Users/<username>/Library/Application Support/Zed/db/0-preview/db.sqlite" "SELECT MAX(step) FROM migrations WHERE domain = 'WorkspaceDb';"
   34
   ```

   Minimum supported version - **34** (as of 2025-01-17)

4. Generate the test database files:

   ```shell
   ./scripts/create-fixtures.sh "/Users/<username>/Library/Application Support/Zed/db/0-preview/db.sqlite" 34
   ./scripts/create-fixtures.sh "/Users/<username>/Library/Application Support/Zed/db/0-preview/db.sqlite" 30
   ```

   Note: The v30 fixture is used to test unsupported version detection.

5. Run the unit tests:

   ```shell
   npm run test
   ```

   Note: Integration tests that require fixtures will be automatically skipped if the fixture files don't exist.

## If Zed Database Schema Update Is Needed

If the Zed database schema gets updated, new tests need to be added:

1. Get the latest applied migration for `WorkspaceDb`:

   ```shell
   sqlite3 --readonly "/Users/<username>/Library/Application Support/Zed/db/0-preview/db.sqlite" "SELECT MAX(step) FROM migrations WHERE domain = 'WorkspaceDb';"
   42
   ```

   Let's say migration **42** adds breaking changes.

2. Implement schema update support in `db.ts`.

3. Add a new sample data script file `scripts/add-sample-data-42.sql`.

4. Add a new section `v42 Schema` to `db.test.ts`.

5. Run tests `npm run test` and update snapshots.