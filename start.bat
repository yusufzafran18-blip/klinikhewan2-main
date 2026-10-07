@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
chcp 65001 >nul

title VetCare Pro - Server Lokal Klinik Hewan
color 0A

echo =====================================================================
echo                MEMULAI VETCARE POS ^& SIM KLINIK HEWAN
echo =====================================================================
echo.

:: 1. Cek Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js belum terpasang di komputer ini!
    echo Silakan unduh dan pasang Node.js terlebih dahulu di:
    echo   ^> https://nodejs.org/
    echo =====================================================================
    pause
    exit /b 1
)

:: 2. Cek apakah dependensi sudah diinstal
if not exist "node_modules\" (
    color 0E
    echo [PERINGATAN] Folder 'node_modules' belum ditemukan.
    echo Aplikasi perlu diinstal terlebih dahulu.
    echo Menjalankan instalasi otomatis sekarang...
    echo.
    call install.bat
    if not exist "node_modules\" (
        color 0C
        echo [ERROR] Instalasi belum selesai. Silakan jalankan install.bat manual.
        pause
        exit /b 1
    )
)

:: 3. Cek file .env
if not exist ".env" (
    echo Menyiapkan file konfigurasi dasar .env...
    echo PORT=3000 > .env
    echo HOST=0.0.0.0 >> .env
    echo MYSQL_HOST=localhost >> .env
    echo MYSQL_PORT=3306 >> .env
    echo MYSQL_USER=root >> .env
    echo MYSQL_PASSWORD= >> .env
    echo MYSQL_DATABASE=klinik_hewan >> .env
)

echo  [*] Alamat Akses Server : http://localhost:3000
echo  [*] Jaringan Lokal (LAN): http://IP_KOMPUTER_ANDA:3000
echo  [*] Petunjuk: Jangan tutup jendela hitam ini selama aplikasi digunakan.
echo  [*] Untuk menghentikan: Tekan Ctrl + C atau tutup jendela ini.
echo.
echo Membuka aplikasi di browser dalam 3 detik...
echo ---------------------------------------------------------------------

:: Buka browser secara otomatis di background setelah server mulai bersiap
start "" cmd /c "timeout /t 3 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 4 >nul & start http://localhost:3000"

:: Jalankan server aplikasi
npm run dev

echo.
echo Server telah dimatikan.
pause
