# BUKU PANDUAN PENGGUNAAN SISTEM (USER MANUAL)
## VETCARE PRO ANIMAL CLINIC & PETSHOP MANAGEMENT SYSTEM
**Versi Sistem:** 2.6.0  
**Tahun Rilis:** 2026  
**Dokumen:** Manual Operasional Resmi Klinik Hewan & Kasir Terpadu

---

## DAFTAR ISI
1. [BAB 1: Pendahuluan & Gambaran Umum Sistem](#bab-1-pendahuluan--gambaran-umum-sistem)
2. [BAB 2: Hak Akses & Peran Pengguna (RBAC)](#bab-2-hak-akses--peran-pengguna-rbac)
3. [BAB 3: Alur Kerja Operasional Utama Klinik (Workflow End-to-End)](#bab-3-alur-kerja-operasional-utama-klinik-workflow-end-to-end)
4. [BAB 4: Modul Dashboard Overview](#bab-4-modul-dashboard-overview)
5. [BAB 5: Modul Pendaftaran & Antrian Pasien](#bab-5-modul-pendaftaran--antrian-pasien)
6. [BAB 6: Modul Data Pasien & Data Pemilik (Owner)](#bab-6-modul-data-pasien--data-pemilik-owner)
7. [BAB 7: Modul Rekam Medis Elektronik (SOAP)](#bab-7-modul-rekam-medis-elektronik-soap)
8. [BAB 8: Modul Layanan Rawat Jalan (Outpatient)](#bab-8-modul-layanan-rawat-jalan-outpatient)
9. [BAB 9: Modul Rawat Inap & Monitoring Shift Pasien](#bab-9-modul-rawat-inap--monitoring-shift-pasien)
10. [BAB 10: Modul Janji Temu (Appointment Booking)](#bab-10-modul-janji-temu-appointment-booking)
11. [BAB 11: Modul Kasir POS Pembayaran Nota (A4, F4, & Thermal)](#bab-11-modul-kasir-pos-pembayaran-nota-a4-f4--thermal)
12. [BAB 12: Modul Kasir PetShop Direct](#bab-12-modul-kasir-petshop-direct)
13. [BAB 13: Modul Manajemen Stok Obat, BMHP & Inventaris](#bab-13-modul-manajemen-stok-obat-bmhp--inventaris)
14. [BAB 14: Modul Pembelian Stok & Manajemen Supplier](#bab-14-modul-pembelian-stok--manajemen-supplier)
15. [BAB 15: Modul Master Data (Dokter, Tindakan, Pakan, Spesies)](#bab-15-modul-master-data-dokter-tindakan-pakan-spesies)
16. [BAB 16: Modul Laporan Keuangan, Laba Rugi & Tren Penyakit](#bab-16-modul-laporan-keuangan-laba-rugi--tren-penyakit)
17. [BAB 17: Modul Integrasi WhatsApp Gateway & Notifikasi Otomatis](#bab-17-modul-integrasi-whatsapp-gateway--notifikasi-otomatis)
18. [BAB 18: Modul Pengaturan Profil Klinik, Backup & Restore Database](#bab-18-modul-pengaturan-profil-klinik-backup--restore-database)
19. [BAB 19: Panduan Instalasi Lokal (install.bat & start.bat)](#bab-19-panduan-instalasi-lokal-installbat--startbat)
20. [BAB 20: Panduan Deploy ke Hosting (cPanel / JagoanHosting)](#bab-20-panduan-deploy-ke-hosting-cpanel--jagoanhosting)
21. [BAB 21: Tanya Jawab & Solusi Kendala (FAQ & Troubleshooting)](#bab-21-tanya-jawab--solusi-kendala-faq--troubleshooting)

---

## BAB 1: Pendahuluan & Gambaran Umum Sistem

### 1.1 Mengenai VetCare Pro
**VetCare Pro** adalah aplikasi manajemen operasional komprehensif yang dirancang khusus untuk klinik hewan modern, rumah sakit hewan (*animal hospital*), dan fasilitas *pet care / petshop*. Aplikasi ini mengintegrasikan seluruh tahapan pelayanan mulai dari pendaftaran antrian, rekam medis SOAP berbasis standar kedokteran hewan, monitoring rawat inap berkala (shift pagi/siang/malam), kasir pembayaran multifungsi (cetak A4, F4, thermal 58mm & 80mm), hingga mutasi otomatis stok obat dan laporan keuangan akurat.

### 1.2 Karakteristik Utama Sistem
* **Terintegrasi Real-Time**: Status antrian pendaftaran, rekam medis, rawat inap, mutasi stok barang, dan kasir saling terhubung otomatis tanpa entri data berulang.
* **Mutasi Stok Otomatis**: Setiap obat, alkes, atau barang yang diresepkan atau digunakan langsung memotong saldo inventaris saat transaksi dilunasi.
* **Sistem Cetak Bersih & Fleksibel**: Pratinjau cetak nota rincian biaya resmi (A4 / F4) dan kasir thermal bebas dari elemen navigasi website (*isolated printing*).
* **Multi-Peran (RBAC)**: Pembatasan akses aman sesuai fungsi kerja masing-masing petugas klinik.

---

## BAB 2: Hak Akses & Peran Pengguna (RBAC)

Aplikasi menyediakan 4 tingkatan peran (*Role*):

| Peran (*Role*) | Deskripsi Tanggung Jawab | Akses Fitur Utama |
|---|---|---|
| **Super Admin** | Pemilik klinik / IT Administrator | Seluruh menu sistem, konfigurasi RBAC, pengaturan identitas klinik, backup database, manajemen pengguna. |
| **Admin** | Manajer operasional klinik | Pendaftaran, data pasien, inventaris, laporan keuangan & laba rugi, pembelian stok, master data. |
| **Dokter (drh.)** | Tim medis & dokter hewan praktik | Pendaftaran antrian, data pasien, rekam medis SOAP, monitoring rawat inap, tren diagnosa penyakit, katalog obat. |
| **Staf / Kasir** | Resepsionis & petugas kasir / apotek | Pendaftaran antrian, kasir pembayaran nota, kasir PetShop direct, janji temu, kartu stok barang. |

*Tips Akses*: Untuk berganti pengguna dalam sesi uji coba, klik profil pengguna di pojok kanan atas (*Navbar*) lalu pilih peran yang ingin diuji.

---

## BAB 3: Alur Kerja Operasional Utama Klinik (Workflow End-to-End)

```
[1. KEDATANGAN PASIEN]
       │
       ▼
[2. PENDAFTARAN & ANTRIAN] ──► Pasien Baru/Lama terdaftar, Nomor Antrian (RJ-001 / RI-001) terbit
       │
       ├─────────────────────────────────┐
       ▼ (Rawat Jalan)                   ▼ (Rawat Inap)
[3A. REKAM MEDIS SOAP]           [3B. ADMISI RAWAT INAP]
  • Dokter memeriksa fisik         • Masuk kandang & tetapkan tarif/hari
  • Diagnosa utama & banding       • Monitoring kondisi per shift
  • Resep obat, racikan, alkes     • Terapi injeksi, obat oral, infus
       │                                 │
       ▼                                 ▼ (Dokter izinkan pulang)
[4A. SELESAI PEMERIKSAAN]        [4B. PULANGKAN PASIEN RAWAT INAP]
       │                                 │
       └────────────────► ◄──────────────┘
                          │
                          ▼
               [5. KASIR PEMBAYARAN]
                 • Pilih nota tagihan yang belum lunas
                 • Input diskon & pilih metode bayar (Tunai/QRIS/Debit)
                 • Proses pembayaran:
                     ✓ Stok obat/alkes/pakan terpotong otomatis
                     ✓ Status transaksi menjadi "Lunas"
                     ✓ Status antrian di Pendaftaran otomatis "Selesai"
                 • Cetak Struk / Nota (A4, F4, atau Thermal 58/80mm)
                 • Kirim rincian nota via WhatsApp ke nomor pemilik
```

---

## BAB 4: Modul Dashboard Overview

### 4.1 Fungsi Modul
Menampilkan ringkasan statistik harian klinik secara cepat untuk evaluasi performa operasional.

### 4.2 Informasi yang Ditampilkan
1. **Statistik Antrian Hari Ini**: Jumlah pasien rawat jalan dan inap yang sedang mengantri dan diperiksa.
2. **Pasien Dirawat Inap**: Jumlah pasien aktif yang saat ini menempati kandang rawat inap.
3. **Omset Penjualan & Pendapatan Hari Ini**: Total penerimaan kasir dari tindakan medis dan penjualan PetShop.
4. **Peringatan Stok Menipis**: Daftar obat atau produk yang jumlahnya sudah berada di bawah batas minimum (*Safety Stock*).
5. **Grafik Kunjungan & Tren Penyakit**: Visualisasi tren kunjungan pasien 7 hari terakhir.

---

## BAB 5: Modul Pendaftaran & Antrian Pasien

### 5.1 Langkah Mendaftarkan Pasien
1. Buka menu **Pendaftaran & Antrian** dari sidebar.
2. Klik tombol hijau **+ Tambah Pendaftaran / Antrian**.
3. Pilih tipe registrasi:
   * **Pasien Lama Terdaftar**: Cari nama hewan, nama pemilik, atau nomor rekam medis pada kolom pencarian.
   * **Pasien & Pemilik Baru**: Masukkan data lengkap pemilik (nama, no. WhatsApp, alamat) dan data hewan (nama hewan, spesies, ras, jenis kelamin, tanggal lahir/perkiraan umur).
4. Pilih **Jenis Layanan**:
   * **Rawat Jalan**: Pilih dokter pemeriksa dan tuliskan keluhan utama pasien.
   * **Rawat Inap**: Masukkan nomor/nama kandang (misal: *Kandang Kucing A-02*), tarif sewa kandang per hari, dan diagnosa awal.
5. Klik **Simpan & Masuk Antrian**.
6. Nomor antrian otomatis terbit (format `RJ-xxx` untuk rawat jalan atau `RI-xxx` untuk rawat inap).

### 5.2 Alur Pembaruan Status Pasien
* **Antri**: Pasien baru terdaftar dan menunggu giliran dipanggil.
* **Diperiksa**: Pasien sedang berada di ruang periksa dokter (klik tombol **Mulai SOAP RJ**).
* **Selesai**: Pasien telah selesai diperiksa/dipulangkan dan melunasi pembayaran di kasir. Sistem secara otomatis memperbarui status ini menjadi "Selesai" saat kasir melunasi transaksi.
* **Batal**: Pasien membatalkan antrian.
* **Pengubahan Manual**: Petugas dapat mengubah status antrian sewaktu-waktu menggunakan menu dropdown status pada tabel, atau mengklik tombol cepat centang **Selesai**.

---

## BAB 6: Modul Data Pasien & Data Pemilik (Owner)

### 6.1 Manajemen Data Pasien
* **Pencarian Cepat**: Cari pasien berdasarkan nama hewan, nama pemilik, no. WhatsApp, kode pasien, atau ras.
* **Tambah Pasien**: Daftarkan hewan pasien beserta data lengkap pemilik.
* **Edit Pasien**: Perbarui nomor kontak pemilik, riwayat sterilisasi, atau data ras hewan.
* **Hapus Pasien**: Tersedia tombol hapus khusus dengan modal konfirmasi keamanan bertingkat untuk membersihkan data testing atau entri keliru.
* **Riwayat Pasien Terintegrasi**: Klik nama pasien untuk melihat rekam jejak medis lampau, vaksinasi, dan riwayat transaksi kasir.

---

## BAB 7: Modul Rekam Medis Elektronik (SOAP)

Modul ini digunakan oleh dokter hewan untuk mencatat pemeriksaan secara sistematis:

### 7.1 Struktur Form SOAP
1. **S (Subjective)**:
   * Keluhan utama pemilik.
   * Anamnesa (riwayat nafsu makan, minum, durasi sakit, riwayat lingkungan).
2. **O (Objective)**:
   * Berat badan (kg), Suhu tubuh (°C), Frekuensi napas, Detak jantung.
   * CRT (*Capillary Refill Time*), Tingkat dehidrasi (%), dan Temuan fisik.
3. **A (Assessment)**:
   * Diagnosa utama (primer) dan Diagnosa banding (diferensial).
4. **P (Plan)**:
   * **Tindakan Medis**: Pilih tindakan yang dilakukan (misal: *Pembersihan Telinga*, *Injeksi Antibiotik*, *Jahit Luka*).
   * **Resep Obat Jadi**: Pilih obat jadi dari gudang farmasi beserta dosis dan aturan pakai.
   * **Obat Racikan**: Buat puyer/kapsul racikan dengan menghitung otomatis kombinasi bahan aktif dan jasa racik.
   * **Penggunaan Alkes & BMHP**: Catat jarum suntik, perban, cairan infus yang terpakai.
   * **Anjuran Pakan & Edukasi**: Catat rekomendasi pakan diet khusus dan tanggal kontrol ulang.
5. Klik **Simpan Rekam Medis**. Data tagihan otomatis diteruskan ke antrian kasir.

---

## BAB 8: Modul Layanan Rawat Jalan (Outpatient)

### 8.1 Fungsi Modul
Menampilkan daftar pasien yang menjalani pemeriksaan jalan pada hari berjalan, memantau antrian rekam medis, dan menerbitkan **Nota Rincian Biaya Rawat Jalan**.

### 8.2 Fitur Cetak Nota Rincian Biaya Rawat Jalan (A4 / F4)
* Klik tombol **Cetak Rincian Biaya (A4/F4)** pada pasien terkait.
* Pilih ukuran kertas **A4** atau **F4**.
* Pratinjau nota menampilkan KOP resmi klinik, identitas pasien & pemilik, tabel item per kategori (Tindakan, Farmasi, Alkes, Pakan), subtotal, diskon, dan tanda tangan dokter/kasir.
* Mendukung fitur **Mode Edit Rincian** untuk menambah atau menyesuaikan harga/item sebelum dicetak ke pemilik.

---

## BAB 9: Modul Rawat Inap & Monitoring Shift Pasien

### 9.1 Alur Pelayanan Rawat Inap
1. **Pendaftaran Opname**: Dilakukan melalui menu Pendaftaran (Layanan Rawat Inap) atau rujukan langsung dari hasil SOAP dokter.
2. **Penempatan Kandang**: Sistem mencatat nomor kandang dan tarif harian yang disepakati.
3. **Pencatatan Monitoring Berkala (Shift Pagi, Siang, Malam)**:
   * Petugas/paramedis menginput suhu badan, nafsu makan (*Lahap, Sedikit, Muntah*), status BAB/BAK (*Normal, Diare, Berdarah*), kondisi umum, dan obat yang diinjeksikan.
4. **Pencatatan Pemakaian Obat & Alkes Rawat Inap**:
   * Setiap pemberian obat harian atau pemakaian infus dapat ditambahkan langsung ke lembar rawat inap pasien.
5. **Pemulangan Pasien (*Checkout / Pulang*)**:
   * Saat kondisi pasien membaik dan dokter mengizinkan pulang, klik tombol **Selesai / Pulang**.
   * Sistem menghitung otomatis:
     $$\text{Total Biaya} = (\text{Lama Menginap Hari} \times \text{Tarif/Hari}) + \text{Obat-Obatan} + \text{Alkes} + \text{Tindakan}$$
   * Tagihan otomatis diteruskan ke menu Kasir, dan status antrian pasien di menu Pendaftaran disinkronkan menjadi "Selesai".

---

## BAB 10: Modul Janji Temu (Appointment Booking)

### 10.1 Membuat Janji Temu Baru
1. Buka menu **Janji Temu**.
2. Klik **+ Buat Janji Temu Baru**.
3. Pilih pasien, dokter yang dituju, tanggal janji temu, jam kedatangan, dan jenis layanan (misal: *Vaksinasi Tahunan*, *Grooming Medis*, *Operasi Steril*).
4. Simpan janji temu.
5. Tersedia tombol **Kirim Pengingat WA** untuk mengirim pesan konfirmasi otomatis ke nomor WhatsApp pemilik.

---

## BAB 11: Modul Kasir POS Pembayaran Nota (A4, F4, & Thermal)

### 11.1 Alur Pembayaran di Kasir
1. Buka menu **Kasir Pembayaran Nota**.
2. Pada tab **Menunggu Pembayaran**, pilih tagihan pasien:
   * Tagihan **Rawat Jalan** (berasal dari Rekam Medis).
   * Tagihan **Rawat Inap** (berasal dari Pasien Pulang Opname).
3. Rincian seluruh tindakan, obat, dan alkes akan tampil di panel kasir.
4. Masukkan nominal **Diskon** (bila ada promosi atau potongan).
5. Pilih **Metode Pembayaran**: *Tunai*, *Transfer QRIS*, atau *Kartu Debit/Kredit*.
6. Masukkan nominal **Jumlah Bayar**, sistem otomatis menghitung uang kembalian.
7. Klik **Proses Pembayaran & Cetak Nota**:
   * Sistem otomatis memotong stok barang/obat di gudang.
   * Transaksi tersimpan ke laporan keuangan.
   * Status antrian pasien di menu Pendaftaran otomatis berubah menjadi **Selesai**.

### 11.2 Pilihan Format Cetak Nota
* **Nota A4 / F4**: Digunakan untuk rincian tagihan resmi kepada pemilik pasien rawat inap atau tagihan lengkap rawat jalan.
* **Nota Struk Thermal (58mm / 80mm)**: Digunakan untuk struk kasir cepat pada printer thermal POS kasir.

---

## BAB 12: Modul Kasir PetShop Direct

### 12.1 Fungsi Modul
Digunakan untuk melayani transaksi pembelian langsung barang retail, pakan hewan, aksesoris, atau obat bebas tanpa melalui alur pemeriksaan dokter.

### 12.2 Langkah Penjualan Direct
1. Buka menu **Kasir PetShop Direct**.
2. Klik barang atau cari nama produk/barcode pada kolom pencarian katalog.
3. Atur jumlah kuantiti barang.
4. Pilih metode pembayaran, masukkan jumlah uang yang diterima.
5. Klik **Bayar & Cetak Struk**. Stok produk di inventaris otomatis berkurang seketika.

---

## BAB 13: Modul Manajemen Stok Obat, BMHP & Inventaris

### 13.1 Pengelolaan Gudang
* **Kategori Barang**: Obat Jadi, Obat Racikan, Alat Kesehatan & BMHP, Pakan Hewan, dan Aksesoris.
* **Stok Minimum & Peringatan Otomatis**: Jika stok barang menyentuh atau berada di bawah *Stok Minimum*, sistem memberikan peringatan lencana merah pada Navbar dan Dashboard.
* **Mutasi Stok Real-Time**: Setiap barang keluar (karena resep dokter, rawat inap, atau penjualan petshop) dan barang masuk (karena penerimaan supplier) tercatat otomatis di kartu riwayat mutasi lengkap dengan tanggal, jam, referensi nota, dan nama petugas.

---

## BAB 14: Modul Pembelian Stok & Manajemen Supplier

### 14.1 Pencatatan Faktur Masuk (PO Pembelian)
1. Buka menu **Pembelian Stok Barang**.
2. Klik **+ Catat Faktur Pembelian**.
3. Pilih supplier distributor (misal: *PT Kimia Farma*, *Distributor Pakan Royal Canin*).
4. Masukkan nomor faktur supplier, tanggal penerimaan, dan tanggal jatuh tempo pembayaran.
5. Tambahkan item barang yang dibeli beserta harga beli modal (*HPP*) dan jumlah kuantiti yang datang.
6. Klik **Simpan Pembelian**:
   * Saldo stok barang di inventaris otomatis bertambah.
   * Nilai modal HPP terhitung otomatis pada laporan laba rugi.

---

## BAB 15: Modul Master Data (Dokter, Tindakan, Pakan, Spesies)

Menu ini dikelola oleh Administrator untuk menjaga konsistensi data acuan:
1. **Master Dokter**: Mengatur data nama dokter hewan, nomor SIP, nomor telepon, spesialisasi, dan status aktif.
2. **Master Jasa & Tindakan Medis**: Mengatur daftar nama tindakan medis, kategori layanan, tarif standar, dan komisi jasa dokter.
3. **Master Pakan Hewan**: Mengatur katalog pakan, merk, kemasan, harga jual, dan takaran dosis pakan harian berdasarkan berat badan hewan.
4. **Master Spesies & Ras**: Menambahkan jenis hewan baru (Anjing, Kucing, Kelinci, Burung, Reptil, Hamster) beserta ras-ras terkait.

---

## BAB 16: Modul Laporan Keuangan, Laba Rugi & Tren Penyakit

### 16.1 Laporan yang Tersedia
1. **Laporan Pendapatan & Omset Harian/Bulanan**: Menampilkan total penerimaan kasir, rincian per metode bayar, dan grafik pemasukan.
2. **Laporan Laba Rugi Produk**: Menghitung selisih harga jual dan harga beli modal (*Gross Profit*) atas produk farmasi dan barang retail petshop yang terjual.
3. **Laporan Tren Penyakit**: Menganalisis frekuensi diagnosa medis terbanyak (misal: *Panleukopenia, Scabies, FUS/FLUTD, Parvovirus*) untuk evaluasi epidemiologi klinik.
4. **Fitur Ekspor**: Semua laporan dapat diekspor ke format **Microsoft Excel (.xlsx)** dan dicetak rapi ke PDF.

---

## BAB 17: Modul Integrasi WhatsApp Gateway & Notifikasi Otomatis

### 17.1 Template WhatsApp Terintegrasi
Sistem dilengkapi template pesan WhatsApp otomatis dengan format dinamis:
* **Pengingat Kontrol Ulang Medis Pasien**: Mengingatkan pemilik jadwal kontrol paska pengobatan.
* **Kwitansi & Struk Pembayaran Digital**: Mengirimkan ringkasan nota pembayaran kasir langsung ke ponsel pemilik.
* **Pengingat Jadwal Vaksinasi**: Notifikasi booster vaksin rabies/tahunan.
* **Pengingat Janji Temu**: Konfirmasi kedatangan dokter hewan.

---

## BAB 18: Modul Pengaturan Profil Klinik, Backup & Restore Database

### 18.1 Profil Identitas Klinik
Pengaturan nama klinik, alamat, nomor telepon/WhatsApp, nomor izin operasional, nama dokter penanggung jawab, serta logo resmi klinik yang otomatis tampil pada KOP nota cetak resmi.

### 18.2 Backup & Keamanan Data
* **Ekspor Backup Lengkap (.json)**: Mengunduh salinan seluruh data operasional (pasien, rekam medis, transaksi, inventaris) ke komputer Anda.
* **Import / Pulihkan Data**: Mengembalikan data dari berkas cadangan jika terjadi pergantian komputer kasir.

---

## BAB 19: Panduan Instalasi Lokal (install.bat & start.bat)

Untuk menjalankan aplikasi di komputer lokal (Windows) tanpa koneksi internet:

### 19.1 Prasyarat
* Pasang **Node.js LTS** (versi 18 atau 20) dari [nodejs.org](https://nodejs.org).
* MySQL Server (bisa menggunakan XAMPP atau MySQL Server bawaan).

### 19.2 Langkah Instalasi Cepat
1. Letakkan seluruh folder aplikasi di komputer kasir.
2. Klik dua kali berkas **`install.bat`**:
   * Sistem otomatis mengunduh seluruh dependensi aplikasi dan modul pendukung.
3. Klik dua kali berkas **`start.bat`**:
   * Server lokal aplikasi akan menyala dan otomatis membuka browser pada alamat:
     `http://localhost:3000`

---

## BAB 20: Panduan Deploy ke Hosting (cPanel / JagoanHosting)

Aplikasi dapat di-hosting agar dapat diakses dari banyak komputer kasir, poli dokter, dan smartphone secara daring:
1. Pada cPanel hosting (misal: JagoanHosting), buka menu **Setup Node.js App**.
2. Pilih versi Node.js **18.x** atau **20.x**.
3. Tentukan Application Root dan Application URL.
4. Unggah berkas proyek dan buat database MySQL pada menu **MySQL Databases**.
5. Salin konfigurasi kredensial database ke berkas `.env`.
6. Klik tombol **Run NPM Install**, lalu jalankan aplikasi (**Start Application**).

---

## BAB 21: Tanya Jawab & Solusi Kendala (FAQ & Troubleshooting)

### Q1: Kenapa hasil cetak nota di Chrome sempat blank putih?
* **Penyebab**: Mesin cetak Chrome mengabaikan elemen iframe jika menggunakan dimensi 0x0 atau atribut visibilitas tersembunyi.
* **Solusi**: Di versi terbaru, seluruh iframe cetak ditempatkan di luar layar (*offscreen*) dengan dimensi fisik presisi (210mm x 297mm) dan aturan `* { visibility: visible !important; }` sehingga pratinjau 100% muncul jelas.

### Q2: Mengapa status pasien di antrian tidak berubah padahal sudah bayar di kasir?
* **Penyebab**: Sebelumnya belum ada penyelarasan otomatis antara entri transaksi kasir dan daftar antrian.
* **Solusi**: Sistem versi 2.6 kini menyinkronkan status secara real-time. Begitu kasir menekan tombol pelunasan atau pasien rawat inap dipulangkan, status antrian otomatis diperbarui menjadi "Selesai". Anda juga dapat mengubah status secara manual lewat dropdown di tabel antrian.

### Q3: Bagaimana jika ada obat yang diresepkan tetapi stok di gudang tidak mencukupi?
* Sistem akan menampilkan informasi jumlah sisa stok saat dokter memilih obat di rekam medis. Jika stok menipis, segera catat penerimaan barang baru di menu **Pembelian Stok Barang**.

---
*VetCare Pro Animal Clinic - Sahabat Terbaik Manajemen Kesehatan Hewan Kesayangan Anda.*
