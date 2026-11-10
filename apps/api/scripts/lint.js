import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['src', 'scripts', 'tests'];

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
};

let failed = 0;
for (const target of targets) {
  const dir = path.join(root, target);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      failed += 1;
      console.error(`Sintaxis invalida: ${path.relative(root, file)}`);
      console.error(result.stderr);
    }
  }
}

if (failed) {
  console.error(`\n${failed} archivo(s) con errores de sintaxis`);
  process.exit(1);
}
console.log('Sintaxis OK');
