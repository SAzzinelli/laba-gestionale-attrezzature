// backend/scripts/run_migrations.js
import fs from 'node:fs';
import path from 'node:path';
import db from '../utils/db.js';

const MIGRATIONS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'migrations');

function runSql(sql) {
  db.exec(sql);
}

const files = fs.readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log('Running migrations:', files);
for (const f of files) {
  const p = path.join(MIGRATIONS_DIR, f);
  const sql = fs.readFileSync(p, 'utf8');
  console.log('> applying', f);
  runSql(sql);
}
console.log('All migrations applied');
