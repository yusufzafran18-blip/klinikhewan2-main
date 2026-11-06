import React, { useState } from 'react';
import {
  BookOpen, Search, Printer, Download, CheckCircle2, ChevronRight,
  ChevronDown, Stethoscope, Users, BedDouble, CreditCard, ShoppingBag,
  Database, ShoppingCart, Settings, ShieldCheck, MessageSquare,
  HelpCircle, Sparkles, Layers, FileText, Activity, AlertTriangle,
  ClipboardList, Calendar, Info, ArrowRight, ExternalLink
} from 'lucide-react';
import { DataKlinik, User } from '../../types';

interface PanduanViewProps {
  klinik: DataKlinik;
  activeUser: User;
  onNavigateTab?: (tab: string) => void;
}

interface Chapter {
  id: string;
  nomor: string;
  judul: string;
  kategoriPeran: ('Semua' | 'Dokter' | 'Resepsionis' | 'Kasir' | 'Farmasi' | 'Admin')[];
  icon: React.ElementType;
  ringkasan: string;
  konten: React.ReactNode;
}

export const PanduanView: React.FC<PanduanViewProps> = ({ klinik, activeUser, onNavigateTab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Semua' | 'Dokter' | 'Resepsionis' | 'Kasir' | 'Farmasi' | 'Admin'>('Semua');
  const [expandedChapterId, setExpandedChapterId] = useState<string>('bab-3');

  const handlePrintManual = () => {
    const docTitle = `Buku_Panduan_Penggunaan_${klinik.namaKlinik.replace(/\s+/g, '_')}`;
    const printableEl = document.getElementById('manual-book-content');

    if (!printableEl) {
      window.print();
      return;
    }

    try {
      const oldFrame = document.getElementById('receipt-print-iframe');
      if (oldFrame) oldFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'receipt-print-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.left = '-9999px';
      printFrame.style.top = '-9999px';
      printFrame.style.width = '210mm';
      printFrame.style.height = '297mm';
      printFrame.style.border = '0';
      printFrame.style.opacity = '0';
      printFrame.style.pointerEvents = 'none';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (!frameDoc) throw new Error('Cannot access frame doc');

      const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((n) => n.outerHTML)
        .join('\n');

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="utf-8" />
            <title>${docTitle}</title>
            ${styleTags}
            <style>
              *, *::before, *::after {
                visibility: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                size: A4 portrait;
                margin: 12mm 15mm;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              .no-print, .print\\:hidden {
                display: none !important;
              }
            </style>
          </head>
          <body>
            <div style="padding: 10px;">
              ${printableEl.outerHTML}
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (_) {
          window.print();
        }
      }, 300);
    } catch (_) {
      window.print();
    }
  };

  const handleDownloadMarkdown = () => {
    // Read the markdown content and trigger file download
    fetch('/BUKU_PANDUAN_PENGGUNAAN.md')
      .then((res) => {
        if (!res.ok) throw new Error('File not found');
        return res.text();
      })
      .then((text) => {
        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BUKU_PANDUAN_VETCARE_${klinik.namaKlinik.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch(() => {
        window.alert('Berkas markdown tersedia di root direktori BUKU_PANDUAN_PENGGUNAAN.md');
      });
  };

  const chapters: Chapter[] = [
    {
      id: 'bab-1',
      nomor: 'BAB 1',
      judul: 'Gambaran Umum Sistem & Hak Akses (RBAC)',
      kategoriPeran: ['Semua', 'Admin'],
      icon: ShieldCheck,
      ringkasan: 'Mengenal struktur sistem VetCare Pro, 4 tingkatan peran pengguna, dan navigasi antarmuka.',
      konten: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            <strong>VetCare Pro</strong> adalah sistem manajemen operasional terpadu yang dirancang khusus untuk klinik hewan, praktek dokter hewan bersama, dan petshop.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <h5 className="font-bold text-purple-900 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span> Super Admin & Admin
              </h5>
              <p className="text-xs text-purple-800">
                Memiliki wewenang penuh konfigurasi klinik, manajemen pengguna & RBAC, backup database, master data, dan laporan keuangan komprehensif.
              </p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <h5 className="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span> Dokter Hewan (drh.)
              </h5>
              <p className="text-xs text-blue-800">
                Fokus pada pemeriksaan fisik SOAP, penetapan diagnosa utama & banding, peresepan obat jadi/racikan, dan pemantauan kondisi rawat inap.
              </p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <h5 className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Kasir & Resepsionis
              </h5>
              <p className="text-xs text-emerald-800">
                Bertanggung jawab atas registrasi pasien baru, antrian harian, pencetakan struk/nota rincian biaya, dan penjualan kasir PetShop direct.
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <h5 className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span> Farmasi & Gudang
              </h5>
              <p className="text-xs text-amber-800">
                Mengelola persediaan obat, alkes & BMHP, pencatatan faktur barang masuk dari supplier, serta monitoring mutasi stok otomatis.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-2',
      nomor: 'BAB 2',
      judul: 'Pendaftaran Pasien & Manajemen Antrian',
      kategoriPeran: ['Semua', 'Resepsionis'],
      icon: ClipboardList,
      ringkasan: 'Tata cara mendaftarkan pasien baru/lama, nomor antrian otomatis (RJ/RI), dan sinkronisasi status.',
      konten: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Buka Menu Pendaftaran & Antrian</strong> dari sidebar navigasi kiri.
            </li>
            <li>
              Klik tombol hijau <strong>+ Tambah Pendaftaran / Antrian</strong> di pojok kanan atas.
            </li>
            <li>
              Pilih tipe pendaftaran:
              <ul className="list-disc pl-5 mt-1 text-xs text-slate-600 space-y-1">
                <li><strong>Pasien Lama:</strong> Ketik nama hewan, nama pemilik, atau nomor RM pada kotak pencarian cepat.</li>
                <li><strong>Pasien & Pemilik Baru:</strong> Isi data pemilik (Nama, No. WhatsApp, Alamat) dan data hewan (Nama, Spesies, Ras, Jenis Kelamin, Tanggal Lahir).</li>
              </ul>
            </li>
            <li>
              Pilih <strong>Jenis Layanan</strong>:
              <ul className="list-disc pl-5 mt-1 text-xs text-slate-600 space-y-1">
                <li><strong>Rawat Jalan:</strong> Pasien diperiksa di poli dan langsung pulang setelah bayar. Format antrian otomatis <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-bold">RJ-xxx</code>.</li>
                <li><strong>Rawat Inap:</strong> Pasien diopname. Tentukan nomor kandang dan tarif harian. Format antrian otomatis <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700 font-bold">RI-xxx</code>.</li>
              </ul>
            </li>
            <li>
              <strong>Status Antrian Otomatis</strong>:
              <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                <strong>Catatan Penting:</strong> Status pasien akan otomatis berubah menjadi <strong>Selesai</strong> saat pasien telah melunasi pembayaran di kasir atau telah dipulangkan dari rawat inap. Anda juga dapat mengubah status secara manual lewat menu dropdown status pada tabel antrian.
              </div>
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'bab-3',
      nomor: 'BAB 3',
      judul: 'Pemeriksaan Rekam Medis (SOAP)',
      kategoriPeran: ['Semua', 'Dokter'],
      icon: Stethoscope,
      ringkasan: 'Panduan pengisian rekam medis standar SOAP, obat racikan, tindakan medis, dan integrasi tagihan.',
      konten: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            Dokter hewan dapat memulai pemeriksaan dengan mengklik tombol <strong>Mulai SOAP RJ</strong> pada daftar antrian pasien.
          </p>
          <div className="space-y-3">
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <h5 className="font-bold text-slate-800 text-xs mb-1">1. Subjective (S) - Anamnesa & Keluhan</h5>
              <p className="text-xs text-slate-600">
                Catat keluhan utama pemilik, nafsu makan/minum, durasi sakit, riwayat muntah/diare, dan riwayat kontak lingkungan.
              </p>
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <h5 className="font-bold text-slate-800 text-xs mb-1">2. Objective (O) - Tanda Vital & Fisik</h5>
              <p className="text-xs text-slate-600">
                Input berat badan (kg), suhu tubuh (°C), CRT, hidrasi (%), detak jantung, serta temuan inspeksi/auskultasi fisik.
              </p>
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <h5 className="font-bold text-slate-800 text-xs mb-1">3. Assessment (A) - Diagnosa</h5>
              <p className="text-xs text-slate-600">
                Masukkan diagnosa primer/utama serta diagnosa banding jika diperlukan pengujian laboratorium lanjutan.
              </p>
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <h5 className="font-bold text-slate-800 text-xs mb-1">4. Plan (P) - Terapi, Obat & Edukasi</h5>
              <p className="text-xs text-slate-600">
                Pilih tindakan medis berbayar, resep obat paten/jadi, racikan kapsul/puyer, alkes terpakai (spuit/perban), dan tanggal kontrol ulang.
              </p>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <strong>Otomasi:</strong> Begitu form SOAP disimpan, total tagihan medis otomatis terakumulasi dan langsung tampil pada antrian pembayaran menu Kasir POS.
          </div>
        </div>
      ),
    },
    {
      id: 'bab-4',
      nomor: 'BAB 4',
      judul: 'Rawat Inap & Monitoring Shift Paramedis',
      kategoriPeran: ['Semua', 'Dokter', 'Farmasi'],
      icon: BedDouble,
      ringkasan: 'Alur admisi kandang, monitoring kondisi shift harian, pencatatan obat inap, dan discharge (pulang).',
      konten: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Pencatatan Monitoring Per Shift</strong>: Petugas/paramedis menginput evaluasi berkala (Shift Pagi, Siang, Malam): suhu, nafsu makan, BAB/BAK, kondisi umum, dan obat yang diinjeksikan.
            </li>
            <li>
              <strong>Pemberian Obat & BMHP Inap</strong>: Tambahkan pemakaian obat oral, injeksi, infus, atau pakan basah khusus selama masa rawat. Seluruh item ini akan terekam ke lembar tagihan rawat inap.
            </li>
            <li>
              <strong>Memulangkan Pasien (Discharge)</strong>:
              <ul className="list-disc pl-5 mt-1 text-xs text-slate-600 space-y-1">
                <li>Klik tombol <strong>Selesai / Pulang</strong> pada kartu rawat inap pasien.</li>
                <li>Sistem otomatis menghitung durasi menginap: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-700">Jumlah Hari x Tarif Kandang</code> ditambah rincian obat, alkes, dan tindakan.</li>
                <li>Nota tagihan diteruskan ke Kasir dan antrian pasien di menu Pendaftaran disinkronkan menjadi <strong>Selesai</strong>.</li>
              </ul>
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'bab-5',
      nomor: 'BAB 5',
      judul: 'Kasir POS, Pembayaran Nota & Cetak Struk',
      kategoriPeran: ['Semua', 'Kasir'],
      icon: CreditCard,
      ringkasan: 'Pelunasan tagihan rawat jalan & inap, diskon, cetak nota resmi A4/F4, dan cetak thermal 58/80mm.',
      konten: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h5 className="font-bold text-slate-800 text-xs">Langkah Pembayaran di Kasir:</h5>
            <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1.5">
              <li>Buka menu <strong>Kasir Pembayaran Nota</strong>.</li>
              <li>Pilih tagihan pasien dari daftar <strong>Menunggu Pembayaran</strong> (Rawat Jalan atau Rawat Inap).</li>
              <li>Periksa item tindakan, obat, dan alkes. Masukkan nominal diskon bila ada promosi.</li>
              <li>Pilih metode pembayaran (Tunai, Transfer QRIS, atau Kartu Debit) dan masukkan nominal bayar.</li>
              <li>Klik <strong>Proses Pembayaran & Cetak Nota</strong>.</li>
            </ol>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <h5 className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-indigo-600" /> Cetak Nota Resmi (A4 / F4)
              </h5>
              <p className="text-xs text-slate-600">
                Dilengkapi KOP klinik, logo, identitas lengkap pasien & pemilik, tabel item per kategori, subtotal, dan tanda tangan. Bersih dari bilah navigasi aplikasi.
              </p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <h5 className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-emerald-600" /> Cetak Thermal (58mm / 80mm)
              </h5>
              <p className="text-xs text-slate-600">
                Format struk kasir cepat untuk printer thermal POS mini (kertas gulung) kasir klinik.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-6',
      nomor: 'BAB 6',
      judul: 'Stok Obat, Mutasi Otomatis & Pembelian PO',
      kategoriPeran: ['Semua', 'Farmasi', 'Admin'],
      icon: Database,
      ringkasan: 'Kartu stok otomatis, peringatan stok menipis (Safety Stock), dan pencatatan faktur barang masuk.',
      konten: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            VetCare Pro menerapkan <strong>Sistem Mutasi Stok Otomatis</strong>:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>
              <strong>Stok Berkurang Otomatis</strong>: Saat transaksi kasir rawat jalan, rawat inap, atau penjualan petshop dilunasi (*Lunas*).
            </li>
            <li>
              <strong>Stok Bertambah Otomatis</strong>: Saat faktur pembelian barang masuk dari distributor/supplier dicatat di menu <strong>Pembelian Stok Barang</strong>.
            </li>
            <li>
              <strong>Peringatan Stok Menipis</strong>: Barang yang stoknya mencapai batas minimum langsung diberi tanda merah di Dashboard dan Navbar.
            </li>
            <li>
              <strong>Pengembalian Stok (Revert)</strong>: Jika nota transaksi dibatalkan (*Void*), stok barang otomatis dikembalikan ke gudang secara akurat.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'bab-7',
      nomor: 'BAB 7',
      judul: 'Laporan Keuangan & Tren Penyakit',
      kategoriPeran: ['Semua', 'Admin'],
      icon: Activity,
      ringkasan: 'Laporan omset harian/bulanan, laba kotor penjualan obat/petshop, dan analisis tren diagnosa.',
      konten: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            Administrator dan pemilik klinik dapat mengakses menu <strong>Laporan Keuangan & Laba Rugi</strong> untuk memantau kesehatan finansial klinik:
          </p>
          <div className="space-y-2 text-xs text-slate-600">
            <p>• <strong>Laporan Pendapatan Kasir</strong>: Rincian total penerimaan kasir tunai vs nontunai (QRIS/Transfer).</p>
            <p>• <strong>Laporan Margin Laba Produk</strong>: Menghitung selisih harga jual dan harga beli modal (*HPP*) per produk yang terjual.</p>
            <p>• <strong>Laporan Tren Penyakit</strong>: Grafik kasus penyakit terbanyak yang ditangani dokter klinik untuk perencanaan pengadaan obat dan pencegahan wabah.</p>
            <p>• <strong>Ekspor Excel (.xlsx)</strong>: Semua laporan dapat diunduh untuk kebutuhan pembukuan atau pelaporan pajak.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-8',
      nomor: 'BAB 8',
      judul: 'Integrasi WhatsApp Gateway Digital',
      kategoriPeran: ['Semua', 'Admin', 'Resepsionis'],
      icon: MessageSquare,
      ringkasan: 'Kirim struk digital, pengingat janji temu, dan notifikasi kontrol ulang langsung ke nomor WhatsApp pemilik.',
      konten: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            Tingkatkan kepuasan pemilik hewan (*client satisfaction*) dengan notifikasi otomatis langsung ke WhatsApp:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>Struk & Rincian Biaya Digital</strong>: Kirim ringkasan invoice tanpa perlu mencetak kertas fisik.</li>
            <li><strong>Pengingat Kontrol Ulang Medis</strong>: Otomatis mengingatkan H-1 sebelum jadwal kontrol pasien.</li>
            <li><strong>Pengingat Vaksinasi Tahunan</strong>: Menjaga hewan kesayangan tetap terlindungi tepat waktu.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'bab-9',
      nomor: 'BAB 9',
      judul: 'Backup Database & Pengaturan Profil Klinik',
      kategoriPeran: ['Semua', 'Admin'],
      icon: Settings,
      ringkasan: 'Pengaturan KOP surat & logo nota resmi, ekspor cadangan database (.json), dan reset data.',
      konten: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            Menu <strong>Pengaturan & Backup</strong> memberikan kendali penuh terhadap data institusi klinik:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>Profil & Logo Klinik</strong>: Nama klinik, alamat, telepon, dan nomor izin operasional yang diatur di sini akan otomatis terpasang pada KOP seluruh cetakan nota resmi (A4, F4, Thermal).</li>
            <li><strong>Backup Berkala</strong>: Klik tombol <strong>Ekspor Backup Lengkap (.json)</strong> secara berkala (misal: seminggu sekali) untuk menyimpan salinan cadangan data aman di komputer Anda.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'bab-10',
      nomor: 'BAB 10',
      judul: 'Instalasi Komputer Lokal & Hosting Web',
      kategoriPeran: ['Semua', 'Admin'],
      icon: ExternalLink,
      ringkasan: 'Menjalankan aplikasi via install.bat / start.bat di Windows offline serta upload ke cPanel / JagoanHosting.',
      konten: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="p-3 bg-slate-900 text-slate-100 rounded-xl space-y-2 font-mono text-xs">
            <p className="text-emerald-400 font-bold font-sans">A. Menjalankan di Komputer Lokal (Windows Offline):</p>
            <p>1. Klik ganda berkas: <strong>install.bat</strong> (hanya saat pertama kali instalasi).</p>
            <p>2. Klik ganda berkas: <strong>start.bat</strong> (untuk menyalakan aplikasi setiap hari).</p>
            <p>3. Buka browser pada alamat: <span className="text-indigo-300">http://localhost:3000</span></p>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1 text-xs text-indigo-900">
            <p className="font-bold">B. Menjalankan di cPanel / JagoanHosting:</p>
            <p>Gunakan fitur <strong>Setup Node.js App</strong> (pilih versi Node.js 18.x atau 20.x), atur database MySQL pada cPanel, masukkan kredensial ke berkas <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono">.env</code>, dan klik <strong>Start Application</strong>.</p>
          </div>
        </div>
      ),
    },
  ];

  // Filtering
  const filteredChapters = chapters.filter((c) => {
    const matchRole = selectedRole === 'Semua' || c.kategoriPeran.includes(selectedRole);
    const matchQuery =
      searchQuery === '' ||
      c.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ringkasan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nomor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchQuery;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buku Panduan Resmi Sistem Operasional</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
              Buku Manual Penggunaan VetCare Pro
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Panduan lengkap langkah demi langkah operasional klinik hewan, alur antrian, rekam medis SOAP, monitoring rawat inap, kasir POS nota A4/thermal, hingga manajemen persediaan obat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handlePrintManual}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
              title="Cetak format buku PDF (A4)"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Manual (PDF)</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer"
              title="Unduh berkas dokumentasi markdown"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Unduh File (.md)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Role Quick Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik panduan (contoh: cetak nota, antrian, rawat inap, kasir, rekam medis)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-indigo-600 font-bold hover:underline shrink-0"
            >
              Reset Pencarian
            </button>
          )}
        </div>

        {/* Role Filter Badges */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Filter Peran:</span>
          {(['Semua', 'Dokter', 'Resepsionis', 'Kasir', 'Farmasi', 'Admin'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedRole === role
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {role === 'Semua' ? '🌟 Semua Peran' :
               role === 'Dokter' ? '🩺 Dokter Hewan' :
               role === 'Resepsionis' ? '📋 Resepsionis' :
               role === 'Kasir' ? '💳 Kasir & POS' :
               role === 'Farmasi' ? '📦 Farmasi / Gudang' :
               '⚙️ Super Admin'}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Clinical Workflow Chart */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Alur Kerja Utama Klinik (End-to-End Workflow)</h3>
              <p className="text-xs text-slate-500">Urutan alur dari pasien datang hingga pulang dan pelunasan kasir</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold mb-2">Langkah 1</span>
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">Pendaftaran Pasien</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">Pasien baru/lama didaftarkan. Nomor antrian RJ atau RI terbit otomatis.</p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('pendaftaran')}
                className="mt-3 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
              >
                <span>Buka Menu</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 text-[10px] font-bold mb-2">Langkah 2</span>
              <h4 className="font-extrabold text-indigo-950 text-xs sm:text-sm">Pemeriksaan SOAP</h4>
              <p className="text-[11px] text-indigo-900 mt-1 leading-snug">Dokter menginput tanda vital, diagnosa, tindakan, resep obat paten & racikan.</p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('rekam_medis')}
                className="mt-3 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
              >
                <span>Buka Menu</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold mb-2">Langkah 3</span>
              <h4 className="font-extrabold text-purple-950 text-xs sm:text-sm">Rawat Inap / Observasi</h4>
              <p className="text-[11px] text-purple-900 mt-1 leading-snug">Bila butuh opname, masuk kandang. Dipantau per shift hingga diizinkan pulang.</p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('rawat_inap')}
                className="mt-3 text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center space-x-1"
              >
                <span>Buka Menu</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-bold mb-2">Langkah 4</span>
              <h4 className="font-extrabold text-emerald-950 text-xs sm:text-sm">Kasir Pembayaran</h4>
              <p className="text-[11px] text-emerald-900 mt-1 leading-snug">Pelunasan nota, pemotongan stok otomatis, cetak nota A4/F4 & thermal.</p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('kasir')}
                className="mt-3 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
              >
                <span>Buka Menu</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold mb-2">Langkah 5</span>
              <h4 className="font-extrabold text-blue-950 text-xs sm:text-sm">Pasien Selesai & Pulang</h4>
              <p className="text-[11px] text-blue-900 mt-1 leading-snug">Status antrian otomatis terupdate menjadi "Selesai", struk dikirim via WhatsApp.</p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('whatsapp')}
                className="mt-3 text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center space-x-1"
              >
                <span>Kirim WA</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chapters Accordion List */}
      <div id="manual-book-content" className="space-y-4">
        {filteredChapters.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">Tidak ditemukan topik panduan</h4>
            <p className="text-xs text-slate-400 mt-1">Coba gunakan kata kunci pencarian lain atau pilih filter "Semua Peran".</p>
          </div>
        ) : (
          filteredChapters.map((chapter) => {
            const Icon = chapter.icon;
            const isExpanded = expandedChapterId === chapter.id;

            return (
              <div
                key={chapter.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-150"
              >
                {/* Chapter Header Bar */}
                <button
                  type="button"
                  onClick={() => setExpandedChapterId(isExpanded ? '' : chapter.id)}
                  className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-start sm:items-center space-x-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {chapter.nomor}
                        </span>
                        <div className="flex items-center space-x-1">
                          {chapter.kategoriPeran.filter(k => k !== 'Semua').map((k) => (
                            <span key={k} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">
                        {chapter.judul}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                        {chapter.ringkasan}
                      </p>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 shrink-0">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </button>

                {/* Chapter Expanded Body */}
                {isExpanded && (
                  <div className="px-5 pb-6 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                    {chapter.konten}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info Box */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1 text-xs text-slate-500">
        <p className="font-bold text-slate-700">{klinik.namaKlinik} • VetCare Pro v2.6</p>
        <p>{klinik.alamat} | Telp / WA: {klinik.telepon || '-'}</p>
        <p className="text-[11px] text-slate-400 pt-1">Buku panduan ini diperbarui secara otomatis sesuai fitur sistem terkini.</p>
      </div>

    </div>
  );
};
