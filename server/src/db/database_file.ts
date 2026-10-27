import fs from 'fs';
import path from 'path';

export const DATABASE_SQL_PATH = path.join(__dirname, '../../db/database.sql');
export const SEED_SEPARATOR = '-- === VQ_FRUIT_SEED_DATA ===';

export function combineDatabaseSql(schema: string, seed: string): string {
  if (!schema.trim() || !seed.trim() || schema.includes(SEED_SEPARATOR) || seed.includes(SEED_SEPARATOR)) {
    throw new Error('Database SQL requires one schema section and one seed section');
  }
  return `${schema.trimEnd()}\n\n${SEED_SEPARATOR}\n\n${seed.trim()}\n`;
}

export function readDatabaseSql(): { schema: string; seed: string } {
  const sections = fs.readFileSync(DATABASE_SQL_PATH, 'utf8').split(SEED_SEPARATOR);
  if (sections.length !== 2 || !sections[0].trim() || !sections[1].trim()) {
    throw new Error('database.sql is missing its schema/seed separator');
  }
  return { schema: sections[0].trimEnd(), seed: sections[1].trim() };
}

export function writeDatabaseSql(schema: string, seed: string): void {
  fs.writeFileSync(DATABASE_SQL_PATH, combineDatabaseSql(schema, seed), 'utf8');
}
