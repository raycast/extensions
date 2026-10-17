#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

function usage() {
  console.error('Usage: create-fixtures.ts [--skip-errors] <zed_db_path> <target_version>');
  process.exit(1);
}

const args = process.argv.slice(2);

if (args.length !== 2) {
  usage();
}

const [srcPathInput, targetInput] = args
const targetVersion = Number(targetInput);
if (!srcPathInput || Number.isNaN(targetVersion)) {
  usage();
}

const cwd = process.cwd();
// Handle both absolute and relative paths
const srcPath = path.isAbsolute(srcPathInput) ? srcPathInput : path.resolve(cwd, srcPathInput);
if (!fs.existsSync(srcPath)) {
  console.error(`Source DB not found: ${srcPath}`);
  process.exit(1);
}

const fixturesDir = path.join(cwd, 'test', 'fixtures');
fs.mkdirSync(fixturesDir, { recursive: true });
const newDbPath = path.join(fixturesDir, `zed-db-v${targetVersion}.sqlite`);
if (fs.existsSync(newDbPath)) {
  fs.unlinkSync(newDbPath);
}

console.log(`Creating fixture for Zed version ${targetVersion} at ${newDbPath}`);

let srcDb: DatabaseSync;
let newDb: DatabaseSync;
try {
  srcDb = new DatabaseSync(srcPath);
} catch (err) {
  console.error('Failed to open source DB:', err);
  process.exit(1);
}

try {
  newDb = new DatabaseSync(newDbPath);
} catch (err) {
  console.error('Failed to create new DB:', err);
  process.exit(1);
}

// Ensure migrations table exists in new DB
newDb.exec("CREATE TABLE IF NOT EXISTS migrations (domain TEXT, step INTEGER, migration TEXT);");

// Read migrations from source where step <= targetVersion
const selectStmt = srcDb.prepare('SELECT domain, step, migration FROM migrations WHERE step <= ? ORDER BY step');
const migrations: Array<{ domain: string, step: number, migration: string }> = selectStmt.all(targetVersion) as any[];

// Insert migrations rows into new DB
const insertStmt = newDb.prepare('INSERT INTO migrations (domain, step, migration) VALUES (?, ?, ?)');
for (const row of migrations) {
  insertStmt.run(row.domain, row.step, row.migration);
}

// Apply migrations in order from 0..targetVersion
for (let i = 0; i <= targetVersion; i++) {
  const stepStmt = srcDb.prepare('SELECT migration FROM migrations WHERE step = ? ORDER BY rowid');
  const stepRows: Array<{ migration: string }> = stepStmt.all(i) as any[];
  if (stepRows.length > 0) {
    for (const r of stepRows) {
      const mig = r.migration;
      if (mig && mig.trim()) {
        console.log(`Applying migration step ${i}`);
        // Split by semicolon and execute each statement separately
        const statements = mig.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (let stmtIdx = 0; stmtIdx < statements.length; stmtIdx++) {
          const stmt = statements[stmtIdx];
          try {
            newDb.exec(stmt);
          } catch (err) {
            console.warn(`⚠️ Failed to apply migration for step ${i}`);
            console.warn(`${stmtIdx}: ${err}`)
          }
        }
      }
    }
  }
}

// Apply sample data file if present
const sampleDataFile = path.join(cwd, 'scripts', `add-sample-data-${targetVersion}.sql`);
if (fs.existsSync(sampleDataFile)) {
  console.log(`Applying sample data from ${sampleDataFile}`);
  const sql = fs.readFileSync(sampleDataFile, 'utf8');
  if (sql && sql.trim()) {
    try {
      newDb.exec(sql);
    } catch (err) {
      console.error('Failed to apply sample data:', err);
      process.exit(1);
    }
  }
}

try {
  // Close DBs if supported
  // @ts-ignore - DatabaseSync has a close method in Node 20+
  srcDb?.close?.();
  // @ts-ignore
  newDb?.close?.();
} catch { }

console.log(`Fixture created: ${newDbPath}`);
