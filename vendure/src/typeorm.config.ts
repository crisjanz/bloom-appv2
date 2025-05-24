import { DataSource } from 'typeorm';
import { join } from 'path';
import dotenv from 'dotenv';
dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA || 'public',
  migrations: [join(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: false,
  entities: [
    join(__dirname, '../node_modules/@vendure/core/dist/entity/**/*.entity.js'), // core entities
    join(__dirname, './entities/**/*.entity.ts'), // ✅ only your entity files (optional)
    join(__dirname, './**/*.entity.ts'), // ✅ includes variant custom field mapping
  ],
});
