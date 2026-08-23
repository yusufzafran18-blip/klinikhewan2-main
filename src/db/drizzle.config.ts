import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const mysqlHost = process.env.MYSQL_HOST || 'localhost';
const mysqlUser = process.env.MYSQL_USER || 'root';
const mysqlPassword = process.env.MYSQL_PASSWORD || '';
const mysqlDatabase = process.env.MYSQL_DATABASE || 'klinik_hewan';
const mysqlPort = Number(process.env.MYSQL_PORT) || 3306;

console.log(`Connecting to MySQL: ${mysqlUser}@${mysqlHost}:${mysqlPort}/${mysqlDatabase}`);

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: mysqlHost,
    user: mysqlUser,
    password: mysqlPassword,
    database: mysqlDatabase,
    port: mysqlPort,
  },
  verbose: true,
});
