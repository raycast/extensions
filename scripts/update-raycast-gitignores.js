#!/usr/bin/env node
/**
 * Updates all individual extension .gitignore files to include the standard
 * Raycast-recommended ignore patterns if not already present.
 *
 * Target block:
 *   # See https://help.github.com/articles/ignoring-files/ for more about ignoring files.
 *
 *   # dependencies
 *   /node_modules
 *
 *   # Raycast specific files
 *   raycast-env.d.ts
 *   .raycast-swift-build
 *   .swiftpm
 *   compiled_raycast_swift
 *   compiled_raycast_rust
 *
 *   # misc
 *   .DS_Store
 */

const fs = require('fs');
const path = require('path');

const CANONICAL = `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules

# Raycast specific files
raycast-env.d.ts
.raycast-swift-build
.swiftpm
compiled_raycast_swift
compiled_raycast_rust

# misc
.DS_Store
`;

const RAYCAST_LINES = [
  'raycast-env.d.ts',
  '.raycast-swift-build',
  '.swiftpm',
  'compiled_raycast_swift',
  'compiled_raycast_rust',
];

function shouldSkip(filePath) {
  return filePath.includes('/.fallow/');
}

function findGitignores(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      results.push(...findGitignores(full));
    } else if (entry.name === '.gitignore') {
      if (!shouldSkip(full)) {
        results.push(full);
      }
    }
  }
  return results;
}

const CANONICAL_RAYCAST_SECTION = `# Raycast specific files
raycast-env.d.ts
.raycast-swift-build
.swiftpm
compiled_raycast_swift
compiled_raycast_rust`;

function needsUpdate(content) {
  // Must start with our exact header for consistency
  if (!content.startsWith('# See https://help.github.com/articles/ignoring-files/')) return true;

  // Must contain the full well-formed Raycast section (consecutive)
  if (!content.includes(CANONICAL_RAYCAST_SECTION)) return true;

  return false;
}

function updateContent(original) {
  let content = original.replace(/\r\n/g, '\n').trimEnd();

  if (!needsUpdate(content)) {
    return original;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return CANONICAL;
  }

  // Force the canonical block at the top. Keep the rest of whatever was there.
  return CANONICAL + '\n' + trimmed + '\n';
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  if (!needsUpdate(original)) {
    return { filePath, changed: false };
  }

  const updated = updateContent(original);
  if (updated === original) {
    return { filePath, changed: false };
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  return { filePath, changed: true };
}

function main() {
  const root = path.resolve(__dirname, '..');
  const extensionsDir = path.join(root, 'extensions');
  const templatesDir = path.join(root, 'templates');

  console.log('Scanning for .gitignore files...');
  const gitignores = [
    ...findGitignores(extensionsDir),
    ...findGitignores(templatesDir),
  ];

  console.log(`Found ${gitignores.length} .gitignore files.`);

  let updatedCount = 0;
  const changedFiles = [];

  for (const file of gitignores) {
    const res = processFile(file);
    if (res.changed) {
      updatedCount++;
      changedFiles.push(res.filePath);
      console.log('Updated:', path.relative(root, res.filePath));
    }
  }

  console.log(`\nDone. Updated ${updatedCount} file(s).`);
  if (changedFiles.length > 0 && changedFiles.length <= 20) {
    console.log('\nChanged files:');
    for (const f of changedFiles) console.log(' -', path.relative(root, f));
  }
}

main();
