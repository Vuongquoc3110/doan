import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'klever_fruits_db';

async function runReset() {
  console.log('⚠ Resetting Klever Fruit Database...');
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  console.log(`Dropping database '${DB_NAME}' if exists...`);
  await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\`;`);
  await conn.end();
  console.log('Database dropped. Now running fresh setup...');

  // Run setup
  require('./setup');
}

runReset().catch((err) => {
  console.error('❌ Database reset error:', err);
  process.exit(1);
});
