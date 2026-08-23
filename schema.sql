-- ============================================================================
-- SKEMA DATABASE MYSQL - VETCARE PRO (KLINIK HEWAN)
-- ============================================================================
-- Script ini berisi struktur tabel MySQL lengkap untuk aplikasi VetCare Pro.
-- Anda dapat mengimpor file ini langsung ke MySQL / MariaDB (e.g. phpMyAdmin, MySQL Workbench, DBeaver, GCP Cloud SQL MySQL).
-- Database Default: `klinik_hewan`
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `klinik_hewan` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `klinik_hewan`;

-- 1. TABEL USERS (Pengguna System & Authentication)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL DEFAULT 'admin123',
  `nama` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `role` ENUM('super_admin', 'admin', 'staf', 'dokter') NOT NULL DEFAULT 'staf',
  `no_hp` VARCHAR(20) DEFAULT NULL,
  `aktif` TINYINT(1) NOT NULL DEFAULT 1,
  `avatar_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL DOKTER (Data Dokter Hewan)
CREATE TABLE IF NOT EXISTS `dokter` (
  `id` VARCHAR(50) NOT NULL,
  `sip` VARCHAR(50) NOT NULL UNIQUE,
  `nama` VARCHAR(100) NOT NULL,
  `spesialisasi` VARCHAR(100) NOT NULL,
  `no_hp` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `jadwal` TEXT DEFAULT NULL,
  `aktif` TINYINT(1) NOT NULL DEFAULT 1,
  `foto_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL SPESIES (Master Spesies Hewan)
