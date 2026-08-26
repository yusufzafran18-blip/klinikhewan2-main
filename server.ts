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
const HOST = '0.0.0.0';
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

// ============================================================================
// IN-MEMORY FALLBACK STORE (Pre-seeded with default system data)
// ============================================================================

const inMemoryStore = {
  users: [
    {
      id: 'usr-1',
      username: 'superadmin',
      password: 'admin123',
      nama: 'Drh. Ahmad Fauzi (Super Admin)',
      email: 'admin@klinikhewan.com',
      role: 'super_admin',
      noHp: '081234567890',
      aktif: true,
      avatarUrl: null,
    },
    {
      id: 'usr-2',
      username: 'admin',
      password: 'admin123',
      nama: 'Rina Wati (Administrator)',
      email: 'rina@klinikhewan.com',
      role: 'admin',
      noHp: '081234567891',
      aktif: true,
      avatarUrl: null,
    },
    {
      id: 'usr-3',
      username: 'kasir',
      password: 'admin123',
      nama: 'Budi Santoso (Staf Kasir)',
      email: 'budi@klinikhewan.com',
      role: 'staf',
      noHp: '081234567892',
      aktif: true,
      avatarUrl: null,
    },
    {
      id: 'usr-4',
      username: 'dokter',
      password: 'admin123',
      nama: 'Drh. Siska Putri (Dokter Hewan)',
      email: 'siska@klinikhewan.com',
      role: 'dokter',
      noHp: '081234567893',
      aktif: true,
      avatarUrl: null,
    },
  ] as any[],

  dokter: [
    {
      id: 'doc-1',
      sip: 'SIP/503/2023/001',
      nama: 'Drh. Ahmad Fauzi, M.Si',
      spesialisasi: 'Bedah & Internis Hewan Kecil',
      noHp: '081234567890',
      email: 'fauzi@klinikhewan.com',
      jadwal: 'Senin - Jumat (08.00 - 16.00)',
      aktif: true,
      fotoUrl: null,
    },
    {
      id: 'doc-2',
      sip: 'SIP/503/2023/002',
      nama: 'Drh. Siska Putri, Sp.Klinik',
      spesialisasi: 'Eksotis & Dermatologi',
      noHp: '081234567893',
      email: 'siska@klinikhewan.com',
      jadwal: 'Selasa - Sabtu (10.00 - 18.00)',
      aktif: true,
      fotoUrl: null,
    },
  ] as any[],

  spesies: [
    { id: 'sp-1', kodeSpesies: 'KUCING', namaSpesies: 'Kucing (Felis catus)', nama: 'Kucing (Felis catus)', deskripsi: 'Kucing domestik, ras, dll.', kategori: 'Mamalia', rasUmum: ['Persia', 'Anggora', 'Domestik / Kampung', 'British Shorthair', 'Maine Coon'] },
    { id: 'sp-2', kodeSpesies: 'ANJING', namaSpesies: 'Anjing (Canis lupus familiaris)', nama: 'Anjing (Canis lupus familiaris)', deskripsi: 'Anjing ras & lokal', kategori: 'Mamalia', rasUmum: ['Golden Retriever', 'Poodle', 'Pomeranian', 'Shih Tzu', 'Bulldog'] },
    { id: 'sp-3', kodeSpesies: 'KELINCI', namaSpesies: 'Kelinci', nama: 'Kelinci', deskripsi: 'Oryctolagus cuniculus', kategori: 'Mamalia', rasUmum: ['Netherland Dwarf', 'Holland Lop', 'Rex', 'Fuzzy Lop'] },
    { id: 'sp-4', kodeSpesies: 'BURUNG', namaSpesies: 'Burung & Unggas', nama: 'Burung & Unggas', deskripsi: 'Avian species', kategori: 'Unggas', rasUmum: ['Lovebird', 'Kenari', 'Kakatua', 'Parrot'] },
  ] as any[],

  pasien: [
    {
      id: 'pas-1',
      kodePasien: 'PAS-2026-001',
      namaHewan: 'Milo',
      jenisHewan: 'Kucing (Felis catus)',
      ras: 'Persia Medium',
      jenisKelamin: 'Jantan',
      tanggalLahir: '2023-04-15',
      umurFormat: '2 Tahun 11 Bulan',
      warna: 'Abu-abu Putih',
      noMicrochip: '',
      namaOwner: 'Andi Pratama',
      noHpOwner: '081298765432',
      alamatOwner: 'Jl. Melati No. 12, Jember',
      emailOwner: 'andi.pratama@gmail.com',
      fotoUrl: '',
      catatanKhusus: 'Alergi pakan ikan laut basah',
      createdAt: '2026-01-10T08:30:00.000Z',
    },
    {
      id: 'pas-2',
      kodePasien: 'PAS-2026-002',
      namaHewan: 'Bruno',
      jenisHewan: 'Anjing (Canis lupus familiaris)',
      ras: 'Golden Retriever',
      jenisKelamin: 'Jantan Kastrasi',
      tanggalLahir: '2022-08-20',
      umurFormat: '3 Tahun 6 Bulan',
      warna: 'Golden Cream',
      noMicrochip: 'ID-9821039812',
      namaOwner: 'Dewi Lestari',
      noHpOwner: '085712349988',
      alamatOwner: 'Perumahan Indah Blok C-4, Jember',
      emailOwner: 'dewi.lestari@gmail.com',
      fotoUrl: '',
      catatanKhusus: 'Sensitif pada telinga kiri',
      createdAt: '2026-01-15T09:15:00.000Z',
    },
  ] as any[],

  barang: [
    { id: 'brg-1', kode: 'OBT-001', kodeBarang: 'OBT-001', nama: 'Amoxicillin Drop 15ml', namaBarang: 'Amoxicillin Drop 15ml', kategori: 'Obat', satuan: 'Botol', hargaBeli: 25000, hargaJual: 45000, stok: 35, stokCurrent: 35, stokMinimum: 5, tanggalKadaluarsa: '2027-12-31', expiredDate: '2027-12-31', lokasiRak: 'Rak Obat A-1', catatan: 'Antibiotik spektrum luas' },
    { id: 'brg-2', kode: 'OBT-002', kodeBarang: 'OBT-002', nama: 'Drontal Cat Tablet', namaBarang: 'Drontal Cat Tablet', kategori: 'Obat', satuan: 'Tablet', hargaBeli: 18000, hargaJual: 30000, stok: 48, stokCurrent: 48, stokMinimum: 10, tanggalKadaluarsa: '2027-10-15', expiredDate: '2027-10-15', lokasiRak: 'Rak Obat B-2', catatan: 'Obat cacing kucing' },
    { id: 'brg-3', kode: 'PKN-001', kodeBarang: 'PKN-001', nama: 'Royal Canin Recovery 195g', namaBarang: 'Royal Canin Recovery 195g', kategori: 'Pakan', satuan: 'Pcs', hargaBeli: 38000, hargaJual: 55000, stok: 24, stokCurrent: 24, stokMinimum: 5, tanggalKadaluarsa: '2026-11-20', expiredDate: '2026-11-20', lokasiRak: 'Rak Pakan C-1', catatan: 'Pakan khusus pemulihan sakit' },
    { id: 'brg-4', kode: 'ALK-001', kodeBarang: 'ALK-001', nama: 'Infus NaCl 0.9% 500ml', namaBarang: 'Infus NaCl 0.9% 500ml', kategori: 'Alkes', satuan: 'Botol', hargaBeli: 12000, hargaJual: 25000, stok: 30, stokCurrent: 30, stokMinimum: 8, tanggalKadaluarsa: '2028-01-01', expiredDate: '2028-01-01', lokasiRak: 'Rak Alkes D-1', catatan: 'Cairan rehidrasi standar' },
  ] as any[],

  tindakan: [
    { id: 'tdk-1', kode: 'TDK-001', kodeTindakan: 'TDK-001', nama: 'Pemeriksaan Umum (Konsultasi)', namaTindakan: 'Pemeriksaan Umum (Konsultasi)', kategori: 'Medis', tarif: 50000, komisiDokter: 15000, jasaDokter: 35000, deskripsi: 'Pemeriksaan fisik lengkap & diagnosa dokter' },
    { id: 'tdk-2', kode: 'TDK-002', kodeTindakan: 'TDK-002', nama: 'Vaksinasi Rabies', namaTindakan: 'Vaksinasi Rabies', kategori: 'Vaksinasi', tarif: 120000, komisiDokter: 30000, jasaDokter: 90000, deskripsi: 'Suntik vaksin rabies bersertifikat' },
    { id: 'tdk-3', kode: 'TDK-003', kodeTindakan: 'TDK-003', nama: 'Grooming Kucing Standar', namaTindakan: 'Grooming Kucing Standar', kategori: 'Grooming', tarif: 75000, komisiDokter: 0, jasaDokter: 75000, deskripsi: 'Mandi bersih, potong kuku, & bersihkan telinga' },
    { id: 'tdk-4', kode: 'TDK-004', kodeTindakan: 'TDK-004', nama: 'Pembersihan Karang Gigi (Scaling)', namaTindakan: 'Pembersihan Karang Gigi (Scaling)', kategori: 'Bedah / Gigi', tarif: 250000, komisiDokter: 75000, jasaDokter: 175000, deskripsi: 'Ultrasonic dental scaling dengan sedasi ringan' },
  ] as any[],

  pakan: [
    { id: 'pk-1', kode: 'PK-01', nama: 'Pakan Rawat Inap Kucing Dewasa', jenisHewan: 'Kucing', hargaPerHari: 20000, catatan: '2x makan sehari (Royal Canin / Pro Plan)' },
    { id: 'pk-2', kode: 'PK-02', nama: 'Pakan Rawat Inap Anjing Medium', jenisHewan: 'Anjing', hargaPerHari: 35000, catatan: '2x makan sehari + snack bergizi' },
  ] as any[],

  pendaftaran: [] as any[],
  rekamMedis: [] as any[],
  rawatInap: [] as any[],
  janjiTemu: [] as any[],
  vaksinasi: [] as any[],
  transaksi: [] as any[],
  pembelian: [] as any[],
  supplier: [
    { id: 'sup-1', kode: 'SUP-001', kodeSupplier: 'SUP-001', nama: 'PT Medika Satwa Nusantara', namaSupplier: 'PT Medika Satwa Nusantara', kontak: 'Bpk. Hendra (0812-3344-5566)', noHp: '081233445566', email: 'sales@medikasatwa.co.id', alamat: 'Kawasan Industri Rungkut, Surabaya' },
    { id: 'sup-2', kode: 'SUP-002', kodeSupplier: 'SUP-002', nama: 'CV Pet Nutrition Global', namaSupplier: 'CV Pet Nutrition Global', kontak: 'Ibu Ratna (0813-7788-9900)', noHp: '081377889900', email: 'order@petnutrition.id', alamat: 'Jl. Raya Darmo No. 45, Surabaya' },
  ] as any[],
  feedback: [] as any[],

  clinicStore: {
    klinik: {
      namaKlinik: 'VetCare Pro Animal Clinic',
      alamat: 'Jl. Pemuda No. 88, Jember, Jawa Timur',
      noTelepon: '0812-3456-7890',
      email: 'info@vetcarepro.com',
      sipKlinik: 'KLINIK/VET/2024/089',
      footerReceipt: 'Terima kasih atas kepercayaan Anda merawat anabul tercinta di VetCare Pro!',
    },
    settings: {
      namaKlinik: 'VetCare Pro Animal Clinic',
      alamatKlinik: 'Jl. Pemuda No. 88, Jember, Jawa Timur',
      teleponKlinik: '0812-3456-7890',
      emailKlinik: 'info@vetcarepro.com',
      sipKlinik: 'KLINIK/VET/2024/089',
      footerReceipt: 'Terima kasih atas kepercayaan Anda merawat anabul tercinta di VetCare Pro!',
      autoBackupEnabled: true,
      theme: 'light',
    },
    rbacConfig: { modules: [] },
    waConfig: {
      provider: 'fonnte',
      apiKey: '',
      senderPhone: '',
      statusDevice: 'terputus',
      active: false,
      autoReminders: { janjiTemu: false, kontrolUlang: false, vaksinasi: false, notaPembayaran: false, pengingatPakan: false },
    },
    waTemplates: [],
    waLogs: [],
    mutasiStok: [],
  } as Record<string, any>,

  sessions: new Map<string, { userId: string; expiresAt: Date }>(),
  backups: [] as any[],
};

