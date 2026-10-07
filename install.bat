@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
chcp 65001 >nul

title VetCare Pro - Setup & Instalasi Lokal
color 0B

echo =====================================================================
echo          VETCARE POS ^& SIM KLINIK HEWAN - INSTALASI LOKAL
echo =====================================================================
echo.
echo Sedang memeriksa kesiapan sistem komputer Anda...
echo.

:: 1. Cek Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js TIDAK DITEMUKAN di komputer ini!
    echo.
    echo Aplikasi ini membutuhkan Node.js versi 18 atau lebih baru.
    echo Silakan unduh dan pasang Node.js terlebih dahulu melalui tautan berikut:
    echo   ^> https://nodejs.org/
    echo.
    echo Setelah menginstal Node.js, silakan buka kembali file install.bat ini.
    echo =====================================================================
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo  [OK] Node.js terdeteksi: %NODE_VERSION%

:: 2. Cek npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] NPM (Node Package Manager) tidak ditemukan!
    echo Silakan pastikan instalasi Node.js Anda lengkap.
    echo =====================================================================
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('npm -v') do set NPM_VERSION=%%v
echo  [OK] NPM terdeteksi: v%NPM_VERSION%
echo.

:: 3. Konfigurasi file .env
echo [1/3] Menyiapkan file konfigurasi (.env)...
if not exist ".env" (
    echo PORT=3000 > .env
    echo HOST=0.0.0.0 >> .env
    echo MYSQL_HOST=localhost >> .env
    echo MYSQL_PORT=3306 >> .env
    echo MYSQL_USER=root >> .env
    echo MYSQL_PASSWORD= >> .env
    echo MYSQL_DATABASE=klinik_hewan >> .env
    echo  [OK] File .env baru berhasil dibuat dengan konfigurasi standar.
) else (
    echo  [OK] File .env sudah ada, konfigurasi yang sudah ada tetap dipertahankan.
)
echo.

:: 4. Install dependencies (npm install)
echo [2/3] Mengunduh dan memasang dependensi (npm install)...
echo Proses ini membutuhkan koneksi internet dan memerlukan waktu 1-3 menit.
echo Mohon tunggu hingga selesai...
echo ---------------------------------------------------------------------
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Terjadi kegagalan saat menjalankan 'npm install'.
    echo Pastikan koneksi internet Anda stabil dan coba jalankan kembali.
    echo =====================================================================
    pause
    exit /b 1
)
echo ---------------------------------------------------------------------
echo  [OK] Seluruh modul dan dependensi berhasil dipasang!
echo.

:: 5. Build aplikasi (opsional namun disiapkan untuk build production)
echo [3/3] Melakukan kompilasi awal aplikasi (npm run build)...
echo ---------------------------------------------------------------------
call npm run build
if %errorlevel% neq 0 (
    echo  [PERINGATAN] Kompilasi build production mengalami kendala,
    echo  namun Anda tetap dapat menjalankan aplikasi dalam mode standar (dev).
) else (
    echo  [OK] Aplikasi berhasil dikompilasi (Production Build siap).
)
echo ---------------------------------------------------------------------
echo.

color 0A
echo =====================================================================
echo            INSTALASI VETCARE PRO SELESAI DENGAN SUKSES!
echo =====================================================================
echo.
echo Langkah berikutnya:
echo 1. Anda cukup klik 2x pada file: start.bat
echo 2. Aplikasi akan otomatis membuka browser di: http://localhost:3000
echo.
echo Catatan Database:
echo - Jika Anda menggunakan database MySQL lokal (XAMPP / Laragon):
echo   Pastikan MySQL sudah berjalan dan sesuaikan kredensial di file .env jika perlu.
echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul
exit /b 0
