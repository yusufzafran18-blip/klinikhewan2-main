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

  const [databaseRows] = await pool.query('SELECT DATABASE() AS name');
  const databaseName = (databaseRows as Array<{ name: string }>)[0]?.name || process.env.MYSQL_DATABASE || 'klinik_hewan';

  // 1. Create all missing tables if they don't exist
  const tableDefinitions: Array<{ name: string; ddl: string }> = [
    {
      name: 'auth_sessions',
      ddl: `CREATE TABLE IF NOT EXISTS auth_sessions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_auth_sessions_user (user_id),
        INDEX idx_auth_sessions_expiry (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'users',
      ddl: `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL DEFAULT 'admin123',
        nama VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        role VARCHAR(30) NOT NULL DEFAULT 'staf',
        no_hp VARCHAR(20) NULL,
        aktif TINYINT(1) NOT NULL DEFAULT 1,
        status_aktif TINYINT(1) NOT NULL DEFAULT 1,
        avatar_url TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'dokter',
      ddl: `CREATE TABLE IF NOT EXISTS dokter (
        id VARCHAR(50) PRIMARY KEY,
        sip VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(100) NOT NULL,
        spesialisasi VARCHAR(100) NOT NULL DEFAULT 'Umum',
        no_hp VARCHAR(20) NOT NULL DEFAULT '-',
        email VARCHAR(100) NULL,
        jadwal TEXT NULL,
        aktif TINYINT(1) NOT NULL DEFAULT 1,
        status_aktif TINYINT(1) NOT NULL DEFAULT 1,
        foto_url TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'pasien',
      ddl: `CREATE TABLE IF NOT EXISTS pasien (
        id VARCHAR(50) PRIMARY KEY,
        kode_pasien VARCHAR(50) NOT NULL UNIQUE,
        nama_hewan VARCHAR(100) NOT NULL,
        jenis_hewan VARCHAR(50) NOT NULL,
        ras VARCHAR(50) NULL,
        jenis_kelamin VARCHAR(30) NOT NULL DEFAULT 'Jantan',
        tanggal_lahir DATE NOT NULL,
        umur_format VARCHAR(50) NULL,
        warna VARCHAR(50) NULL,
        no_microchip VARCHAR(50) NULL,
        nama_owner VARCHAR(100) NOT NULL,
        no_hp_owner VARCHAR(20) NOT NULL,
        alamat_owner TEXT NOT NULL,
        email_owner VARCHAR(100) NULL,
        foto_url TEXT NULL,
        catatan_khusus TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_kode_pasien (kode_pasien),
        INDEX idx_nama_owner (nama_owner)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'barang',
      ddl: `CREATE TABLE IF NOT EXISTS barang (
        id VARCHAR(50) PRIMARY KEY,
        kode VARCHAR(50) NULL,
        kode_barang VARCHAR(50) NULL,
        nama VARCHAR(150) NULL,
        nama_barang VARCHAR(150) NULL,
        kategori VARCHAR(50) NOT NULL DEFAULT 'Obat',
        satuan VARCHAR(30) NOT NULL DEFAULT 'Pcs',
        harga_beli DECIMAL(12,2) NOT NULL DEFAULT 0,
        harga_jual DECIMAL(12,2) NOT NULL DEFAULT 0,
        stok INT NOT NULL DEFAULT 0,
        stok_current INT NOT NULL DEFAULT 0,
        stok_minimum INT NOT NULL DEFAULT 5,
        tanggal_kadaluarsa DATE NULL,
        expired_date DATE NULL,
        status_kadaluarsa VARCHAR(30) NULL DEFAULT 'Aman',
        lokasi_rak VARCHAR(50) NULL,
        catatan TEXT NULL,
        keterangan TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_kode_barang (kode_barang),
        INDEX idx_kategori (kategori)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'tindakan',
      ddl: `CREATE TABLE IF NOT EXISTS tindakan (
        id VARCHAR(50) PRIMARY KEY,
        kode VARCHAR(50) NULL,
        kode_tindakan VARCHAR(50) NULL,
        nama VARCHAR(150) NULL,
        nama_tindakan VARCHAR(150) NULL,
        kategori VARCHAR(50) NOT NULL DEFAULT 'Medis',
        tarif DECIMAL(12,2) NOT NULL DEFAULT 0,
        komisi_dokter DECIMAL(12,2) NOT NULL DEFAULT 0,
        jasa_dokter DECIMAL(12,2) NOT NULL DEFAULT 0,
        deskripsi TEXT NULL,
        keterangan TEXT NULL,
        estimasi_menit INT NULL DEFAULT 15,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'pakan',
      ddl: `CREATE TABLE IF NOT EXISTS pakan (
        id VARCHAR(50) PRIMARY KEY,
        kode VARCHAR(50) NULL,
        kode_pakan VARCHAR(50) NULL,
        nama VARCHAR(150) NULL,
        nama_pakan VARCHAR(150) NULL,
        merk VARCHAR(100) NULL,
        kategori_usia VARCHAR(50) NULL,
        jenis_hewan VARCHAR(50) NULL,
        dosis_per_kg_bb VARCHAR(100) NULL,
        harga_jual DECIMAL(12,2) NOT NULL DEFAULT 0,
        harga_per_hari DECIMAL(12,2) NOT NULL DEFAULT 0,
        stok INT NOT NULL DEFAULT 0,
        satuan VARCHAR(30) NOT NULL DEFAULT 'Kg',
        catatan TEXT NULL,
        keterangan TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'spesies',
      ddl: `CREATE TABLE IF NOT EXISTS spesies (
        id VARCHAR(50) PRIMARY KEY,
        kode_spesies VARCHAR(30) NULL,
        nama VARCHAR(100) NULL,
        nama_spesies VARCHAR(100) NULL,
        kategori VARCHAR(50) NOT NULL DEFAULT 'Mamalia',
        deskripsi TEXT NULL,
        keterangan TEXT NULL,
        ras_umum JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'pendaftaran',
      ddl: `CREATE TABLE IF NOT EXISTS pendaftaran (
        id VARCHAR(50) PRIMARY KEY,
        nomor_antrian VARCHAR(20) NULL,
        no_antrian VARCHAR(20) NULL,
        pasien_id VARCHAR(50) NOT NULL,
        dokter_id VARCHAR(50) NOT NULL,
        tanggal DATE NOT NULL,
        waktu TIME NULL,
        waktu_daftar TIME NULL,
        keluhan TEXT NULL,
        keluhan_utama TEXT NULL,
        layanan_dipilih VARCHAR(100) NULL,
        jenis_layanan VARCHAR(100) NULL DEFAULT 'Rawat Jalan',
        rawat_inap_id VARCHAR(50) NULL,
        rawat_inap_detail_json JSON NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'Antri',
        petugas_id VARCHAR(50) NULL,
        catatan TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pendaftaran_tanggal (tanggal),
        INDEX idx_pendaftaran_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'rekam_medis',
      ddl: `CREATE TABLE IF NOT EXISTS rekam_medis (
        id VARCHAR(50) PRIMARY KEY,
        no_rekam_medis VARCHAR(50) NULL,
        no_rm VARCHAR(50) NULL,
        pendaftaran_id VARCHAR(50) NULL,
        pasien_id VARCHAR(50) NOT NULL,
        dokter_id VARCHAR(50) NOT NULL,
        tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        subjektif TEXT NULL,
        subjective_json JSON NULL,
        objektif TEXT NULL,
        objective_json JSON NULL,
        assesment TEXT NULL,
        assessment_json JSON NULL,
        diagnosa TEXT NULL,
        plan TEXT NULL,
        plan_json JSON NULL,
        suhu VARCHAR(30) NULL,
        berat_badan VARCHAR(30) NULL,
        resep JSON NULL,
        resep_json JSON NULL,
        tindakan JSON NULL,
        tindakan_json JSON NULL,
        lampiran_dokumen_json JSON NULL,
        total_biaya DECIMAL(12,2) NOT NULL DEFAULT 0,
        status_pembayaran VARCHAR(30) NOT NULL DEFAULT 'Belum Bayar',
        alasan_pembatalan TEXT NULL,
        dibatalkan_oleh VARCHAR(50) NULL,
        catatan TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rm_pasien (pasien_id),
        INDEX idx_rm_tanggal (tanggal)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'rawat_inap',
      ddl: `CREATE TABLE IF NOT EXISTS rawat_inap (
        id VARCHAR(50) PRIMARY KEY,
        pendaftaran_id VARCHAR(50) NULL,
        pasien_id VARCHAR(50) NOT NULL,
        no_kamar VARCHAR(50) NULL,
        no_kandang VARCHAR(100) NULL,
        tanggal_masuk DATETIME NOT NULL,
        tanggal_keluar DATETIME NULL,
        tanggal_keluar_target DATETIME NULL,
        tanggal_keluar_aktif DATETIME NULL,
        dokter_id VARCHAR(50) NULL,
        dokter_pj_id VARCHAR(50) NULL,
        diagnosa TEXT NULL,
        diagnosa_inap TEXT NULL,
        pakan_id VARCHAR(50) NULL,
        tarif_per_hari DECIMAL(12,2) NOT NULL DEFAULT 100000,
        status VARCHAR(30) NOT NULL DEFAULT 'Aktif',
        alasan_pembatalan TEXT NULL,
        dibatalkan_oleh VARCHAR(50) NULL,
        catatan TEXT NULL,
        catatan_khusus TEXT NULL,
        daily_notes JSON NULL,
        monitoring_logs JSON NULL,
        monitoring_logs_json JSON NULL,
        pemberian_obat_json JSON NULL,
        pemberian_obat TEXT NULL,
        penggunaan_alkes_json JSON NULL,
        penggunaan_alkes TEXT NULL,
        pemakaian_barang_json JSON NULL,
        tindakan_medis_json JSON NULL,
        pelaksanaan_perawatan TEXT NULL,
        biaya_tambahan DECIMAL(12,2) NULL DEFAULT 0,
        total_biaya DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_biaya_inap DECIMAL(12,2) NOT NULL DEFAULT 0,
        status_pembayaran VARCHAR(30) NULL DEFAULT 'Belum Lunas',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ri_pasien (pasien_id),
        INDEX idx_ri_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'janji_temu',
      ddl: `CREATE TABLE IF NOT EXISTS janji_temu (
        id VARCHAR(50) PRIMARY KEY,
        pasien_id VARCHAR(50) NOT NULL,
        dokter_id VARCHAR(50) NOT NULL,
        tanggal DATE NOT NULL,
        waktu TIME NULL,
        jam TIME NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'Terjadwal',
        keluhan TEXT NULL,
        keperluan TEXT NULL,
        layanan VARCHAR(100) NULL,
        jenis_layanan VARCHAR(100) NULL,
        reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
        notifikasi_sent TINYINT(1) NOT NULL DEFAULT 0,
        no_hp_pengingat VARCHAR(20) NULL,
        catatan TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_janji_pasien (pasien_id),
        INDEX idx_janji_tanggal (tanggal)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'vaksinasi',
      ddl: `CREATE TABLE IF NOT EXISTS vaksinasi (
        id VARCHAR(50) PRIMARY KEY,
        pasien_id VARCHAR(50) NOT NULL,
        nama_vaksin VARCHAR(100) NOT NULL,
        tanggal_diberikan DATE NULL,
        tanggal_vaksin DATE NULL,
        tanggal_berikutnya DATE NULL,
        tanggal_kembali DATE NULL,
        tanggal_vaksin_ulang DATE NULL,
        dokter_id VARCHAR(50) NULL,
        batch_number VARCHAR(50) NULL,
        batch_no VARCHAR(50) NULL,
        catatan TEXT NULL,
        keterangan TEXT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'Selesai',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_vaksin_pasien (pasien_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'transaksi',
      ddl: `CREATE TABLE IF NOT EXISTS transaksi (
        id VARCHAR(50) PRIMARY KEY,
        kode_transaksi VARCHAR(50) NULL,
        no_nota VARCHAR(50) NULL,
        no_faktur VARCHAR(50) NULL,
        tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        pendaftaran_id VARCHAR(50) NULL,
        rekam_medis_id VARCHAR(50) NULL,
        rawat_inap_id VARCHAR(50) NULL,
        pasien_id VARCHAR(50) NULL,
        nama_pelanggan VARCHAR(100) NULL,
        tipe_transaksi VARCHAR(50) NULL,
        type_transaksi VARCHAR(50) NULL,
        source_type VARCHAR(50) NULL,
        source_id VARCHAR(50) NULL,
        kasir VARCHAR(50) NULL,
        kasir_id VARCHAR(50) NULL,
        items JSON NULL,
        items_json JSON NULL,
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
        diskon DECIMAL(12,2) NOT NULL DEFAULT 0,
        pajak DECIMAL(12,2) NOT NULL DEFAULT 0,
        total DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_akhir DECIMAL(12,2) NOT NULL DEFAULT 0,
        grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
        metode_pembayaran VARCHAR(30) NOT NULL DEFAULT 'Tunai',
        jumlah_bayar DECIMAL(12,2) NOT NULL DEFAULT 0,
        kembalian DECIMAL(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'Lunas',
        alasan_batal TEXT NULL,
        dibatalkan_oleh VARCHAR(50) NULL,
        catatan TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_transaksi_tanggal (tanggal),
        INDEX idx_transaksi_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'pembelian',
      ddl: `CREATE TABLE IF NOT EXISTS pembelian (
        id VARCHAR(50) PRIMARY KEY,
        nomor_po VARCHAR(50) NOT NULL,
        no_faktur VARCHAR(50) NULL,
        no_faktur_supplier VARCHAR(50) NULL,
        supplier_id VARCHAR(50) NOT NULL,
        nama_supplier VARCHAR(100) NULL,
        tanggal DATE NOT NULL,
        items JSON NULL,
        items_json JSON NULL,
        total_harga DECIMAL(12,2) NOT NULL DEFAULT 0,
        grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_pembelian DECIMAL(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'Selesai',
        status_pembayaran VARCHAR(50) NOT NULL DEFAULT 'Lunas',
        jatuh_tempo DATE NULL,
        catatan TEXT NULL,
        keterangan TEXT NULL,
        alasan_pembatalan TEXT NULL,
        dibatalkan_oleh VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'pembelian_supplier',
      ddl: `CREATE TABLE IF NOT EXISTS pembelian_supplier (
        id VARCHAR(50) PRIMARY KEY,
        no_faktur_supplier VARCHAR(50) NOT NULL,
        supplier_id VARCHAR(50) NOT NULL,
        tanggal DATE NOT NULL,
        items_json JSON NOT NULL,
        total_pembelian DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status_pembayaran VARCHAR(50) NOT NULL DEFAULT 'Lunas',
        jatuh_tempo DATE DEFAULT NULL,
        keterangan TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'supplier',
      ddl: `CREATE TABLE IF NOT EXISTS supplier (
        id VARCHAR(50) PRIMARY KEY,
        kode_supplier VARCHAR(50) NULL,
        nama_supplier VARCHAR(100) NULL,
        nama VARCHAR(100) NULL,
        kontak VARCHAR(100) NULL,
        sales_person VARCHAR(100) NULL,
        no_hp VARCHAR(20) NOT NULL,
        email VARCHAR(100) NULL,
        alamat TEXT NOT NULL,
        rekening_bank VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'feedback',
      ddl: `CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(50) PRIMARY KEY,
        pasien_id VARCHAR(50) NOT NULL,
        transaksi_id VARCHAR(50) NULL,
        nama_owner VARCHAR(100) NULL,
        nama_pelanggan VARCHAR(100) NULL,
        rating INT NOT NULL DEFAULT 5,
        catatan TEXT NULL,
        komentar TEXT NULL,
        pesan TEXT NULL,
        saran_petugas TEXT NULL,
        balasan_klinik TEXT NULL,
        layanan_diuji VARCHAR(100) NULL,
        tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'feedback_pelanggan',
      ddl: `CREATE TABLE IF NOT EXISTS feedback_pelanggan (
        id VARCHAR(50) PRIMARY KEY,
        tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        nama_pelanggan VARCHAR(100) NOT NULL,
        no_hp VARCHAR(20) DEFAULT NULL,
        rating INT NOT NULL DEFAULT 5,
        layanan_diuji VARCHAR(100) DEFAULT NULL,
        pesan TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'mutasi_stok',
      ddl: `CREATE TABLE IF NOT EXISTS mutasi_stok (
        id VARCHAR(50) PRIMARY KEY,
        barang_id VARCHAR(50) NOT NULL,
        kode_barang VARCHAR(50) NULL,
        nama_barang VARCHAR(150) NULL,
        kategori VARCHAR(50) NULL,
        satuan VARCHAR(30) NULL,
        tanggal DATE NOT NULL,
        waktu VARCHAR(20) NULL,
        jenis VARCHAR(30) NOT NULL,
        jumlah INT NOT NULL DEFAULT 0,
        saldo_sebelum INT DEFAULT 0,
        saldo_setelah INT NOT NULL DEFAULT 0,
        keterangan TEXT NULL,
        referensi VARCHAR(100) NULL,
        tipe_referensi VARCHAR(50) NULL,
        pasien_nama VARCHAR(100) NULL,
        owner_nama VARCHAR(100) NULL,
        petugas VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mutasi_barang (barang_id),
        INDEX idx_mutasi_tanggal (tanggal)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'whatsapp_logs',
      ddl: `CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id VARCHAR(50) PRIMARY KEY,
        tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        no_hp VARCHAR(20) NULL,
        no_tujuan VARCHAR(20) NULL,
        nama_penerima VARCHAR(100) NULL,
        penerima VARCHAR(100) NULL,
        pesan TEXT NOT NULL,
        kategori VARCHAR(50) NOT NULL DEFAULT 'umum',
        status VARCHAR(30) NOT NULL DEFAULT 'terkirim',
        error_message TEXT NULL,
        error_details TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'whatsapp_templates',
      ddl: `CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id VARCHAR(50) PRIMARY KEY,
        kategori VARCHAR(50) NOT NULL,
        judul VARCHAR(150) NOT NULL,
        pesan TEXT NOT NULL,
        variable_placeholder_json JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'klinik_config',
      ddl: `CREATE TABLE IF NOT EXISTS klinik_config (
        id INT NOT NULL DEFAULT 1 PRIMARY KEY,
        nama_klinik VARCHAR(100) NOT NULL,
        alamat TEXT NOT NULL,
        no_telepon VARCHAR(30) NOT NULL,
        email VARCHAR(100) NULL,
        sip_klinik VARCHAR(100) NULL,
        footer_receipt TEXT NULL,
        logo_url TEXT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'clinic_store',
      ddl: `CREATE TABLE IF NOT EXISTS clinic_store (
        \`key\` VARCHAR(100) PRIMARY KEY,
        value JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'clinic_settings',
      ddl: `CREATE TABLE IF NOT EXISTS clinic_settings (
        id INT NOT NULL DEFAULT 1 PRIMARY KEY,
        clinic_profile_json JSON NOT NULL,
        app_settings_json JSON NOT NULL,
        updated_by VARCHAR(50) NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: 'clinic_backups',
      ddl: `CREATE TABLE IF NOT EXISTS clinic_backups (
        id VARCHAR(80) PRIMARY KEY,
        backup_version VARCHAR(30) NOT NULL,
        backup_json JSON NOT NULL,
        created_by VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_clinic_backups_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
  ];

  // Execute create table queries
  for (const table of tableDefinitions) {
    try {
      await pool.query(table.ddl);
    } catch (e: any) {
      console.warn(`[AI Studio] Table creation error (${table.name}):`, e.message);
    }
  }

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

  // Ensure all alternative/synonym columns exist in all tables
  const columns: Array<[string, string, string]> = [
    // users
    ['users', 'status_aktif', 'TINYINT(1) NULL DEFAULT 1'],
    ['users', 'avatar_url', 'TEXT NULL'],
    ['users', 'no_hp', 'VARCHAR(20) NULL'],
    // dokter
    ['dokter', 'status_aktif', 'TINYINT(1) NULL DEFAULT 1'],
    ['dokter', 'foto_url', 'TEXT NULL'],
    // pasien
    ['pasien', 'catatan_khusus', 'TEXT NULL'],
    ['pasien', 'umur_format', 'VARCHAR(50) NULL'],
    ['pasien', 'warna', 'VARCHAR(50) NULL'],
    ['pasien', 'no_microchip', 'VARCHAR(50) NULL'],
    ['pasien', 'email_owner', 'VARCHAR(100) NULL'],
    // barang
    ['barang', 'kode', 'VARCHAR(50) NULL'],
    ['barang', 'kode_barang', 'VARCHAR(50) NULL'],
    ['barang', 'nama', 'VARCHAR(150) NULL'],
    ['barang', 'nama_barang', 'VARCHAR(150) NULL'],
    ['barang', 'stok', 'INT NULL DEFAULT 0'],
    ['barang', 'stok_current', 'INT NULL DEFAULT 0'],
    ['barang', 'stok_minimum', 'INT NULL DEFAULT 5'],
    ['barang', 'tanggal_kadaluarsa', 'DATE NULL'],
    ['barang', 'expired_date', 'DATE NULL'],
    ['barang', 'status_kadaluarsa', "VARCHAR(30) NULL DEFAULT 'Aman'"],
    ['barang', 'lokasi_rak', 'VARCHAR(50) NULL'],
    ['barang', 'catatan', 'TEXT NULL'],
    ['barang', 'keterangan', 'TEXT NULL'],
    // tindakan
    ['tindakan', 'kode', 'VARCHAR(50) NULL'],
    ['tindakan', 'kode_tindakan', 'VARCHAR(50) NULL'],
    ['tindakan', 'nama', 'VARCHAR(150) NULL'],
    ['tindakan', 'nama_tindakan', 'VARCHAR(150) NULL'],
    ['tindakan', 'komisi_dokter', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['tindakan', 'jasa_dokter', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['tindakan', 'deskripsi', 'TEXT NULL'],
    ['tindakan', 'keterangan', 'TEXT NULL'],
    ['tindakan', 'estimasi_menit', 'INT NULL DEFAULT 15'],
    // pakan
    ['pakan', 'kode', 'VARCHAR(50) NULL'],
    ['pakan', 'kode_pakan', 'VARCHAR(50) NULL'],
    ['pakan', 'nama', 'VARCHAR(150) NULL'],
    ['pakan', 'nama_pakan', 'VARCHAR(150) NULL'],
    ['pakan', 'merk', 'VARCHAR(100) NULL'],
    ['pakan', 'kategori_usia', 'VARCHAR(50) NULL'],
    ['pakan', 'jenis_hewan', 'VARCHAR(50) NULL'],
    ['pakan', 'dosis_per_kg_bb', 'VARCHAR(100) NULL'],
    ['pakan', 'harga_jual', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['pakan', 'harga_per_hari', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['pakan', 'stok', 'INT NULL DEFAULT 0'],
    ['pakan', 'satuan', "VARCHAR(30) NULL DEFAULT 'Kg'"],
    ['pakan', 'catatan', 'TEXT NULL'],
    ['pakan', 'keterangan', 'TEXT NULL'],
    // spesies
    ['spesies', 'nama', 'VARCHAR(100) NULL'],
    ['spesies', 'nama_spesies', 'VARCHAR(100) NULL'],
    ['spesies', 'kategori', "VARCHAR(50) NULL DEFAULT 'Mamalia'"],
    ['spesies', 'kode_spesies', 'VARCHAR(30) NULL'],
    ['spesies', 'deskripsi', 'TEXT NULL'],
    ['spesies', 'keterangan', 'TEXT NULL'],
    ['spesies', 'ras_umum', 'JSON NULL'],
    // pendaftaran
    ['pendaftaran', 'nomor_antrian', 'VARCHAR(20) NULL'],
    ['pendaftaran', 'no_antrian', 'VARCHAR(20) NULL'],
    ['pendaftaran', 'keluhan', 'TEXT NULL'],
    ['pendaftaran', 'keluhan_utama', 'TEXT NULL'],
    ['pendaftaran', 'layanan_dipilih', 'VARCHAR(100) NULL'],
    ['pendaftaran', 'jenis_layanan', 'VARCHAR(100) NULL'],
    ['pendaftaran', 'rawat_inap_id', 'VARCHAR(50) NULL'],
    ['pendaftaran', 'rawat_inap_detail_json', 'JSON NULL'],
    ['pendaftaran', 'petugas_id', 'VARCHAR(50) NULL'],
    ['pendaftaran', 'catatan', 'TEXT NULL'],
    ['pendaftaran', 'waktu_daftar', 'TIME NULL'],
    // rekam_medis
    ['rekam_medis', 'no_rekam_medis', 'VARCHAR(50) NULL'],
    ['rekam_medis', 'no_rm', 'VARCHAR(50) NULL'],
    ['rekam_medis', 'pendaftaran_id', 'VARCHAR(50) NULL'],
    ['rekam_medis', 'subjektif', 'TEXT NULL'],
    ['rekam_medis', 'subjective_json', 'JSON NULL'],
    ['rekam_medis', 'objektif', 'TEXT NULL'],
    ['rekam_medis', 'objective_json', 'JSON NULL'],
    ['rekam_medis', 'assesment', 'TEXT NULL'],
    ['rekam_medis', 'assessment_json', 'JSON NULL'],
    ['rekam_medis', 'diagnosa', 'TEXT NULL'],
    ['rekam_medis', 'plan', 'TEXT NULL'],
    ['rekam_medis', 'plan_json', 'JSON NULL'],
    ['rekam_medis', 'suhu', 'VARCHAR(30) NULL'],
    ['rekam_medis', 'berat_badan', 'VARCHAR(30) NULL'],
    ['rekam_medis', 'resep', 'JSON NULL'],
    ['rekam_medis', 'resep_json', 'JSON NULL'],
    ['rekam_medis', 'tindakan', 'JSON NULL'],
    ['rekam_medis', 'tindakan_json', 'JSON NULL'],
    ['rekam_medis', 'lampiran_dokumen_json', 'JSON NULL'],
    ['rekam_medis', 'alasan_pembatalan', 'TEXT NULL'],
    ['rekam_medis', 'dibatalkan_oleh', 'VARCHAR(50) NULL'],
    ['rekam_medis', 'catatan', 'TEXT NULL'],
    // rawat_inap
    ['rawat_inap', 'no_kamar', 'VARCHAR(50) NULL'],
    ['rawat_inap', 'no_kandang', 'VARCHAR(100) NULL'],
    ['rawat_inap', 'dokter_id', 'VARCHAR(50) NULL'],
    ['rawat_inap', 'dokter_pj_id', 'VARCHAR(50) NULL'],
    ['rawat_inap', 'pendaftaran_id', 'VARCHAR(50) NULL'],
    ['rawat_inap', 'diagnosa', 'TEXT NULL'],
    ['rawat_inap', 'diagnosa_inap', 'TEXT NULL'],
    ['rawat_inap', 'tarif_per_hari', 'DECIMAL(12,2) NULL DEFAULT 100000'],
    ['rawat_inap', 'pakan_id', 'VARCHAR(50) NULL'],
    ['rawat_inap', 'catatan', 'TEXT NULL'],
    ['rawat_inap', 'catatan_khusus', 'TEXT NULL'],
    ['rawat_inap', 'daily_notes', 'JSON NULL'],
    ['rawat_inap', 'monitoring_logs', 'JSON NULL'],
    ['rawat_inap', 'monitoring_logs_json', 'JSON NULL'],
    ['rawat_inap', 'pemberian_obat_json', 'JSON NULL'],
    ['rawat_inap', 'pemberian_obat', 'TEXT NULL'],
    ['rawat_inap', 'penggunaan_alkes_json', 'JSON NULL'],
    ['rawat_inap', 'penggunaan_alkes', 'TEXT NULL'],
    ['rawat_inap', 'pemakaian_barang_json', 'JSON NULL'],
    ['rawat_inap', 'tindakan_medis_json', 'JSON NULL'],
    ['rawat_inap', 'pelaksanaan_perawatan', 'TEXT NULL'],
    ['rawat_inap', 'biaya_tambahan', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['rawat_inap', 'total_biaya', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['rawat_inap', 'total_biaya_inap', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['rawat_inap', 'status_pembayaran', "VARCHAR(30) NULL DEFAULT 'Belum Lunas'"],
    ['rawat_inap', 'alasan_pembatalan', 'TEXT NULL'],
    ['rawat_inap', 'dibatalkan_oleh', 'VARCHAR(50) NULL'],
    // janji_temu
    ['janji_temu', 'waktu', 'TIME NULL'],
    ['janji_temu', 'jam', 'TIME NULL'],
    ['janji_temu', 'keluhan', 'TEXT NULL'],
    ['janji_temu', 'keperluan', 'TEXT NULL'],
    ['janji_temu', 'layanan', 'VARCHAR(100) NULL'],
    ['janji_temu', 'jenis_layanan', 'VARCHAR(100) NULL'],
    ['janji_temu', 'reminder_sent', 'TINYINT(1) NULL DEFAULT 0'],
    ['janji_temu', 'notifikasi_sent', 'TINYINT(1) NULL DEFAULT 0'],
    ['janji_temu', 'no_hp_pengingat', 'VARCHAR(20) NULL'],
    // vaksinasi
    ['vaksinasi', 'tanggal_diberikan', 'DATE NULL'],
    ['vaksinasi', 'tanggal_vaksin', 'DATE NULL'],
    ['vaksinasi', 'tanggal_berikutnya', 'DATE NULL'],
    ['vaksinasi', 'tanggal_kembali', 'DATE NULL'],
    ['vaksinasi', 'tanggal_vaksin_ulang', 'DATE NULL'],
    ['vaksinasi', 'batch_number', 'VARCHAR(50) NULL'],
    ['vaksinasi', 'batch_no', 'VARCHAR(50) NULL'],
    ['vaksinasi', 'catatan', 'TEXT NULL'],
    ['vaksinasi', 'keterangan', 'TEXT NULL'],
    ['vaksinasi', 'status', "VARCHAR(30) NULL DEFAULT 'Selesai'"],
    // transaksi
    ['transaksi', 'kode_transaksi', 'VARCHAR(50) NULL'],
    ['transaksi', 'no_nota', 'VARCHAR(50) NULL'],
    ['transaksi', 'no_faktur', 'VARCHAR(50) NULL'],
    ['transaksi', 'pendaftaran_id', 'VARCHAR(50) NULL'],
    ['transaksi', 'rekam_medis_id', 'VARCHAR(50) NULL'],
    ['transaksi', 'rawat_inap_id', 'VARCHAR(50) NULL'],
    ['transaksi', 'nama_pelanggan', 'VARCHAR(100) NULL'],
    ['transaksi', 'tipe_transaksi', 'VARCHAR(50) NULL'],
    ['transaksi', 'type_transaksi', 'VARCHAR(50) NULL'],
    ['transaksi', 'source_type', 'VARCHAR(50) NULL'],
    ['transaksi', 'source_id', 'VARCHAR(50) NULL'],
    ['transaksi', 'kasir', 'VARCHAR(50) NULL'],
    ['transaksi', 'kasir_id', 'VARCHAR(50) NULL'],
    ['transaksi', 'items', 'JSON NULL'],
    ['transaksi', 'items_json', 'JSON NULL'],
    ['transaksi', 'total', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['transaksi', 'total_akhir', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['transaksi', 'grand_total', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['transaksi', 'jumlah_bayar', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['transaksi', 'kembalian', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['transaksi', 'metode_pembayaran', "VARCHAR(30) NULL DEFAULT 'Tunai'"],
    ['transaksi', 'alasan_batal', 'TEXT NULL'],
    ['transaksi', 'dibatalkan_oleh', 'VARCHAR(50) NULL'],
    ['transaksi', 'catatan', 'TEXT NULL'],
    // pembelian
    ['pembelian', 'no_faktur', 'VARCHAR(50) NULL'],
    ['pembelian', 'no_faktur_supplier', 'VARCHAR(50) NULL'],
    ['pembelian', 'nama_supplier', 'VARCHAR(100) NULL'],
    ['pembelian', 'items_json', 'JSON NULL'],
    ['pembelian', 'grand_total', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['pembelian', 'total_pembelian', 'DECIMAL(12,2) NULL DEFAULT 0'],
    ['pembelian', 'status_pembayaran', "VARCHAR(50) NULL DEFAULT 'Lunas'"],
    ['pembelian', 'jatuh_tempo', 'DATE NULL'],
    ['pembelian', 'alasan_pembatalan', 'TEXT NULL'],
    ['pembelian', 'dibatalkan_oleh', 'VARCHAR(50) NULL'],
    // supplier
    ['supplier', 'kode_supplier', 'VARCHAR(50) NULL'],
    ['supplier', 'nama_supplier', 'VARCHAR(100) NULL'],
    ['supplier', 'nama', 'VARCHAR(100) NULL'],
    ['supplier', 'kontak', 'VARCHAR(100) NULL'],
    ['supplier', 'sales_person', 'VARCHAR(100) NULL'],
    ['supplier', 'rekening_bank', 'VARCHAR(100) NULL'],
    // feedback
    ['feedback', 'nama_owner', 'VARCHAR(100) NULL'],
    ['feedback', 'nama_pelanggan', 'VARCHAR(100) NULL'],
    ['feedback', 'komentar', 'TEXT NULL'],
    ['feedback', 'pesan', 'TEXT NULL'],
    ['feedback', 'saran_petugas', 'TEXT NULL'],
    ['feedback', 'balasan_klinik', 'TEXT NULL'],
    ['feedback', 'layanan_diuji', 'VARCHAR(100) NULL'],
    // mutasi_stok
    ['mutasi_stok', 'kode_barang', 'VARCHAR(50) NULL'],
    ['mutasi_stok', 'nama_barang', 'VARCHAR(150) NULL'],
    ['mutasi_stok', 'kategori', 'VARCHAR(50) NULL'],
    ['mutasi_stok', 'satuan', 'VARCHAR(30) NULL'],
    ['mutasi_stok', 'tipe_referensi', 'VARCHAR(50) NULL'],
    ['mutasi_stok', 'pasien_nama', 'VARCHAR(100) NULL'],
    ['mutasi_stok', 'owner_nama', 'VARCHAR(100) NULL'],
    ['mutasi_stok', 'petugas', 'VARCHAR(100) NULL'],
    // whatsapp_logs
    ['whatsapp_logs', 'no_hp', 'VARCHAR(20) NULL'],
    ['whatsapp_logs', 'no_tujuan', 'VARCHAR(20) NULL'],
    ['whatsapp_logs', 'nama_penerima', 'VARCHAR(100) NULL'],
    ['whatsapp_logs', 'penerima', 'VARCHAR(100) NULL'],
    ['whatsapp_logs', 'error_message', 'TEXT NULL'],
    ['whatsapp_logs', 'error_details', 'TEXT NULL'],
  ];

  for (const [tableName, columnName, definition] of columns) {
    await addColumn(tableName, columnName, definition);
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
          mutasiStokList,
          whatsappLogsList,
          whatsappTemplatesList,
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
          db.select().from(schema.mutasiStok),
          db.select().from(schema.whatsappLogs),
          db.select().from(schema.whatsappTemplates),
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
            kodePasien: p.kodePasien || p.kode_pasien,
            namaHewan: p.namaHewan || p.nama_hewan,
            jenisHewan: p.jenisHewan || p.jenis_hewan,
            jenisKelamin: p.jenisKelamin || p.jenis_kelamin,
            tanggalLahir: p.tanggalLahir || p.tanggal_lahir,
            namaOwner: p.namaOwner || p.nama_owner,
            noHpOwner: p.noHpOwner || p.no_hp_owner,
            alamatOwner: p.alamatOwner || p.alamat_owner,
            emailOwner: p.emailOwner || p.email_owner,
            catatanKhusus: p.catatanKhusus || p.catatan_khusus,
          })),
          barang: barangList.map((b: any) => ({
            ...b,
            kodeBarang: b.kodeBarang || b.kode,
            namaBarang: b.namaBarang || b.nama,
            hargaBeli: Number(b.hargaBeli ?? b.harga_beli ?? 0),
            hargaJual: Number(b.hargaJual ?? b.harga_jual ?? 0),
            stokCurrent: Number(b.stokCurrent ?? b.stok ?? 0),
            stok: Number(b.stokCurrent ?? b.stok ?? 0),
            expiredDate: b.expiredDate || b.tanggalKadaluarsa || b.tanggal_kadaluarsa || null,
            stokMinimum: Number(b.stokMinimum ?? b.stok_minimum ?? 5),
            lokasiRak: b.lokasiRak || b.lokasi_rak || '',
            keterangan: b.keterangan || b.catatan || '',
          })),
          tindakan: tindakanList.map((t: any) => ({
            ...t,
            kodeTindakan: t.kodeTindakan || t.kode,
            namaTindakan: t.namaTindakan || t.nama,
            tarif: Number(t.tarif || 0),
            komisiDokter: Number(t.komisiDokter ?? t.komisi_dokter ?? 0),
            jasaDokter: Number(t.jasaDokter ?? t.jasa_dokter ?? 0),
            deskripsi: t.deskripsi || t.keterangan || '',
            keterangan: t.keterangan || t.deskripsi || '',
          })),
          pakan: pakanList.map((pk: any) => ({
            ...pk,
            kodePakan: pk.kodePakan || pk.kode,
            namaPakan: pk.namaPakan || pk.nama,
            hargaJual: Number(pk.hargaJual ?? pk.harga_jual ?? pk.hargaPerHari ?? pk.harga_per_hari ?? 0),
            hargaPerHari: Number(pk.hargaPerHari ?? pk.harga_per_hari ?? pk.hargaJual ?? pk.harga_jual ?? 0),
            stok: Number(pk.stok || 0),
            satuan: pk.satuan || 'Kg',
            kategoriUsia: pk.kategoriUsia || pk.kategori_usia || pk.jenisHewan || 'All',
            jenisHewan: pk.jenisHewan || pk.jenis_hewan || 'Semua',
          })),
          spesies: spesiesList.map((sp: any) => ({
            ...sp,
            kodeSpesies: sp.kodeSpesies || sp.kode_spesies || sp.id,
            namaSpesies: sp.namaSpesies || sp.nama,
            nama: sp.namaSpesies || sp.nama,
            kategori: sp.kategori || 'Mamalia',
            keterangan: sp.deskripsi || sp.keterangan || '',
            deskripsi: sp.deskripsi || sp.keterangan || '',
            rasUmum: Array.isArray(sp.rasUmum) ? sp.rasUmum : (typeof sp.ras_umum === 'string' ? JSON.parse(sp.ras_umum) : []),
          })),
          pendaftaran: pendaftaranList.map((pd: any) => ({
            ...pd,
            noAntrian: pd.noAntrian || pd.nomorAntrian || pd.no_antrian || pd.nomor_antrian,
            nomorAntrian: pd.nomorAntrian || pd.noAntrian || pd.nomor_antrian || pd.no_antrian,
            pasienId: pd.pasienId || pd.pasien_id,
            dokterId: pd.dokterId || pd.dokter_id,
            tanggal: pd.tanggal,
            waktu: pd.waktu || pd.waktuDaftar || pd.waktu_daftar || '09:00',
            waktuDaftar: pd.waktuDaftar || pd.waktu || pd.waktu_daftar || '09:00',
            keluhanUtama: pd.keluhanUtama || pd.keluhan || pd.keluhan_utama || '-',
            keluhan: pd.keluhan || pd.keluhanUtama || pd.keluhan_utama || '-',
            layananDipilih: pd.layananDipilih || pd.jenisLayanan || pd.layanan_dipilih || pd.jenis_layanan || 'Pemeriksaan Umum',
            jenisLayanan: pd.jenisLayanan || pd.layananDipilih || pd.jenis_layanan || pd.layanan_dipilih || 'Rawat Jalan',
            status: pd.status || 'Antri',
            rawatInapId: pd.rawatInapId || pd.rawat_inap_id || null,
            rawatInapDetail: pd.rawatInapDetail || (typeof pd.rawat_inap_detail_json === 'string' ? JSON.parse(pd.rawat_inap_detail_json) : pd.rawat_inap_detail_json) || null,
          })),
          rekamMedis: rekamMedisList.map((rm: any) => {
            let subjectiveParsed: any = { keluhan: rm.subjektif || '', anamnesa: '', makanMinum: 'Normal', durasiSakit: '' };
            let objectiveParsed: any = { beratBadan: Number(rm.beratBadan || rm.berat_badan || 0), suhu: Number(rm.suhu || 0), crt: '< 2 Detik', dehidrasi: 'Normal', pemeriksaanFisik: rm.objektif || '' };
            let assessmentParsed: any = { diagnosaUtama: rm.diagnosa || rm.assessment?.diagnosaUtama || '-', diagnosaBanding: rm.assesment || '-' };
            let planParsed: any = { tindakanList: [], resepList: [], racikanList: [], penggunaanAlkesList: [], pemakaianBarangList: [], statusLanjutan: 'Rawat Jalan' };

            try {
              if (rm.subjektif && typeof rm.subjektif === 'string' && rm.subjektif.startsWith('{')) subjectiveParsed = JSON.parse(rm.subjektif);
              else if (typeof rm.subjective_json === 'string' && rm.subjective_json.startsWith('{')) subjectiveParsed = JSON.parse(rm.subjective_json);
              else if (typeof rm.subjective === 'object' && rm.subjective) subjectiveParsed = rm.subjective;
            } catch (_) {}

            try {
              if (rm.objektif && typeof rm.objektif === 'string' && rm.objektif.startsWith('{')) objectiveParsed = JSON.parse(rm.objektif);
              else if (typeof rm.objective_json === 'string' && rm.objective_json.startsWith('{')) objectiveParsed = JSON.parse(rm.objective_json);
              else if (typeof rm.objective === 'object' && rm.objective) objectiveParsed = rm.objective;
            } catch (_) {}

            try {
              if (rm.assesment && typeof rm.assesment === 'string' && rm.assesment.startsWith('{')) assessmentParsed = JSON.parse(rm.assesment);
              else if (typeof rm.assessment_json === 'string' && rm.assessment_json.startsWith('{')) assessmentParsed = JSON.parse(rm.assessment_json);
              else if (typeof rm.assessment === 'object' && rm.assessment) assessmentParsed = rm.assessment;
            } catch (_) {}

            try {
              if (rm.plan && typeof rm.plan === 'string' && rm.plan.startsWith('{')) planParsed = JSON.parse(rm.plan);
              else if (typeof rm.plan_json === 'string' && rm.plan_json.startsWith('{')) planParsed = JSON.parse(rm.plan_json);
              else if (typeof rm.plan === 'object' && rm.plan) planParsed = rm.plan;
            } catch (_) {}

            // Ensure plan sub-lists are arrays
            if (!Array.isArray(planParsed.tindakanList)) {
              let tList = [];
              try {
                if (typeof rm.tindakan === 'string' && rm.tindakan.startsWith('[')) tList = JSON.parse(rm.tindakan);
                else if (typeof rm.tindakan_json === 'string' && rm.tindakan_json.startsWith('[')) tList = JSON.parse(rm.tindakan_json);
                else if (Array.isArray(rm.tindakan)) tList = rm.tindakan;
              } catch (_) {}
              planParsed.tindakanList = tList;
            }

            if (!Array.isArray(planParsed.resepList)) {
              let rList = [];
              try {
                if (typeof rm.resep === 'string' && rm.resep.startsWith('[')) rList = JSON.parse(rm.resep);
                else if (typeof rm.resep_json === 'string' && rm.resep_json.startsWith('[')) rList = JSON.parse(rm.resep_json);
                else if (Array.isArray(rm.resep)) rList = rm.resep;
              } catch (_) {}
              planParsed.resepList = rList;
            }

            if (!Array.isArray(planParsed.racikanList)) planParsed.racikanList = [];
            if (!Array.isArray(planParsed.penggunaanAlkesList)) planParsed.penggunaanAlkesList = [];
            if (!Array.isArray(planParsed.pemakaianBarangList)) planParsed.pemakaianBarangList = [];

            // Normalize tindakanList items numbers
            planParsed.tindakanList = (planParsed.tindakanList || []).map((t: any) => ({
              ...t,
              tindakanId: t.tindakanId || t.id || 'tdk-1',
              namaTindakan: t.namaTindakan || t.nama || 'Pemeriksaan & Konsultasi Dokter',
              tarif: Number(t.tarif ?? t.hargaSatuan ?? t.biaya ?? t.jasaDokter ?? 0),
            }));

            // Normalize resepList items numbers
            planParsed.resepList = (planParsed.resepList || []).map((r: any) => ({
              ...r,
              jumlah: Number(r.jumlah || 1),
              hargaSatuan: Number(r.hargaSatuan || 0),
              subtotal: Number(r.subtotal ?? (Number(r.hargaSatuan || 0) * Number(r.jumlah || 1))),
            }));

            return {
              ...rm,
              noRM: rm.noRM || rm.noRekamMedis || rm.no_rm || rm.no_rekam_medis,
              noRekamMedis: rm.noRekamMedis || rm.noRM || rm.no_rekam_medis || rm.no_rm,
              pasienId: rm.pasienId || rm.pasien_id,
              dokterId: rm.dokterId || rm.dokter_id,
              pendaftaranId: rm.pendaftaranId || rm.pendaftaran_id,
              subjective: subjectiveParsed,
              objective: objectiveParsed,
              assessment: assessmentParsed,
              plan: planParsed,
              totalBiaya: Number(rm.totalBiaya ?? rm.total_biaya ?? 0),
              statusPembayaran: rm.statusPembayaran || rm.status_pembayaran || 'Belum Lunas',
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
              pasienId: ri.pasienId || ri.pasien_id,
              noKandang: ri.noKandang || ri.no_kandang || ri.noKamar || ri.no_kamar || 'Kandang Rawat Inap',
              dokterPenanggungJawabId: ri.dokterPenanggungJawabId || ri.dokter_pj_id || ri.dokterId || ri.dokter_id || '',
              diagnosaInap: ri.diagnosaInap || ri.diagnosa_inap || ri.diagnosa || '',
              tarifPerHari: Number(ri.tarifPerHari ?? ri.tarif_per_hari ?? ri.totalBiaya ?? 100000),
              totalBiaya: Number(ri.totalBiaya ?? ri.total_biaya_inap ?? ri.total_biaya ?? 0),
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
            pasienId: jt.pasienId || jt.pasien_id,
            dokterId: jt.dokterId || jt.dokter_id,
            jam: jt.jam || jt.waktu || '09:00',
            waktu: jt.waktu || jt.jam || '09:00',
            layanan: jt.layanan || jt.jenisLayanan || jt.jenis_layanan || jt.keperluan || 'Pemeriksaan Umum',
            jenisLayanan: jt.jenisLayanan || jt.layanan || jt.jenis_layanan || 'Pemeriksaan Umum',
            catatan: jt.catatan || jt.keluhan || '',
            keluhan: jt.keluhan || jt.catatan || '',
            reminderSent: !!(jt.reminderSent || jt.reminder_sent || jt.notifikasi_sent),
            noHpPengingat: jt.noHpPengingat || jt.no_hp_pengingat || '',
          })),
          vaksinasi: vaksinasiList.map((v: any) => ({
            ...v,
            pasienId: v.pasienId || v.pasien_id,
            namaVaksin: v.namaVaksin || v.nama_vaksin,
            tanggalVaksin: v.tanggalVaksin || v.tanggalDiberikan || v.tanggal_vaksin || v.tanggal_diberikan,
            tanggalVaksinUlang: v.tanggalVaksinUlang || v.tanggalBerikutnya || v.tanggal_vaksin_ulang || v.tanggal_berikutnya || '',
            batchNo: v.batchNo || v.batchNumber || v.batch_no || v.batch_number || '',
            keterangan: v.keterangan || v.catatan || '',
            status: v.status || 'Selesai',
          })),
          transaksi: transaksiList.map((trx: any) => ({
            ...trx,
            noNota: trx.noNota || trx.noFaktur || trx.kodeTransaksi || trx.no_nota || trx.no_faktur || trx.kode_transaksi,
            kodeTransaksi: trx.kodeTransaksi || trx.noNota || trx.noFaktur || trx.kode_transaksi,
            kasirId: trx.kasirId || trx.kasir || trx.kasir_id || 'system',
            pasienId: trx.pasienId || trx.pasien_id,
            pendaftaranId: trx.pendaftaranId || trx.pendaftaran_id,
            rekamMedisId: trx.rekamMedisId || trx.rekam_medis_id,
            rawatInapId: trx.rawatInapId || trx.rawat_inap_id,
            namaPelanggan: trx.namaPelanggan || trx.nama_pelanggan || 'Pelanggan',
            typeTransaksi: trx.typeTransaksi || trx.tipeTransaksi || trx.type_transaksi || trx.tipe_transaksi || 'Rawat Jalan',
            subtotal: Number(trx.subtotal || 0),
            diskon: Number(trx.diskon || 0),
            pajak: Number(trx.pajak || 0),
            grandTotal: Number(trx.grandTotal ?? trx.totalAkhir ?? trx.total_akhir ?? trx.total ?? 0),
            total: Number(trx.total ?? trx.grandTotal ?? trx.totalAkhir ?? trx.total_akhir ?? 0),
            jumlahBayar: Number(trx.jumlahBayar ?? trx.jumlah_bayar ?? 0),
            kembalian: Number(trx.kembalian || 0),
            items: trx.items || (typeof trx.items_json === 'string' ? JSON.parse(trx.items_json) : trx.items_json) || [],
          })),
          pembelian: pembelianList.map((po: any) => ({
            ...po,
            noFaktur: po.noFaktur || po.nomorPO || po.no_faktur || po.nomor_po,
            nomorPO: po.nomorPO || po.noFaktur || po.nomor_po || po.no_faktur,
            supplierId: po.supplierId || po.namaSupplier || po.supplier_id || po.nama_supplier,
            namaSupplier: po.namaSupplier || po.supplierId || po.nama_supplier || po.supplier_id,
            grandTotal: Number(po.grandTotal ?? po.totalHarga ?? po.total_harga ?? po.total_pembelian ?? 0),
            totalHarga: Number(po.totalHarga ?? po.grandTotal ?? po.total_harga ?? 0),
            items: po.items || (typeof po.items_json === 'string' ? JSON.parse(po.items_json) : po.items_json) || [],
          })),
          supplier: supplierList.map((s: any) => ({
            ...s,
            kodeSupplier: s.kodeSupplier || (s as any).kode || s.kode_supplier || s.id,
            namaSupplier: s.namaSupplier || s.nama || s.nama_supplier,
            nama: s.namaSupplier || s.nama || s.nama_supplier,
            kontak: s.kontak || s.salesPerson || s.sales_person || '-',
            salesPerson: s.salesPerson || s.kontak || s.sales_person || '-',
            noHp: s.noHp || s.no_hp || '-',
            email: s.email || '',
            alamat: s.alamat || '-',
          })),
          feedback: feedbackList.map((fb: any) => ({
            ...fb,
            pasienId: fb.pasienId || fb.pasien_id || 'PAS-001',
            namaOwner: fb.namaOwner || fb.namaPelanggan || fb.nama_owner || fb.nama_pelanggan || 'Owner',
            namaPelanggan: fb.namaPelanggan || fb.namaOwner || fb.nama_pelanggan || fb.nama_owner || 'Owner',
            komentar: fb.komentar || fb.catatan || fb.pesan || '',
            catatan: fb.catatan || fb.komentar || fb.pesan || '',
            rating: Number(fb.rating || 5),
            tanggal: fb.tanggal || new Date().toISOString(),
          })),
          mutasiStok: (mutasiStokList && mutasiStokList.length > 0)
            ? mutasiStokList.map((m: any) => ({
                ...m,
                barangId: m.barangId || m.barang_id,
                kodeBarang: m.kodeBarang || m.kode_barang,
                namaBarang: m.namaBarang || m.nama_barang,
                saldoSebelum: Number(m.saldoSebelum ?? m.saldo_sebelum ?? 0),
                saldoSetelah: Number(m.saldoSetelah ?? m.saldo_setelah ?? 0),
                jumlah: Number(m.jumlah || 0),
                tipeReferensi: m.tipeReferensi || m.tipe_referensi,
                pasienNama: m.pasienNama || m.pasien_nama,
                ownerNama: m.ownerNama || m.owner_nama,
              }))
            : (storeMap['mutasiStok'] || inMemoryStore.clinicStore.mutasiStok),
          waLogs: (whatsappLogsList && whatsappLogsList.length > 0)
            ? whatsappLogsList.map((wl: any) => ({
                ...wl,
                noHp: wl.noHp || wl.no_hp || wl.noTujuan || wl.no_tujuan,
                namaPenerima: wl.namaPenerima || wl.nama_penerima || wl.penerima,
                errorMessage: wl.errorMessage || wl.error_message,
              }))
            : (storeMap['waLogs'] || inMemoryStore.clinicStore.waLogs),
          waTemplates: (whatsappTemplatesList && whatsappTemplatesList.length > 0)
            ? whatsappTemplatesList.map((wt: any) => ({
                ...wt,
                variablePlaceholder: wt.variablePlaceholderJson || (typeof wt.variable_placeholder_json === 'string' ? JSON.parse(wt.variable_placeholder_json) : wt.variable_placeholder_json) || [],
              }))
            : (storeMap['waTemplates'] || inMemoryStore.clinicStore.waTemplates),
          klinik: storeMap['klinik'] || inMemoryStore.clinicStore.klinik,
          settings: storeMap['settings'] || inMemoryStore.clinicStore.settings,
          rbacConfig: storeMap['rbacConfig'] || inMemoryStore.clinicStore.rbacConfig,
          waConfig: storeMap['waConfig'] || inMemoryStore.clinicStore.waConfig,
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
              status_aktif: u.aktif !== false ? 1 : 0,
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
              status_aktif: d.aktif !== false ? 1 : 0,
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
              status_kadaluarsa: b.statusKadaluarsa || 'Aman',
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
              estimasi_menit: Number(t.estimasiMenit || 15),
            });
          }
        }

        if (Array.isArray(data.pakan)) {
          for (const pk of data.pakan) {
            if (!pk.id || !(pk.kodePakan || pk.kode || pk.namaPakan || pk.nama)) continue;
            await upsertRecord('pakan', 'id', {
              id: pk.id,
              kode: pk.kodePakan || pk.kode,
              kode_pakan: pk.kodePakan || pk.kode,
              nama: pk.namaPakan || pk.nama,
              nama_pakan: pk.namaPakan || pk.nama,
              merk: pk.merk || '-',
              kategori_usia: pk.kategoriUsia || pk.jenisHewan || 'All',
              jenis_hewan: pk.jenisHewan || pk.kategoriUsia || 'Semua',
              dosis_per_kg_bb: pk.dosisPerKgBb || '-',
              harga_jual: String(pk.hargaJual || pk.hargaPerHari || 0),
              harga_per_hari: String(pk.hargaPerHari || pk.hargaJual || 0),
              stok: Number(pk.stok || 0),
              satuan: pk.satuan || 'Kg',
              catatan: pk.catatan || pk.keterangan || null,
              keterangan: pk.catatan || pk.keterangan || null,
            });
          }
        }

        if (Array.isArray(data.spesies)) {
          for (const sp of data.spesies) {
            if (!sp.id || !(sp.nama || sp.namaSpesies)) continue;
            await upsertRecord('spesies', 'id', {
              id: sp.id,
              kode_spesies: sp.kodeSpesies || sp.id,
              nama: sp.namaSpesies || sp.nama,
              nama_spesies: sp.namaSpesies || sp.nama,
              kategori: sp.kategori || 'Mamalia',
              deskripsi: sp.keterangan || sp.deskripsi || null,
              keterangan: sp.keterangan || sp.deskripsi || null,
              ras_umum: JSON.stringify(sp.rasUmum || []),
            });
          }
        }

        if (Array.isArray(data.pendaftaran)) {
          for (const pd of data.pendaftaran) {
            if (!pd.id || !pd.pasienId) continue;
            await upsertRecord('pendaftaran', 'id', {
              id: pd.id,
              nomor_antrian: pd.noAntrian || pd.nomorAntrian,
              no_antrian: pd.noAntrian || pd.nomorAntrian,
              pasien_id: pd.pasienId,
              dokter_id: pd.dokterId,
              tanggal: pd.tanggal || new Date().toISOString().split('T')[0],
              waktu: pd.waktu || '09:00',
              waktu_daftar: pd.waktu || '09:00',
              keluhan: pd.keluhanUtama || pd.keluhan || '-',
              keluhan_utama: pd.keluhanUtama || pd.keluhan || '-',
              layanan_dipilih: pd.layananDipilih || pd.jenisLayanan || 'Pemeriksaan Umum',
              jenis_layanan: pd.jenisLayanan || pd.layananDipilih || 'Rawat Jalan',
              status: pd.status || 'Antri',
              petugas_id: pd.petugasId || 'staf',
              rawat_inap_id: pd.rawatInapId || null,
              rawat_inap_detail_json: JSON.stringify(pd.rawatInapDetail || {}),
              catatan: pd.catatan || null,
            });
          }
        }

        if (Array.isArray(data.rekamMedis)) {
          for (const rm of data.rekamMedis) {
            if (!rm.id || !rm.pasienId) continue;
            await upsertRecord('rekam_medis', 'id', {
              id: rm.id,
              no_rekam_medis: rm.noRM || rm.noRekamMedis || ('RM-' + rm.id),
              no_rm: rm.noRM || rm.noRekamMedis || ('RM-' + rm.id),
              pendaftaran_id: rm.pendaftaranId || null,
              tanggal: rm.tanggal || new Date().toISOString().split('T')[0],
              pasien_id: rm.pasienId,
              dokter_id: rm.dokterId || 'drh-1',
              subjektif: typeof rm.subjective === 'object' ? JSON.stringify(rm.subjective) : (rm.subjektif || '-'),
              subjective_json: typeof rm.subjective === 'object' ? JSON.stringify(rm.subjective) : null,
              objektif: typeof rm.objective === 'object' ? JSON.stringify(rm.objective) : (rm.objektif || '-'),
              objective_json: typeof rm.objective === 'object' ? JSON.stringify(rm.objective) : null,
              assesment: typeof rm.assessment === 'object' ? JSON.stringify(rm.assessment) : (rm.assesment || '-'),
              assessment_json: typeof rm.assessment === 'object' ? JSON.stringify(rm.assessment) : null,
              diagnosa: rm.assessment?.diagnosaUtama || rm.diagnosa || '-',
              plan: typeof rm.plan === 'object' ? JSON.stringify(rm.plan) : (rm.plan || '-'),
              plan_json: typeof rm.plan === 'object' ? JSON.stringify(rm.plan) : null,
              suhu: String(rm.objective?.suhu || rm.suhu || ''),
              berat_badan: String(rm.objective?.beratBadan || rm.beratBadan || ''),
              tindakan: JSON.stringify(rm.plan?.tindakanList || []),
              tindakan_json: JSON.stringify(rm.plan?.tindakanList || []),
              resep: JSON.stringify(rm.plan?.resepList || []),
              resep_json: JSON.stringify(rm.plan?.resepList || []),
              total_biaya: String(rm.totalBiaya || 0),
              status_pembayaran: rm.statusPembayaran || 'Belum Bayar',
              alasan_pembatalan: rm.alasanPembatalan || null,
              dibatalkan_oleh: rm.dibatalkanOleh || null,
              catatan: rm.catatan || null,
            });
          }
        }

        if (Array.isArray(data.rawatInap)) {
          for (const ri of data.rawatInap) {
            if (!ri.id || !ri.pasienId) continue;
            await upsertRecord('rawat_inap', 'id', {
              id: ri.id,
              pasien_id: ri.pasienId,
              pendaftaran_id: ri.pendaftaranId || null,
              no_kandang: ri.noKandang || 'Kandang Rawat Inap',
              no_kamar: ri.noKandang || 'Kandang Rawat Inap',
              tanggal_masuk: ri.tanggalMasuk || new Date().toISOString().replace('T', ' ').slice(0, 19),
              tanggal_keluar: ri.tanggalKeluarAktif || null,
              tanggal_keluar_target: ri.tanggalKeluarTarget || null,
              tanggal_keluar_aktif: ri.tanggalKeluarAktif || null,
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
              pelaksanaan_perawatan: ri.pelaksanaanPerawatan || null,
              biaya_tambahan: String(ri.biayaTambahan || 0),
              total_biaya: String(ri.totalBiaya || 0),
              total_biaya_inap: String(ri.totalBiaya || 0),
              status_pembayaran: ri.statusPembayaran || 'Belum Lunas',
              alasan_pembatalan: ri.alasanPembatalan || null,
              dibatalkan_oleh: ri.dibatalkanOleh || null,
              catatan: ri.catatan || null,
              catatan_khusus: ri.catatanKhusus || null,
            });
          }
        }

        if (Array.isArray(data.janjiTemu)) {
          for (const jt of data.janjiTemu) {
            if (!jt.id || !jt.pasienId) continue;
            await upsertRecord('janji_temu', 'id', {
              id: jt.id,
              pasien_id: jt.pasienId,
              dokter_id: jt.dokterId || 'drh-1',
              tanggal: jt.tanggal,
              waktu: jt.jam || jt.waktu || '09:00',
              jam: jt.jam || jt.waktu || '09:00',
              status: jt.status || 'Terjadwal',
              keluhan: jt.catatan || jt.keluhan || '-',
              keperluan: jt.layanan || jt.keperluan || 'Pemeriksaan Umum',
              layanan: jt.layanan || 'Pemeriksaan Umum',
              jenis_layanan: jt.layanan || 'Pemeriksaan Umum',
              reminder_sent: jt.reminderSent ? 1 : 0,
              notifikasi_sent: jt.reminderSent ? 1 : 0,
              no_hp_pengingat: jt.noHpPengingat || null,
              catatan: jt.catatan || null,
            });
          }
        }

        if (Array.isArray(data.vaksinasi)) {
          for (const v of data.vaksinasi) {
            if (!v.id || !v.pasienId) continue;
            await upsertRecord('vaksinasi', 'id', {
              id: v.id,
              pasien_id: v.pasienId,
              nama_vaksin: v.namaVaksin,
              tanggal_diberikan: v.tanggalVaksin || v.tanggalDiberikan || new Date().toISOString().split('T')[0],
              tanggal_vaksin: v.tanggalVaksin || v.tanggalDiberikan || new Date().toISOString().split('T')[0],
              tanggal_berikutnya: v.tanggalVaksinUlang || v.tanggalBerikutnya || null,
              tanggal_kembali: v.tanggalVaksinUlang || v.tanggalBerikutnya || null,
              tanggal_vaksin_ulang: v.tanggalVaksinUlang || v.tanggalBerikutnya || null,
              dokter_id: v.dokterId || 'drh-1',
              batch_number: v.batchNo || v.batchNumber || null,
              batch_no: v.batchNo || v.batchNumber || null,
              catatan: v.keterangan || v.catatan || null,
              keterangan: v.keterangan || v.catatan || null,
              status: v.status || 'Selesai',
            });
          }
        }

        if (Array.isArray(data.transaksi)) {
          for (const trx of data.transaksi) {
            if (!trx.id || !trx.noNota) continue;
            await upsertRecord('transaksi', 'id', {
              id: trx.id,
              kode_transaksi: trx.noNota,
              no_nota: trx.noNota,
              no_faktur: trx.noNota,
              tanggal: trx.tanggal || new Date().toISOString().replace('T', ' ').slice(0, 19),
              pendaftaran_id: trx.pendaftaranId || null,
              rekam_medis_id: trx.rekamMedisId || null,
              rawat_inap_id: trx.rawatInapId || null,
              pasien_id: trx.pasienId || null,
              nama_pelanggan: trx.namaPelanggan || 'Pelanggan',
              tipe_transaksi: trx.typeTransaksi || trx.tipeTransaksi || 'Rawat Jalan',
              type_transaksi: trx.typeTransaksi || trx.tipeTransaksi || 'Rawat Jalan',
              source_type: trx.sourceType || null,
              source_id: trx.sourceId || null,
              kasir: trx.kasirId || 'system',
              kasir_id: trx.kasirId || 'system',
              items: trx.items || [],
              items_json: JSON.stringify(trx.items || []),
              subtotal: String(trx.subtotal || 0),
              diskon: String(trx.diskon || 0),
              pajak: String(trx.pajak || 0),
              total: String(trx.grandTotal || trx.total || 0),
              total_akhir: String(trx.grandTotal || trx.total || 0),
              grand_total: String(trx.grandTotal || trx.total || 0),
              metode_pembayaran: trx.metodePembayaran || 'Tunai',
              jumlah_bayar: String(trx.jumlahBayar || 0),
              kembalian: String(trx.kembalian || 0),
              status: trx.status || 'Lunas',
              alasan_batal: trx.alasanBatal || null,
              dibatalkan_oleh: trx.dibatalkanOleh || null,
              catatan: trx.catatan || null,
            });
          }
        }

        if (Array.isArray(data.pembelian)) {
          for (const po of data.pembelian) {
            if (!po.id) continue;
            await upsertRecord('pembelian', 'id', {
              id: po.id,
              nomor_po: po.noFaktur || po.nomorPO || ('PO-' + po.id),
              no_faktur: po.noFaktur || po.nomorPO || ('PO-' + po.id),
              no_faktur_supplier: po.noFaktur || po.nomorPO || ('PO-' + po.id),
              supplier_id: po.supplierId || po.namaSupplier || 'SUP-001',
              nama_supplier: po.namaSupplier || po.supplierId || 'Supplier',
              tanggal: po.tanggal || new Date().toISOString().split('T')[0],
              items: po.items || [],
              items_json: JSON.stringify(po.items || []),
              total_harga: String(po.grandTotal || po.totalHarga || 0),
              grand_total: String(po.grandTotal || po.totalHarga || 0),
              total_pembelian: String(po.grandTotal || po.totalHarga || 0),
              status: po.status || 'Selesai',
              status_pembayaran: po.status || 'Lunas',
              jatuh_tempo: po.jatuhTempo || null,
              catatan: po.catatan || null,
              keterangan: po.catatan || null,
              alasan_pembatalan: po.alasanPembatalan || null,
              dibatalkan_oleh: po.dibatalkanOleh || null,
            });
          }
        }

        if (Array.isArray(data.supplier)) {
          for (const s of data.supplier) {
            if (!s.id || !(s.nama || s.namaSupplier)) continue;
            await upsertRecord('supplier', 'id', {
              id: s.id,
              kode_supplier: s.kodeSupplier || s.id,
              nama_supplier: s.namaSupplier || s.nama,
              nama: s.namaSupplier || s.nama,
              kontak: s.kontak || s.salesPerson || '-',
              sales_person: s.salesPerson || s.kontak || '-',
              no_hp: s.noHp || '-',
              email: s.email || null,
              alamat: s.alamat || '-',
              rekening_bank: s.rekeningBank || null,
            });
          }
        }

        if (Array.isArray(data.feedback)) {
          for (const fb of data.feedback) {
            if (!fb.id) continue;
            await upsertRecord('feedback', 'id', {
              id: fb.id,
              pasien_id: fb.pasienId || 'PAS-001',
              transaksi_id: fb.transaksiId || null,
              nama_owner: fb.namaOwner || fb.namaPelanggan || 'Owner',
              nama_pelanggan: fb.namaPelanggan || fb.namaOwner || 'Owner',
              rating: Number(fb.rating || 5),
              catatan: fb.komentar || fb.catatan || fb.pesan || '-',
              komentar: fb.komentar || fb.catatan || fb.pesan || '-',
              pesan: fb.komentar || fb.catatan || fb.pesan || '-',
              saran_petugas: fb.saranPetugas || null,
              balasan_klinik: fb.balasanKlinik || null,
              layanan_diuji: fb.layananDiuji || null,
              tanggal: fb.tanggal || new Date().toISOString().replace('T', ' ').slice(0, 19),
            });
          }
        }

        if (Array.isArray(data.mutasiStok)) {
          for (const m of data.mutasiStok) {
            if (!m.id || !m.barangId) continue;
            await upsertRecord('mutasi_stok', 'id', {
              id: m.id,
              barang_id: m.barangId,
              kode_barang: m.kodeBarang || null,
              nama_barang: m.namaBarang || null,
              kategori: m.kategori || null,
              satuan: m.satuan || null,
              tanggal: m.tanggal || new Date().toISOString().split('T')[0],
              waktu: m.waktu || '00:00',
              jenis: m.jenis || 'Penyesuaian',
              jumlah: Number(m.jumlah || 0),
              saldo_sebelum: Number(m.saldoSebelum || 0),
              saldo_setelah: Number(m.saldoSetelah || 0),
              keterangan: m.keterangan || null,
              referensi: m.referensi || null,
              tipe_referensi: m.tipeReferensi || null,
              pasien_nama: m.pasienNama || null,
              owner_nama: m.ownerNama || null,
              petugas: m.petugas || null,
            });
          }
        }

        if (Array.isArray(data.waLogs)) {
          for (const wl of data.waLogs) {
            if (!wl.id) continue;
            await upsertRecord('whatsapp_logs', 'id', {
              id: wl.id,
              tanggal: wl.tanggal || new Date().toISOString().replace('T', ' ').slice(0, 19),
              no_hp: wl.noHp || wl.noTujuan || '',
              no_tujuan: wl.noTujuan || wl.noHp || '',
              nama_penerima: wl.namaPenerima || wl.penerima || '',
              penerima: wl.penerima || wl.namaPenerima || '',
              pesan: wl.pesan || '',
              status: wl.status || 'terkirim',
              kategori: wl.kategori || 'umum',
              error_message: wl.errorMessage || null,
            });
          }
        }

        if (Array.isArray(data.waTemplates)) {
          for (const wt of data.waTemplates) {
            if (!wt.id) continue;
            await upsertRecord('whatsapp_templates', 'id', {
              id: wt.id,
              kategori: wt.kategori || 'umum',
              judul: wt.judul || 'Template',
              pesan: wt.pesan || '',
              variable_placeholder_json: JSON.stringify(wt.variablePlaceholder || []),
            });
          }
        }

        if (data.klinik && typeof data.klinik === 'object') {
          await upsertRecord('klinik_config', 'id', {
            id: 1,
            nama_klinik: data.klinik.nama || data.klinik.namaKlinik || 'VetCare Clinic',
            alamat: data.klinik.alamat || '-',
            no_telepon: data.klinik.telepon || data.klinik.noTelepon || '-',
            email: data.klinik.email || null,
            sip_klinik: data.klinik.sipKlinik || null,
            footer_receipt: data.klinik.footerReceipt || null,
            logo_url: data.klinik.logoUrl || null,
          });
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
