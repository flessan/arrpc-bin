import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const stage = join(root, 'dist', 'lite-package');

await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });

for (const file of ['README.md', 'LICENSE', 'package.json']) {
  await cp(join(root, file), join(stage, file));
}
await cp(join(root, 'src'), join(stage, 'src'), { recursive: true });
await cp(join(root, 'browser-extension'), join(stage, 'browser-extension'), { recursive: true });

const databasePath = join(stage, 'src', 'process', 'detectable.json');
const sourceDatabase = JSON.parse(await readFile(databasePath, 'utf8'));
const liteDatabase = sourceDatabase
  .filter(entry => Array.isArray(entry.executables) && entry.executables.length > 0)
  .map(entry => ({
    id: entry.id,
    name: entry.name,
    executables: entry.executables
      .filter(executable => typeof executable.name === 'string' && executable.name.length > 0)
      .map(executable => ({
        name: executable.name,
        ...(typeof executable.is_launcher === 'boolean' ? { is_launcher: executable.is_launcher } : {}),
        ...(typeof executable.arguments === 'string' ? { arguments: executable.arguments } : {})
      }))
  }))
  .filter(entry => entry.executables.length > 0);

await writeFile(databasePath, JSON.stringify(liteDatabase));
const sourceBytes = Buffer.byteLength(JSON.stringify(sourceDatabase));
const liteBytes = Buffer.byteLength(JSON.stringify(liteDatabase));
console.log(
  `Prepared Lite database: ${sourceDatabase.length} entries / ${sourceBytes} bytes -> ${liteDatabase.length} entries / ${liteBytes} bytes.`
);
