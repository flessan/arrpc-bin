import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const database = JSON.parse(readFileSync(join(root, 'src/process/detectable.json'), 'utf8'));

test('game detection database is present and non-empty', () => {
  assert.ok(Array.isArray(database));
  assert.ok(database.length > 100);
});

test('game detection records have the fields used by the scanner', () => {
  assert.ok(database.some(entry =>
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    Array.isArray(entry.executables)
  ));
});
