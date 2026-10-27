import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || '0.0.0.0',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'klever_fruit_secret_access_key_2026_super_secure!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'klever_fruit_secret_refresh_key_2026_super_secure!',
    accessExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'klever_fruits_db',
  },
};
