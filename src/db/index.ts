import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.ts';

declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

export const createPool = () => {
  if (!global._mysqlPool) {
    try {
      global._mysqlPool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'klinik_hewan',
        port: Number(process.env.MYSQL_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: 2000,
      });
    } catch (e) {
      console.warn('[AI Studio] MySQL pool creation skipped:', (e as Error).message);
    }
  }
  return global._mysqlPool;
};

let db: any;
try {
  const pool = createPool();
  if (pool) {
    db = drizzle(pool, { schema, mode: 'default' });
  } else {
    throw new Error('Pool not created');
  }
} catch {
  console.warn('[AI Studio] Database not connected — mock active');
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({})
  };
  db = new Proxy({}, {
    get: (_, prop) => prop === 'query'
      ? new Proxy({}, { get: () => noOp }) : async () => [],
  });
}

export { db };

