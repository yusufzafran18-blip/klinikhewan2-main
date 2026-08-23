import React, { useState } from 'react';
import { Transaksi, Barang, Pakan } from '../../types';
import {
  TrendingUp, FileSpreadsheet, Search, Filter, Calendar,
  Pill, ShoppingBag, Stethoscope, Tag, DollarSign, ArrowUpRight,
  PieChart, Layers, RefreshCw, ChevronDown, CheckCircle2
} from 'lucide-react';
import { exportToExcel } from '../../services/excel';

interface LaporanLabaPenjualanViewProps {
  transaksiList: Transaksi[];
  barangList: Barang[];
  pakanList?: Pakan[];
}

export type CategoryFilter = 'Semua' | 'Obat' | 'Pakan' | 'Alkes' | 'Aksesoris & Barang';

export interface ItemProfitSummary {
  id: string;
  kodeItem: string;
  namaItem: string;
  kategori: 'Obat' | 'Pakan' | 'Alkes' | 'Aksesoris & Barang';
  satuan: string;
  qtyTerjual: number;
  hargaBeliAvg: number;
  hargaJualAvg: number;
  labaPerUnit: number;
  totalOmzet: number;
  totalModalHpp: number;
  totalLaba: number;
  marginPercent: number;
}

export const LaporanLabaPenjualanView: React.FC<LaporanLabaPenjualanViewProps> = ({
  transaksiList = [],
  barangList = [],
  pakanList = [],
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('Semua');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'this_month' | 'this_year' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'profit' | 'omzet' | 'qty' | 'margin'>('profit');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const currentYearStr = todayStr.substring(0, 4);  // YYYY

  // 1. Filter Transactions by status === 'Lunas' and date period
  const lunasTrx = transaksiList.filter((t) => {
    if (t.status !== 'Lunas') return false;

    if (periodFilter === 'today') {
      return t.tanggal === todayStr;
    }
    if (periodFilter === 'this_month') {
      return t.tanggal.startsWith(currentMonthStr);
    }
    if (periodFilter === 'this_year') {
      return t.tanggal.startsWith(currentYearStr);
    }
    if (periodFilter === 'custom') {
      if (startDate && t.tanggal < startDate) return false;
      if (endDate && t.tanggal > endDate) return false;
    }
    return true;
  });

  // 2. Aggregate Sales Items and compute Profit Margin
  const itemMap: Record<string, ItemProfitSummary> = {};

  lunasTrx.forEach((trx) => {
    trx.items.forEach((item) => {
      // Ignore pure non-material services / tindakan unless they are goods/medicines/pakan/alkes
      if (item.jenis === 'Tindakan' || item.jenis === 'Rawat Inap') {
        return;
      }

      // Try matching with barangList or pakanList
      let matchedBarang = barangList.find(
        (b) => b.namaBarang.toLowerCase() === item.namaItem.toLowerCase() || b.id === item.id
      );

      let matchedPakan = !matchedBarang
        ? pakanList.find((p) => p.namaPakan.toLowerCase() === item.namaItem.toLowerCase() || p.id === item.id)
        : undefined;

      // Determine Category
      let kat: 'Obat' | 'Pakan' | 'Alkes' | 'Aksesoris & Barang' = 'Aksesoris & Barang';
      let hppSatuan = 0;
      let kode = 'ITEM-' + Math.floor(1000 + Math.random() * 9000);
      let satuan = 'Pcs';

      if (matchedBarang) {
        kode = matchedBarang.kodeBarang;
        satuan = matchedBarang.satuan;
        hppSatuan = matchedBarang.hargaBeli || Math.round(item.hargaSatuan * 0.65);
        
        if (matchedBarang.kategori === 'Obat') kat = 'Obat';
        else if (matchedBarang.kategori === 'Pakan') kat = 'Pakan';
        else if (matchedBarang.kategori === 'Alkes') kat = 'Alkes';
        else kat = 'Aksesoris & Barang';
      } else if (matchedPakan) {
        kode = matchedPakan.kodePakan;
        satuan = matchedPakan.satuan;
        kat = 'Pakan';
        // Assume cost is 70% of selling price if not explicitly in pakan
        hppSatuan = Math.round(item.hargaSatuan * 0.70);
      } else {
        // Fallback for Racikan or items inferred from name
        if (item.namaItem.toLowerCase().includes('vaksin') || item.jenis === 'Obat' || item.jenis === 'Obat Racikan') {
          kat = 'Obat';
        } else if (item.namaItem.toLowerCase().includes('pakan') || item.namaItem.toLowerCase().includes('royal') || item.namaItem.toLowerCase().includes('pro plan')) {
          kat = 'Pakan';
        } else if (item.namaItem.toLowerCase().includes('infus') || item.namaItem.toLowerCase().includes('spuit') || item.namaItem.toLowerCase().includes('spoid') || item.namaItem.toLowerCase().includes('catheter')) {
          kat = 'Alkes';
        }
        hppSatuan = Math.round(item.hargaSatuan * 0.60); // 60% estimated cost
      }

      const key = item.namaItem.toLowerCase().trim();

      if (!itemMap[key]) {
        itemMap[key] = {
          id: key,
          kodeItem: kode,
          namaItem: item.namaItem,
          kategori: kat,
          satuan: satuan,
          qtyTerjual: 0,
          hargaBeliAvg: hppSatuan,
          hargaJualAvg: item.hargaSatuan,
          labaPerUnit: item.hargaSatuan - hppSatuan,
          totalOmzet: 0,
          totalModalHpp: 0,
          totalLaba: 0,
          marginPercent: 0,
        };
      }

      itemMap[key].qtyTerjual += item.jumlah;
      const omzetItem = item.subtotal || item.jumlah * item.hargaSatuan;
      const hppItem = item.jumlah * hppSatuan;

      itemMap[key].totalOmzet += omzetItem;
      itemMap[key].totalModalHpp += hppItem;
      itemMap[key].totalLaba += (omzetItem - hppItem);
    });
  });

  // Convert map to array and compute margin percentage
  const allProfitableItems: ItemProfitSummary[] = Object.values(itemMap).map((item) => {
    const margin = item.totalOmzet > 0 ? ((item.totalLaba / item.totalOmzet) * 100) : 0;
    return {
      ...item,
      marginPercent: Math.round(margin * 10) / 10,
    };
  });

  // Calculate Overall Category Aggregates
  const categoryStats = {
    Obat: { omzet: 0, hpp: 0, laba: 0, itemsCount: 0, unitSold: 0 },
    Pakan: { omzet: 0, hpp: 0, laba: 0, itemsCount: 0, unitSold: 0 },
    Alkes: { omzet: 0, hpp: 0, laba: 0, itemsCount: 0, unitSold: 0 },
    'Aksesoris & Barang': { omzet: 0, hpp: 0, laba: 0, itemsCount: 0, unitSold: 0 },
  };

  allProfitableItems.forEach((item) => {
    if (categoryStats[item.kategori]) {
      categoryStats[item.kategori].omzet += item.totalOmzet;
      categoryStats[item.kategori].hpp += item.totalModalHpp;
      categoryStats[item.kategori].laba += item.totalLaba;
      categoryStats[item.kategori].itemsCount += 1;
      categoryStats[item.kategori].unitSold += item.qtyTerjual;
    }
  });

  const grandTotalOmzet = allProfitableItems.reduce((acc, i) => acc + i.totalOmzet, 0);
  const grandTotalHpp = allProfitableItems.reduce((acc, i) => acc + i.totalModalHpp, 0);
  const grandTotalLaba = grandTotalOmzet - grandTotalHpp;
  const grandMarginPercent = grandTotalOmzet > 0 ? Math.round((grandTotalLaba / grandTotalOmzet) * 1000) / 10 : 0;

  // Filter by Category Tab and Search Query
  const filteredItems = allProfitableItems.filter((item) => {
    if (selectedCategory !== 'Semua' && item.kategori !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.namaItem.toLowerCase().includes(q) ||
        item.kodeItem.toLowerCase().includes(q) ||
        item.kategori.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort Filtered Items
  filteredItems.sort((a, b) => {
    if (sortBy === 'profit') return b.totalLaba - a.totalLaba;
    if (sortBy === 'omzet') return b.totalOmzet - a.totalOmzet;
    if (sortBy === 'qty') return b.qtyTerjual - a.qtyTerjual;
    if (sortBy === 'margin') return b.marginPercent - a.marginPercent;
    return 0;
  });

  // Export Excel
  const handleExportExcel = () => {
    const dataToExport = filteredItems.map((i, index) => ({
      'No': index + 1,
      'Kode Barang': i.kodeItem,
      'Nama Barang / Obat / Pakan': i.namaItem,
      'Kategori': i.kategori,
      'Satuan': i.satuan,
      'Jumlah Terjual (Qty)': i.qtyTerjual,
      'Harga Beli Satuan (HPP)': i.hargaBeliAvg,
      'Harga Jual Satuan': i.hargaJualAvg,
      'Total Omzet Penjualan (Rp)': i.totalOmzet,
      'Total HPP / Modal (Rp)': i.totalModalHpp,
      'TOTAL LABA BERSIH (Rp)': i.totalLaba,
      'Margin Laba (%)': `${i.marginPercent}%`,
    }));

    const periodLabel =
      periodFilter === 'today'
        ? `Hari_Ini_${todayStr}`
        : periodFilter === 'this_month'
        ? `Bulan_${currentMonthStr}`
        : periodFilter === 'this_year'
        ? `Tahun_${currentYearStr}`
        : 'Semua_Periode';

    exportToExcel(dataToExport, `Laporan_Laba_Penjualan_Obat_Pakan_Alkes_${periodLabel}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md text-emerald-200 border border-emerald-400/30">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Laporan Keuntungan & Margin Penjualan</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Laporan Laba Penjualan (Obat, Pakan, Alkes & Barang)
          </h1>
          <p className="text-emerald-100 text-xs md:text-sm max-w-2xl">
            Pantau rincian omzet, HPP (modal beli), dan keuntungan bersih per kategori obat-obatan, pakan hewan, alat kesehatan, serta produk petshop.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="relative z-10 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2 text-xs md:text-sm cursor-pointer border border-emerald-400/30"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel Laba</span>
        </button>
      </div>

      {/* Date Period Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-2 font-bold text-slate-700">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Filter Periode Penjualan:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPeriodFilter('today')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'today'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setPeriodFilter('this_month')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'this_month'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Bulan Ini ({currentMonthStr})
          </button>
          <button
            onClick={() => setPeriodFilter('this_year')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'this_year'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tahun Ini ({currentYearStr})
          </button>
          <button
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Periode
          </button>
        </div>

        {/* Custom Date Inputs if 'custom' selected */}
        {periodFilter === 'custom' && (
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
            />
          </div>
        )}
      </div>

      {/* Main KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Omzet Penjualan</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-900">
              Rp {grandTotalOmzet.toLocaleString('id-ID')}
            </h3>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> Terhitung dari {lunasTrx.length} Nota Lunas
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Modal / HPP</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800">
              Rp {grandTotalHpp.toLocaleString('id-ID')}
            </h3>
            <p className="text-[10px] text-amber-600 font-medium">Harga Beli Stok Terjual</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border-emerald-200">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-emerald-800 font-bold">TOTAL LABA BERSIH</p>
            <h3 className="text-xl md:text-2xl font-black text-emerald-700">
              Rp {grandTotalLaba.toLocaleString('id-ID')}
            </h3>
            <p className="text-[10px] text-emerald-600 font-bold">Laba Kotor Penjualan Barang</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Rata-rata Margin Laba</p>
            <h3 className="text-xl md:text-2xl font-black text-indigo-700">
              {grandMarginPercent}%
            </h3>
            <p className="text-[10px] text-indigo-600 font-medium">Profit Margin Rata-Rata</p>
          </div>
        </div>
      </div>

      {/* Breakdown per Kategori (Obat, Pakan, Alkes, Aksesoris & Barang) */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Rincian Perbandingan Laba Per Kategori Produk</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. OBAT */}
          <div
            onClick={() => setSelectedCategory('Obat')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'Obat'
                ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500'
                : 'bg-white border-slate-200 hover:border-indigo-200'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Pill className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">OBAT-OBATAN</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {categoryStats.Obat.itemsCount} Produk
              </span>
            </div>

            <div className="pt-3 space-y-1">
              <p className="text-[11px] text-slate-500">Total Laba Penjualan:</p>
              <h4 className="text-lg font-black text-indigo-700">
                Rp {categoryStats.Obat.laba.toLocaleString('id-ID')}
              </h4>
              <div className="text-[10px] text-slate-600 flex justify-between pt-1">
                <span>Omzet: Rp {categoryStats.Obat.omzet.toLocaleString('id-ID')}</span>
                <span className="font-bold text-emerald-600">
                  {categoryStats.Obat.omzet > 0
                    ? Math.round((categoryStats.Obat.laba / categoryStats.Obat.omzet) * 100)
                    : 0}% Margin
                </span>
              </div>
            </div>
          </div>

          {/* 2. PAKAN */}
          <div
            onClick={() => setSelectedCategory('Pakan')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'Pakan'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500'
                : 'bg-white border-slate-200 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">PAKAN HEWAN</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {categoryStats.Pakan.itemsCount} Produk
              </span>
            </div>

            <div className="pt-3 space-y-1">
              <p className="text-[11px] text-slate-500">Total Laba Penjualan:</p>
              <h4 className="text-lg font-black text-amber-700">
                Rp {categoryStats.Pakan.laba.toLocaleString('id-ID')}
              </h4>
              <div className="text-[10px] text-slate-600 flex justify-between pt-1">
                <span>Omzet: Rp {categoryStats.Pakan.omzet.toLocaleString('id-ID')}</span>
                <span className="font-bold text-amber-600">
                  {categoryStats.Pakan.omzet > 0
                    ? Math.round((categoryStats.Pakan.laba / categoryStats.Pakan.omzet) * 100)
                    : 0}% Margin
                </span>
              </div>
            </div>
          </div>

          {/* 3. ALKES */}
          <div
            onClick={() => setSelectedCategory('Alkes')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'Alkes'
                ? 'bg-teal-50/80 border-teal-300 ring-2 ring-teal-500'
                : 'bg-white border-slate-200 hover:border-teal-200'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">ALAT KESEHATAN</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                {categoryStats.Alkes.itemsCount} Produk
              </span>
            </div>

            <div className="pt-3 space-y-1">
              <p className="text-[11px] text-slate-500">Total Laba Penjualan:</p>
              <h4 className="text-lg font-black text-teal-700">
                Rp {categoryStats.Alkes.laba.toLocaleString('id-ID')}
              </h4>
              <div className="text-[10px] text-slate-600 flex justify-between pt-1">
                <span>Omzet: Rp {categoryStats.Alkes.omzet.toLocaleString('id-ID')}</span>
                <span className="font-bold text-teal-600">
                  {categoryStats.Alkes.omzet > 0
                    ? Math.round((categoryStats.Alkes.laba / categoryStats.Alkes.omzet) * 100)
                    : 0}% Margin
                </span>
              </div>
            </div>
          </div>

          {/* 4. AKSESORIS & BARANG */}
          <div
            onClick={() => setSelectedCategory('Aksesoris & Barang')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'Aksesoris & Barang'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500'
                : 'bg-white border-slate-200 hover:border-purple-200'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">BARANG & AKSESORIS</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {categoryStats['Aksesoris & Barang'].itemsCount} Produk
              </span>
            </div>

            <div className="pt-3 space-y-1">
              <p className="text-[11px] text-slate-500">Total Laba Penjualan:</p>
              <h4 className="text-lg font-black text-purple-700">
                Rp {categoryStats['Aksesoris & Barang'].laba.toLocaleString('id-ID')}
              </h4>
              <div className="text-[10px] text-slate-600 flex justify-between pt-1">
                <span>Omzet: Rp {categoryStats['Aksesoris & Barang'].omzet.toLocaleString('id-ID')}</span>
                <span className="font-bold text-purple-600">
                  {categoryStats['Aksesoris & Barang'].omzet > 0
                    ? Math.round((categoryStats['Aksesoris & Barang'].laba / categoryStats['Aksesoris & Barang'].omzet) * 100)
                    : 0}% Margin
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls for Item Table */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Filter Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            {(['Semua', 'Obat', 'Pakan', 'Alkes', 'Aksesoris & Barang'] as CategoryFilter[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box & Sort Options */}
          <div className="flex items-center space-x-3">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama obat, pakan, alkes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="profit">Urutkan: Laba Tertinggi</option>
              <option value="omzet">Urutkan: Omzet Terbesar</option>
              <option value="qty">Urutkan: Qty Terbanyak</option>
              <option value="margin">Urutkan: Margin % Terbesar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Items Laba Penjualan */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">
              Tabel Laporan Laba Penjualan Per Produk
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredItems.length} produk terhitung dari transaksi penjualan
            </p>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Tag className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600 text-sm">Belum ada data penjualan produk untuk filter ini</p>
            <p className="text-xs">Cobalah ubah filter periode tanggal atau kata kunci pencarian</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-4">No.</th>
                  <th className="p-4">Kode & Nama Produk</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4 text-center">Qty Terjual</th>
                  <th className="p-4 text-right">Harga Beli (HPP)</th>
                  <th className="p-4 text-right">Harga Jual</th>
                  <th className="p-4 text-right">Total Omzet</th>
                  <th className="p-4 text-right">Total Modal (HPP)</th>
                  <th className="p-4 text-right">TOTAL LABA BERSIH</th>
                  <th className="p-4 text-center">Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{item.namaItem}</p>
                      <span className="text-[10px] text-slate-400 font-semibold">{item.kodeItem}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          item.kategori === 'Obat'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : item.kategori === 'Pakan'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : item.kategori === 'Alkes'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {item.kategori}
                      </span>
                    </td>
                    <td className="p-4 text-center font-extrabold text-slate-800">
                      {item.qtyTerjual} {item.satuan}
                    </td>
                    <td className="p-4 text-right text-slate-500">
                      Rp {item.hargaBeliAvg.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-right text-slate-700 font-semibold">
                      Rp {item.hargaJualAvg.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      Rp {item.totalOmzet.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-right font-medium text-amber-800">
                      Rp {item.totalModalHpp.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-right font-black text-emerald-700 bg-emerald-50/50">
                      + Rp {item.totalLaba.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                        {item.marginPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200 text-slate-900 text-xs">
                <tr>
                  <td colSpan={3} className="p-4 uppercase tracking-wider">
                    TOTAL KESELURUHAN ({filteredItems.length} Produk)
                  </td>
                  <td className="p-4 text-center">
                    {filteredItems.reduce((acc, i) => acc + i.qtyTerjual, 0)} Unit
                  </td>
                  <td className="p-4 text-right">-</td>
                  <td className="p-4 text-right">-</td>
                  <td className="p-4 text-right font-black text-slate-900">
                    Rp {filteredItems.reduce((acc, i) => acc + i.totalOmzet, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="p-4 text-right font-bold text-amber-900">
                    Rp {filteredItems.reduce((acc, i) => acc + i.totalModalHpp, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="p-4 text-right font-black text-emerald-700 text-sm bg-emerald-100/70">
                    + Rp {filteredItems.reduce((acc, i) => acc + i.totalLaba, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="p-4 text-center font-black text-indigo-700">
                    {grandMarginPercent}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
