import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { generateSeedSql } from './seed_generator';
import { DATABASE_SQL_PATH, readDatabaseSql, writeDatabaseSql } from './database_file';
import { buildAndSaveAllSampleImages } from '../scripts/generate_sample_images';
import { migrateOperations } from './migrate_operations';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'klever_fruits_db';

async function runSetup() {
  // Validate the combined file before making any database changes.
  const { schema: schemaSql } = readDatabaseSql();
  console.log('================================================================');
  console.log('🍇 KLEVER FRUIT DATABASE INITIALIZATION & MIGRATION SCRIPT 🍇');
  console.log('================================================================');
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT} as user '${DB_USER}'...`);

  // 1. Initial connection without database
  const initConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  console.log(`Creating database '${DB_NAME}' if not exists...`);
  await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await initConn.end();

  // 2. Connect to klever_fruits_db
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  // 3. Apply the schema section of the combined SQL file.
  console.log(`Reading schema from: ${DATABASE_SQL_PATH}`);
  console.log('Applying schema (tables, foreign keys, views)...');
  await conn.query(schemaSql);
  console.log('✔ Schema applied successfully!');

  // 4. Generate local sample vector illustrations
  console.log('Generating local sample illustrations for products & banners...');
  buildAndSaveAllSampleImages();

  // 5. Refresh only the seed section, preserving the schema in database.sql.
  console.log(`Generating expanded seed data (156+ products, 10 dynamic banners)...`);
  const seedSql = generateSeedSql();
  writeDatabaseSql(schemaSql, seedSql);
  console.log(`✔ Seed section updated in: ${DATABASE_SQL_PATH} (${(seedSql.length / 1024).toFixed(1)} KB)`);

  console.log('Populating seed data into MySQL...');
  await conn.query(seedSql);
  await migrateOperations();
  console.log('✔ Seed data populated successfully!');

  // 5. Count records per table as required by Section 11
  console.log('\n================================================================');
  console.log('📊 THỐNG KÊ SỐ LƯỢNG BẢN GHI TRONG CÁC BẢNG (KLEVER FRUIT DB):');
  console.log('================================================================');

  const [tablesResult] = await conn.query<any[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME ASC;`,
    [DB_NAME]
  );

  let totalRows = 0;
  for (const row of tablesResult) {
    const tableName = row.TABLE_NAME;
    const [countResult] = await conn.query<any[]>(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    const count = countResult[0].count;
    totalRows += count;
    console.log(`  - ${tableName.padEnd(25)} : ${String(count).padStart(5)} bản ghi`);
  }

  // Count views
  const [viewsResult] = await conn.query<any[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'VIEW' ORDER BY TABLE_NAME ASC;`,
    [DB_NAME]
  );
  console.log('\n📈 VIEWS ĐÃ TẠO:');
  for (const row of viewsResult) {
    console.log(`  - ${row.TABLE_NAME}`);
  }

  console.log('----------------------------------------------------------------');
  console.log(`Tổng số bảng: ${tablesResult.length} | Tổng số bản ghi: ${totalRows}`);
  console.log('================================================================\n');

  await conn.end();
}

runSetup().catch((err) => {
  console.error('❌ Database setup error:', err);
  process.exit(1);
});
