import React, { useState, useMemo } from 'react';
import { Transaksi, Barang, Pakan, Tindakan, PembelianSupplier, DataKlinik } from '../../types';
import {
  TrendingUp, FileSpreadsheet, Search, Filter, Calendar,
  Pill, ShoppingBag, Stethoscope, Tag, DollarSign, ArrowUpRight,
  PieChart, Layers, RefreshCw, ChevronDown, CheckCircle2,
  Printer, ArrowDownRight, Award, BarChart3, ShoppingCart,
  Building, Eye, ExternalLink, ArrowUpDown, ChevronRight,
  Sparkles, Check, AlertCircle, BedDouble, Package
} from 'lucide-react';
import { exportToExcel } from '../../services/excel';

interface LaporanLabaPenjualanViewProps {
  transaksiList: Transaksi[];
  barangList: Barang[];
  pakanList?: Pakan[];
  tindakanList?: Tindakan[];
  pembelianList?: PembelianSupplier[];
  klinik?: DataKlinik;
  onNavigateToKeuangan?: () => void;
}

export type MenuSourceFilter = 'Semua' | 'Penjualan Direct (PetShop)' | 'Rawat Jalan' | 'Rawat Inap';
export type ItemCategoryFilter = 'Semua' | 'Obat' | 'Pakan' | 'Alkes' | 'Aksesoris' | 'Tindakan' | 'Rawat Inap' | 'Lainnya';
export type SortOption = 'omzet_desc' | 'omzet_asc' | 'qty_desc' | 'qty_asc' | 'profit_desc' | 'profit_asc' | 'margin_desc' | 'name_asc';

export interface ItemProfitDetail {
  id: string;
  kodeItem: string;
  namaItem: string;
  kategori: ItemCategoryFilter;
  satuan: string;
  menuSources: string[]; // List of menus it was sold in
  stokSaatIni: number;
  qtyTerjual: number;
  hargaBeliAvg: number;
  hargaJualAvg: number;
  totalOmzet: number;
  totalModalHpp: number;
  totalLaba: number;
  marginPercent: number;
}

