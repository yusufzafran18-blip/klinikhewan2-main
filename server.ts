import 'dotenv/config';
import { randomUUID } from 'crypto';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const SESSION_COOKIE = 'vetcare_session';
const realtimeClients = new Set<Response>();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function broadcastDataUpdated() {
  const message = `event: data-updated\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`;
  for (const client of realtimeClients) {
    try {
      client.write(message);
    } catch {
      realtimeClients.delete(client);
    }
  }
}

app.get('/api/events', (req: Request, res: Response) => {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
  realtimeClients.add(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(keepAlive);
      realtimeClients.delete(res);
    }
  }, 25_000);

  req.on('close', () => {
    clearInterval(keepAlive);
    realtimeClients.delete(res);
  });
});

function getSessionId(req: Request): string | null {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setSessionCookie(res: Response, sessionId: string) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Max-Age=28800; HttpOnly; SameSite=Lax; Path=/`);
}

function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/`);
}

// Helper to create MySQL Connection Pool for self-hosted MySQL servers
function getMySQLConfig() {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'klinik_hewan',
    connectTimeout: 5000,
  };
}

let mysqlPool: mysql.Pool | null = null;
function getMySQLPool() {
  if (!mysqlPool) {
    const config = getMySQLConfig();
    mysqlPool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 25,
      queueLimit: 0,
    });
  }
  return mysqlPool;
}

