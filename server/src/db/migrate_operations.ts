import pool from './connection';

export const operationTables = [
    `CREATE TABLE IF NOT EXISTS pos_requests (
      user_id INT NOT NULL, request_key VARCHAR(100) NOT NULL, payload_hash CHAR(64) NOT NULL,
      order_id INT NULL, PRIMARY KEY (user_id, request_key)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS receipt_jobs (
      id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, user_id INT NOT NULL,
      state ENUM('sending','submitted','unknown') NOT NULL DEFAULT 'sending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX(order_id)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS payment_events (
      id INT AUTO_INCREMENT PRIMARY KEY, provider VARCHAR(20) NOT NULL, event_id VARCHAR(100) NOT NULL,
      order_id INT NULL, amount BIGINT NOT NULL, outcome VARCHAR(40) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY(provider,event_id)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS inventory_batches (
      id INT AUTO_INCREMENT PRIMARY KEY, store_id INT NOT NULL, variant_id INT NOT NULL,
      batch_no VARCHAR(100) NOT NULL, qty INT NOT NULL, received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NULL, legacy TINYINT(1) NOT NULL DEFAULT 0,
      UNIQUE KEY(store_id,variant_id,batch_no), INDEX(store_id,variant_id,received_at,id), INDEX(expires_at)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS batch_allocations (
      id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, batch_id INT NOT NULL, qty INT NOT NULL,
      restored TINYINT(1) NOT NULL DEFAULT 0, INDEX(order_id)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS push_devices (
      token VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, platform VARCHAR(20) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX(user_id)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS operation_jobs (
      id INT AUTO_INCREMENT PRIMARY KEY, kind VARCHAR(30) NOT NULL, dedupe_key VARCHAR(160) NOT NULL,
      payload JSON NOT NULL, state VARCHAR(20) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0,
      available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, locked_at DATETIME NULL, last_error VARCHAR(500) NULL,
      UNIQUE KEY(kind,dedupe_key), INDEX(state,available_at)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS shipments (
      order_id INT PRIMARY KEY, provider VARCHAR(30) NOT NULL, tracking_number VARCHAR(100) NOT NULL,
      provider_id VARCHAR(100) NULL, state VARCHAR(30) NOT NULL, tracking_url TEXT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS delivery_quotes (
      id VARCHAR(64) PRIMARY KEY, store_id INT NOT NULL, address VARCHAR(500) NOT NULL,
      lat DECIMAL(10,7) NOT NULL, lng DECIMAL(10,7) NOT NULL, fee BIGINT NOT NULL,
      provider VARCHAR(30) NOT NULL, expires_at DATETIME NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS order_deliveries (
      order_id INT PRIMARY KEY, quote_id VARCHAR(64) NOT NULL, lat DECIMAL(10,7) NOT NULL,
      lng DECIMAL(10,7) NOT NULL, address VARCHAR(500) NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS verified_reviews (
      review_id INT PRIMARY KEY, order_id INT NOT NULL, user_id INT NOT NULL, product_id INT NOT NULL,
      UNIQUE KEY(user_id,product_id,order_id)) ENGINE=InnoDB`,
];
export async function migrateOperations() {
  for (const sql of operationTables) await pool.query(sql);
  // Historical stock has no known expiry. Preserve it explicitly; never invent shelf-life dates.
  await pool.query(`INSERT IGNORE INTO inventory_batches (store_id,variant_id,batch_no,qty,legacy)
    SELECT i.store_id,i.variant_id,'LEGACY',i.qty,1 FROM inventory i
    WHERE NOT EXISTS (SELECT 1 FROM inventory_batches b WHERE b.store_id=i.store_id AND b.variant_id=i.variant_id)`);
}
if (require.main === module) {
  migrateOperations().then(() => console.log('Operations migration applied')).catch(error => {
    console.error(error.message); process.exitCode = 1;
  }).finally(() => pool.end());
}