export const LaporanLabaPenjualanView: React.FC<LaporanLabaPenjualanViewProps> = ({
  transaksiList = [],
  barangList = [],
  pakanList = [],
  tindakanList = [],
  pembelianList = [],
  klinik,
  onNavigateToKeuangan,
}) => {
  // Active internal view tab
  const [activeTab, setActiveTab] = useState<'ranking' | 'items' | 'menu_breakdown' | 'transactions'>('ranking');

  // Filters
  const [selectedMenuSource, setSelectedMenuSource] = useState<MenuSourceFilter>('Semua');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategoryFilter>('Semua');
  const [periodPreset, setPeriodPreset] = useState<'all' | 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('omzet_desc');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Date constants
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const currentYearStr = todayStr.substring(0, 4);  // YYYY

  // Calculate Last Month string
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);

  // 7 Days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  // 1. Filter Transactions by status === 'Lunas' and date period
  const filteredTransactions = useMemo(() => {
    return transaksiList.filter((t) => {
      if (t.status !== 'Lunas') return false;

      // Filter by menu source if specific
      if (selectedMenuSource !== 'Semua') {
        if (selectedMenuSource === 'Penjualan Direct (PetShop)') {
          if (t.typeTransaksi !== 'Penjualan Direct (PetShop)' && (t.rawatInapId || t.rekamMedisId)) return false;
        } else if (selectedMenuSource === 'Rawat Jalan') {
          if (t.typeTransaksi !== 'Rekam Medis' && !t.rekamMedisId) return false;
        } else if (selectedMenuSource === 'Rawat Inap') {
          if (t.typeTransaksi !== 'Rawat Inap' && !t.rawatInapId) return false;
        }
      }

      // Filter by date period
      const tgl = t.tanggal;
      if (periodPreset === 'today') {
        return tgl === todayStr;
      }
      if (periodPreset === 'last_7_days') {
        return tgl >= sevenDaysAgoStr && tgl <= todayStr;
      }
      if (periodPreset === 'this_month') {
        return tgl.startsWith(currentMonthStr);
      }
      if (periodPreset === 'last_month') {
        return tgl.startsWith(lastMonthStr);
      }
      if (periodPreset === 'this_year') {
        return tgl.startsWith(currentYearStr);
      }
      if (periodPreset === 'custom') {
        if (startDate && tgl < startDate) return false;
        if (endDate && tgl > endDate) return false;
      }
      return true;
    });
  }, [transaksiList, selectedMenuSource, periodPreset, todayStr, sevenDaysAgoStr, currentMonthStr, lastMonthStr, currentYearStr, startDate, endDate]);

  // 2. Aggregate Sales Items and compute COGS (HPP) & Gross Profit
  const aggregatedItems = useMemo(() => {
    const itemMap: Record<string, ItemProfitDetail> = {};

    filteredTransactions.forEach((trx) => {
      // Determine Transaction Menu Source Label
      let menuLabel = 'Penjualan Direct (PetShop)';
      if (trx.typeTransaksi === 'Rawat Inap' || trx.rawatInapId) {
        menuLabel = 'Rawat Inap';
      } else if (trx.typeTransaksi === 'Rekam Medis' || trx.rekamMedisId) {
        menuLabel = 'Rawat Jalan';
      }

      (trx.items || []).forEach((item) => {
        if (!item || item.jumlah <= 0) return;
        const rawName = item.namaItem || (item as any).namaBarang || (item as any).nama || '';
        if (!rawName) return;

        const itemNameLower = rawName.toLowerCase().trim();

        // 1. Check matching in barangList
        let matchedBarang = item.barangId
          ? barangList.find((b) => b.id === item.barangId)
          : undefined;

        if (!matchedBarang) {
          matchedBarang = barangList.find(
            (b) => (b.namaBarang && b.namaBarang.toLowerCase().trim() === itemNameLower) ||
                   (b.kodeBarang && b.kodeBarang.toLowerCase().trim() === itemNameLower)
          );
        }

        // 2. Check matching in pakanList
        let matchedPakan = !matchedBarang
          ? pakanList.find((p) => (p.namaPakan && p.namaPakan.toLowerCase().trim() === itemNameLower) || (p.id && p.id === item.id))
          : undefined;

        // 3. Check matching in tindakanList
        let matchedTindakan = !matchedBarang && !matchedPakan
          ? tindakanList.find((t) => t.namaTindakan && t.namaTindakan.toLowerCase().trim() === itemNameLower)
          : undefined;

        // Determine Category & HPP
        let kat: ItemCategoryFilter = 'Lainnya';
        let hppSatuan = 0;
        let kode = 'ITM-' + Math.floor(1000 + Math.random() * 9000);
        let satuan = 'Pcs';
        let currentStock = 0;

        if (matchedBarang) {
          kode = matchedBarang.kodeBarang || kode;
          satuan = matchedBarang.satuan || 'Pcs';
          hppSatuan = matchedBarang.hargaBeli ?? Math.round(item.hargaSatuan * 0.65);
          currentStock = matchedBarang.stokCurrent ?? 0;

          if (matchedBarang.kategori === 'Obat') kat = 'Obat';
          else if (matchedBarang.kategori === 'Pakan') kat = 'Pakan';
          else if (matchedBarang.kategori === 'Alkes') kat = 'Alkes';
          else if (matchedBarang.kategori === 'Aksesoris') kat = 'Aksesoris';
          else kat = 'Lainnya';
        } else if (matchedPakan) {
          kode = matchedPakan.kodePakan || kode;
          satuan = matchedPakan.satuan || 'Pcs';
          kat = 'Pakan';
          currentStock = matchedPakan.stok ?? 0;
          hppSatuan = Math.round(item.hargaSatuan * 0.70); // Estimasi modal 70%
        } else if (matchedTindakan) {
          kode = matchedTindakan.kodeTindakan || 'TND-' + Math.floor(1000 + Math.random() * 9000);
          satuan = 'Layanan';
          kat = 'Tindakan';
          // Layanan / tindakan dokter modal materiil 0 (jasa murni)
          hppSatuan = 0;
          currentStock = 999;
        } else {
          // Inferred from item.jenis or item name
          if (item.jenis === 'Tindakan') {
            kat = 'Tindakan';
            satuan = 'Layanan';
            hppSatuan = 0;
            currentStock = 999;
          } else if (item.jenis === 'Rawat Inap' || itemNameLower.includes('kamar') || itemNameLower.includes('inap')) {
            kat = 'Rawat Inap';
            satuan = 'Hari';
            hppSatuan = 0;
            currentStock = 999;
          } else if (item.jenis === 'Obat' || item.jenis === 'Obat Racikan' || itemNameLower.includes('vaksin') || itemNameLower.includes('tab') || itemNameLower.includes('sirup')) {
            kat = 'Obat';
            satuan = 'Pcs';
            hppSatuan = Math.round(item.hargaSatuan * 0.65);
          } else if (item.jenis === 'Barang/Pakan' || itemNameLower.includes('pakan') || itemNameLower.includes('royal') || itemNameLower.includes('pro plan') || itemNameLower.includes('whiskas')) {
            kat = 'Pakan';
            satuan = 'Pcs';
            hppSatuan = Math.round(item.hargaSatuan * 0.70);
          } else if (itemNameLower.includes('infus') || itemNameLower.includes('spuit') || itemNameLower.includes('catheter') || itemNameLower.includes('alkes')) {
            kat = 'Alkes';
            satuan = 'Pcs';
            hppSatuan = Math.round(item.hargaSatuan * 0.60);
          } else {
            kat = 'Aksesoris';
            satuan = 'Pcs';
            hppSatuan = Math.round(item.hargaSatuan * 0.65);
          }
        }

        const key = itemNameLower;

        if (!itemMap[key]) {
          itemMap[key] = {
            id: key,
            kodeItem: kode,
            namaItem: item.namaItem,
            kategori: kat,
            satuan: satuan,
            menuSources: [menuLabel],
            stokSaatIni: currentStock,
            qtyTerjual: 0,
            hargaBeliAvg: hppSatuan,
            hargaJualAvg: item.hargaSatuan,
            totalOmzet: 0,
            totalModalHpp: 0,
            totalLaba: 0,
            marginPercent: 0,
          };
        } else {
          if (!itemMap[key].menuSources.includes(menuLabel)) {
            itemMap[key].menuSources.push(menuLabel);
          }
        }

        const itemQty = Number(item.jumlah) || 1;
        const itemOmzet = Number(item.subtotal) || (itemQty * Number(item.hargaSatuan || 0));
        const itemHpp = itemQty * hppSatuan;

        itemMap[key].qtyTerjual += itemQty;
        itemMap[key].totalOmzet += itemOmzet;
        itemMap[key].totalModalHpp += itemHpp;
        itemMap[key].totalLaba += (itemOmzet - itemHpp);
      });
    });

    // Compute Margin % and return sorted array
    return Object.values(itemMap).map((item) => {
      const margin = item.totalOmzet > 0 ? ((item.totalLaba / item.totalOmzet) * 100) : 0;
      return {
        ...item,
        marginPercent: Math.round(margin * 10) / 10,
      };
    });
  }, [filteredTransactions, barangList, pakanList, tindakanList]);

  // 3. Filter Aggregated Items by Category & Search Query
  const filteredAndSortedItems = useMemo(() => {
    let result = aggregatedItems.filter((item) => {
      if (selectedCategory !== 'Semua' && item.kategori !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (item.namaItem && item.namaItem.toLowerCase().includes(q)) ||
          (item.kodeItem && item.kodeItem.toLowerCase().includes(q)) ||
          (item.kategori && item.kategori.toLowerCase().includes(q)) ||
          (item.menuSources && item.menuSources.some((m) => m && m.toLowerCase().includes(q)))
        );
      }
      return true;
    });

    // Sort items
    result.sort((a, b) => {
      if (sortBy === 'omzet_desc') return b.totalOmzet - a.totalOmzet;
      if (sortBy === 'omzet_asc') return a.totalOmzet - b.totalOmzet;
      if (sortBy === 'qty_desc') return b.qtyTerjual - a.qtyTerjual;
      if (sortBy === 'qty_asc') return a.qtyTerjual - b.qtyTerjual;
      if (sortBy === 'profit_desc') return b.totalLaba - a.totalLaba;
      if (sortBy === 'profit_asc') return a.totalLaba - b.totalLaba;
      if (sortBy === 'margin_desc') return b.marginPercent - a.marginPercent;
      if (sortBy === 'name_asc') return a.namaItem.localeCompare(b.namaItem);
      return 0;
    });

    return result;
  }, [aggregatedItems, selectedCategory, searchQuery, sortBy]);

  // 4. Overall Totals and Key Metrics
  const summaryMetrics = useMemo(() => {
    const totalOmzet = aggregatedItems.reduce((acc, i) => acc + i.totalOmzet, 0);
    const totalHpp = aggregatedItems.reduce((acc, i) => acc + i.totalModalHpp, 0);
    const totalLaba = totalOmzet - totalHpp;
    const totalQty = aggregatedItems.reduce((acc, i) => acc + i.qtyTerjual, 0);
    const avgMargin = totalOmzet > 0 ? Math.round((totalLaba / totalOmzet) * 1000) / 10 : 0;
    const totalNota = filteredTransactions.length;

    // Breakdown per Menu Source
    const menuBreakdown = {
      pos: { omzet: 0, hpp: 0, laba: 0, count: 0, items: 0 },
      rawatJalan: { omzet: 0, hpp: 0, laba: 0, count: 0, items: 0 },
      rawatInap: { omzet: 0, hpp: 0, laba: 0, count: 0, items: 0 },
    };

    filteredTransactions.forEach((trx) => {
      const trxTotal = trx.grandTotal || 0;
      let hppTrx = 0;
      let itemsCount = 0;

      (trx.items || []).forEach((it) => {
        itemsCount += Number(it.jumlah) || 1;
        const itName = (it.namaItem || (it as any).namaBarang || (it as any).nama || '').toLowerCase().trim();
        const matched = barangList.find(
          (b) => (b.id && it.barangId && b.id === it.barangId) ||
                 (itName && b.namaBarang && b.namaBarang.toLowerCase().trim() === itName)
        );
        const hppUnit = matched ? (matched.hargaBeli || 0) : (it.jenis === 'Tindakan' || it.jenis === 'Rawat Inap' ? 0 : Math.round(it.hargaSatuan * 0.65));
        hppTrx += (Number(it.jumlah) || 1) * hppUnit;
      });

      if (trx.typeTransaksi === 'Rawat Inap' || trx.rawatInapId) {
        menuBreakdown.rawatInap.omzet += trxTotal;
        menuBreakdown.rawatInap.hpp += hppTrx;
        menuBreakdown.rawatInap.laba += (trxTotal - hppTrx);
        menuBreakdown.rawatInap.count += 1;
        menuBreakdown.rawatInap.items += itemsCount;
      } else if (trx.typeTransaksi === 'Rekam Medis' || trx.rekamMedisId) {
        menuBreakdown.rawatJalan.omzet += trxTotal;
        menuBreakdown.rawatJalan.hpp += hppTrx;
        menuBreakdown.rawatJalan.laba += (trxTotal - hppTrx);
        menuBreakdown.rawatJalan.count += 1;
        menuBreakdown.rawatJalan.items += itemsCount;
      } else {
        menuBreakdown.pos.omzet += trxTotal;
        menuBreakdown.pos.hpp += hppTrx;
        menuBreakdown.pos.laba += (trxTotal - hppTrx);
        menuBreakdown.pos.count += 1;
        menuBreakdown.pos.items += itemsCount;
      }
    });

    // Breakdown per Category
    const categoryStats: Record<string, { omzet: number; hpp: number; laba: number; qty: number }> = {
      Obat: { omzet: 0, hpp: 0, laba: 0, qty: 0 },
      Pakan: { omzet: 0, hpp: 0, laba: 0, qty: 0 },
      Alkes: { omzet: 0, hpp: 0, laba: 0, qty: 0 },
      Aksesoris: { omzet: 0, hpp: 0, laba: 0, qty: 0 },
      Tindakan: { omzet: 0, hpp: 0, laba: 0, qty: 0 },
      'Rawat Inap': { omzet: 0, hpp: 0, laba: 0, qty: 0 },
      Lainnya: { omzet: 0, hpp: 0, laba: 0, qty: 0 },
    };

    aggregatedItems.forEach((i) => {
      const kat = i.kategori;
      if (categoryStats[kat]) {
        categoryStats[kat].omzet += i.totalOmzet;
        categoryStats[kat].hpp += i.totalModalHpp;
        categoryStats[kat].laba += i.totalLaba;
        categoryStats[kat].qty += i.qtyTerjual;
      }
    });

    return {
      totalOmzet,
      totalHpp,
      totalLaba,
      totalQty,
      avgMargin,
      totalNota,
      menuBreakdown,
      categoryStats,
    };
  }, [aggregatedItems, filteredTransactions, barangList]);

  // Export Excel
  const handleExportExcel = () => {
    const dataToExport = filteredAndSortedItems.map((i, index) => ({
      'No': index + 1,
      'Kode Item': i.kodeItem,
      'Nama Barang / Layanan': i.namaItem,
      'Kategori': i.kategori,
      'Menu Sumber Penjualan': i.menuSources.join(', '),
      'Satuan': i.satuan,
      'Stok Saat Ini': i.stokSaatIni,
      'Qty Terjual': i.qtyTerjual,
      'Harga Beli Satuan (HPP)': i.hargaBeliAvg,
      'Harga Jual Satuan': i.hargaJualAvg,
      'Total Omzet Penjualan (Rp)': i.totalOmzet,
      'Total Modal HPP (Rp)': i.totalModalHpp,
      'TOTAL LABA KOTOR (Rp)': i.totalLaba,
      'Margin Laba (%)': `${i.marginPercent}%`,
    }));

    const periodLabel =
      periodPreset === 'today'
        ? `Hari_Ini_${todayStr}`
        : periodPreset === 'this_month'
        ? `Bulan_${currentMonthStr}`
        : periodPreset === 'this_year'
        ? `Tahun_${currentYearStr}`
        : 'Semua_Periode';

    exportToExcel(dataToExport, `Laporan_Penjualan_Laba_Produk_VetCare_${periodLabel}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md text-emerald-200 border border-emerald-400/30">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Laporan Penjualan & Laba Rugi Produk Multi-Menu</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Laporan Penjualan & Laba Rugi Seluruh Menu
          </h1>
          <p className="text-emerald-100/90 text-xs md:text-sm max-w-3xl leading-relaxed">
            Rekapitulasi penjualan terintegrasi dari seluruh sumber pengurangan stok (Kasir PetShop POS, Layanan Rawat Jalan, dan Rawat Inap) dengan kalkulasi HPP, margin keuntungan, dan peringkat penjualan tertinggi hingga terendah.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {onNavigateToKeuangan && (
            <button
              onClick={onNavigateToKeuangan}
              className="px-3.5 py-2.5 bg-slate-900/60 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all duration-200 text-xs border border-white/20 flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-300" />
              <span>Laporan Keuangan Terpadu</span>
            </button>
          )}

          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all duration-200 text-xs border border-white/20 flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>Cetak Laporan</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all duration-200 shadow-md flex items-center space-x-2 text-xs cursor-pointer border border-emerald-400/30"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Range Tanggal, Menu Sumber, Kategori, & Pengurutan */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        {/* Row 1: Date Range Presets & Custom Picker */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
          <div className="flex items-center space-x-2 font-extrabold text-slate-800">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Periode Penjualan:</span>
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
                    ? 'bg-emerald-600 text-white shadow-xs'
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

        {/* Row 2: Menu Source Filter, Category Filter, Search & Sorting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Menu Sumber Penjualan */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
              Sumber Menu Penjualan:
            </label>
            <select
              value={selectedMenuSource}
              onChange={(e) => setSelectedMenuSource(e.target.value as MenuSourceFilter)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none cursor-pointer"
            >
              <option value="Semua">Semua Menu Sumber (POS, RJ, RI)</option>
              <option value="Penjualan Direct (PetShop)">Penjualan Direct (PetShop POS)</option>
              <option value="Rawat Jalan">Layanan Rawat Jalan (Rekam Medis)</option>
              <option value="Rawat Inap">Layanan Rawat Inap</option>
            </select>
          </div>

          {/* Kategori Barang / Item */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
              Kategori Barang / Layanan:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ItemCategoryFilter)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none cursor-pointer"
            >
              <option value="Semua">Semua Kategori Produk & Jasa</option>
              <option value="Obat">Obat-obatan & Vaksin</option>
              <option value="Pakan">Pakan & Nutrisi Hewan</option>
              <option value="Alkes">Alkes & BMHP Medis</option>
              <option value="Aksesoris">Aksesoris & Retail PetShop</option>
              <option value="Tindakan">Tindakan & Jasa Dokter</option>
              <option value="Rawat Inap">Kamar & Rawat Inap</option>
            </select>
          </div>

          {/* Pengurutan (Sorting) */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1 flex items-center justify-between">
              <span>Urutkan Data Penjualan:</span>
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none cursor-pointer"
            >
              <option value="omzet_desc">Penjualan Tertinggi ke Terendah (Omzet Rp)</option>
              <option value="omzet_asc">Penjualan Terendah ke Tertinggi (Omzet Rp)</option>
              <option value="qty_desc">Kuantitas Terjual Tertinggi ke Terendah (Qty)</option>
              <option value="qty_asc">Kuantitas Terjual Terendah ke Tertinggi (Qty)</option>
              <option value="profit_desc">Laba Kotor Tertinggi ke Terendah (Laba Rp)</option>
              <option value="profit_asc">Laba Kotor Terendah ke Tertinggi (Laba Rp)</option>
              <option value="margin_desc">Margin Laba Tertinggi (%)</option>
              <option value="name_asc">Nama Produk (A - Z)</option>
            </select>
          </div>

          {/* Pencarian Keyword */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
              Pencarian Produk / Jasa:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama barang, kode, menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Omzet Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Omzet Penjualan</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-0.5">
              Rp {summaryMetrics.totalOmzet.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-emerald-600 font-bold flex items-center mt-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> Dari {summaryMetrics.totalNota} Nota Transaksi
            </p>
          </div>
        </div>

        {/* 2. Modal HPP */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Modal / HPP</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-0.5">
              Rp {summaryMetrics.totalHpp.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-amber-600 font-bold mt-0.5">
              Modal barang & obat terjual
            </p>
          </div>
        </div>

        {/* 3. Laba Kotor */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs flex items-center space-x-4 bg-gradient-to-br from-emerald-50/70 to-teal-50/40">
          <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-emerald-900 font-black uppercase tracking-wider">LABA KOTOR PENJUALAN</p>
            <h3 className="text-xl md:text-2xl font-black text-emerald-700 mt-0.5">
              Rp {summaryMetrics.totalLaba.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
              Keuntungan kotor (Omzet - HPP)
            </p>
          </div>
        </div>

        {/* 4. Margin & Qty */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Rata-Rata Margin</p>
            <h3 className="text-xl md:text-2xl font-black text-indigo-700 mt-0.5">
              {summaryMetrics.avgMargin}%
            </h3>
            <p className="text-[11px] text-indigo-600 font-bold mt-0.5">
              Total {summaryMetrics.totalQty.toLocaleString('id-ID')} Item Terjual
            </p>
          </div>
        </div>
      </div>

      {/* Perbandingan Penjualan & Laba per Sumber Menu (Direct POS vs Rawat Jalan vs Rawat Inap) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-extrabold text-slate-800">
              Perbandingan Penjualan & Laba Per Sumber Menu
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Klik untuk memfilter menu</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* POS Direct */}
          <div
            onClick={() => setSelectedMenuSource(selectedMenuSource === 'Penjualan Direct (PetShop)' ? 'Semua' : 'Penjualan Direct (PetShop)')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedMenuSource === 'Penjualan Direct (PetShop)'
                ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500'
                : 'bg-slate-50/60 border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs">Penjualan Direct (PetShop POS)</h4>
                  <p className="text-[10px] text-slate-500">{summaryMetrics.menuBreakdown.pos.count} Nota Selesai</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {summaryMetrics.menuBreakdown.pos.items} Item
              </span>
            </div>
            <div className="pt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Omzet:</span>
                <span className="font-bold text-slate-900">Rp {summaryMetrics.menuBreakdown.pos.omzet.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Modal HPP:</span>
                <span className="font-bold text-amber-700">Rp {summaryMetrics.menuBreakdown.pos.hpp.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200/60 font-extrabold">
                <span className="text-emerald-800">Laba Bersih POS:</span>
                <span className="text-emerald-700">Rp {summaryMetrics.menuBreakdown.pos.laba.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Rawat Jalan */}
          <div
            onClick={() => setSelectedMenuSource(selectedMenuSource === 'Rawat Jalan' ? 'Semua' : 'Rawat Jalan')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedMenuSource === 'Rawat Jalan'
                ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500'
                : 'bg-slate-50/60 border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs">Layanan Rawat Jalan (Rekam Medis)</h4>
                  <p className="text-[10px] text-slate-500">{summaryMetrics.menuBreakdown.rawatJalan.count} Nota Selesai</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {summaryMetrics.menuBreakdown.rawatJalan.items} Item
              </span>
            </div>
            <div className="pt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Omzet:</span>
                <span className="font-bold text-slate-900">Rp {summaryMetrics.menuBreakdown.rawatJalan.omzet.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Modal Obat/BMHP:</span>
                <span className="font-bold text-amber-700">Rp {summaryMetrics.menuBreakdown.rawatJalan.hpp.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200/60 font-extrabold">
                <span className="text-indigo-800">Laba Jasa & Obat:</span>
                <span className="text-indigo-700">Rp {summaryMetrics.menuBreakdown.rawatJalan.laba.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Rawat Inap */}
          <div
            onClick={() => setSelectedMenuSource(selectedMenuSource === 'Rawat Inap' ? 'Semua' : 'Rawat Inap')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedMenuSource === 'Rawat Inap'
                ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500'
                : 'bg-slate-50/60 border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <BedDouble className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs">Layanan Rawat Inap & Pakan</h4>
                  <p className="text-[10px] text-slate-500">{summaryMetrics.menuBreakdown.rawatInap.count} Nota Selesai</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {summaryMetrics.menuBreakdown.rawatInap.items} Item
              </span>
            </div>
            <div className="pt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Omzet:</span>
                <span className="font-bold text-slate-900">Rp {summaryMetrics.menuBreakdown.rawatInap.omzet.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Modal Pakan/Obat:</span>
                <span className="font-bold text-amber-700">Rp {summaryMetrics.menuBreakdown.rawatInap.hpp.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200/60 font-extrabold">
                <span className="text-amber-800">Laba Kamar & Inap:</span>
                <span className="text-amber-700">Rp {summaryMetrics.menuBreakdown.rawatInap.laba.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'ranking'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Peringkat Produk & Jasa Terlaris</span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'items'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Rincian Item Penjualan & HPP ({filteredAndSortedItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'transactions'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Log Transaksi Kasir ({filteredTransactions.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-semibold pb-2">
          Menampilkan <span className="font-bold text-slate-800">{filteredAndSortedItems.length}</span> item penjualan
        </div>
      </div>

      {/* TAB CONTENT 1: RANKING PRODUK TERLARIS */}
      {activeTab === 'ranking' && (
        <div className="space-y-6">
          {/* Top 5 Highlight Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Top 5 Penjualan Terlaris (Kontribusi Omzet Tertinggi)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {filteredAndSortedItems.slice(0, 5).map((item, idx) => {
                const medals = ['🥇 #1', '🥈 #2', '🥉 #3', '#4', '#5'];
                const cardBgs = [
                  'border-amber-300 bg-gradient-to-b from-amber-50/60 to-white',
                  'border-slate-300 bg-gradient-to-b from-slate-50/80 to-white',
                  'border-amber-700/30 bg-gradient-to-b from-amber-50/30 to-white',
                  'border-slate-200 bg-white',
                  'border-slate-200 bg-white',
                ];

                return (
                  <div key={item.id} className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${cardBgs[idx] || 'bg-white'}`}>
                    <div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="text-xs font-black text-amber-600">{medals[idx]}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {item.kategori}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-xs mt-2 line-clamp-2" title={item.namaItem}>
                        {item.namaItem}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Terjual: <span className="font-black text-slate-900">{item.qtyTerjual} {item.satuan}</span>
                      </p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-slate-100 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Omzet:</span>
                        <span className="font-extrabold text-slate-900">Rp {item.totalOmzet.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Laba:</span>
                        <span className="font-black text-emerald-700">Rp {item.totalLaba.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ranking Visual Progress Bars */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Peringkat 15 Produk Teratas (Berdasarkan Nilai Penjualan & Margin)</span>
            </h3>

            <div className="space-y-3">
              {filteredAndSortedItems.slice(0, 15).map((item, index) => {
                const maxOmzet = filteredAndSortedItems[0]?.totalOmzet || 1;
                const percentage = Math.min(100, Math.round((item.totalOmzet / maxOmzet) * 100));

                return (
                  <div key={item.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-white hover:border-emerald-200 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-200 font-black text-slate-700 text-[11px]">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-slate-800">{item.namaItem}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                              {item.kategori}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              ({item.menuSources.join(', ')})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Terjual: <span className="font-bold text-slate-700">{item.qtyTerjual} {item.satuan}</span> • HPP: Rp {item.hargaBeliAvg.toLocaleString('id-ID')} • Harga Jual: Rp {item.hargaJualAvg.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right sm:min-w-[180px]">
                        <span className="font-black text-slate-900 text-sm">
                          Rp {item.totalOmzet.toLocaleString('id-ID')}
                        </span>
                        <div className="text-[11px] font-bold text-emerald-600">
                          Laba: Rp {item.totalLaba.toLocaleString('id-ID')} ({item.marginPercent}%)
                        </div>
                      </div>
                    </div>

                    {/* Progress bar visual */}
                    <div className="w-full bg-slate-200/70 h-2 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: RINCIAN ITEM PENJUALAN & HPP (TABEL LENGKAP) */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Tabel Rincian Seluruh Produk & Jasa Terjual
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-bold">
              Total {filteredAndSortedItems.length} Produk Ditemukan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-black text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 text-center w-10">No</th>
                  <th className="p-3.5">Kode & Nama Item</th>
                  <th className="p-3.5">Kategori & Menu Asal</th>
                  <th className="p-3.5 text-center">Stok Sisa</th>
                  <th className="p-3.5 text-right">Qty Terjual</th>
                  <th className="p-3.5 text-right">HPP (Modal)</th>
                  <th className="p-3.5 text-right">Harga Jual</th>
                  <th className="p-3.5 text-right">Total Omzet</th>
                  <th className="p-3.5 text-right">Total HPP</th>
                  <th className="p-3.5 text-right">Laba Kotor</th>
                  <th className="p-3.5 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      Tidak ada data penjualan yang sesuai dengan filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-900 block">{item.namaItem}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.kodeItem}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 mb-1">
                          {item.kategori}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-medium">
                          {item.menuSources.join(', ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                          item.stokSaatIni <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.stokSaatIni} {item.satuan}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900">
                        {item.qtyTerjual} {item.satuan}
                      </td>
                      <td className="p-3.5 text-right font-medium text-amber-700">
                        Rp {item.hargaBeliAvg.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-800">
                        Rp {item.hargaJualAvg.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900">
                        Rp {item.totalOmzet.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right font-bold text-amber-800">
                        Rp {item.totalModalHpp.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right font-black text-emerald-700">
                        Rp {item.totalLaba.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          item.marginPercent >= 40
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.marginPercent >= 20
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.marginPercent}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredAndSortedItems.length > 0 && (
                <tfoot className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="p-3.5 text-center uppercase tracking-wider text-[11px]">
                      TOTAL KESELURUHAN
                    </td>
                    <td className="p-3.5 text-right text-indigo-700">
                      {summaryMetrics.totalQty.toLocaleString('id-ID')} Unit
                    </td>
                    <td colSpan={2} className="p-3.5 text-right text-slate-400">
                      -
                    </td>
                    <td className="p-3.5 text-right text-slate-900">
                      Rp {summaryMetrics.totalOmzet.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3.5 text-right text-amber-800">
                      Rp {summaryMetrics.totalHpp.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3.5 text-right text-emerald-700">
                      Rp {summaryMetrics.totalLaba.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3.5 text-center text-emerald-800">
                      {summaryMetrics.avgMargin}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: LOG TRANSAKSI KASIR */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Daftar Transaksi Lunas Terkait
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-bold">
              {filteredTransactions.length} Transaksi Terhitung
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-black text-[10px]">
                <tr>
                  <th className="p-3.5">No. Nota & Tanggal</th>
                  <th className="p-3.5">Menu Sumber</th>
                  <th className="p-3.5">Pelanggan / Pasien</th>
                  <th className="p-3.5">Item Barang & Layanan Terjual</th>
                  <th className="p-3.5 text-right">Subtotal</th>
                  <th className="p-3.5 text-right">Diskon</th>
                  <th className="p-3.5 text-right">Grand Total</th>
                  <th className="p-3.5 text-center">Metode Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Tidak ada transaksi lunas pada periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50/80">
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-900 block">{trx.noNota}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{trx.tanggal}</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          trx.typeTransaksi === 'Rawat Inap' || trx.rawatInapId
                            ? 'bg-amber-100 text-amber-800'
                            : trx.typeTransaksi === 'Rekam Medis' || trx.rekamMedisId
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {trx.typeTransaksi === 'Rawat Inap' || trx.rawatInapId
                            ? 'Rawat Inap'
                            : trx.typeTransaksi === 'Rekam Medis' || trx.rekamMedisId
                            ? 'Rawat Jalan'
                            : 'PetShop POS'}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {trx.namaPelanggan || 'Pelanggan Umum'}
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          {(trx.items || []).map((it, i) => (
                            <span key={i} className="text-[11px] text-slate-600 block">
                              • {it.namaItem} <span className="font-bold text-slate-900">({it.jumlah}x)</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-medium text-slate-700">
                        Rp {(trx.subtotal || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right font-bold text-rose-600">
                        Rp {(trx.diskon || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right font-black text-indigo-700">
                        Rp {(trx.grandTotal || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px]">
                          {trx.metodePembayaran}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pratinjau Cetak Laporan Penjualan</h2>
                <p className="text-xs text-slate-500">Siap dicetak atau disimpan sebagai PDF dokumen resmi klinik</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-200"
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

            {/* Document Body (Formatted like official paper report) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 text-slate-800">
              {/* Clinic Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h1 className="text-xl font-black uppercase text-slate-900 tracking-wider">
                  {klinik?.namaKlinik || 'VETCARE CLINIC & PETSHOP'}
                </h1>
                <p className="text-xs text-slate-600 mt-1">{klinik?.alamat || 'Jl. Kesehatan Hewan No. 12, Indonesia'}</p>
                <p className="text-xs text-slate-600">Telp: {klinik?.noTelp || '-'} | WhatsApp: {klinik?.noWhatsApp || '-'}</p>
                <div className="inline-block mt-3 px-4 py-1 bg-slate-100 rounded-full font-black text-xs text-slate-800">
                  LAPORAN PENJUALAN & LABA RUGI PRODUK
                </div>
              </div>

              {/* Report Info */}
              <div className="grid grid-cols-2 text-xs text-slate-600 gap-2 pb-2">
                <div>
                  <p><span className="font-bold">Periode:</span> {periodPreset.toUpperCase()} {startDate && endDate ? `(${startDate} s/d ${endDate})` : ''}</p>
                  <p><span className="font-bold">Sumber Menu:</span> {selectedMenuSource}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">Tanggal Cetak:</span> {new Date().toLocaleDateString('id-ID')}</p>
                  <p><span className="font-bold">Total Transaksi:</span> {filteredTransactions.length} Nota Lunas</p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center w-8">No</th>
                    <th className="p-2 border-r border-slate-300">Nama Barang / Layanan</th>
                    <th className="p-2 border-r border-slate-300">Kategori</th>
                    <th className="p-2 border-r border-slate-300 text-right">Qty</th>
                    <th className="p-2 border-r border-slate-300 text-right">HPP (Modal)</th>
                    <th className="p-2 border-r border-slate-300 text-right">Harga Jual</th>
                    <th className="p-2 border-r border-slate-300 text-right">Total Omzet</th>
                    <th className="p-2 text-right">Laba Bersih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAndSortedItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-bold">{item.namaItem}</td>
                      <td className="p-2 border-r border-slate-200">{item.kategori}</td>
                      <td className="p-2 border-r border-slate-200 text-right">{item.qtyTerjual} {item.satuan}</td>
                      <td className="p-2 border-r border-slate-200 text-right">Rp {item.hargaBeliAvg.toLocaleString('id-ID')}</td>
                      <td className="p-2 border-r border-slate-200 text-right">Rp {item.hargaJualAvg.toLocaleString('id-ID')}</td>
                      <td className="p-2 border-r border-slate-200 text-right font-bold">Rp {item.totalOmzet.toLocaleString('id-ID')}</td>
                      <td className="p-2 text-right font-black text-emerald-800">Rp {item.totalLaba.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-black border-t-2 border-slate-800 text-xs">
                  <tr>
                    <td colSpan={3} className="p-2 text-center uppercase">TOTAL REKAPITULASI</td>
                    <td className="p-2 text-right">{summaryMetrics.totalQty} Unit</td>
                    <td colSpan={2} className="p-2 text-right">Total HPP: Rp {summaryMetrics.totalHpp.toLocaleString('id-ID')}</td>
                    <td className="p-2 text-right">Rp {summaryMetrics.totalOmzet.toLocaleString('id-ID')}</td>
                    <td className="p-2 text-right text-emerald-800">Rp {summaryMetrics.totalLaba.toLocaleString('id-ID')}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 text-center text-xs pt-8">
                <div>
                  <p className="text-slate-500">Dibuat Oleh Petugas Kasir / Admin,</p>
                  <div className="h-16" />
                  <p className="font-bold border-t border-slate-400 inline-block px-8 pt-1">Petugas Administrasi</p>
                </div>
                <div>
                  <p className="text-slate-500">Mengetahui & Menyetujui,</p>
                  <div className="h-16" />
                  <p className="font-bold border-t border-slate-400 inline-block px-8 pt-1">{klinik?.namaPenanggungJawab || 'Pimpinan / Owner Klinik'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
