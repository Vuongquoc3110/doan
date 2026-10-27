import pool from './connection';

export async function migrateApiContract() {
  const [columns] = await pool.query<any[]>("SHOW COLUMNS FROM stores LIKE 'is_active'");
  if (!columns.length) await pool.query('ALTER TABLE stores ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
}
if (require.main === module) {
  migrateApiContract().then(() => console.log('API contract migration applied: stores.is_active')).catch(error => {
    console.error(error.message); process.exitCode = 1;
  }).finally(() => pool.end());
}