async function ensureMysqlSchemaCompatibility() {
  const pool = getMySQLPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS auth_sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auth_sessions_user (user_id),
    INDEX idx_auth_sessions_expiry (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [databaseRows] = await pool.query('SELECT DATABASE() AS name');
  const databaseName = (databaseRows as Array<{ name: string }>)[0]?.name;
  if (!databaseName) throw new Error('MySQL database belum dipilih.');

  const hasColumn = async (tableName: string, columnName: string) => {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [databaseName, tableName, columnName],
    );
    return Number((rows as Array<{ count: number }>)[0]?.count || 0) > 0;
  };

  const addColumn = async (tableName: string, columnName: string, definition: string) => {
    if (!(await hasColumn(tableName, columnName))) {
      await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
    }
  };

  const columns: Array<[string, string, string]> = [
    ['barang', 'kode', "VARCHAR(50) NULL"], ['barang', 'nama', "VARCHAR(150) NULL"],
    ['barang', 'stok', 'INT NULL DEFAULT 0'], ['barang', 'tanggal_kadaluarsa', 'DATE NULL'],
    ['barang', 'status_kadaluarsa', "VARCHAR(30) NULL DEFAULT 'Aman'"], ['barang', 'catatan', 'TEXT NULL'],
    ['barang', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
    ['tindakan', 'kode', "VARCHAR(50) NULL"], ['tindakan', 'nama', "VARCHAR(150) NULL"],
    ['tindakan', 'komisi_dokter', 'DECIMAL(12,2) NULL DEFAULT 0'], ['tindakan', 'jasa_dokter', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['tindakan', 'deskripsi', 'TEXT NULL'], ['tindakan', 'estimasi_menit', 'INT NULL DEFAULT 15'],
    ['tindakan', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
    ['pakan', 'kode', "VARCHAR(50) NULL"], ['pakan', 'nama', "VARCHAR(150) NULL"],
    ['pakan', 'jenis_hewan', "VARCHAR(50) NULL"], ['pakan', 'harga_per_hari', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['pakan', 'catatan', 'TEXT NULL'], ['pakan', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
    ['spesies', 'nama', "VARCHAR(100) NULL"], ['spesies', 'kategori', "VARCHAR(50) NULL DEFAULT 'Mamalia'"],
    ['spesies', 'kode_spesies', "VARCHAR(30) NULL"], ['spesies', 'deskripsi', 'TEXT NULL'], ['spesies', 'ras_umum', 'JSON NULL'],
    ['spesies', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
    ['pendaftaran', 'nomor_antrian', "VARCHAR(20) NULL"], ['pendaftaran', 'keluhan', 'TEXT NULL'],
    ['pendaftaran', 'jenis_layanan', "VARCHAR(100) NULL"], ['pendaftaran', 'catatan', 'TEXT NULL'],
    ['pendaftaran', 'waktu_daftar', 'TIME NULL'],
    ['rekam_medis', 'no_rekam_medis', "VARCHAR(50) NULL"], ['rekam_medis', 'subjektif', 'TEXT NULL'],
    ['rekam_medis', 'objektif', 'TEXT NULL'], ['rekam_medis', 'assesment', 'TEXT NULL'],
    ['rekam_medis', 'diagnosa', 'TEXT NULL'], ['rekam_medis', 'plan', 'TEXT NULL'],
    ['rekam_medis', 'suhu', 'VARCHAR(30) NULL'], ['rekam_medis', 'berat_badan', 'VARCHAR(30) NULL'],
    ['rekam_medis', 'resep', 'JSON NULL'], ['rekam_medis', 'tindakan', 'JSON NULL'],
    ['rekam_medis', 'catatan', 'TEXT NULL'],
    ['rawat_inap', 'no_kamar', "VARCHAR(50) NULL"], ['rawat_inap', 'dokter_id', "VARCHAR(50) NULL"],
    ['rawat_inap', 'diagnosa', 'TEXT NULL'], ['rawat_inap', 'pakan_id', "VARCHAR(50) NULL"],
    ['rawat_inap', 'catatan', 'TEXT NULL'], ['rawat_inap', 'daily_notes', 'JSON NULL'],
    ['rawat_inap', 'monitoring_logs', 'JSON NULL'], ['rawat_inap', 'total_biaya', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['rawat_inap', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
    ['janji_temu', 'waktu', 'TIME NULL'], ['janji_temu', 'keluhan', 'TEXT NULL'],
    ['janji_temu', 'jenis_layanan', "VARCHAR(100) NULL"], ['janji_temu', 'reminder_sent', 'TINYINT(1) NULL DEFAULT 0'],
    ['janji_temu', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
    ['vaksinasi', 'tanggal_diberikan', 'DATE NULL'], ['vaksinasi', 'tanggal_berikutnya', 'DATE NULL'],
    ['vaksinasi', 'batch_number', "VARCHAR(50) NULL"], ['vaksinasi', 'catatan', 'TEXT NULL'],
    ['vaksinasi', 'status', "VARCHAR(30) NULL DEFAULT 'Selesai'"], ['vaksinasi', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
    ['transaksi', 'kode_transaksi', "VARCHAR(50) NULL"], ['transaksi', 'items', 'JSON NULL'],
    ['transaksi', 'total', 'DECIMAL(12,2) NULL DEFAULT 0'], ['transaksi', 'metode_pembayaran', "VARCHAR(30) NULL DEFAULT 'Tunai'"],
    ['transaksi', 'kasir', "VARCHAR(50) NULL"], ['transaksi', 'catatan', 'TEXT NULL'], ['transaksi', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
    ['transaksi', 'source_type', "VARCHAR(50) NULL"], ['transaksi', 'source_id', "VARCHAR(50) NULL"],
    ['pembelian', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
    ['supplier', 'nama', "VARCHAR(100) NULL"], ['supplier', 'kontak', "VARCHAR(100) NULL"],
    ['supplier', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
  ];

  const existingTables = new Set<string>();
  const [tableRows] = await pool.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [databaseName]);
  for (const row of tableRows as Array<{ TABLE_NAME: string }>) existingTables.add(row.TABLE_NAME);

  if (!existingTables.has('pembelian')) {
    await pool.query(`CREATE TABLE pembelian (
      id VARCHAR(50) PRIMARY KEY, nomor_po VARCHAR(50) NOT NULL UNIQUE, supplier_id VARCHAR(50) NOT NULL,
      tanggal DATE NOT NULL, items JSON NOT NULL, total_harga DECIMAL(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'Selesai', catatan TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
  if (!existingTables.has('feedback')) {
    await pool.query(`CREATE TABLE feedback (
      id VARCHAR(50) PRIMARY KEY, pasien_id VARCHAR(50) NOT NULL, transaksi_id VARCHAR(50) NULL,
      rating INT NOT NULL DEFAULT 5, catatan TEXT NULL, tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
  if (!existingTables.has('clinic_store')) {
    await pool.query(`CREATE TABLE clinic_store (
      \`key\` VARCHAR(100) PRIMARY KEY, value JSON NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
  if (!existingTables.has('clinic_settings')) {
    await pool.query(`CREATE TABLE clinic_settings (
      id INT NOT NULL DEFAULT 1 PRIMARY KEY,
      clinic_profile_json JSON NOT NULL,
      app_settings_json JSON NOT NULL,
      updated_by VARCHAR(50) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
  if (!existingTables.has('clinic_backups')) {
    await pool.query(`CREATE TABLE clinic_backups (
      id VARCHAR(80) PRIMARY KEY,
      backup_version VARCHAR(30) NOT NULL,
      backup_json JSON NOT NULL,
      created_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_clinic_backups_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  for (const [tableName, columnName, definition] of columns) {
    if (tableName === 'pembelian' && !(await hasColumn(tableName, columnName))) continue;
    await addColumn(tableName, columnName, definition);
  }

  const copyCompatibilityData = async (statement: string) => {
    try {
      await pool.query(statement);
    } catch (error) {
      console.warn('Compatibility data copy skipped:', (error as Error).message);
    }
  };
  await copyCompatibilityData("UPDATE barang SET kode = COALESCE(kode, kode_barang), nama = COALESCE(nama, nama_barang), stok = COALESCE(stok, stok_current), tanggal_kadaluarsa = COALESCE(tanggal_kadaluarsa, expired_date), catatan = COALESCE(catatan, keterangan) WHERE kode IS NULL OR nama IS NULL");
  await copyCompatibilityData("UPDATE tindakan SET kode = COALESCE(kode, kode_tindakan), nama = COALESCE(nama, nama_tindakan), deskripsi = COALESCE(deskripsi, keterangan) WHERE kode IS NULL OR nama IS NULL");
  await copyCompatibilityData("UPDATE pakan SET kode = COALESCE(kode, kode_pakan), nama = COALESCE(nama, nama_pakan), jenis_hewan = COALESCE(jenis_hewan, kategori_usia), harga_per_hari = COALESCE(harga_per_hari, harga_jual), catatan = COALESCE(catatan, dosis_per_kg_bb) WHERE kode IS NULL OR nama IS NULL");
  await copyCompatibilityData("UPDATE spesies SET nama = COALESCE(nama, nama_spesies), deskripsi = COALESCE(deskripsi, keterangan) WHERE nama IS NULL");
  await copyCompatibilityData("UPDATE pendaftaran SET nomor_antrian = COALESCE(nomor_antrian, no_antrian), keluhan = COALESCE(keluhan, keluhan_utama), jenis_layanan = COALESCE(jenis_layanan, layanan_dipilih), waktu_daftar = COALESCE(waktu_daftar, waktu) WHERE nomor_antrian IS NULL");
  await copyCompatibilityData("UPDATE rekam_medis SET no_rekam_medis = COALESCE(no_rekam_medis, CONCAT('RM-', id)), subjektif = COALESCE(subjektif, subjective_json), objektif = COALESCE(objektif, objective_json), assesment = COALESCE(assesment, assessment_json), plan = COALESCE(plan, plan_json) WHERE no_rekam_medis IS NULL");
  await copyCompatibilityData("UPDATE rawat_inap SET no_kamar = COALESCE(no_kamar, no_kandang), dokter_id = COALESCE(dokter_id, dokter_pj_id), diagnosa = COALESCE(diagnosa, diagnosa_inap), monitoring_logs = COALESCE(monitoring_logs, monitoring_logs_json), total_biaya = COALESCE(total_biaya, tarif_per_hari) WHERE no_kamar IS NULL");
  await copyCompatibilityData("UPDATE janji_temu SET waktu = COALESCE(waktu, jam), keluhan = COALESCE(keluhan, keperluan), jenis_layanan = COALESCE(jenis_layanan, keperluan), reminder_sent = COALESCE(reminder_sent, notifikasi_sent) WHERE waktu IS NULL");
  await copyCompatibilityData("UPDATE vaksinasi SET tanggal_diberikan = COALESCE(tanggal_diberikan, tanggal_vaksin), tanggal_berikutnya = COALESCE(tanggal_berikutnya, tanggal_kembali), batch_number = COALESCE(batch_number, no_batch), catatan = COALESCE(catatan, keterangan) WHERE tanggal_diberikan IS NULL");
  await copyCompatibilityData("UPDATE transaksi SET kode_transaksi = COALESCE(kode_transaksi, no_faktur), items = COALESCE(items, items_json), total = COALESCE(total, total_akhir), kasir = COALESCE(kasir, kasir_id) WHERE kode_transaksi IS NULL");
  await copyCompatibilityData("UPDATE supplier SET nama = COALESCE(nama, nama_supplier), kontak = COALESCE(kontak, sales_person) WHERE nama IS NULL");
}

// Helper function for MySQL UPSERT (INSERT ... ON DUPLICATE KEY UPDATE)
async function upsertRecord(
  tableName: string,
  primaryKey: string,
  values: Record<string, any>
) {
  const pool = getMySQLPool();
  const databaseName = process.env.MYSQL_DATABASE || 'klinik_hewan';
  const [columnRows] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [databaseName, tableName],
  );
  const existingColumns = new Set(
    (columnRows as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME),
  );
  const columns = Object.keys(values).filter((column) => existingColumns.has(column));
  if (!existingColumns.has(primaryKey) || columns.length === 0) {
    throw new Error(`Tabel MySQL '${tableName}' tidak memiliki kolom yang diperlukan.`);
  }
  const placeholders = columns.map(() => '?').join(',');
  const updates = columns.map((col) => `${col}=VALUES(${col})`).join(',');

  const query = `
    INSERT INTO \`${tableName}\` (${columns.map((c) => `\`${c}\``).join(',')})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates}
  `;

  const vals = columns.map((col) => values[col]);
  await pool.query(query, vals);
}

async function removeRecordsMissingFromPayload(tableName: string, records: unknown[]) {
  const pool = getMySQLPool();
  const ids = records
    .map((record) => (record as { id?: unknown })?.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (ids.length === 0) {
    await pool.query(`DELETE FROM \`${tableName}\``);
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  await pool.query(`DELETE FROM \`${tableName}\` WHERE id NOT IN (${placeholders})`, ids);
}

// ============================================================================
// SQL DATABASE API ROUTES
// ============================================================================

app.post('/api/auth/session', async (req: Request, res: Response) => {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId : '';
    if (!userId) return res.status(400).json({ success: false, error: 'User ID wajib diisi.' });

    const users = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    const user = users[0];
    if (!user || !user.aktif) return res.status(401).json({ success: false, error: 'Akun tidak aktif atau tidak ditemukan.' });

    const sessionId = randomUUID();
    const pool = getMySQLPool();
    await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
    await pool.query('INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR))', [sessionId, user.id]);
    setSessionCookie(res, sessionId);
    return res.json({ success: true, user });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auth/session', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    if (!sessionId) return res.json({ success: true, authenticated: false, user: null });

    const pool = getMySQLPool();
    const [sessionRows] = await pool.query('SELECT user_id FROM auth_sessions WHERE id = ? AND expires_at > NOW() LIMIT 1', [sessionId]);
    const userId = (sessionRows as Array<{ user_id: string }>)[0]?.user_id;
    if (!userId) return res.json({ success: true, authenticated: false, user: null });

    const users = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    const user = users[0];
    if (!user || !user.aktif) {
      await pool.query('DELETE FROM auth_sessions WHERE id = ?', [sessionId]);
      clearSessionCookie(res);
      return res.json({ success: true, authenticated: false, user: null });
    }
    return res.json({ success: true, authenticated: true, user });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/auth/session', (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const removeSession = sessionId
    ? getMySQLPool().query('DELETE FROM auth_sessions WHERE id = ?', [sessionId])
    : Promise.resolve();
  return removeSession.then(() => {
    clearSessionCookie(res);
    return res.json({ success: true });
  });
});

// 1. Database Connection Status
app.get('/api/db/status', async (req: Request, res: Response) => {
  try {
    // Check MySQL ORM connection with Drizzle
    try {
      const testRes = await db.select({ count: sql`count(*)` }).from(schema.users);
      const usersCount = Number(testRes[0]?.count || 0);

      return res.json({
        connected: true,
        type: 'MySQL Database (Drizzle ORM)',
        database: process.env.MYSQL_DATABASE || 'klinik_hewan',
        host: process.env.MYSQL_HOST || 'localhost',
        tablesCount: 17,
        recordsInfo: `Tersambung ke MySQL Database (${usersCount} user aktif)`,
        message: 'Database MySQL Aktif dan Terkoneksi secara Realtime.',
      });
    } catch (err: any) {
      console.error('MySQL ORM query check error:', err);
      
      // Fallback: Direct MySQL connection check
      try {
        const pool = getMySQLPool();
        const [rows] = await pool.query('SELECT 1 as ping');
        if (rows) {
          return res.json({
            connected: true,
            type: 'MySQL Database Server',
            database: process.env.MYSQL_DATABASE || 'klinik_hewan',
            host: process.env.MYSQL_HOST || 'localhost',
            tablesCount: 17,
            message: 'Terhubung ke Database MySQL Host.',
          });
        }
      } catch (mysqlErr: any) {
        console.error('MySQL direct connection error:', mysqlErr);
      }
    }

    return res.status(500).json({
      connected: false,
      type: 'MySQL Database',
      database: process.env.MYSQL_DATABASE || 'klinik_hewan',
      host: process.env.MYSQL_HOST || 'localhost',
      error: 'Unable to connect to MySQL database',
      message: 'Gagal menghubungkan database MySQL. Periksa konfigurasi connection.',
    });
  } catch (error: any) {
    return res.status(500).json({
      connected: false,
      type: 'MySQL Database',
      error: error.message,
      message: 'Gagal menghubungkan database MySQL: ' + error.message,
    });
  }
});

app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.query('SELECT clinic_profile_json, app_settings_json, updated_by, updated_at FROM clinic_settings WHERE id = 1 LIMIT 1');
    const row = (rows as Array<any>)[0];
    return res.json({ success: true, data: row || null });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const { clinicProfile, appSettings, updatedBy } = req.body || {};
    if (!clinicProfile || !appSettings) {
      return res.status(400).json({ success: false, error: 'Profil klinik dan pengaturan aplikasi wajib diisi.' });
    }
    const pool = getMySQLPool();
    await pool.query(
      `INSERT INTO clinic_settings (id, clinic_profile_json, app_settings_json, updated_by)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE clinic_profile_json = VALUES(clinic_profile_json), app_settings_json = VALUES(app_settings_json), updated_by = VALUES(updated_by)`,
      [JSON.stringify(clinicProfile), JSON.stringify(appSettings), updatedBy || null],
    );
    broadcastDataUpdated();
    return res.json({ success: true, message: 'Pengaturan klinik tersimpan ke MySQL.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/backups', async (req: Request, res: Response) => {
  try {
    const { id, version, backup, createdBy } = req.body || {};
    if (!backup || typeof backup !== 'object') {
      return res.status(400).json({ success: false, error: 'Isi backup JSON wajib diisi.' });
    }
    const pool = getMySQLPool();
    await pool.query(
      'INSERT INTO clinic_backups (id, backup_version, backup_json, created_by) VALUES (?, ?, ?, ?)',
      [id || `backup-${Date.now()}`, version || '3.0.0-mysql', JSON.stringify(backup), createdBy || null],
    );
    broadcastDataUpdated();
    return res.json({ success: true, message: 'Backup berhasil disimpan ke MySQL.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/backups/latest', async (req: Request, res: Response) => {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.query('SELECT id, backup_version, backup_json, created_by, created_at FROM clinic_backups ORDER BY created_at DESC LIMIT 1');
    return res.json({ success: true, data: (rows as Array<any>)[0] || null });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Fetch All Clinic Data from SQL Database
app.get('/api/data', async (req: Request, res: Response) => {
  try {
    const [
      usersList,
      dokterList,
      pasienList,
      barangList,
      tindakanList,
      pakanList,
      spesiesList,
      pendaftaranList,
      rekamMedisList,
      rawatInapList,
      janjiTemuList,
      vaksinasiList,
      transaksiList,
      pembelianList,
      supplierList,
      feedbackList,
      clinicStoreList,
    ] = await Promise.all([
      db.select().from(schema.users),
      db.select().from(schema.dokter),
      db.select().from(schema.pasien),
      db.select().from(schema.barang),
      db.select().from(schema.tindakan),
      db.select().from(schema.pakan),
      db.select().from(schema.spesies),
      db.select().from(schema.pendaftaran),
      db.select().from(schema.rekamMedis),
      db.select().from(schema.rawatInap),
      db.select().from(schema.janjiTemu),
      db.select().from(schema.vaksinasi),
      db.select().from(schema.transaksi),
      db.select().from(schema.pembelian),
      db.select().from(schema.supplier),
      db.select().from(schema.feedback),
      db.select().from(schema.clinicStore),
    ]);

    const storeMap: Record<string, any> = {};
    clinicStoreList.forEach((item) => {
      storeMap[item.key] = item.value;
    });

    const payload = {
      users: usersList,
      dokter: dokterList,
      pasien: pasienList.map((p) => ({
        ...p,
        kodePasien: p.kodePasien,
        namaHewan: p.namaHewan,
        jenisHewan: p.jenisHewan,
        jenisKelamin: p.jenisKelamin,
        tanggalLahir: p.tanggalLahir,
        namaOwner: p.namaOwner,
        noHpOwner: p.noHpOwner,
        alamatOwner: p.alamatOwner,
        emailOwner: p.emailOwner,
        catatanKhusus: p.catatanKhusus,
      })),
      barang: barangList.map((b) => ({
        ...b,
        kodeBarang: b.kode,
        namaBarang: b.nama,
        hargaBeli: Number(b.hargaBeli),
        hargaJual: Number(b.hargaJual),
        stokCurrent: Number(b.stok),
        expiredDate: b.tanggalKadaluarsa,
        stokMinimum: Number(b.stokMinimum),
      })),
      tindakan: tindakanList.map((t) => ({
        ...t,
        kodeTindakan: t.kode,
        namaTindakan: t.nama,
        tarif: Number(t.tarif),
        komisiDokter: Number(t.komisiDokter || 0),
        jasaDokter: Number(t.jasaDokter || 0),
      })),
      pakan: pakanList.map((pk) => ({
        ...pk,
        hargaPerHari: Number(pk.hargaPerHari),
      })),
      spesies: spesiesList.map((sp) => ({
        ...sp,
        kodeSpesies: sp.kodeSpesies,
        namaSpesies: sp.nama,
        keterangan: sp.deskripsi || '',
      })),
      pendaftaran: pendaftaranList,
      rekamMedis: rekamMedisList.map((rm) => {
        let subjectiveParsed: any = { keluhan: rm.subjektif, anamnesa: '', makanMinum: 'Normal', durasiSakit: '' };
        let objectiveParsed: any = { beratBadan: Number(rm.beratBadan || 0), suhu: Number(rm.suhu || 0), crt: '< 2 Detik', dehidrasi: 'Normal', pemeriksaanFisik: rm.objektif };
        let assessmentParsed: any = { diagnosaUtama: rm.diagnosa, diagnosaBanding: rm.assesment };
        let planParsed: any = { tindakanList: (rm.tindakan as any) || [], resepList: (rm.resep as any) || [], racikanList: [], statusLanjutan: 'Rawat Jalan' };

        try {
          if (rm.subjektif && rm.subjektif.startsWith('{')) subjectiveParsed = JSON.parse(rm.subjektif);
        } catch (_) {}
        try {
          if (rm.objektif && rm.objektif.startsWith('{')) objectiveParsed = JSON.parse(rm.objektif);
        } catch (_) {}
        try {
          if (rm.assesment && rm.assesment.startsWith('{')) assessmentParsed = JSON.parse(rm.assesment);
        } catch (_) {}
        try {
          if (rm.plan && rm.plan.startsWith('{')) planParsed = JSON.parse(rm.plan);
        } catch (_) {}

        return {
          ...rm,
          noRM: rm.noRekamMedis,
          subjective: subjectiveParsed,
          objective: objectiveParsed,
          assessment: assessmentParsed,
          plan: planParsed,
          totalBiaya: Number(rm.totalBiaya),
        };
      }),
      rawatInap: rawatInapList.map((ri) => ({
        ...ri,
        noKandang: ri.noKamar,
        dokterPenanggungJawabId: ri.dokterId,
        diagnosaInap: ri.diagnosa,
        tarifPerHari: Number(ri.totalBiaya || 0),
        totalBiaya: Number(ri.totalBiaya || 0),
      })),
      janjiTemu: janjiTemuList.map((jt) => ({
        ...jt,
        jam: jt.waktu,
        layanan: jt.jenisLayanan || 'Pemeriksaan Umum',
        catatan: jt.keluhan || '',
        noHpPengingat: '',
      })),
      vaksinasi: vaksinasiList.map((v) => ({
        ...v,
        tanggalVaksin: v.tanggalDiberikan,
        tanggalVaksinUlang: v.tanggalBerikutnya || '',
        batchNo: v.batchNumber || '',
        keterangan: v.catatan || '',
      })),
      transaksi: transaksiList.map((trx) => ({
        ...trx,
        noNota: trx.kodeTransaksi,
        kasirId: trx.kasir,
        subtotal: Number(trx.subtotal),
        diskon: Number(trx.diskon),
        pajak: Number(trx.pajak),
        grandTotal: Number(trx.total),
        total: Number(trx.total),
      })),
      pembelian: pembelianList.map((po) => ({
        ...po,
        noFaktur: po.nomorPO,
        namaSupplier: po.supplierId,
        grandTotal: Number(po.totalHarga),
        totalHarga: Number(po.totalHarga),
      })),
      supplier: supplierList.map((s) => ({
        ...s,
        kodeSupplier: s.kodeSupplier || (s as any).kode,
        namaSupplier: s.namaSupplier || s.nama,
      })),
      feedback: feedbackList.map((fb) => ({
        ...fb,
        komentar: fb.catatan,
      })),
      klinik: storeMap['klinik'] || null,
      settings: storeMap['settings'] || null,
      rbacConfig: storeMap['rbacConfig'] || null,
      waConfig: storeMap['waConfig'] || null,
      waTemplates: storeMap['waTemplates'] || null,
      waLogs: storeMap['waLogs'] || null,
    };

    return res.json({
      success: true,
      data: payload,
    });
  } catch (error: any) {
    console.error('Error in /api/data:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Batch Sync to SQL Database
app.post('/api/data/sync', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: 'Empty payload' });
    }

    // Save users
    if (Array.isArray(data.users)) {
      for (const u of data.users) {
        if (!u.id || !u.username) continue;
        await upsertRecord('users', 'id', {
          id: u.id,
          username: u.username,
          password: u.password || 'admin123',
          nama: u.nama || u.username,
          email: u.email || `${u.username}@klinik.local`,
          role: u.role || 'staf',
          no_hp: u.noHp || null,
          aktif: u.aktif !== false ? 1 : 0,
          avatar_url: u.avatarUrl || null,
        });
      }
    }

    // Save dokter
    if (Array.isArray(data.dokter)) {
      for (const d of data.dokter) {
        if (!d.id || !d.sip) continue;
        await upsertRecord('dokter', 'id', {
          id: d.id,
          sip: d.sip,
          nama: d.nama,
          spesialisasi: d.spesialisasi || 'Umum',
          no_hp: d.noHp || '-',
          email: d.email || null,
          jadwal: d.jadwal || null,
          aktif: d.aktif !== false ? 1 : 0,
          foto_url: d.fotoUrl || null,
        });
      }
    }

    // Save pasien
    if (Array.isArray(data.pasien)) {
      for (const p of data.pasien) {
        if (!p.id || !p.kodePasien) continue;
        await upsertRecord('pasien', 'id', {
          id: p.id,
          kode_pasien: p.kodePasien,
          nama_hewan: p.namaHewan,
          jenis_hewan: p.jenisHewan,
          ras: p.ras || null,
          jenis_kelamin: p.jenisKelamin || 'Jantan',
          tanggal_lahir: p.tanggalLahir || '2024-01-01',
          umur_format: p.umurFormat || null,
          warna: p.warna || null,
          no_microchip: p.noMicrochip || null,
          nama_owner: p.namaOwner || '-',
          no_hp_owner: p.noHpOwner || '-',
          alamat_owner: p.alamatOwner || '-',
          email_owner: p.emailOwner || null,
          foto_url: p.fotoUrl || p.foto || null,
          catatan_khusus: p.catatanKhusus || null,
        });
      }
    }

    // Save barang
    if (Array.isArray(data.barang)) {
      for (const b of data.barang) {
        if (!b.id || !(b.kodeBarang || b.kode)) continue;
        await upsertRecord('barang', 'id', {
          id: b.id,
          kode_barang: b.kodeBarang || b.kode,
          nama_barang: b.namaBarang || b.nama,
          kode: b.kodeBarang || b.kode,
          nama: b.namaBarang || b.nama,
          kategori: b.kategori || 'Obat',
          satuan: b.satuan || 'Pcs',
          harga_beli: String(b.hargaBeli || 0),
          harga_jual: String(b.hargaJual || 0),
          stok_current: Number(b.stokCurrent ?? b.stok ?? 0),
          stok: Number(b.stokCurrent ?? b.stok ?? 0),
          stok_minimum: Number(b.stokMinimum || 5),
          expired_date: b.expiredDate || b.tanggalKadaluarsa || null,
          tanggal_kadaluarsa: b.expiredDate || b.tanggalKadaluarsa || null,
          lokasi_rak: b.lokasiRak || null,
          keterangan: b.keterangan || b.catatan || null,
          catatan: b.keterangan || b.catatan || null,
        });
      }
    }

    // Save tindakan
    if (Array.isArray(data.tindakan)) {
      for (const t of data.tindakan) {
        if (!t.id || !(t.kodeTindakan || t.kode)) continue;
        await upsertRecord('tindakan', 'id', {
          id: t.id,
          kode_tindakan: t.kodeTindakan || t.kode,
          nama_tindakan: t.namaTindakan || t.nama,
          kode: t.kodeTindakan || t.kode,
          nama: t.namaTindakan || t.nama,
          kategori: t.kategori || 'Medis',
          tarif: String(t.tarif || 0),
          komisi_dokter: String(t.komisiDokter || 0),
          jasa_dokter: String(t.jasaDokter || 0),
          keterangan: t.keterangan || t.deskripsi || null,
          deskripsi: t.keterangan || t.deskripsi || null,
        });
      }
    }

    // Save pakan
    if (Array.isArray(data.pakan)) {
      for (const pk of data.pakan) {
        if (!pk.id || !pk.kode) continue;
        await upsertRecord('pakan', 'id', {
          id: pk.id,
          kode: pk.kode,
          nama: pk.nama,
          jenis_hewan: pk.jenisHewan || 'Kucing',
          harga_per_hari: String(pk.hargaPerHari || 0),
          catatan: pk.catatan || null,
        });
      }
    }

    // Save spesies
    if (Array.isArray(data.spesies)) {
      for (const sp of data.spesies) {
        if (!sp.id) continue;
        const namaSpesies = sp.namaSpesies || sp.nama || 'Lainnya';
        await upsertRecord('spesies', 'id', {
          id: sp.id,
          kode_spesies: sp.kodeSpesies || null,
          nama_spesies: namaSpesies,
          keterangan: sp.keterangan || sp.deskripsi || null,
          nama: namaSpesies,
          kategori: sp.kategori || 'Mamalia',
          deskripsi: sp.keterangan || sp.deskripsi || null,
          ras_umum: JSON.stringify(sp.rasUmum || []),
        });
      }
    }

    // Save pendaftaran
    if (Array.isArray(data.pendaftaran)) {
      for (const pd of data.pendaftaran) {
        const nomorAntrian = pd.nomorAntrian || pd.noAntrian;
        const keluhan = pd.keluhan || pd.keluhanUtama || '-';
        const jenisLayanan = pd.jenisLayanan || pd.layananDipilih || 'Pemeriksaan Umum';
        const waktu = pd.waktuDaftar || pd.waktu || '00:00';
        if (!pd.id || !nomorAntrian || !pd.pasienId || !pd.dokterId) continue;
        await upsertRecord('pendaftaran', 'id', {
          id: pd.id,
          no_antrian: nomorAntrian,
          nomor_antrian: nomorAntrian,
          pasien_id: pd.pasienId,
          dokter_id: pd.dokterId,
          tanggal: pd.tanggal,
          waktu,
          keluhan_utama: keluhan,
          keluhan,
          status: pd.status || 'Antri',
          layanan_dipilih: jenisLayanan,
          jenis_layanan: jenisLayanan,
          petugas_id: pd.petugasId || null,
          waktu_daftar: waktu,
        });
      }
    }

    // Save rekam medis
    if (Array.isArray(data.rekamMedis)) {
      for (const rm of data.rekamMedis) {
        if (!rm.id) continue;
        const noRM = rm.noRM || rm.noRekamMedis || `RM-${rm.id}`;
        const subjStr = typeof rm.subjective === 'object' ? JSON.stringify(rm.subjective) : (rm.subjektif || '-');
        const objStr = typeof rm.objective === 'object' ? JSON.stringify(rm.objective) : (rm.objektif || '-');
        const assStr = typeof rm.assessment === 'object' ? JSON.stringify(rm.assessment) : (rm.assesment || '-');
        const planStr = typeof rm.plan === 'object' ? JSON.stringify(rm.plan) : (rm.plan || '-');
        const diagnosa = rm.assessment?.diagnosaUtama || rm.diagnosa || '-';
        const suhu = String(rm.objective?.suhu ?? rm.suhu ?? '');
        const beratBadan = String(rm.objective?.beratBadan ?? rm.beratBadan ?? '');
        const resep = rm.plan?.resepList || rm.resep || [];
        const tindakan = rm.plan?.tindakanList || rm.tindakan || [];

        await upsertRecord('rekam_medis', 'id', {
          id: rm.id,
          pasien_id: rm.pasienId,
          dokter_id: rm.dokterId,
          pendaftaran_id: rm.pendaftaranId || null,
          no_rekam_medis: noRM,
          tanggal: rm.tanggal || new Date().toISOString(),
          subjective_json: subjStr,
          objective_json: objStr,
          assessment_json: assStr,
          plan_json: planStr,
          subjektif: subjStr,
          objektif: objStr,
          assesment: assStr,
          diagnosa,
          plan: planStr,
          suhu,
          berat_badan: beratBadan,
          resep: JSON.stringify(resep),
          tindakan: JSON.stringify(tindakan),
          total_biaya: String(rm.totalBiaya || 0),
          status_pembayaran: rm.statusPembayaran || 'Belum Lunas',
        });
      }
    }

    // Save rawat inap
    if (Array.isArray(data.rawatInap)) {
      for (const ri of data.rawatInap) {
        if (!ri.id) continue;
        const noKamar = ri.noKandang || ri.noKamar || 'Kandang-1';
        const dokterId = ri.dokterPenanggungJawabId || ri.dokterId || 'dok-1';
        const diagnosa = ri.diagnosaInap || ri.diagnosa || '-';
        const totalBiaya = String(ri.tarifPerHari ?? ri.totalBiaya ?? 0);

        await upsertRecord('rawat_inap', 'id', {
          id: ri.id,
          pasien_id: ri.pasienId,
          no_kandang: noKamar,
          no_kamar: noKamar,
          tanggal_masuk: ri.tanggalMasuk || new Date().toISOString(),
          tanggal_keluar: ri.tanggalKeluarAktif || ri.tanggalKeluar || null,
          dokter_pj_id: dokterId,
          dokter_id: dokterId,
          diagnosa_inap: diagnosa,
          diagnosa,
          tarif_per_hari: totalBiaya,
          status: ri.status === 'Selesai / Pulang' ? 'Selesai' : (ri.status || 'Aktif'),
          monitoring_logs_json: JSON.stringify(ri.monitoringLogs || []),
          monitoring_logs: JSON.stringify(ri.monitoringLogs || []),
          pemberian_pakan_json: JSON.stringify([]),
          total_biaya_inap: totalBiaya,
          total_biaya: totalBiaya,
        });
      }
    }

    // Save janji temu
    if (Array.isArray(data.janjiTemu)) {
      for (const jt of data.janjiTemu) {
        if (!jt.id) continue;
        const waktu = jt.jam || jt.waktu || '09:00';
        const keluhan = jt.catatan || jt.keluhan || jt.layanan || '-';
        const jenisLayanan = jt.layanan || jt.jenisLayanan || 'Kontrol Ulang';
        const status = jt.status === 'Disetujui' || jt.status === 'Dikonfirmasi'
          ? 'Dikonfirmasi'
          : (jt.status === 'Dibatalkan' ? 'Batal' : (jt.status || 'Terjadwal'));

        await upsertRecord('janji_temu', 'id', {
          id: jt.id,
          pasien_id: jt.pasienId,
          dokter_id: jt.dokterId,
          tanggal: jt.tanggal,
          jam: waktu,
          waktu,
          keperluan: jenisLayanan,
          jenis_layanan: jenisLayanan,
          status,
          notifikasi_sent: jt.reminderSent === true ? 1 : 0,
          catatan: keluhan,
          keluhan,
        });
      }
    }

    // Save vaksinasi
    if (Array.isArray(data.vaksinasi)) {
      for (const v of data.vaksinasi) {
        if (!v.id) continue;
        const tanggalDiberikan = v.tanggalVaksin || v.tanggalDiberikan || new Date().toISOString().split('T')[0];
        const tanggalBerikutnya = v.tanggalVaksinUlang || v.tanggalBerikutnya || null;
        const batchNumber = v.batchNo || v.batchNumber || null;
        const catatan = v.keterangan || v.catatan || null;

        await upsertRecord('vaksinasi', 'id', {
          id: v.id,
          pasien_id: v.pasienId,
          nama_vaksin: v.namaVaksin,
          tanggal_diberikan: tanggalDiberikan,
          tanggal_berikutnya: tanggalBerikutnya,
          dokter_id: v.dokterId || null,
          batch_number: batchNumber,
          catatan: catatan,
          status: v.status || 'Selesai',
        });
      }
    }

    // Save transaksi
    if (Array.isArray(data.transaksi)) {
      for (const trx of data.transaksi) {
        if (!trx.id) continue;
        const kodeTransaksi = trx.noNota || trx.kodeTransaksi || `INV-${trx.id}`;
        const tipeTransaksi = trx.typeTransaksi === 'Rekam Medis'
          ? 'Rawat Jalan'
          : (trx.typeTransaksi === 'Penjualan Direct (PetShop)' ? 'Direct Sales' : (trx.typeTransaksi || 'Rawat Jalan'));
        const metodePembayaran = trx.metodePembayaran === 'Transfer QRIS'
          ? 'QRIS'
          : (trx.metodePembayaran === 'Debit/Kredit' ? 'Debit' : (trx.metodePembayaran || 'Tunai'));
        const status = trx.status === 'Dibatalkan'
          ? 'Batal'
          : (trx.status === 'Belum Lunas' ? 'Pending' : (trx.status || 'Lunas'));
        const total = String(trx.grandTotal ?? trx.total ?? 0);
        const subtotal = String(trx.subtotal ?? 0);
        const diskon = String(trx.diskon ?? 0);
        const pajak = String(trx.pajak ?? 0);

        await upsertRecord('transaksi', 'id', {
          id: trx.id,
          no_faktur: kodeTransaksi,
          kode_transaksi: kodeTransaksi,
          tanggal: trx.tanggal || new Date().toISOString(),
          tipe_transaksi: tipeTransaksi,
          pasien_id: trx.pasienId || null,
          nama_pelanggan: trx.namaPelanggan || null,
          kasir_id: trx.kasirId || 'usr-system',
          items_json: JSON.stringify(trx.items || []),
          items: JSON.stringify(trx.items || []),
          subtotal: subtotal,
          diskon: diskon,
          pajak: pajak,
          total_akhir: total,
          total: total,
          metode_pembayaran: metodePembayaran,
          jumlah_bayar: String(trx.jumlahBayar ?? 0),
          kembalian: String(trx.kembalian ?? 0),
          status,
          kasir: trx.kasirId || 'usr-system',
        });
      }
    }

    // Save pembelian
    if (Array.isArray(data.pembelian)) {
      for (const pb of data.pembelian) {
        if (!pb.id) continue;
        const nomorPO = pb.nomorPO || pb.noFaktur || `PO-${pb.id}`;
        const supplierId = pb.namaSupplier || pb.supplierId || 'sup-1';
        const totalHarga = String(pb.grandTotal ?? pb.totalHarga ?? 0);

        await upsertRecord('pembelian', 'id', {
          id: pb.id,
          nomor_po: nomorPO,
          supplier_id: supplierId,
          tanggal: pb.tanggal || new Date().toISOString().split('T')[0],
          items: JSON.stringify(pb.items || []),
          total_harga: totalHarga,
          status: pb.status || 'Selesai',
          catatan: pb.catatan || null,
        });
      }
    }

    // Save supplier
    if (Array.isArray(data.supplier)) {
      for (const s of data.supplier) {
        if (!s.id) continue;
        const nama = s.namaSupplier || s.nama || '-';
        const kode = s.kodeSupplier || s.kode || `SUP-${String(Date.now()).slice(-5)}`;
        await upsertRecord('supplier', 'id', {
          id: s.id,
          kode_supplier: kode,
          nama_supplier: nama,
          sales_person: s.kontak || null,
          nama: nama,
          kontak: s.kontak || '-',
          no_hp: s.noHp || '-',
          email: s.email || null,
          alamat: s.alamat || '-',
        });
      }
    }

    // Save feedback
    if (Array.isArray(data.feedback)) {
      for (const fb of data.feedback) {
        if (!fb.id) continue;
        await upsertRecord('feedback', 'id', {
          id: fb.id,
          pasien_id: fb.pasienId,
          transaksi_id: fb.transaksiId || null,
          rating: Number(fb.rating || 5),
          catatan: fb.komentar || fb.catatan || '',
          tanggal: fb.tanggal || new Date().toISOString(),
        });
      }
    }

    // The client sends complete collections. Remove records deleted from a menu.
    const collectionTables: Array<[string, string]> = [
      ['users', 'users'],
      ['dokter', 'dokter'],
      ['pasien', 'pasien'],
      ['barang', 'barang'],
      ['tindakan', 'tindakan'],
      ['pakan', 'pakan'],
      ['spesies', 'spesies'],
      ['pendaftaran', 'pendaftaran'],
      ['rekamMedis', 'rekam_medis'],
      ['rawatInap', 'rawat_inap'],
      ['janjiTemu', 'janji_temu'],
      ['vaksinasi', 'vaksinasi'],
      ['transaksi', 'transaksi'],
      ['pembelian', 'pembelian'],
      ['supplier', 'supplier'],
      ['feedback', 'feedback'],
    ];
    for (const [payloadKey, tableName] of collectionTables) {
      if (Array.isArray(data[payloadKey])) {
        await removeRecordsMissingFromPayload(tableName, data[payloadKey]);
      }
    }

    // Save App Config / Settings to clinic_store
    const configKeys = ['klinik', 'settings', 'rbacConfig', 'waConfig', 'waTemplates', 'waLogs'];
    for (const key of configKeys) {
      if (data[key] !== undefined) {
        await upsertRecord('clinic_store', 'key', {
          key,
          value: JSON.stringify(data[key]),
        });
      }
    }

    broadcastDataUpdated();
    return res.json({
      success: true,
      message: 'Semua data klinik berhasil disimpan ke database SQL!',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/data/sync:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// MYSQL COMPATIBILITY & DUMP UTILITIES (For Hosting / cPanel Deployments)
// ============================================================================

// Test custom MySQL connection endpoint
app.post('/api/mysql/test-connection', async (req: Request, res: Response) => {
  const { host, port, user, password, database } = req.body;

  try {
    const tempConnection = await mysql.createConnection({
      host: host || 'localhost',
      port: Number(port) || 3306,
      user: user || 'root',
      password: password || '',
      database: database || 'klinik_hewan',
      connectTimeout: 5000,
    });

    await tempConnection.ping();
    await tempConnection.end();

    return res.json({ success: true, message: 'Berhasil terhubung ke database MySQL!' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal terhubung ke MySQL: ' + error.message });
  }
});

// Download/Get DDL Schema SQL
app.get('/api/mysql/schema-sql', (req: Request, res: Response) => {
  try {
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="schema.sql"');
      return res.send(sqlContent);
    } else {
      return res.status(404).json({ error: 'File schema.sql tidak ditemukan.' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Initialize Tables on MySQL database
app.post('/api/mysql/init-tables', async (req: Request, res: Response) => {
  try {
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return res.status(404).json({ success: false, message: 'File schema.sql tidak ditemukan' });
    }

    const sqlScript = fs.readFileSync(schemaPath, 'utf8');
    const pool = getMySQLPool();

    const statements = sqlScript
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      await pool.query(statement);
    }

    return res.json({ success: true, message: 'Semua tabel MySQL berhasil diinisialisasi!' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error inisialisasi tabel MySQL: ' + error.message });
  }
});

// ============================================================================
// VITE MIDDLEWARE & SERVER BOOT
// ============================================================================

async function startServer() {
  await ensureMysqlSchemaCompatibility();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server VetCare Pro (SQL Database Engine) running on http://${HOST}:${PORT}`);
  });
}

startServer();
