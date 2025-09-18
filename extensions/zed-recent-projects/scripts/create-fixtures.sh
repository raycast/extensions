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

for i in $(seq 0 $TARGET_VERSION); do
  MIGRATION=$(sqlite3 "$DB_PATH" "SELECT migration FROM migrations WHERE step=$i;")
  if [ -n "$MIGRATION" ]; then
    echo "Applying migration step $i"
    sqlite3 "$NEW_DB" "$MIGRATION"
  fi
done

# Apply sample data if available
SAMPLE_DATA_FILE="scripts/add-sample-data-${TARGET_VERSION}.sql"
if [ -f "$SAMPLE_DATA_FILE" ]; then
  echo "Applying sample data from $SAMPLE_DATA_FILE"
  sqlite3 "$NEW_DB" < "$SAMPLE_DATA_FILE"
fi

echo "Fixture created: $NEW_DB"
