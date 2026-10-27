const assert = require('node:assert/strict');
const { readDatabaseSql, combineDatabaseSql, SEED_SEPARATOR } = require('../../dist/db/database_file');
const { generateSeedSql } = require('../../dist/db/seed_generator');

// File-only checks: no database connection and no SQL execution.
const current = readDatabaseSql();
assert(current.schema.includes('CREATE TABLE'));
assert(current.seed.includes('INSERT INTO'));
const regenerated = generateSeedSql();
const merged = combineDatabaseSql(current.schema, regenerated);
const sections = merged.split(SEED_SEPARATOR);
assert.equal(sections.length, 2, 'Exactly one seed section');
assert.equal(sections[0].trim(), current.schema.trim(), 'Regenerating seed preserves schema');
assert.equal(sections[1].trim(), regenerated.trim(), 'Entire generated seed retained');
assert.equal(combineDatabaseSql(sections[0], sections[1]), merged, 'Rebuilding does not duplicate sections');
assert.throws(() => combineDatabaseSql('', regenerated));
assert.throws(() => combineDatabaseSql(current.schema, ''));
assert.throws(() => combineDatabaseSql(merged, regenerated));
console.log('PASS: combined SQL readable, schema preserved during seed generation, no duplicate sections, malformed input rejected. No database accessed.');
