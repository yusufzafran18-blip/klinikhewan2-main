# Changelog: Migrasi dari PostgreSQL ke MySQL

Dokumen ini menjelaskan perubahan yang telah dilakukan untuk mengubah aplikasi dari PostgreSQL menjadi aplikasi berbasis MySQL.

## 📝 Perubahan yang Dilakukan

### 1. Drizzle ORM Configuration (`src/db/drizzle.config.ts`)

**Sebelum (PostgreSQL):**
```typescript
dialect: 'postgresql',
schemaFilter: ['public'],
```

**Sesudah (MySQL):**
```typescript
dialect: 'mysql',
// MySQL tidak memerlukan schemaFilter
```

**Perubahan Environment Variables:**
- ❌ `SQL_HOST`, `SQL_DB_NAME`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`
- ✅ `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`

### 2. Database Connection (`src/db/index.ts`)

**Sebelum (PostgreSQL):**
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const db = drizzle(pool, { schema });
```

**Sesudah (MySQL):**
```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

export const db = drizzle(pool, { schema });
```

**Pool Configuration:**
- Menggunakan `mysql2/promise` connection pool
- Fitur tambahan: `enableKeepAlive`, `keepAliveInitialDelayMs` untuk persistent connection

### 3. Database Schema (`src/db/schema.ts`)

**Perubahan Import:**
```typescript
// Sebelum
import { pgTable, ... } from 'drizzle-orm/pg-core';

// Sesudah
import { mysqlTable, ... } from 'drizzle-orm/mysql-core';
```

**Perubahan Type Definitions:**

| PostgreSQL | MySQL |
|-----------|-------|
| `pgTable()` | `mysqlTable()` |
| `integer()` | `int()` |
| `timestamp().defaultNow()` | `timestamp().defaultNow()` |
| *N/A* | `.onUpdateNow()` untuk auto-update timestamp |

**Contoh Perubahan Tabel:**
```typescript
// Sebelum
export const barang = pgTable('barang', {
  stok: integer('stok').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Sesudah
export const barang = mysqlTable('barang', {
  stok: int('stok').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 4. Server Configuration (`server.ts`)

**Penyederhanaan Database Status Check:**
- ❌ Menghilangkan fallback check untuk PostgreSQL (`SQL_HOST` check)
- ✅ Fokus hanya pada MySQL connection check
- ✅ Tetap support Drizzle ORM query untuk MySQL

**API Endpoints Tetap Sama:**
- `/api/db/status` - Check connection status
- `/api/data` - Fetch all data
- `/api/data/sync` - Sync data ke database
- `/api/mysql/test-connection` - Test MySQL connection
- `/api/mysql/schema-sql` - Download schema.sql
- `/api/mysql/init-tables` - Initialize database tables

### 5. Package Dependencies

**Tetap Digunakan:**
```json
{
  "mysql2": "^3.23.2",
  "drizzle-orm": "^0.45.2",
  "drizzle-kit": "^0.31.10"
}
```

**Dihapus:**
- `pg` (PostgreSQL client) - Tidak lagi diperlukan

**Referensi:** Lihat `package.json` untuk detail lengkap

## 🔄 Database Schema Compatibility

Struktur database (`schema.sql`) tetap sama dan compatible dengan MySQL:

- ✅ 17 tabel utama
- ✅ Charset utf8mb4 (support emoji & karakter special)
- ✅ InnoDB engine
- ✅ Proper indexes dan constraints
- ✅ Drizzle ORM type definitions sesuai dengan SQL schema

## 🚀 Testing & Verification

Untuk memverifikasi bahwa aplikasi sudah bekerja dengan MySQL:

```bash
# 1. Install dependencies
npm install

# 2. Setup .env dengan MySQL config
cp .env.example .env
# Edit .env dengan credentials MySQL Anda

# 3. Initialize database
npm run dev
# Akses: http://localhost:3000/api/mysql/init-tables

# 4. Check status
curl http://localhost:3000/api/db/status
```

Expected Response:
```json
{
  "connected": true,
  "type": "MySQL Database (Drizzle ORM)",
  "database": "klinik_hewan",
  "host": "localhost",
  "tablesCount": 17,
  "message": "Database MySQL Aktif dan Terkoneksi secara Realtime."
}
```

## ⚠️ Known Differences: PostgreSQL vs MySQL

| Fitur | PostgreSQL | MySQL |
|-------|-----------|-------|
| UUID Native | ✅ Yes | ⚠️ Stored as VARCHAR(36) |
| JSON Support | ✅ Native JSONB | ✅ Native JSON |
| Timestamp Default | `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` |
| Auto Update | `ON UPDATE CURRENT_TIMESTAMP` | ✅ Supported |
| Character Set | UTF-8 | ✅ utf8mb4 (recommended) |
| Collation | UTF-8 Unicode | ✅ utf8mb4_unicode_ci |
| Full Text Search | ✅ Advanced | ⚠️ Basic FULLTEXT |

## 🔐 Migration Data dari PostgreSQL ke MySQL

Jika Anda memiliki data existing di PostgreSQL, gunakan tools berikut:

### Opsi 1: Menggunakan pgAdmin Export
1. Export dari PostgreSQL ke CSV/SQL
2. Adapter SQL untuk MySQL syntax
3. Import ke MySQL

### Opsi 2: Menggunakan Node.js Script
```typescript
// Buat script untuk baca dari PostgreSQL dan tulis ke MySQL
// Gunakan pg client untuk read dan mysql2 untuk write
```

### Opsi 3: Menggunakan MySQL Workbench
1. MySQL Workbench → File → Reverse Engineer Database
2. Lakukan mapping schema PostgreSQL → MySQL
3. Migrate data menggunakan bulk insert

**Catatan:** Pastikan untuk test data migration di development environment terlebih dahulu!

## 📚 Resources

- [Drizzle ORM - MySQL Guide](https://orm.drizzle.team/docs/get-started-mysql)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [mysql2 Package](https://github.com/sidorares/node-mysql2)

## 🎯 Next Steps

1. ✅ Update database configuration
2. ✅ Modify schema definitions
3. ✅ Update connection pool
4. ⏳ Test dengan MySQL server actual
5. ⏳ Deploy ke production
6. ⏳ Monitor dan optimize query performance

---

**Last Updated:** 2024  
**Migration Date:** 2024-08-18  
**Status:** ✅ Completed
