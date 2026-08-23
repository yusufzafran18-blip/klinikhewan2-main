# Setup Aplikasi Klinik Hewan dengan MySQL

Dokumentasi ini menjelaskan cara mengkonfigurasi dan menjalankan aplikasi Klinik Hewan menggunakan database MySQL.

## 📋 Prasyarat

- Node.js 18+ dan npm atau yarn
- MySQL Server 5.7+ atau MariaDB 10.4+
- Git (opsional)

## 🔧 Konfigurasi Database MySQL

### 1. Buat Database dan User MySQL

Akses MySQL console:
```bash
mysql -u root -p
```

Buat database dan user:
```sql
-- Buat database
CREATE DATABASE IF NOT EXISTS `klinik_hewan` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Buat user (ubah password sesuai kebutuhan)
CREATE USER 'klinik_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Berikan privilege
GRANT ALL PRIVILEGES ON klinik_hewan.* TO 'klinik_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Setup Environment Variables

Buat file `.env` di root folder aplikasi:

```env
# MySQL Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=klinik_user
MYSQL_PASSWORD=your_secure_password
MYSQL_DATABASE=klinik_hewan

# Application Port
PORT=3000

# Gemini API Key (Optional)
GEMINI_API_KEY=
```

**Catatan:** 
- Ubah `MYSQL_USER` dan `MYSQL_PASSWORD` sesuai konfigurasi Anda
- Jika MySQL berjalan di server lain, ubah `MYSQL_HOST`
- Sesuaikan `MYSQL_PORT` jika menggunakan port non-standar (default: 3306)

### 3. Inisialisasi Database Schema

#### Opsi A: Gunakan schema.sql (Recommended)

```bash
# Import schema langsung dari terminal
mysql -u klinik_user -p klinik_hewan < schema.sql

# Atau dari MySQL console
mysql -u root -p
mysql> USE klinik_hewan;
mysql> SOURCE schema.sql;
```

#### Opsi B: Gunakan API Endpoint

Setelah aplikasi berjalan:

```bash
curl -X POST http://localhost:3000/api/mysql/init-tables
```

#### Opsi C: Verifikasi Database Connection

```bash
curl http://localhost:3000/api/db/status
```

Response yang diharapkan:
```json
{
  "connected": true,
  "type": "MySQL Database (Drizzle ORM)",
  "database": "klinik_hewan",
  "host": "localhost",
  "tablesCount": 17,
  "recordsInfo": "Tersambung ke MySQL Database (0 user aktif)",
  "message": "Database MySQL Aktif dan Terkoneksi secara Realtime."
}
```

## 🚀 Menjalankan Aplikasi

### Development Mode

```bash
# Install dependencies
npm install

# Jalankan development server dengan Vite + Express
npm run dev
```

Server akan berjalan di `http://localhost:3000`

### Production Mode

```bash
# Build aplikasi
npm run build

# Jalankan production server
npm start
```

## 📊 Struktur Database

Aplikasi menggunakan 17 tabel MySQL:

1. **users** - Data pengguna sistem
2. **dokter** - Data dokter hewan
3. **spesies** - Master data spesies hewan
4. **pasien** - Data pasien hewan + pemilik
5. **barang** - Master obat, alkes, pakan, aksesoris
6. **tindakan** - Master tarif tindakan medis
7. **pakan** - Master pakan untuk rawat inap
8. **pendaftaran** - Data pendaftaran pasien
9. **rekam_medis** - Rekam medis pasien
10. **rawat_inap** - Data rawat inap
11. **janji_temu** - Janji temu pasien
12. **vaksinasi** - Riwayat vaksinasi
13. **transaksi** - Transaksi penjualan
14. **pembelian** - Purchase order (pembelian)
15. **supplier** - Data supplier
16. **feedback** - Feedback dari pelanggan
17. **clinic_store** - Konfigurasi & settings aplikasi

Setiap tabel menggunakan charset `utf8mb4` untuk support emoji dan karakter khusus.

## 🔌 API Endpoints untuk Database Management

### Status Database
```bash
GET /api/db/status
```

### Fetch All Data
```bash
GET /api/data
```

### Sync Data ke Database
```bash
POST /api/data/sync
Content-Type: application/json

{
  "users": [...],
  "dokter": [...],
  "pasien": [...],
  ...
}
```

### Test MySQL Connection
```bash
POST /api/mysql/test-connection
Content-Type: application/json

{
  "host": "localhost",
  "port": 3306,
  "user": "klinik_user",
  "password": "password",
  "database": "klinik_hewan"
}
```

### Download Schema SQL
```bash
GET /api/mysql/schema-sql
```

### Initialize Database Tables
```bash
POST /api/mysql/init-tables
```

## 🛠️ Troubleshooting

### Error: Connection Refused
- Pastikan MySQL server berjalan
- Cek bahwa host, port, user, dan password sudah benar di `.env`
- Verifikasi firewall tidak memblokir koneksi

### Error: Database not found
- Pastikan database `klinik_hewan` sudah dibuat
- Jalankan `mysql -u klinik_user -p klinik_hewan < schema.sql`

### Error: Access Denied
- Verifikasi username dan password di `.env`
- Pastikan user memiliki proper privileges
- Gunakan `GRANT ALL PRIVILEGES ON klinik_hewan.* TO 'klinik_user'@'localhost';`

### Error: Character Set Issues
- Pastikan schema.sql diimport dengan charset utf8mb4
- Database harus dengan collation `utf8mb4_unicode_ci`

### Port Already in Use
- Ubah PORT di `.env` atau command:
  ```bash
  PORT=3001 npm run dev
  ```

## 📝 Drizzle ORM Migration

Untuk generate migration files:

```bash
# Generate migration dari schema
npx drizzle-kit generate

# Push schema ke database
npx drizzle-kit push
```

File konfigurasi Drizzle ada di `src/db/drizzle.config.ts`

## 🔐 Security Best Practices

1. **Use Strong Password**
   - Jangan gunakan password default seperti 'password' atau '123456'

2. **Separate User for Production**
   - Buat user MySQL terpisah dengan privilege terbatas hanya untuk database `klinik_hewan`

3. **Environment Variables**
   - Jangan commit `.env` ke git repository
   - Gunakan `.env.local` atau `.env.production` untuk local development

4. **Database Backup**
   ```bash
   mysqldump -u klinik_user -p klinik_hewan > klinik_hewan_backup_$(date +%Y%m%d).sql
   ```

5. **SSL Connection (Optional)**
   - Untuk koneksi remote, gunakan SSL encryption

## 📚 Referensi

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Express.js Guide](https://expressjs.com/)
- [Vite Documentation](https://vitejs.dev/)

## 💡 Tips Pengembangan

### Hot Reload Development
```bash
npm run dev
```

Aplikasi akan auto-reload ketika ada perubahan di file TypeScript

### Database Query Testing
```bash
# Jalankan TypeScript file secara langsung
npx tsx src/db/query.ts
```

### View Generated SQL
Drizzle ORM dalam mode verbose akan menampilkan SQL query yang di-generate. Cek console output.

---

**Versi Aplikasi**: 1.0.0  
**Database Driver**: mysql2  
**ORM**: Drizzle ORM  
**Last Updated**: 2024