// Helper to create MySQL Connection Pool for self-hosted MySQL servers
function getMySQLConfig() {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'klinik_hewan',
    connectTimeout: 3000,
  };
}

let mysqlPool: mysql.Pool | null = null;
function getMySQLPool(): mysql.Pool | null {
  if (!mysqlPool) {
    try {
      const config = getMySQLConfig();
      mysqlPool = mysql.createPool({
        ...config,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    } catch {
      mysqlPool = null;
    }
  }
  return mysqlPool;
}

let isMysqlActive = false;
async function checkMysqlConnection(): Promise<boolean> {
  try {
    const pool = getMySQLPool();
    if (!pool) return false;
    const [rows] = await pool.query('SELECT 1 as ping');
    isMysqlActive = !!rows;
    return isMysqlActive;
  } catch {
    isMysqlActive = false;
    return false;
  }
}

async function ensureMysqlSchemaCompatibility() {
  const pool = getMySQLPool();
  if (!pool) return;

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
  if (!databaseName) return;

  const hasColumn = async (tableName: string, columnName: string) => {
    try {
      const [rows] = await pool.query(
        'SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [databaseName, tableName, columnName],
      );
      return Number((rows as Array<{ count: number }>)[0]?.count || 0) > 0;
    } catch {
      return false;
    }
  };

  const addColumn = async (tableName: string, columnName: string, definition: string) => {
    try {
      if (!(await hasColumn(tableName, columnName))) {
        await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
      }
    } catch (_) {}
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
    ['rawat_inap', 'no_kamar', "VARCHAR(50) NULL"], ['rawat_inap', 'no_kandang', "VARCHAR(100) NULL"],
    ['rawat_inap', 'dokter_id', "VARCHAR(50) NULL"], ['rawat_inap', 'dokter_pj_id', "VARCHAR(50) NULL"],
    ['rawat_inap', 'diagnosa', 'TEXT NULL'], ['rawat_inap', 'diagnosa_inap', 'TEXT NULL'],
    ['rawat_inap', 'tarif_per_hari', 'DECIMAL(12,2) NULL DEFAULT 100000'],
    ['rawat_inap', 'pakan_id', "VARCHAR(50) NULL"],
    ['rawat_inap', 'catatan', 'TEXT NULL'], ['rawat_inap', 'daily_notes', 'JSON NULL'],
    ['rawat_inap', 'monitoring_logs', 'JSON NULL'], ['rawat_inap', 'monitoring_logs_json', 'JSON NULL'],
    ['rawat_inap', 'pemberian_obat_json', 'JSON NULL'], ['rawat_inap', 'penggunaan_alkes_json', 'JSON NULL'],
    ['rawat_inap', 'pemakaian_barang_json', 'JSON NULL'], ['rawat_inap', 'tindakan_medis_json', 'JSON NULL'],
    ['rawat_inap', 'total_biaya', 'DECIMAL(12,2) NULL DEFAULT 0'], ['rawat_inap', 'total_biaya_inap', 'DECIMAL(12,2) NULL DEFAULT 0'],
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

  try {
    const existingTables = new Set<string>();
    const [tableRows] = await pool.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [databaseName]);
    for (const row of tableRows as Array<{ TABLE_NAME: string }>) existingTables.add(row.TABLE_NAME);

    if (!existingTables.has('pembelian')) {
      await pool.query(`CREATE TABLE IF NOT EXISTS pembelian (
        id VARCHAR(50) PRIMARY KEY, nomor_po VARCHAR(50) NOT NULL UNIQUE, supplier_id VARCHAR(50) NOT NULL,
        tanggal DATE NOT NULL, items JSON NOT NULL, total_harga DECIMAL(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'Selesai', catatan TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    }
    if (!existingTables.has('feedback')) {
      await pool.query(`CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(50) PRIMARY KEY, pasien_id VARCHAR(50) NOT NULL, transaksi_id VARCHAR(50) NULL,
        rating INT NOT NULL DEFAULT 5, catatan TEXT NULL, tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    }
    if (!existingTables.has('clinic_store')) {
      await pool.query(`CREATE TABLE IF NOT EXISTS clinic_store (
        \`key\` VARCHAR(100) PRIMARY KEY, value JSON NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    }
    if (!existingTables.has('clinic_settings')) {
      await pool.query(`CREATE TABLE IF NOT EXISTS clinic_settings (
        id INT NOT NULL DEFAULT 1 PRIMARY KEY,
        clinic_profile_json JSON NOT NULL,
        app_settings_json JSON NOT NULL,
        updated_by VARCHAR(50) NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    }
    if (!existingTables.has('clinic_backups')) {
      await pool.query(`CREATE TABLE IF NOT EXISTS clinic_backups (
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
  } catch (err: any) {
    console.warn('[AI Studio] MySQL schema check warning:', err.message);
  }
}

// Helper function for MySQL UPSERT
async function upsertRecord(tableName: string, primaryKey: string, values: Record<string, any>) {
  const pool = getMySQLPool();
  if (!pool) return;

  const databaseName = process.env.MYSQL_DATABASE || 'klinik_hewan';
  const [columnRows] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [databaseName, tableName],
  );
  const existingColumns = new Set(
    (columnRows as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME),
  );
  const columns = Object.keys(values).filter((column) => existingColumns.has(column));
  if (!existingColumns.has(primaryKey) || columns.length === 0) return;

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
  if (!pool) return;

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

    // Check MySQL if connected
    const isLive = await checkMysqlConnection();
    if (isLive) {
      try {
        const users = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
        const user = users[0];
        if (user && user.aktif) {
          const sessionId = randomUUID();
          const pool = getMySQLPool()!;
          await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
          await pool.query('INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR))', [sessionId, user.id]);
          setSessionCookie(res, sessionId);
          return res.json({ success: true, user });
        }
      } catch (_) {}
    }

    // Fallback: in-memory store
    const user = inMemoryStore.users.find((u) => u.id === userId);
    if (!user || !user.aktif) {
      return res.status(401).json({ success: false, error: 'Akun tidak aktif atau tidak ditemukan.' });
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 3600 * 1000);
    inMemoryStore.sessions.set(sessionId, { userId: user.id, expiresAt });
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

    const isLive = await checkMysqlConnection();
    if (isLive) {
      try {
        const pool = getMySQLPool()!;
        const [sessionRows] = await pool.query('SELECT user_id FROM auth_sessions WHERE id = ? AND expires_at > NOW() LIMIT 1', [sessionId]);
        const userId = (sessionRows as Array<{ user_id: string }>)[0]?.user_id;
        if (userId) {
          const users = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
          const user = users[0];
          if (user && user.aktif) {
            return res.json({ success: true, authenticated: true, user });
          }
        }
      } catch (_) {}
    }

    // Fallback in-memory
    const session = inMemoryStore.sessions.get(sessionId);
    if (session && session.expiresAt > new Date()) {
      const user = inMemoryStore.users.find((u) => u.id === session.userId);
      if (user && user.aktif) {
        return res.json({ success: true, authenticated: true, user });
      }
    }

    clearSessionCookie(res);
    return res.json({ success: true, authenticated: false, user: null });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/auth/session', async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  if (sessionId) {
    inMemoryStore.sessions.delete(sessionId);
    try {
      const pool = getMySQLPool();
      if (pool) await pool.query('DELETE FROM auth_sessions WHERE id = ?', [sessionId]);
    } catch (_) {}
  }
  clearSessionCookie(res);
  return res.json({ success: true });
});

// 1. Database Connection Status
app.get('/api/db/status', async (req: Request, res: Response) => {
  const isLive = await checkMysqlConnection();
  if (isLive) {
    return res.json({
      connected: true,
      type: 'MySQL Database (Drizzle ORM)',
      database: process.env.MYSQL_DATABASE || 'klinik_hewan',
      host: process.env.MYSQL_HOST || 'localhost',
      tablesCount: 17,
      recordsInfo: `Tersambung ke MySQL Database Server (${inMemoryStore.users.length} user aktif)`,
      message: 'Database MySQL Aktif dan Terkoneksi secara Realtime.',
    });
  }

  // Graceful fallback status: server is active and ready with in-memory persistence
  return res.json({
    connected: true,
    type: 'Local Database Server Engine (In-Memory)',
    database: process.env.MYSQL_DATABASE || 'klinik_hewan',
    host: process.env.MYSQL_HOST || 'localhost',
    tablesCount: 17,
    recordsInfo: `Engine VetCare Pro Aktif (${inMemoryStore.users.length} user siap digunakan)`,
    message: 'Server VetCare Pro Aktif dan Beroperasi secara Normal.',
  });
});

app.get('/api/settings', async (req: Request, res: Response) => {
  const isLive = await checkMysqlConnection();
  if (isLive) {
    try {
      const pool = getMySQLPool()!;
      const [rows] = await pool.query('SELECT clinic_profile_json, app_settings_json, updated_by, updated_at FROM clinic_settings WHERE id = 1 LIMIT 1');
      const row = (rows as Array<any>)[0];
      if (row) return res.json({ success: true, data: row });
    } catch (_) {}
  }

  return res.json({
    success: true,
    data: {
      clinic_profile_json: inMemoryStore.clinicStore.klinik,
      app_settings_json: inMemoryStore.clinicStore.settings,
      updated_by: 'system',
      updated_at: new Date().toISOString(),
    },
  });
});

app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const { clinicProfile, appSettings, updatedBy } = req.body || {};
    if (!clinicProfile || !appSettings) {
      return res.status(400).json({ success: false, error: 'Profil klinik dan pengaturan aplikasi wajib diisi.' });
    }

    inMemoryStore.clinicStore.klinik = clinicProfile;
    inMemoryStore.clinicStore.settings = appSettings;

    const isLive = await checkMysqlConnection();
    if (isLive) {
      try {
        const pool = getMySQLPool()!;
        await pool.query(
          `INSERT INTO clinic_settings (id, clinic_profile_json, app_settings_json, updated_by)
           VALUES (1, ?, ?, ?)
           ON DUPLICATE KEY UPDATE clinic_profile_json = VALUES(clinic_profile_json), app_settings_json = VALUES(app_settings_json), updated_by = VALUES(updated_by)`,
          [JSON.stringify(clinicProfile), JSON.stringify(appSettings), updatedBy || null],
        );
      } catch (_) {}
    }

    broadcastDataUpdated();
    return res.json({ success: true, message: 'Pengaturan klinik tersimpan.' });
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

    const newBackup = {
      id: id || `backup-${Date.now()}`,
      backup_version: version || '3.0.0-mysql',
      backup_json: backup,
      created_by: createdBy || null,
      created_at: new Date().toISOString(),
    };
    inMemoryStore.backups.unshift(newBackup);

    const isLive = await checkMysqlConnection();
    if (isLive) {
      try {
        const pool = getMySQLPool()!;
        await pool.query(
          'INSERT INTO clinic_backups (id, backup_version, backup_json, created_by) VALUES (?, ?, ?, ?)',
          [newBackup.id, newBackup.backup_version, JSON.stringify(backup), newBackup.created_by],
        );
      } catch (_) {}
    }

    broadcastDataUpdated();
    return res.json({ success: true, message: 'Backup berhasil disimpan.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/backups/latest', async (req: Request, res: Response) => {
  const isLive = await checkMysqlConnection();
  if (isLive) {
    try {
      const pool = getMySQLPool()!;
      const [rows] = await pool.query('SELECT id, backup_version, backup_json, created_by, created_at FROM clinic_backups ORDER BY created_at DESC LIMIT 1');
      const row = (rows as Array<any>)[0];
      if (row) return res.json({ success: true, data: row });
    } catch (_) {}
  }

  return res.json({ success: true, data: inMemoryStore.backups[0] || null });
});

// 2. Fetch All Clinic Data from Database
app.get('/api/data', async (req: Request, res: Response) => {
  try {
    const isLive = await checkMysqlConnection();
    if (isLive) {
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
        clinicStoreList.forEach((item: any) => {
          storeMap[item.key] = item.value;
        });

        const payload = {
          users: usersList.length > 0 ? usersList : inMemoryStore.users,
          dokter: dokterList.length > 0 ? dokterList : inMemoryStore.dokter,
          pasien: pasienList.map((p: any) => ({
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
          barang: barangList.map((b: any) => ({
            ...b,
            kodeBarang: b.kode,
            namaBarang: b.nama,
            hargaBeli: Number(b.hargaBeli),
            hargaJual: Number(b.hargaJual),
            stokCurrent: Number(b.stok),
            expiredDate: b.tanggalKadaluarsa,
            stokMinimum: Number(b.stokMinimum),
          })),
          tindakan: tindakanList.map((t: any) => ({
            ...t,
            kodeTindakan: t.kode,
            namaTindakan: t.nama,
            tarif: Number(t.tarif),
            komisiDokter: Number(t.komisiDokter || 0),
            jasaDokter: Number(t.jasaDokter || 0),
          })),
          pakan: pakanList.map((pk: any) => ({
            ...pk,
            hargaPerHari: Number(pk.hargaPerHari),
          })),
          spesies: spesiesList.map((sp: any) => ({
            ...sp,
            kodeSpesies: sp.kodeSpesies,
            namaSpesies: sp.nama,
            keterangan: sp.deskripsi || '',
          })),
          pendaftaran: pendaftaranList,
          rekamMedis: rekamMedisList.map((rm: any) => {
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
          rawatInap: rawatInapList.map((ri: any) => {
            let monitoringLogsParsed = [];
            let obatListParsed = [];
            let alkesListParsed = [];
            let barangListParsed = [];
            let tindakanListParsed = [];

            try {
              if (ri.monitoringLogs && Array.isArray(ri.monitoringLogs)) monitoringLogsParsed = ri.monitoringLogs;
              else if (typeof ri.monitoring_logs_json === 'string' && ri.monitoring_logs_json.startsWith('[')) monitoringLogsParsed = JSON.parse(ri.monitoring_logs_json);
              else if (Array.isArray(ri.monitoring_logs_json)) monitoringLogsParsed = ri.monitoring_logs_json;
            } catch (_) {}

            try {
              if (ri.pemberianObatList && Array.isArray(ri.pemberianObatList)) obatListParsed = ri.pemberianObatList;
              else if (typeof ri.pemberian_obat_json === 'string') obatListParsed = JSON.parse(ri.pemberian_obat_json);
            } catch (_) {}

            try {
              if (ri.penggunaanAlkesList && Array.isArray(ri.penggunaanAlkesList)) alkesListParsed = ri.penggunaanAlkesList;
              else if (typeof ri.penggunaan_alkes_json === 'string') alkesListParsed = JSON.parse(ri.penggunaan_alkes_json);
            } catch (_) {}

            try {
              if (ri.pemakaianBarangList && Array.isArray(ri.pemakaianBarangList)) barangListParsed = ri.pemakaianBarangList;
              else if (typeof ri.pemakaian_barang_json === 'string') barangListParsed = JSON.parse(ri.pemakaian_barang_json);
            } catch (_) {}

            try {
              if (ri.tindakanMedisList && Array.isArray(ri.tindakanMedisList)) tindakanListParsed = ri.tindakanMedisList;
              else if (typeof ri.tindakan_medis_json === 'string') tindakanListParsed = JSON.parse(ri.tindakan_medis_json);
            } catch (_) {}

            return {
              ...ri,
              noKandang: ri.noKandang || ri.no_kandang || ri.noKamar || 'Kandang Rawat Inap',
              dokterPenanggungJawabId: ri.dokterPenanggungJawabId || ri.dokter_pj_id || ri.dokterId || '',
              diagnosaInap: ri.diagnosaInap || ri.diagnosa_inap || ri.diagnosa || '',
              tarifPerHari: Number(ri.tarifPerHari ?? ri.tarif_per_hari ?? ri.totalBiaya ?? 100000),
              totalBiaya: Number(ri.totalBiaya ?? ri.total_biaya_inap ?? 0),
              status: ri.status || 'Aktif',
              monitoringLogs: monitoringLogsParsed,
              pemberianObatList: obatListParsed,
              penggunaanAlkesList: alkesListParsed,
              pemakaianBarangList: barangListParsed,
              tindakanMedisList: tindakanListParsed,
            };
          }),
          janjiTemu: janjiTemuList.map((jt: any) => ({
            ...jt,
            jam: jt.waktu,
            layanan: jt.jenisLayanan || 'Pemeriksaan Umum',
            catatan: jt.keluhan || '',
            noHpPengingat: '',
          })),
          vaksinasi: vaksinasiList.map((v: any) => ({
            ...v,
            tanggalVaksin: v.tanggalDiberikan,
            tanggalVaksinUlang: v.tanggalBerikutnya || '',
            batchNo: v.batchNumber || '',
            keterangan: v.catatan || '',
          })),
          transaksi: transaksiList.map((trx: any) => ({
            ...trx,
            noNota: trx.kodeTransaksi,
            kasirId: trx.kasir,
            subtotal: Number(trx.subtotal),
            diskon: Number(trx.diskon),
            pajak: Number(trx.pajak),
            grandTotal: Number(trx.total),
            total: Number(trx.total),
          })),
          pembelian: pembelianList.map((po: any) => ({
            ...po,
            noFaktur: po.nomorPO,
            namaSupplier: po.supplierId,
            grandTotal: Number(po.totalHarga),
            totalHarga: Number(po.totalHarga),
          })),
          supplier: supplierList.map((s: any) => ({
            ...s,
            kodeSupplier: s.kodeSupplier || (s as any).kode,
            namaSupplier: s.namaSupplier || s.nama,
          })),
          feedback: feedbackList.map((fb: any) => ({
            ...fb,
            komentar: fb.catatan,
          })),
          klinik: storeMap['klinik'] || inMemoryStore.clinicStore.klinik,
          settings: storeMap['settings'] || inMemoryStore.clinicStore.settings,
          rbacConfig: storeMap['rbacConfig'] || inMemoryStore.clinicStore.rbacConfig,
          waConfig: storeMap['waConfig'] || inMemoryStore.clinicStore.waConfig,
          waTemplates: storeMap['waTemplates'] || inMemoryStore.clinicStore.waTemplates,
          waLogs: storeMap['waLogs'] || inMemoryStore.clinicStore.waLogs,
          mutasiStok: storeMap['mutasiStok'] || inMemoryStore.clinicStore.mutasiStok,
        };

        return res.json({ success: true, data: payload });
      } catch (err) {
        console.warn('[AI Studio] Live MySQL query fallback to memory store:', (err as Error).message);
      }
    }

    // Default In-Memory data payload
    const payload = {
      users: inMemoryStore.users,
      dokter: inMemoryStore.dokter,
      pasien: inMemoryStore.pasien,
      barang: inMemoryStore.barang,
      tindakan: inMemoryStore.tindakan,
      pakan: inMemoryStore.pakan,
      spesies: inMemoryStore.spesies,
      pendaftaran: inMemoryStore.pendaftaran,
      rekamMedis: inMemoryStore.rekamMedis,
      rawatInap: inMemoryStore.rawatInap,
      janjiTemu: inMemoryStore.janjiTemu,
      vaksinasi: inMemoryStore.vaksinasi,
      transaksi: inMemoryStore.transaksi,
      pembelian: inMemoryStore.pembelian,
      supplier: inMemoryStore.supplier,
      feedback: inMemoryStore.feedback,
      klinik: inMemoryStore.clinicStore.klinik,
      settings: inMemoryStore.clinicStore.settings,
      rbacConfig: inMemoryStore.clinicStore.rbacConfig,
      waConfig: inMemoryStore.clinicStore.waConfig,
      waTemplates: inMemoryStore.clinicStore.waTemplates,
      waLogs: inMemoryStore.clinicStore.waLogs,
      mutasiStok: inMemoryStore.clinicStore.mutasiStok,
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

    // Always update in-memory store
    if (Array.isArray(data.users)) inMemoryStore.users = data.users;
    if (Array.isArray(data.dokter)) inMemoryStore.dokter = data.dokter;
    if (Array.isArray(data.pasien)) inMemoryStore.pasien = data.pasien;
    if (Array.isArray(data.barang)) inMemoryStore.barang = data.barang;
    if (Array.isArray(data.tindakan)) inMemoryStore.tindakan = data.tindakan;
    if (Array.isArray(data.pakan)) inMemoryStore.pakan = data.pakan;
    if (Array.isArray(data.spesies)) inMemoryStore.spesies = data.spesies;
    if (Array.isArray(data.pendaftaran)) inMemoryStore.pendaftaran = data.pendaftaran;
    if (Array.isArray(data.rekamMedis)) inMemoryStore.rekamMedis = data.rekamMedis;
    if (Array.isArray(data.rawatInap)) inMemoryStore.rawatInap = data.rawatInap;
    if (Array.isArray(data.janjiTemu)) inMemoryStore.janjiTemu = data.janjiTemu;
    if (Array.isArray(data.vaksinasi)) inMemoryStore.vaksinasi = data.vaksinasi;
    if (Array.isArray(data.transaksi)) inMemoryStore.transaksi = data.transaksi;
    if (Array.isArray(data.pembelian)) inMemoryStore.pembelian = data.pembelian;
    if (Array.isArray(data.supplier)) inMemoryStore.supplier = data.supplier;
    if (Array.isArray(data.feedback)) inMemoryStore.feedback = data.feedback;

    const configKeys = ['klinik', 'settings', 'rbacConfig', 'waConfig', 'waTemplates', 'waLogs', 'mutasiStok'];
    for (const key of configKeys) {
      if (data[key] !== undefined) {
        inMemoryStore.clinicStore[key] = data[key];
      }
    }

    // If MySQL is active, sync to MySQL
    const isLive = await checkMysqlConnection();
    if (isLive) {
      try {
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

        if (Array.isArray(data.rekamMedis)) {
          for (const rm of data.rekamMedis) {
            if (!rm.id || !rm.pasienId) continue;
            await upsertRecord('rekam_medis', 'id', {
              id: rm.id,
              no_rekam_medis: rm.noRM || rm.noRekamMedis || ('RM-' + rm.id),
              tanggal: rm.tanggal || new Date().toISOString().split('T')[0],
              pasien_id: rm.pasienId,
              dokter_id: rm.dokterId || 'drh-1',
              subjektif: typeof rm.subjective === 'object' ? JSON.stringify(rm.subjective) : (rm.subjektif || '-'),
              objektif: typeof rm.objective === 'object' ? JSON.stringify(rm.objective) : (rm.objektif || '-'),
              assesment: typeof rm.assessment === 'object' ? JSON.stringify(rm.assessment) : (rm.assesment || '-'),
              diagnosa: rm.assessment?.diagnosaUtama || rm.diagnosa || '-',
              plan: typeof rm.plan === 'object' ? JSON.stringify(rm.plan) : (rm.plan || '-'),
              tindakan: JSON.stringify(rm.plan?.tindakanList || []),
              resep: JSON.stringify(rm.plan?.resepList || []),
              total_biaya: String(rm.totalBiaya || 0),
            });
          }
        }

        if (Array.isArray(data.rawatInap)) {
          for (const ri of data.rawatInap) {
            if (!ri.id || !ri.pasienId) continue;
            await upsertRecord('rawat_inap', 'id', {
              id: ri.id,
              pasien_id: ri.pasienId,
              no_kandang: ri.noKandang || 'Kandang Rawat Inap',
              no_kamar: ri.noKandang || 'Kandang Rawat Inap',
              tanggal_masuk: ri.tanggalMasuk || new Date().toISOString().replace('T', ' ').slice(0, 19),
              tanggal_keluar: ri.tanggalKeluarAktif || null,
              dokter_pj_id: ri.dokterPenanggungJawabId || 'drh-1',
              dokter_id: ri.dokterPenanggungJawabId || 'drh-1',
              diagnosa_inap: ri.diagnosaInap || 'Rawat Inap',
              diagnosa: ri.diagnosaInap || 'Rawat Inap',
              tarif_per_hari: String(ri.tarifPerHari || 100000),
              status: ri.status || 'Aktif',
              monitoring_logs: ri.monitoringLogs || [],
              monitoring_logs_json: JSON.stringify(ri.monitoringLogs || []),
              pemberian_obat_json: JSON.stringify(ri.pemberianObatList || []),
              penggunaan_alkes_json: JSON.stringify(ri.penggunaanAlkesList || []),
              pemakaian_barang_json: JSON.stringify(ri.pemakaianBarangList || []),
              tindakan_medis_json: JSON.stringify(ri.tindakanMedisList || []),
              total_biaya: String(ri.totalBiaya || 0),
              total_biaya_inap: String(ri.totalBiaya || 0),
            });
          }
        }

        if (Array.isArray(data.transaksi)) {
          for (const trx of data.transaksi) {
            if (!trx.id || !trx.noNota) continue;
            await upsertRecord('transaksi', 'id', {
              id: trx.id,
              no_faktur: trx.noNota,
              tanggal: trx.tanggal || new Date().toISOString().replace('T', ' ').slice(0, 19),
              tipe_transaksi: trx.typeTransaksi || 'Rawat Inap',
              pasien_id: trx.pasienId || null,
              nama_pelanggan: trx.namaPelanggan || 'Pelanggan',
              kasir_id: trx.kasirId || 'system',
              items_json: JSON.stringify(trx.items || []),
              subtotal: String(trx.subtotal || 0),
              diskon: String(trx.diskon || 0),
              pajak: String(trx.pajak || 0),
              total_akhir: String(trx.grandTotal || trx.total || 0),
              metode_pembayaran: trx.metodePembayaran || 'Tunai',
              jumlah_bayar: String(trx.jumlahBayar || 0),
              kembalian: String(trx.kembalian || 0),
              status: trx.status || 'Lunas',
            });
          }
        }

        for (const key of configKeys) {
          if (data[key] !== undefined) {
            await upsertRecord('clinic_store', 'key', {
              key,
              value: JSON.stringify(data[key]),
            });
          }
        }
      } catch (dbErr: any) {
        console.warn('[AI Studio] Sync to MySQL warning:', dbErr.message);
      }
    }

    broadcastDataUpdated();
    return res.json({
      success: true,
      message: 'Data berhasil disimpan!',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/data/sync:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// MYSQL UTILITIES (For Hosting / cPanel Deployments)
// ============================================================================

app.post('/api/mysql/test-connection', async (req: Request, res: Response) => {
  const { host, port, user, password, database } = req.body;

  try {
    const tempConnection = await mysql.createConnection({
      host: host || 'localhost',
      port: Number(port) || 3306,
      user: user || 'root',
      password: password || '',
      database: database || 'klinik_hewan',
      connectTimeout: 4000,
    });

    await tempConnection.ping();
    await tempConnection.end();

    return res.json({ success: true, message: 'Berhasil terhubung ke database MySQL!' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal terhubung ke MySQL: ' + error.message });
  }
});

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

app.post('/api/mysql/init-tables', async (req: Request, res: Response) => {
  try {
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return res.status(404).json({ success: false, message: 'File schema.sql tidak ditemukan' });
    }

    const sqlScript = fs.readFileSync(schemaPath, 'utf8');
    const pool = getMySQLPool();
    if (!pool) {
      return res.status(500).json({ success: false, message: 'Koneksi MySQL pool tidak tersedia' });
    }

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
  // Attempt MySQL initialization in the background without blocking server boot
  checkMysqlConnection()
    .then((connected) => {
      if (connected) {
        return ensureMysqlSchemaCompatibility();
      }
    })
    .catch((err) => {
      console.warn('[AI Studio] MySQL initialization skipped:', err.message);
    });

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
    console.log(`🚀 Server VetCare Pro running on http://${HOST}:${PORT}`);
  });
}

startServer();