CREATE TABLE IF NOT EXISTS `spesies` (
  `id` VARCHAR(50) NOT NULL,
  `kode_spesies` VARCHAR(30) DEFAULT NULL,
  `nama_spesies` VARCHAR(100) NOT NULL,
  `keterangan` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL PASIEN (Pasien Hewan & Pemilik)
CREATE TABLE IF NOT EXISTS `pasien` (
  `id` VARCHAR(50) NOT NULL,
  `kode_pasien` VARCHAR(50) NOT NULL UNIQUE,
  `nama_hewan` VARCHAR(100) NOT NULL,
  `jenis_hewan` VARCHAR(50) NOT NULL,
  `ras` VARCHAR(50) DEFAULT NULL,
  `jenis_kelamin` ENUM('Jantan', 'Betina', 'Jantan Kastrasi', 'Betina Steril') NOT NULL,
  `tanggal_lahir` DATE NOT NULL,
  `umur_format` VARCHAR(50) DEFAULT NULL,
  `warna` VARCHAR(50) DEFAULT NULL,
  `no_microchip` VARCHAR(50) DEFAULT NULL,
  `nama_owner` VARCHAR(100) NOT NULL,
  `no_hp_owner` VARCHAR(20) NOT NULL,
  `alamat_owner` TEXT NOT NULL,
  `email_owner` VARCHAR(100) DEFAULT NULL,
  `foto_url` TEXT DEFAULT NULL,
  `catatan_khusus` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_kode_pasien` (`kode_pasien`),
  INDEX `idx_nama_owner` (`nama_owner`),
  INDEX `idx_no_hp_owner` (`no_hp_owner`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL BARANG (Master Obat, Alkes, Pakan, Aksesoris)
CREATE TABLE IF NOT EXISTS `barang` (
  `id` VARCHAR(50) NOT NULL,
  `kode_barang` VARCHAR(50) NOT NULL UNIQUE,
  `nama_barang` VARCHAR(150) NOT NULL,
  `kategori` ENUM('Obat', 'Alkes', 'Pakan', 'Aksesoris', 'Lainnya') NOT NULL DEFAULT 'Obat',
  `satuan` VARCHAR(30) NOT NULL,
  `harga_beli` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `harga_jual` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stok_current` INT NOT NULL DEFAULT 0,
  `stok_minimum` INT NOT NULL DEFAULT 5,
  `expired_date` DATE DEFAULT NULL,
  `lokasi_rak` VARCHAR(50) DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_kode_barang` (`kode_barang`),
  INDEX `idx_kategori` (`kategori`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL TINDAKAN (Master Tarif & Tindakan Medis)
CREATE TABLE IF NOT EXISTS `tindakan` (
  `id` VARCHAR(50) NOT NULL,
  `kode_tindakan` VARCHAR(50) NOT NULL UNIQUE,
  `nama_tindakan` VARCHAR(150) NOT NULL,
  `kategori` VARCHAR(50) NOT NULL,
  `tarif` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `komisi_dokter` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `jasa_dokter` DECIMAL(12,2) DEFAULT 0.00,
  `keterangan` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABEL PAKAN (Master Pakan Hewan)
CREATE TABLE IF NOT EXISTS `pakan` (
  `id` VARCHAR(50) NOT NULL,
  `kode_pakan` VARCHAR(50) NOT NULL UNIQUE,
  `nama_pakan` VARCHAR(150) NOT NULL,
  `merk` VARCHAR(100) NOT NULL,
  `kategori_usia` VARCHAR(50) NOT NULL,
  `dosis_per_kg_bb` VARCHAR(100) DEFAULT NULL,
  `harga_jual` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stok` INT NOT NULL DEFAULT 0,
  `satuan` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABEL PENDAFTARAN (Antrian Klinik)
CREATE TABLE IF NOT EXISTS `pendaftaran` (
  `id` VARCHAR(50) NOT NULL,
  `no_antrian` VARCHAR(20) NOT NULL,
  `pasien_id` VARCHAR(50) NOT NULL,
  `dokter_id` VARCHAR(50) NOT NULL,
  `tanggal` DATE NOT NULL,
  `waktu` TIME NOT NULL,
  `keluhan_utama` TEXT NOT NULL,
  `layanan_dipilih` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('Antri', 'Diperiksa', 'Selesai', 'Batal') NOT NULL DEFAULT 'Antri',
  `petugas_id` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`pasien_id`) REFERENCES `pasien`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dokter_id`) REFERENCES `dokter`(`id`) ON DELETE RESTRICT,
  INDEX `idx_tanggal` (`tanggal`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABEL REKAM_MEDIS (SOAP Medical Records)
CREATE TABLE IF NOT EXISTS `rekam_medis` (
  `id` VARCHAR(50) NOT NULL,
  `pasien_id` VARCHAR(50) NOT NULL,
  `dokter_id` VARCHAR(50) NOT NULL,
  `pendaftaran_id` VARCHAR(50) DEFAULT NULL,
  `tanggal` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `subjective_json` JSON NOT NULL,
  `objective_json` JSON NOT NULL,
  `assessment_json` JSON NOT NULL,
  `plan_json` JSON NOT NULL,
  `total_biaya` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status_pembayaran` ENUM('Belum Lunas', 'Lunas') NOT NULL DEFAULT 'Belum Lunas',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`pasien_id`) REFERENCES `pasien`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dokter_id`) REFERENCES `dokter`(`id`) ON DELETE RESTRICT,
  INDEX `idx_pasien` (`pasien_id`),
  INDEX `idx_tanggal_rm` (`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABEL RAWAT_INAP (Inpatient Monitoring)
CREATE TABLE IF NOT EXISTS `rawat_inap` (
  `id` VARCHAR(50) NOT NULL,
  `pasien_id` VARCHAR(50) NOT NULL,
  `no_kandang` VARCHAR(50) NOT NULL,
  `tanggal_masuk` DATETIME NOT NULL,
  `tanggal_keluar` DATETIME DEFAULT NULL,
  `dokter_pj_id` VARCHAR(50) NOT NULL,
  `diagnosa_inap` TEXT NOT NULL,
  `tarif_per_hari` DECIMAL(12,2) NOT NULL DEFAULT 100000.00,
  `status` ENUM('Aktif', 'Selesai', 'Batal') NOT NULL DEFAULT 'Aktif',
  `monitoring_logs_json` JSON DEFAULT NULL,
  `pemberian_pakan_json` JSON DEFAULT NULL,
  `total_biaya_inap` DECIMAL(12,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`pasien_id`) REFERENCES `pasien`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dokter_pj_id`) REFERENCES `dokter`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABEL JANJI_TEMU (Appointments)
CREATE TABLE IF NOT EXISTS `janji_temu` (
  `id` VARCHAR(50) NOT NULL,
  `pasien_id` VARCHAR(50) NOT NULL,
  `dokter_id` VARCHAR(50) NOT NULL,
  `tanggal` DATE NOT NULL,
  `jam` TIME NOT NULL,
  `keperluan` TEXT NOT NULL,
  `status` ENUM('Terjadwal', 'Selesai', 'Batal', 'Dikonfirmasi') NOT NULL DEFAULT 'Terjadwal',
  `notifikasi_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `catatan` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`pasien_id`) REFERENCES `pasien`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dokter_id`) REFERENCES `dokter`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABEL TRANSAKSI (Penjualan / Kasir Transactions)
CREATE TABLE IF NOT EXISTS `transaksi` (
  `id` VARCHAR(50) NOT NULL,
  `no_faktur` VARCHAR(50) NOT NULL UNIQUE,
  `tanggal` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tipe_transaksi` ENUM('Rawat Jalan', 'Direct Sales', 'Rawat Inap', 'Campuran') NOT NULL,
  `pasien_id` VARCHAR(50) DEFAULT NULL,
  `nama_pelanggan` VARCHAR(100) DEFAULT NULL,
  `kasir_id` VARCHAR(50) NOT NULL,
  `items_json` JSON NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `diskon` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `pajak` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_akhir` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `metode_pembayaran` ENUM('Tunai', 'QRIS', 'Debit', 'Kredit', 'Transfer') NOT NULL DEFAULT 'Tunai',
  `jumlah_bayar` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `kembalian` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Lunas', 'Pending', 'Batal') NOT NULL DEFAULT 'Lunas',
  PRIMARY KEY (`id`),
  INDEX `idx_no_faktur` (`no_faktur`),
  INDEX `idx_tanggal_trx` (`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. TABEL SUPPLIER
CREATE TABLE IF NOT EXISTS `supplier` (
  `id` VARCHAR(50) NOT NULL,
  `kode_supplier` VARCHAR(50) NOT NULL UNIQUE,
  `nama_supplier` VARCHAR(100) NOT NULL,
  `sales_person` VARCHAR(100) DEFAULT NULL,
  `no_hp` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `alamat` TEXT DEFAULT NULL,
  `rekening_bank` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. TABEL PEMBELIAN_SUPPLIER
CREATE TABLE IF NOT EXISTS `pembelian_supplier` (
  `id` VARCHAR(50) NOT NULL,
  `no_faktur_supplier` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `tanggal` DATE NOT NULL,
  `items_json` JSON NOT NULL,
  `total_pembelian` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status_pembayaran` ENUM('Lunas', 'Kredit / Hutang', 'Sebagian') NOT NULL DEFAULT 'Lunas',
  `jatuh_tempo` DATE DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. TABEL VAKSINASI (Riwayat Vaksin)
CREATE TABLE IF NOT EXISTS `vaksinasi` (
  `id` VARCHAR(50) NOT NULL,
  `pasien_id` VARCHAR(50) NOT NULL,
  `nama_vaksin` VARCHAR(100) NOT NULL,
  `tanggal_vaksin` DATE NOT NULL,
  `tanggal_kembali` DATE DEFAULT NULL,
  `dokter_id` VARCHAR(50) NOT NULL,
  `no_batch` VARCHAR(50) DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`pasien_id`) REFERENCES `pasien`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. TABEL FEEDBACK_PELANGGAN
CREATE TABLE IF NOT EXISTS `feedback_pelanggan` (
  `id` VARCHAR(50) NOT NULL,
  `tanggal` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `nama_pelanggan` VARCHAR(100) NOT NULL,
  `no_hp` VARCHAR(20) DEFAULT NULL,
  `rating` INT NOT NULL DEFAULT 5,
  `layanan_diuji` VARCHAR(100) DEFAULT NULL,
  `pesan` TEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. TABEL WHATSAPP_LOGS
CREATE TABLE IF NOT EXISTS `whatsapp_logs` (
  `id` VARCHAR(50) NOT NULL,
  `tanggal` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `no_tujuan` VARCHAR(20) NOT NULL,
  `penerima` VARCHAR(100) NOT NULL,
  `pesan` TEXT NOT NULL,
  `kategori` VARCHAR(50) NOT NULL,
  `status` ENUM('Terkirim', 'Gagal', 'Pending') NOT NULL DEFAULT 'Terkirim',
  `error_details` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. TABEL KLINIK_CONFIG (Metadata Klinik)
CREATE TABLE IF NOT EXISTS `klinik_config` (
  `id` INT NOT NULL DEFAULT 1,
  `nama_klinik` VARCHAR(100) NOT NULL,
  `alamat` TEXT NOT NULL,
  `no_telepon` VARCHAR(30) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `sip_klinik` VARCHAR(100) DEFAULT NULL,
  `footer_receipt` TEXT DEFAULT NULL,
  `logo_url` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. TABEL CLINIC_SETTINGS (Profil Klinik & Pengaturan Aplikasi)
CREATE TABLE IF NOT EXISTS `clinic_settings` (
  `id` INT NOT NULL DEFAULT 1,
  `clinic_profile_json` JSON NOT NULL,
  `app_settings_json` JSON NOT NULL,
  `updated_by` VARCHAR(50) DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. TABEL CLINIC_BACKUPS (Backup JSON dari Menu Pengaturan)
CREATE TABLE IF NOT EXISTS `clinic_backups` (
  `id` VARCHAR(80) NOT NULL,
  `backup_version` VARCHAR(30) NOT NULL,
  `backup_json` JSON NOT NULL,
  `created_by` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_clinic_backups_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- SEED DATA AWAL (OPTIONAL DUMMY & MASTER DATA)
-- ============================================================================

INSERT INTO `users` (`id`, `username`, `nama`, `email`, `role`, `no_hp`, `aktif`) VALUES
('usr-1', 'superadmin', 'Drh. Ahmad Fauzi (Super Admin)', 'admin@klinikhewan.com', 'super_admin', '081234567890', 1),
('usr-2', 'admin', 'Rina Wati (Administrator)', 'rina@klinikhewan.com', 'admin', '081234567891', 1),
('usr-3', 'kasir', 'Budi Santoso (Staf Kasir)', 'budi@klinikhewan.com', 'staf', '081234567892', 1),
('usr-4', 'dokter', 'Drh. Siska Putri (Dokter Hewan)', 'siska@klinikhewan.com', 'dokter', '081234567893', 1)
ON DUPLICATE KEY UPDATE `nama` = VALUES(`nama`);

INSERT INTO `dokter` (`id`, `sip`, `nama`, `spesialisasi`, `no_hp`, `email`, `jadwal`, `aktif`) VALUES
('doc-1', 'SIP/503/2023/001', 'Drh. Ahmad Fauzi, M.Si', 'Bedah & Internis Hewan Kecil', '081234567890', 'fauzi@klinikhewan.com', 'Senin - Jumat (08.00 - 16.00)', 1),
('doc-2', 'SIP/503/2023/002', 'Drh. Siska Putri, Sp.Klinik', 'Eksotis & Dermatologi', '081234567893', 'siska@klinikhewan.com', 'Selasa - Sabtu (10.00 - 18.00)', 1)
ON DUPLICATE KEY UPDATE `nama` = VALUES(`nama`);

INSERT INTO `spesies` (`id`, `kode_spesies`, `nama_spesies`, `keterangan`) VALUES
('sp-1', 'KUCING', 'Kucing (Felis catus)', 'Kucing domestik, ras, dll.'),
('sp-2', 'ANJING', 'Anjing (Canis lupus familiaris)', 'Anjing ras & lokal'),
('sp-3', 'KELINCI', 'Kelinci', 'Oryctolagus cuniculus'),
('sp-4', 'BURUNG', 'Burung & Unggas', 'Avian species')
ON DUPLICATE KEY UPDATE `nama_spesies` = VALUES(`nama_spesies`);

INSERT INTO `klinik_config` (`id`, `nama_klinik`, `alamat`, `no_telepon`, `email`, `sip_klinik`, `footer_receipt`) VALUES
(1, 'VetCare Pro Animal Clinic', 'Jl. Pemuda No. 88, Jember, Jawa Timur', '0812-3456-7890', 'info@vetcarepro.com', 'KLINIK/VET/2024/089', 'Terima kasih atas kepercayaan Anda merawat anabul tercinta di VetCare Pro!')
ON DUPLICATE KEY UPDATE `nama_klinik` = VALUES(`nama_klinik`);

