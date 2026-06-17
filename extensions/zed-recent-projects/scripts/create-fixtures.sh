#!/bin/bash

set -e

if [ $# -ne 2 ]; then
  echo "Usage: $0 <zed_db_path> <target_version>"
  exit 1
fi

DB_PATH="$1"
TARGET_VERSION="$2"

echo "Creating fixture for Zed version $TARGET_VERSION"

# Directory for fixtures
FIXTURES_DIR="test/fixtures"
mkdir -p "$FIXTURES_DIR"

NEW_DB="$FIXTURES_DIR/zed-db-v${TARGET_VERSION}.sqlite"
rm -f "$NEW_DB"

# Disable .sqliterc by unsetting HOME temporarily or use a wrapper function
run_sqlite() {
  HOME=/dev/null sqlite3 "$@"
}

# First, create the migrations table
echo "Creating migrations table"
run_sqlite "$NEW_DB" "CREATE TABLE IF NOT EXISTS migrations (domain TEXT, step INTEGER, migration TEXT);"

# Copy migrations up to target version
echo "Copying migrations up to version $TARGET_VERSION"
run_sqlite "$DB_PATH" ".mode list" ".separator '|'" "SELECT domain, step, migration FROM migrations WHERE step <= $TARGET_VERSION;" > /tmp/migrations_temp.txt

while IFS='|' read -r domain step migration; do
  if [ -n "$step" ]; then
    # Escape single quotes in migration SQL
    escaped_migration=$(echo "$migration" | sed "s/'/''/g")
    run_sqlite "$NEW_DB" "INSERT INTO migrations (domain, step, migration) VALUES ('$domain', $step, '$escaped_migration');"
  fi
done < /tmp/migrations_temp.txt

rm -f /tmp/migrations_temp.txt

# Apply migrations to create the schema
for i in $(seq 0 $TARGET_VERSION); do
  MIGRATION=$(run_sqlite "$DB_PATH" "SELECT migration FROM migrations WHERE step=$i;")
  if [ -n "$MIGRATION" ]; then
    echo "Applying migration step $i"
    run_sqlite "$NEW_DB" "$MIGRATION"
  fi
done

# Apply sample data if available
SAMPLE_DATA_FILE="scripts/add-sample-data-${TARGET_VERSION}.sql"
if [ -f "$SAMPLE_DATA_FILE" ]; then
  echo "Applying sample data from $SAMPLE_DATA_FILE"
  run_sqlite "$NEW_DB" < "$SAMPLE_DATA_FILE"
fi

echo "Fixture created: $NEW_DB"
