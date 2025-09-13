## Testing

1. Make sure Zed Stable or Zed Preview is installed.

2. Locate the SQLite3 database file for Zed Editor, e.g.:

   `/Users/<username>/Library/Application Support/Zed/db/0-stable/db.sqlite` - Zed Stable
   `/Users/<username>/Library/Application Support/Zed/db/0-preview/db.sqlite` - Zed Preview

3. Check the latest applied migration for `WorkspaceDb`:

   ```shell
   sqlite3 --readonly "/Users/<username>/Library/Application Support/Zed/db/0-preview/db.sqlite" "SELECT MAX(step) FROM migrations WHERE domain = 'WorkspaceDb';"
   28
   ```

   Latest supported one - **28** (as of 2025-09-13)

4. Generate the test database file:

   ```shell
   ./scripts/create-fixtures.sh "/Users/<username>/Library/Application Support/Zed/db/0-preview/db.sqlite" 28
   ```

5. Run the unit tests:

   ```shell
   npm run test
   ```

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
