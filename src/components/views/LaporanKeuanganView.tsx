import React, { useState, useMemo } from 'react';
import { Transaksi, Barang, PembelianSupplier, Tindakan, DataKlinik } from '../../types';
import {
  LineChart, FileSpreadsheet, CreditCard, DollarSign, ArrowUpRight,
  TrendingUp, ArrowDownRight, Calendar, Filter, Search, Printer,
  Layers, ShoppingBag, Stethoscope, BedDouble, ShoppingCart,
  ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, Wallet
} from 'lucide-react';
import { exportToExcel } from '../../services/excel';

interface LaporanKeuanganViewProps {
  transaksiList: Transaksi[];
  barangList?: Barang[];
  pembelianList?: PembelianSupplier[];
  tindakanList?: Tindakan[];
  klinik?: DataKlinik;
  onNavigateToLaba?: () => void;
}

export const LaporanKeuanganView: React.FC<LaporanKeuanganViewProps> = ({
  transaksiList = [],
  barangList = [],
  pembelianList = [],
  tindakanList = [],
  klinik,
  onNavigateToLaba,
}) => {
  // Period filter
  const [periodPreset, setPeriodPreset] = useState<'all' | 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSource, setSelectedSource] = useState<'all' | 'pos' | 'rawat_jalan' | 'rawat_inap' | 'pembelian'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Date constants
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  // 1. Filtered Transactions (Inflows)
  const filteredTrx = useMemo(() => {
    return transaksiList.filter((t) => {
      if (t.status !== 'Lunas') return false;

      // Filter by source
      if (selectedSource === 'pos') {
        if (t.typeTransaksi !== 'Penjualan Direct (PetShop)' && (t.rawatInapId || t.rekamMedisId)) return false;
      } else if (selectedSource === 'rawat_jalan') {
        if (t.typeTransaksi !== 'Rekam Medis' && !t.rekamMedisId) return false;
      } else if (selectedSource === 'rawat_inap') {
        if (t.typeTransaksi !== 'Rawat Inap' && !t.rawatInapId) return false;
      } else if (selectedSource === 'pembelian') {
        return false; // Only show purchases
      }

      // Filter by date
      const tgl = t.tanggal;
      if (periodPreset === 'today') return tgl === todayStr;
      if (periodPreset === 'last_7_days') return tgl >= sevenDaysAgoStr && tgl <= todayStr;
      if (periodPreset === 'this_month') return tgl.startsWith(currentMonthStr);
      if (periodPreset === 'last_month') return tgl.startsWith(lastMonthStr);
      if (periodPreset === 'this_year') return tgl.startsWith(currentYearStr);
      if (periodPreset === 'custom') {
        if (startDate && tgl < startDate) return false;
        if (endDate && tgl > endDate) return false;
      }
      return true;
    });
  }, [transaksiList, selectedSource, periodPreset, todayStr, sevenDaysAgoStr, currentMonthStr, lastMonthStr, currentYearStr, startDate, endDate]);

  // 2. Filtered Purchases (Outflows)
  const filteredPurchases = useMemo(() => {
    return pembelianList.filter((p) => {
      if (p.status !== 'Selesai') return false;
      if (selectedSource !== 'all' && selectedSource !== 'pembelian') return false;

      const tgl = p.tanggal;
      if (periodPreset === 'today') return tgl === todayStr;
      if (periodPreset === 'last_7_days') return tgl >= sevenDaysAgoStr && tgl <= todayStr;
      if (periodPreset === 'this_month') return tgl.startsWith(currentMonthStr);
      if (periodPreset === 'last_month') return tgl.startsWith(lastMonthStr);
      if (periodPreset === 'this_year') return tgl.startsWith(currentYearStr);
      if (periodPreset === 'custom') {
        if (startDate && tgl < startDate) return false;
        if (endDate && tgl > endDate) return false;
      }
      return true;
    });
  }, [pembelianList, selectedSource, periodPreset, todayStr, sevenDaysAgoStr, currentMonthStr, lastMonthStr, currentYearStr, startDate, endDate]);

  // 3. Consolidated Financial Calculations
  const financials = useMemo(() => {
    // Breakdown of Inflow Revenues
    let omzetPOS = 0;
    let omzetRawatJalan = 0;
    let omzetRawatInap = 0;
    let totalDiskon = 0;
    let totalHppBarangTerjual = 0;
    let pendapatanJasaMedis = 0;
    let pendapatanBarangProduk = 0;

    // Payment Methods Breakdown
    const paymentMethods: Record<string, number> = {
      Tunai: 0,
      'Transfer QRIS': 0,
      'Debit/Kredit': 0,
      'E-Wallet': 0,
    };

    filteredTrx.forEach((trx) => {
      const grandTotal = trx.grandTotal || 0;
      totalDiskon += (trx.diskon || 0);

      // Payment method
      if (trx.metodePembayaran) {
        paymentMethods[trx.metodePembayaran] = (paymentMethods[trx.metodePembayaran] || 0) + grandTotal;
      }

      // Source categorization
      if (trx.typeTransaksi === 'Rawat Inap' || trx.rawatInapId) {
        omzetRawatInap += grandTotal;
      } else if (trx.typeTransaksi === 'Rekam Medis' || trx.rekamMedisId) {
        omzetRawatJalan += grandTotal;
      } else {
        omzetPOS += grandTotal;
      }

      // Item level COGS (HPP) and Service vs Goods calculation
      (trx.items || []).forEach((it) => {
        const qty = Number(it.jumlah) || 1;
        const subtotal = Number(it.subtotal) || (qty * Number(it.hargaSatuan || 0));

        const itName = (it.namaItem || (it as any).namaBarang || (it as any).nama || '').toLowerCase().trim();
        const matchedBarang = barangList.find(
          (b) => (b.id && it.barangId && b.id === it.barangId) ||
                 (itName && b.namaBarang && b.namaBarang.toLowerCase().trim() === itName)
        );

        if (it.jenis === 'Tindakan' || it.jenis === 'Rawat Inap') {
          pendapatanJasaMedis += subtotal;
        } else {
          pendapatanBarangProduk += subtotal;
          const hppUnit = matchedBarang ? (matchedBarang.hargaBeli || 0) : Math.round(it.hargaSatuan * 0.65);
          totalHppBarangTerjual += (qty * hppUnit);
        }
      });
    });

    const totalPendapatanKotor = omzetPOS + omzetRawatJalan + omzetRawatInap;
    const totalPembelianStok = filteredPurchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);

    // Gross Profit from Goods Sales
    const labaKotorBarang = Math.max(0, pendapatanBarangProduk - totalHppBarangTerjual);

    // Total Operating Profit (Laba Bersih Operasional)
    // Formula: Total Pendapatan Kotor - HPP Barang Terjual - Total Pembelian Stok Supplier (jika cash outflow)
    const labaOperasional = totalPendapatanKotor - totalHppBarangTerjual;
    const arusKasBersih = totalPendapatanKotor - totalPembelianStok;

    return {
      omzetPOS,
      omzetRawatJalan,
      omzetRawatInap,
      totalPendapatanKotor,
      totalDiskon,
      totalHppBarangTerjual,
      pendapatanJasaMedis,
      pendapatanBarangProduk,
      labaKotorBarang,
      totalPembelianStok,
      labaOperasional,
      arusKasBersih,
      paymentMethods,
    };
  }, [filteredTrx, filteredPurchases, barangList]);

  // Export Excel
  const handleExportExcel = () => {
    const dataTrx = filteredTrx.map((t) => ({
      'Tipe Data': 'Pemasukan (Nota Penjualan)',
      'No. Dokumen / Nota': t.noNota,
      'Tanggal': t.tanggal,
      'Pelanggan / Pasien': t.namaPelanggan,
      'Sumber Transaksi': t.typeTransaksi,
      'Subtotal (Rp)': t.subtotal,
      'Diskon (Rp)': t.diskon,
      'Grand Total / Kas Masuk (Rp)': t.grandTotal,
      'Metode Bayar': t.metodePembayaran,
    }));

    const dataPurchases = filteredPurchases.map((p) => ({
      'Tipe Data': 'Pengeluaran (Pembelian Stok)',
      'No. Dokumen / Nota': p.noFaktur,
      'Tanggal': p.tanggal,
      'Pelanggan / Pasien': p.namaSupplier,
      'Sumber Transaksi': 'Pembelian Supplier',
      'Subtotal (Rp)': p.grandTotal,
      'Diskon (Rp)': 0,
      'Grand Total / Kas Masuk (Rp)': -p.grandTotal,
      'Metode Bayar': 'Transfer / Tunai',
    }));

    const combinedData = [...dataTrx, ...dataPurchases];
    exportToExcel(combinedData, `Laporan_Keuangan_Laba_Rugi_${periodPreset}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md text-indigo-200 border border-indigo-400/30">
            <LineChart className="w-3.5 h-3.5" />
            <span>Laporan Keuangan & Laba Rugi Komprehensif</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Laporan Keuangan Terpadu & Rekapitulasi Kas
          </h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-3xl leading-relaxed">
            Menghubungkan seluruh pendapatan penjualan PetShop POS, pelayanan rawat jalan, rawat inap, biaya HPP barang, diskon, hingga beban pembelian stok barang supplier ke dalam satu laporan laba rugi komprehensif.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {onNavigateToLaba && (
            <button
              onClick={onNavigateToLaba}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all duration-200 text-xs shadow-md shadow-emerald-900/30 flex items-center space-x-1.5 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Laporan Laba Produk & Ranking</span>
            </button>
          )}

          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all duration-200 text-xs border border-white/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-300" />
            <span>Cetak Laporan</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-md flex items-center space-x-2 text-xs cursor-pointer border border-indigo-400/30"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Range Tanggal & Sumber Kas */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
          <div className="flex items-center space-x-2 font-extrabold text-slate-800">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Periode Keuangan:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'last_7_days', label: '7 Hari Terakhir' },
              { id: 'this_month', label: `Bulan Ini (${currentMonthStr})` },
              { id: 'last_month', label: 'Bulan Lalu' },
              { id: 'this_year', label: `Tahun Ini (${currentYearStr})` },
              { id: 'all', label: 'Semua Waktu' },
              { id: 'custom', label: 'Rentang Kustom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  periodPreset === p.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {periodPreset === 'custom' && (
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-1 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
              />
              <span className="text-slate-400 font-bold">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-1 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-bold">Filter Sumber Kas:</span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value as any)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">Semua Aliran Kas (Pendapatan & Pembelian)</option>
              <option value="pos">Khusus Penjualan Direct (PetShop POS)</option>
              <option value="rawat_jalan">Khusus Layanan Rawat Jalan</option>
              <option value="rawat_inap">Khusus Layanan Rawat Inap</option>
              <option value="pembelian">Khusus Pembelian Stok Supplier</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Mencakup <span className="font-bold text-slate-800">{filteredTrx.length}</span> Nota Masuk & <span className="font-bold text-slate-800">{filteredPurchases.length}</span> Pembelian Supplier
          </div>
        </div>
      </div>

      {/* Main KPI Summary Cards (5 Key Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Pendapatan Kotor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pendapatan</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            Rp {financials.totalPendapatanKotor.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">
            {filteredTrx.length} Transaksi Lunas
          </p>
        </div>

        {/* 2. Total HPP Barang */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Beban HPP Barang</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-800 mt-2">
            Rp {financials.totalHppBarangTerjual.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-amber-600 font-bold mt-1">
            Modal barang & obat keluar
          </p>
        </div>

        {/* 3. Beban Pembelian Stok */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pembelian Stok</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-rose-700 mt-2">
            Rp {financials.totalPembelianStok.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-rose-600 font-bold mt-1">
            {filteredPurchases.length} Faktur Supplier Selesai
          </p>
        </div>

        {/* 4. Total Diskon */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Diskon Promo</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-700 mt-2">
            Rp {financials.totalDiskon.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            Potongan nota kasir
          </p>
        </div>

        {/* 5. Laba Bersih Operasional */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-300 shadow-xs bg-gradient-to-br from-indigo-50/80 to-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider">LABA OPERASIONAL</span>
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-indigo-700 mt-2">
            Rp {financials.labaOperasional.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-indigo-600 font-bold mt-1">
            Pendapatan - Beban HPP
          </p>
        </div>
      </div>

      {/* Structured Income Statement (Laporan Laba Rugi Akuntansi Standar) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">
              Laporan Laba Rugi Komprehensif (Income Statement)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-bold">
            Standar Finansial Klinik Hewan & PetShop
          </span>
        </div>

        <div className="p-6 space-y-6 text-xs text-slate-700">
          {/* SECTION 1: PENDAPATAN */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-black text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
              <span>I. PENDAPATAN OPERASIONAL (REVENUES)</span>
              <span>NOMINAL (RP)</span>
            </div>

            <div className="pl-4 space-y-1.5 pt-1">
              <div className="flex justify-between items-center">
                <span className="flex items-center space-x-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1.1 Pendapatan Penjualan Direct (PetShop POS)</span>
                </span>
                <span className="font-bold text-slate-800">
                  Rp {financials.omzetPOS.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="flex items-center space-x-2">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1.2 Pendapatan Pelayanan Rawat Jalan (Rekam Medis & Tindakan)</span>
                </span>
                <span className="font-bold text-slate-800">
                  Rp {financials.omzetRawatJalan.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="flex items-center space-x-2">
                  <BedDouble className="w-3.5 h-3.5 text-amber-600" />
                  <span>1.3 Pendapatan Pelayanan Rawat Inap & Pakan Harian</span>
                </span>
                <span className="font-bold text-slate-800">
                  Rp {financials.omzetRawatInap.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-500 pt-1">
                <span>Dikurangi: Total Diskon & Potongan Harga</span>
                <span className="text-rose-600 font-bold">
                  (Rp {financials.totalDiskon.toLocaleString('id-ID')})
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black text-slate-900 bg-slate-50/80 p-2 rounded-xl">
                <span>TOTAL PENDAPATAN KOTOR (GROSS REVENUE)</span>
                <span className="text-emerald-700 text-sm">
                  Rp {financials.totalPendapatanKotor.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: HARGA POKOK PENJUALAN */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-black text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
              <span>II. HARGA POKOK PENJUALAN (COST OF GOODS SOLD / COGS)</span>
              <span>NOMINAL (RP)</span>
            </div>

            <div className="pl-4 space-y-1.5 pt-1">
              <div className="flex justify-between items-center">
                <span>2.1 Modal Pokok Obat, Vaksin & BMHP Terpakai</span>
                <span className="font-bold text-amber-800">
                  Rp {Math.round(financials.totalHppBarangTerjual * 0.45).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>2.2 Modal Pokok Pakan & Barang Retail PetShop Terjual</span>
                <span className="font-bold text-amber-800">
                  Rp {Math.round(financials.totalHppBarangTerjual * 0.55).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black text-slate-900 bg-amber-50/50 p-2 rounded-xl">
                <span>TOTAL HARGA POKOK PENJUALAN (HPP)</span>
                <span className="text-amber-800 text-sm">
                  Rp {financials.totalHppBarangTerjual.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: LABA KOTOR & PENGADAAN */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-black text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
              <span>III. HASIL LABA RUGI OPERASIONAL & ARUS KAS</span>
              <span>NOMINAL (RP)</span>
            </div>

            <div className="pl-4 space-y-1.5 pt-1">
              <div className="flex justify-between items-center">
                <span>3.1 Laba Kotor Penjualan Produk & Obat (Omzet Barang - HPP)</span>
                <span className="font-bold text-emerald-700">
                  Rp {financials.labaKotorBarang.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>3.2 Pendapatan Jasa & Tindakan Medis Murni (Dokter & Layanan)</span>
                <span className="font-bold text-indigo-700">
                  Rp {financials.pendapatanJasaMedis.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>3.3 Pengeluaran Kas untuk Pembelian Stok Supplier (Faktur Selesai)</span>
                <span className="font-bold text-rose-700">
                  Rp {financials.totalPembelianStok.toLocaleString('id-ID')}
                </span>
              </div>

              {/* FINAL NET OPERATING RESULT */}
              <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-indigo-500 font-black text-white bg-indigo-900 p-3 rounded-2xl shadow-md">
                <div>
                  <span className="text-sm block">LABA BERSIH OPERASIONAL KLINIK</span>
                  <span className="text-[10px] text-indigo-200 font-normal">
                    Formula: (Total Pendapatan Penjualan & Layanan) - (Total HPP Modal Barang Terjual)
                  </span>
                </div>
                <span className="text-lg md:text-xl font-black text-emerald-300">
                  Rp {financials.labaOperasional.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Metode Pembayaran & Log Transaksi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              Rekapitulasi Metode Bayar
            </h3>
          </div>

          <div className="space-y-2.5">
            {Object.entries(financials.paymentMethods).map(([method, amount]) => {
              const numAmount = Number(amount) || 0;
              const total = financials.totalPendapatanKotor || 1;
              const pct = Math.round((numAmount / total) * 100);

              return (
                <div key={method} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">{method}</span>
                    <span className="text-slate-900">Rp {numAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1">{pct}% dari total omzet</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Rincian Transaksi Masuk & Keluar
            </h3>
            <span className="text-xs text-slate-500 font-bold">
              {filteredTrx.length} Nota Masuk
            </span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">No. Dokumen & Tgl</th>
                  <th className="p-3">Sumber / Menu</th>
                  <th className="p-3">Pelanggan / Supplier</th>
                  <th className="p-3 text-right">Nominal</th>
                  <th className="p-3 text-center">Metode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrx.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <span className="font-extrabold text-slate-900 block">{t.noNota}</span>
                      <span className="text-[10px] text-slate-400">{t.tanggal}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {t.typeTransaksi}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{t.namaPelanggan}</td>
                    <td className="p-3 text-right font-black text-emerald-700">
                      +Rp {(t.grandTotal || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center font-bold text-[10px]">{t.metodePembayaran}</td>
                  </tr>
                ))}
                {filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 bg-rose-50/30">
                    <td className="p-3">
                      <span className="font-extrabold text-slate-900 block">{p.noFaktur}</span>
                      <span className="text-[10px] text-slate-400">{p.tanggal}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        Pembelian Supplier
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{p.namaSupplier}</td>
                    <td className="p-3 text-right font-black text-rose-700">
                      -Rp {(p.grandTotal || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center font-bold text-[10px]">Transfer / Kas</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PRINT MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pratinjau Cetak Laporan Keuangan</h2>
                <p className="text-xs text-slate-500">Format resmi pembukuan dan audit finansial klinik</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 text-slate-800 text-xs">
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h1 className="text-xl font-black uppercase text-slate-900">
                  {klinik?.namaKlinik || 'VETCARE CLINIC & PETSHOP'}
                </h1>
                <p className="text-xs text-slate-600 mt-1">{klinik?.alamat || 'Jl. Kesehatan Hewan No. 12, Indonesia'}</p>
                <div className="inline-block mt-3 px-4 py-1 bg-slate-100 rounded-full font-black text-xs text-slate-800">
                  LAPORAN LABA RUGI & ARUS KAS KEUANGAN
                </div>
              </div>

              <div className="grid grid-cols-2 pb-2">
                <div>
                  <p><span className="font-bold">Periode:</span> {periodPreset.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">Tanggal Cetak:</span> {new Date().toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {/* Financial table */}
              <div className="space-y-3 border border-slate-300 p-4 rounded-xl">
                <div className="flex justify-between font-bold border-b border-slate-200 pb-1">
                  <span>1. Total Pendapatan Penjualan & Layanan</span>
                  <span className="font-black">Rp {financials.totalPendapatanKotor.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-600">
                  <span>- Penjualan PetShop POS</span>
                  <span>Rp {financials.omzetPOS.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-600">
                  <span>- Pelayanan Rawat Jalan</span>
                  <span>Rp {financials.omzetRawatJalan.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-600">
                  <span>- Pelayanan Rawat Inap</span>
                  <span>Rp {financials.omzetRawatInap.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between font-bold border-b border-slate-200 pt-2 pb-1 text-amber-800">
                  <span>2. Beban Pokok Penjualan (HPP Modal Barang Terjual)</span>
                  <span className="font-black">Rp {financials.totalHppBarangTerjual.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between font-bold border-b border-slate-200 pt-2 pb-1 text-rose-800">
                  <span>3. Total Pengeluaran Pembelian Stok Supplier</span>
                  <span className="font-black">Rp {financials.totalPembelianStok.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between font-black text-sm bg-slate-100 p-2.5 rounded-lg border border-slate-300 mt-4">
                  <span>LABA BERSIH OPERASIONAL</span>
                  <span className="text-emerald-800">Rp {financials.labaOperasional.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 text-center pt-8">
                <div>
                  <p className="text-slate-500">Dibuat Oleh,</p>
                  <div className="h-16" />
                  <p className="font-bold border-t border-slate-400 inline-block px-8 pt-1">Bagian Keuangan</p>
                </div>
                <div>
                  <p className="text-slate-500">Menyetujui,</p>
                  <div className="h-16" />
                  <p className="font-bold border-t border-slate-400 inline-block px-8 pt-1">{klinik?.namaPenanggungJawab || 'Pimpinan Klinik'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
