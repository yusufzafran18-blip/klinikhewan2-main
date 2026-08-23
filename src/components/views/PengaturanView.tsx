import React, { useState, useEffect } from 'react';
import { DataKlinik, AppSettings } from '../../types';
import { Settings, Printer, Database, Save, Download, Upload, Building, CheckCircle2, RefreshCw, AlertTriangle, Trash2, X, CloudCheck, Server, Activity, Image as ImageIcon, Link as LinkIcon, RotateCcw, Check, Layers } from 'lucide-react';
import { backupToJSON, restoreFromJSON, storageService } from '../../services/storage';
import { checkSqlStatus, testMySQLConnection, initMySQLTables } from '../../services/sqlApi';

interface PengaturanViewProps {
  klinik: DataKlinik;
  settings: AppSettings;
  onSaveKlinik: (k: DataKlinik) => void | Promise<void>;
  onSaveSettings: (s: AppSettings) => void | Promise<void>;
  onReloadAllData: () => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  klinik,
  settings,
  onSaveKlinik,
  onSaveSettings,
  onReloadAllData,
}) => {
  const [namaKlinik, setNamaKlinik] = useState(klinik.namaKlinik);
  const [alamat, setAlamat] = useState(klinik.alamat);
  const [telepon, setTelepon] = useState(klinik.telepon || (klinik as any).noTelp || '');
  const [email, setEmail] = useState(klinik.email);
  const [drhPJ, setDrhPJ] = useState((klinik as any).drhPenanggungJawab || klinik.namaPenanggungJawab || '');
  const [sipPJ, setSipPJ] = useState((klinik as any).sipPenanggungJawab || '');
  const [pesanNota, setPesanNota] = useState((klinik as any).pesanNotaFooter || klinik.footerNota || 'Semoga Anabul Lelek Sehat Selalu!');
  const [logoUrl, setLogoUrl] = useState(klinik.logoUrl || 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=150&auto=format&fit=crop&q=80');

  // Printer settings
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(settings.printerThermalSize);
  const [autoPrint, setAutoPrint] = useState(settings.autoPrintAfterKasir);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Reset database states
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Database Connection states
  const [dbTesting, setDbTesting] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ tested: boolean; success: boolean; message: string; type?: string; database?: string }>({
    tested: false,
    success: true,
    message: 'Terkoneksi ke SQL / Relational Database (Firestore Diputus)',
    type: 'SQL Database Backend',
    database: 'klinik_hewan',
  });

  useEffect(() => {
    // Initial status check
    checkSqlStatus().then((status) => {
      setDbStatus({
        tested: true,
        success: status.connected,
        message: status.message,
        type: status.type,
        database: status.database,
      });
    });
  }, []);

  const handleTestConnection = async () => {
    setDbTesting(true);
    const res = await checkSqlStatus();
    setDbStatus({
      tested: true,
      success: res.connected,
      message: res.message,
      type: res.type,
      database: res.database,
    });
    setDbTesting(false);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file logo terlalu besar. Maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveKlinikForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextKlinik = {
      ...klinik,
      namaKlinik,
      alamat,
      telepon,
      noTelp: telepon,
      email,
      drhPenanggungJawab: drhPJ,
      namaPenanggungJawab: drhPJ,
      sipPenanggungJawab: sipPJ,
      pesanNotaFooter: pesanNota,
      footerNota: pesanNota,
      logoUrl: logoUrl,
    } as any;

    const nextSettings = {
      ...settings,
      printerThermalSize: paperSize,
      autoPrintAfterKasir: autoPrint,
    };

    try {
      await onSaveKlinik(nextKlinik);
      await onSaveSettings(nextSettings);
    } catch (error: any) {
      alert(`Pengaturan gagal disimpan ke MySQL: ${error.message}`);
      return;
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleBackup = async () => {
    try {
      await backupToJSON();
      alert('Backup berhasil disimpan ke MySQL dan diunduh sebagai JSON.');
    } catch (error: any) {
      alert(`Backup gagal disimpan ke MySQL: ${error.message}`);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    restoreFromJSON(file, () => {
      alert('Berhasil mengembalikan data dari file backup JSON!');
      onReloadAllData();
    });
  };

  const handleConfirmReset = async () => {
    if (confirmInput.trim().toUpperCase() !== 'RESET') {
      alert('Silakan ketik kata "RESET" dengan benar untuk mengonfirmasi.');
      return;
    }

    try {
      await storageService.resetDatabaseKeepUsers?.();
    } catch (error: any) {
      alert(`Reset database gagal: ${error.message}`);
      return;
    }
    onReloadAllData();
    setShowResetModal(false);
    setConfirmInput('');
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Pengaturan Sistem & Database Klinik</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Konfigurasi profil identitas klinik, ukuran printer thermal 58/80mm, backup/restore, & reset database</p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Berhasil Disimpan!</span>
          </div>
        )}

        {resetSuccess && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold border border-rose-200 animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-rose-600" />
            <span>Database Berhasil Dikosongkan! (Akun User, Password, Master Data & Dokter Tetap Aman)</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveKlinikForm} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Profil Klinik */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Profil Identitas Klinik Hewan</h3>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Resmi Klinik / Vet Clinic</label>
            <input type="text" required value={namaKlinik} onChange={(e) => setNamaKlinik(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold" />
          </div>

          {/* Logo Aplikasi Klinik Section */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>Logo Aplikasi Klinik</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">PNG / JPG / WEBP (Max 2MB)</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Preview Box */}
              <div className="relative group w-20 h-20 rounded-2xl border-2 border-dashed border-indigo-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo Klinik Preview"
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=150&auto=format&fit=crop&q=80';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                    <span className="text-[9px]">Tanpa Logo</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer inline-flex items-center space-x-1.5 shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                      title="Kosongkan Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setLogoUrl('https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=150&auto=format&fit=crop&q=80')}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                    title="Gunakan Logo Default VetCare"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default</span>
                  </button>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Atau masukkan URL link gambar logo..."
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap (Ditampilkan di Nota & Surat)</label>
            <input type="text" required value={alamat} onChange={(e) => setAlamat(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">No. Telepon / WhatsApp Klinik</label>
              <input type="text" value={telepon} onChange={(e) => setTelepon(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Resmi</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Drh. Penanggung Jawab Klinik</label>
              <input type="text" value={drhPJ} onChange={(e) => setDrhPJ(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SIP Penanggung Jawab</label>
              <input type="text" value={sipPJ} onChange={(e) => setSipPJ(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pesan Footer Struk Nota POS Thermal</label>
            <input type="text" value={pesanNota} onChange={(e) => setPesanNota(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
          </div>

          <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center space-x-2">
            <Save className="w-4 h-4" />
            <span>Simpan Profil Klinik</span>
          </button>
        </div>

        {/* Setting Printer Thermal & Backup */}
        <div className="space-y-6 text-xs">
          
          {/* Printer Config */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Printer className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">Pengaturan Printer Thermal Nota</h3>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-2">Lebar Kertas Printer Thermal Kasir</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`p-3 rounded-xl border-2 flex items-center justify-center space-x-2 cursor-pointer font-bold ${
                  paperSize === '58mm' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-600'
                }`}>
                  <input type="radio" name="paper" value="58mm" checked={paperSize === '58mm'} onChange={() => setPaperSize('58mm')} className="sr-only" />
                  <span>Kertas 58 mm (Standard POS)</span>
                </label>

                <label className={`p-3 rounded-xl border-2 flex items-center justify-center space-x-2 cursor-pointer font-bold ${
                  paperSize === '80mm' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-600'
                }`}>
                  <input type="radio" name="paper" value="80mm" checked={paperSize === '80mm'} onChange={() => setPaperSize('80mm')} className="sr-only" />
                  <span>Kertas 80 mm (Lebar)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input type="checkbox" id="autoprint" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
              <label htmlFor="autoprint" className="font-semibold text-slate-700">Otomatis Muncul Dialog Cetak Setelah Pembayaran Kasir</label>
            </div>
          </div>

          {/* Setup Koneksi Database SQL / MySQL */}
          <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Koneksi Database SQL / Relational Engine</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center space-x-1 ${
                dbStatus.success ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                <CloudCheck className="w-3.5 h-3.5" />
                <span>{dbStatus.success ? 'SQL AKTIF & TERHUBUNG' : 'PERIKSA KONEKSI'}</span>
              </span>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              Aplikasi kini menggunakan <strong>Database SQL Relasional</strong> (Cloud SQL / MySQL Engine) dan koneksi Firestore telah <strong>diputus total</strong>. Semua transaksi, pasien, rekam medis, dan stok tersimpan langsung secara terstruktur.
            </p>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 font-mono text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans font-bold">Tipe Database:</span>
                <span className="font-bold text-indigo-700">{dbStatus.type || 'Cloud SQL Relational'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans font-bold">Nama Database:</span>
                <span className="font-bold text-slate-800">{dbStatus.database || 'klinik_hewan'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans font-bold">Status Firestore:</span>
                <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">TERPUTUS / DINONAKTIFKAN</span>
              </div>
            </div>

            {dbStatus.tested && (
              <div className={`p-3 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
                dbStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <Activity className="w-4 h-4 shrink-0" />
                <span>{dbStatus.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={dbTesting}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center space-x-2 cursor-pointer transition-colors"
              >
                <Server className={`w-4 h-4 ${dbTesting ? 'animate-spin' : ''}`} />
                <span>{dbTesting ? 'Menguji Koneksi...' : 'Uji Koneksi Database SQL'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await storageService.syncToSqlNow();
                    alert('Data berhasil disinkronkan ke Database MySQL!');
                  } catch (error: any) {
                    alert(`Sinkronisasi ke MySQL gagal: ${error.message}`);
                  }
                }}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200 flex items-center justify-center space-x-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sinkronkan ke SQL Sekarang</span>
              </button>
            </div>
          </div>

          {/* Integrasi & Export MySQL Database Untuk Hosting / cPanel */}
          <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Panduan & File SQL untuk Hosting / cPanel MySQL</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200">
                MySQL Hosting Ready
              </span>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              Saat hosting aplikasi di cPanel / VPS, Anda cukup mengimpor file <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-700">schema.sql</code> ke phpMyAdmin / MySQL untuk membuat seluruh tabel secara otomatis.
            </p>

            <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-2">
              <p className="font-bold flex items-center text-indigo-950">
                <Server className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Skema DDL & Export Database
              </p>
              <p className="text-[11px] text-slate-600">
                Gunakan tombol di bawah untuk mengunduh skema SQL lengkap berisi 17 tabel (Users, Pasien, Rekam Medis, Transaksi, Obat, Pakan, Spesies, Dokter, dll.).
              </p>
              
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="/api/mysql/schema-sql"
                  download="schema.sql"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download schema.sql (Untuk Hosting)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Backup & Restore Data JSON */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Database className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">Backup & Restore Database (JSON)</h3>
            </div>

            <p className="text-slate-500">
              Cadangkan seluruh data pasien, rekam medis, transaksi kasir, & stok barang ke dalam file format JSON aman.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackup}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Backup JSON</span>
              </button>

              <label className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md shadow-slate-300 flex items-center justify-center space-x-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Restore Database JSON</span>
                <input type="file" accept=".json" onChange={handleRestoreFile} className="sr-only" />
              </label>
            </div>
          </div>

          {/* Reset Database Kosong Section */}
          <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-rose-100">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-rose-900 text-sm">Reset Database (Kosongkan Data Operasional)</h3>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200/60 text-rose-800 space-y-1">
              <p className="font-bold flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1 text-rose-600" /> Perhatian:
              </p>
              <p className="text-[11px] leading-relaxed">
                Fitur ini akan <strong>mengosongkan data transaksi & operasional</strong> (Pasien, Rekam Medis, Antrian Pendaftaran, Transaksi Kasir, Rawat Inap, Janji Temu, Pembelian, dan Feedback).
              </p>
              <p className="text-[11px] font-bold text-rose-900 pt-1">
                ✓ Data Akun User, Password, Data Dokter, & Master Data (Obat, Tindakan, Pakan, Supplier) TETAP AMAN.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setConfirmInput('');
                setShowResetModal(true);
              }}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-200 flex items-center justify-center space-x-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset & Kosongkan Database</span>
            </button>
          </div>

        </div>

      </form>

      {/* Confirmation Modal for Database Reset */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="p-2.5 bg-rose-100 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Konfirmasi Reset Database</h3>
                  <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Apakah Anda yakin ingin mengosongkan seluruh data operasional klinik?
              </p>
              
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <p className="font-bold text-amber-900">Data Transaksi & Operasional yang Dikosongkan:</p>
                <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                  <li>Data Pasien & Rekam Medis (SOAP)</li>
                  <li>Antrian Pendaftaran & Rawat Inap</li>
                  <li>Transaksi Nota Kasir & Laporan Keuangan</li>
                  <li>Pembelian Supplier & Riwayat Janji Temu</li>
                  <li>Feedback Pelanggan & Log WA</li>
                </ul>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <p className="font-bold text-emerald-900 text-[11px]">
                  🔒 DATA TETAP AMAN & TIDAK DIHAPUS:
                </p>
                <ul className="list-disc list-inside text-[10px] text-emerald-800 font-semibold space-y-0.5">
                  <li>Akun User & Password Login</li>
                  <li>Data Dokter Hewan</li>
                  <li>Master Obat/Barang, Tindakan, Pakan, & Supplier</li>
                </ul>
              </div>

              <div className="pt-2">
                <label className="block font-bold text-slate-800 mb-1">
                  Ketik <span className="text-rose-600 font-extrabold underline">RESET</span> untuk konfirmasi:
                </label>
                <input
                  type="text"
                  placeholder="Ketik RESET disini..."
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 focus:border-rose-600 focus:outline-none font-extrabold uppercase text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={confirmInput.trim().toUpperCase() !== 'RESET'}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center space-x-1.5 transition-all ${
                  confirmInput.trim().toUpperCase() === 'RESET'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Reset Database</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

