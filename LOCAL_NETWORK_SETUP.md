# Akses Aplikasi di Jaringan Lokal

## Konfigurasi server

Pastikan komputer server dan perangkat pengguna berada pada jaringan yang sama. Konfigurasi aktif berada di `.env`:

```env
HOST=0.0.0.0
PORT=3000
MYSQL_HOST=192.168.1.8
MYSQL_PORT=3306
```

`MYSQL_HOST` harus tetap menunjuk ke alamat server MySQL yang benar. Nilai di atas mengikuti konfigurasi lokal saat ini dan dapat berbeda jika jaringan berubah.

## Menjalankan aplikasi

Mode development:

```powershell
npm run dev
```

Mode production:

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

## URL akses

Dari komputer server:

```text
http://localhost:3000
```

Dari perangkat lain di Wi-Fi yang sama:

```text
http://192.168.1.8:3000
```

Jika komputer terhubung melalui Ethernet, gunakan alamat Ethernet yang tampil dari perintah berikut:

```powershell
Get-NetIPAddress -AddressFamily IPv4
```

## Firewall Windows

Jika perangkat lain tidak dapat membuka URL, izinkan port aplikasi pada Windows Firewall. Jalankan PowerShell sebagai Administrator:

```powershell
New-NetFirewallRule -DisplayName "VetCare Local Network 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

Jangan membuka port ini pada profil jaringan Public. Gunakan jaringan Private yang dipercaya.

## Pemeriksaan koneksi

Buka URL berikut dari perangkat klien:

```text
http://192.168.1.8:3000/api/db/status
```

Respons yang benar memiliki `connected: true`. Semua data aplikasi tetap dibaca dan disimpan melalui MySQL API.
