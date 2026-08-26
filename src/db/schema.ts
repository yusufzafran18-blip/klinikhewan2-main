import { mysqlTable, text, timestamp, boolean, int, json, decimal } from 'drizzle-orm/mysql-core';

// 1. Users Table
export const users = mysqlTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull().default('admin123'),
  nama: text('nama').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('staf'),
  noHp: text('no_hp'),
  aktif: boolean('aktif').notNull().default(true),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Dokter Table
export const dokter = mysqlTable('dokter', {
  id: text('id').primaryKey(),
  sip: text('sip').notNull().unique(),
  nama: text('nama').notNull(),
  spesialisasi: text('spesialisasi').notNull(),
  noHp: text('no_hp').notNull(),
  email: text('email'),
  jadwal: text('jadwal'),
  aktif: boolean('aktif').notNull().default(true),
  fotoUrl: text('foto_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Pasien Table
export const pasien = mysqlTable('pasien', {
  id: text('id').primaryKey(),
  kodePasien: text('kode_pasien').notNull().unique(),
  namaHewan: text('nama_hewan').notNull(),
  jenisHewan: text('jenis_hewan').notNull(),
  ras: text('ras'),
  jenisKelamin: text('jenis_kelamin').notNull(),
  tanggalLahir: text('tanggal_lahir').notNull(),
  umurFormat: text('umur_format'),
  warna: text('warna'),
  noMicrochip: text('no_microchip'),
  namaOwner: text('nama_owner').notNull(),
  noHpOwner: text('no_hp_owner').notNull(),
  alamatOwner: text('alamat_owner').notNull(),
  emailOwner: text('email_owner'),
  fotoUrl: text('foto_url'),
  catatanKhusus: text('catatan_khusus'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Barang Table
export const barang = mysqlTable('barang', {
  id: text('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  kategori: text('kategori').notNull().default('Obat'),
  satuan: text('satuan').notNull().default('Pcs'),
  hargaBeli: decimal('harga_beli', { precision: 12, scale: 2 }).notNull().default('0'),
  hargaJual: decimal('harga_jual', { precision: 12, scale: 2 }).notNull().default('0'),
  stok: int('stok').notNull().default(0),
  stokMinimum: int('stok_minimum').notNull().default(5),
  tanggalKadaluarsa: text('tanggal_kadaluarsa'),
  statusKadaluarsa: text('status_kadaluarsa').default('Aman'),
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Tindakan Table
export const tindakan = mysqlTable('tindakan', {
  id: text('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  kategori: text('kategori').notNull(),
  tarif: decimal('tarif', { precision: 12, scale: 2 }).notNull().default('0'),
  komisiDokter: decimal('komisi_dokter', { precision: 12, scale: 2 }).default('0'),
  jasaDokter: decimal('jasa_dokter', { precision: 12, scale: 2 }).default('0'),
  deskripsi: text('deskripsi'),
  estimasiMenit: int('estimasi_menit').default(15),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Pakan Table
export const pakan = mysqlTable('pakan', {
  id: text('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  jenisHewan: text('jenis_hewan').notNull(),
  hargaPerHari: decimal('harga_per_hari', { precision: 12, scale: 2 }).notNull().default('0'),
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Spesies Table
export const spesies = mysqlTable('spesies', {
  id: text('id').primaryKey(),
  kodeSpesies: text('kode_spesies'),
  nama: text('nama').notNull(),
  kategori: text('kategori').notNull(),
  deskripsi: text('deskripsi'),
  rasUmum: json('ras_umum'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Pendaftaran Table
export const pendaftaran = mysqlTable('pendaftaran', {
  id: text('id').primaryKey(),
  nomorAntrian: text('nomor_antrian').notNull(),
  pasienId: text('pasien_id').notNull(),
  dokterId: text('dokter_id').notNull(),
  tanggal: text('tanggal').notNull(),
  keluhan: text('keluhan').notNull(),
  status: text('status').notNull().default('Menunggu'),
  jenisLayanan: text('jenis_layanan').default('Pemeriksaan Umum'),
  catatan: text('catatan'),
  waktuDaftar: text('waktu_daftar'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Rekam Medis Table
export const rekamMedis = mysqlTable('rekam_medis', {
  id: text('id').primaryKey(),
  noRekamMedis: text('no_rekam_medis').notNull().unique(),
  tanggal: text('tanggal').notNull(),
  pasienId: text('pasien_id').notNull(),
  dokterId: text('dokter_id').notNull(),
  subjektif: text('subjektif').default('-'),
  objektif: text('objektif').default('-'),
  assesment: text('assesment').default('-'),
  diagnosa: text('diagnosa').default('-'),
  plan: text('plan').default('-'),
  suhu: text('suhu'),
  beratBadan: text('berat_badan'),
  resep: json('resep'),
  tindakan: json('tindakan'),
  totalBiaya: decimal('total_biaya', { precision: 12, scale: 2 }).notNull().default('0'),
  statusPembayaran: text('status_pembayaran').notNull().default('Belum Bayar'),
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Rawat Inap Table
export const rawatInap = mysqlTable('rawat_inap', {
  id: text('id').primaryKey(),
  noKamar: text('no_kamar').notNull(),
  pasienId: text('pasien_id').notNull(),
  dokterId: text('dokter_id').notNull(),
  tanggalMasuk: text('tanggal_masuk').notNull(),
  tanggalKeluar: text('tanggal_keluar'),
  status: text('status').notNull().default('Dalam Perawatan'),
  diagnosa: text('diagnosa').default('-'),
  pakanId: text('pakan_id'),
  catatan: text('catatan'),
  dailyNotes: json('daily_notes'),
  monitoringLogs: json('monitoring_logs'),
  totalBiaya: decimal('total_biaya', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Janji Temu Table
export const janjiTemu = mysqlTable('janji_temu', {
  id: text('id').primaryKey(),
  pasienId: text('pasien_id').notNull(),
  dokterId: text('dokter_id').notNull(),
  tanggal: text('tanggal').notNull(),
  waktu: text('waktu').default('09:00'),
  status: text('status').notNull().default('Terjadwal'),
  keluhan: text('keluhan').default('-'),
  jenisLayanan: text('jenis_layanan').default('Kontrol Ulang'),
  reminderSent: boolean('reminder_sent').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12. Vaksinasi Table
export const vaksinasi = mysqlTable('vaksinasi', {
  id: text('id').primaryKey(),
  pasienId: text('pasien_id').notNull(),
  namaVaksin: text('nama_vaksin').notNull(),
  tanggalDiberikan: text('tanggal_diberikan').default(''),
  tanggalBerikutnya: text('tanggal_berikutnya'),
  dokterId: text('dokter_id'),
  batchNumber: text('batch_number'),
  catatan: text('catatan'),
  status: text('status').notNull().default('Selesai'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13. Transaksi Table
export const transaksi = mysqlTable('transaksi', {
  id: text('id').primaryKey(),
  kodeTransaksi: text('kode_transaksi').notNull().unique(),
  tanggal: text('tanggal').notNull(),
  pasienId: text('pasien_id'),
  items: json('items').notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  diskon: decimal('diskon', { precision: 12, scale: 2 }).notNull().default('0'),
  pajak: decimal('pajak', { precision: 12, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull().default('0'),
  metodePembayaran: text('metode_pembayaran').notNull().default('Tunai'),
  status: text('status').notNull().default('Lunas'),
  kasir: text('kasir').notNull(),
  catatan: text('catatan'),
  sourceType: text('source_type'),
  sourceId: text('source_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 14. Pembelian Table
export const pembelian = mysqlTable('pembelian', {
  id: text('id').primaryKey(),
  nomorPO: text('nomor_po').notNull().unique(),
  supplierId: text('supplier_id').notNull(),
  tanggal: text('tanggal').notNull(),
  items: json('items').notNull(),
  totalHarga: decimal('total_harga', { precision: 12, scale: 2 }).notNull().default('0'),
  status: text('status').notNull().default('Selesai'),
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 15. Supplier Table
export const supplier = mysqlTable('supplier', {
  id: text('id').primaryKey(),
  kodeSupplier: text('kode_supplier'),
  namaSupplier: text('nama_supplier'),
  nama: text('nama').notNull(),
  kontak: text('kontak').notNull(),
  noHp: text('no_hp').notNull(),
  email: text('email'),
  alamat: text('alamat').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 16. Feedback Table
export const feedback = mysqlTable('feedback', {
  id: text('id').primaryKey(),
  pasienId: text('pasien_id').notNull(),
  transaksiId: text('transaksi_id'),
  rating: int('rating').notNull().default(5),
  catatan: text('catatan'),
  tanggal: text('tanggal').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 17. Mutasi Stok Table
export const mutasiStok = mysqlTable('mutasi_stok', {
  id: text('id').primaryKey(),
  barangId: text('barang_id').notNull(),
  kodeBarang: text('kode_barang'),
  namaBarang: text('nama_barang'),
  kategori: text('kategori'),
  satuan: text('satuan'),
  tanggal: text('tanggal').notNull(),
  waktu: text('waktu'),
  jenis: text('jenis').notNull(),
  jumlah: int('jumlah').notNull().default(0),
  saldoSebelum: int('saldo_sebelum').default(0),
  saldoSetelah: int('saldo_setelah').notNull().default(0),
  keterangan: text('keterangan'),
  referensi: text('referensi'),
  tipeReferensi: text('tipe_referensi'),
  pasienNama: text('pasien_nama'),
  ownerNama: text('owner_nama'),
  petugas: text('petugas'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 18. WhatsApp Logs Table
export const whatsappLogs = mysqlTable('whatsapp_logs', {
  id: text('id').primaryKey(),
  tanggal: text('tanggal').notNull(),
  noHp: text('no_hp').notNull(),
  namaPenerima: text('nama_penerima').notNull(),
  pesan: text('pesan').notNull(),
  status: text('status').notNull().default('terkirim'),
  kategori: text('kategori').notNull().default('umum'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 19. WhatsApp Templates Table
export const whatsappTemplates = mysqlTable('whatsapp_templates', {
  id: text('id').primaryKey(),
  kategori: text('kategori').notNull(),
  judul: text('judul').notNull(),
  pesan: text('pesan').notNull(),
  variablePlaceholderJson: json('variable_placeholder_json'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 20. Klinik Config Table
export const klinikConfig = mysqlTable('klinik_config', {
  id: int('id').primaryKey().default(1),
  namaKlinik: text('nama_klinik').notNull(),
  alamat: text('alamat').notNull(),
  noTelepon: text('no_telepon').notNull(),
  email: text('email'),
  sipKlinik: text('sip_klinik'),
  footerReceipt: text('footer_receipt'),
  logoUrl: text('logo_url'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// 21. App Config & Settings Tables
export const clinicStore = mysqlTable('clinic_store', {
  key: text('key').primaryKey(),
  value: json('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const clinicSettings = mysqlTable('clinic_settings', {
  id: int('id').primaryKey().default(1),
  clinicProfileJson: json('clinic_profile_json').notNull(),
  appSettingsJson: json('app_settings_json').notNull(),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const clinicBackups = mysqlTable('clinic_backups', {
  id: text('id').primaryKey(),
  backupVersion: text('backup_version').notNull(),
  backupJson: json('backup_json').notNull(),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
});
