import React, { useState } from 'react';
import { RekamMedis, Pasien, Dokter } from '../../types';
import {
  Activity, TrendingUp, BarChart2, AlertTriangle, Search, Filter,
  Calendar, FileSpreadsheet, ShieldAlert, Sparkles, Stethoscope,
  Layers, PieChart, Flame, CheckCircle2, HeartPulse, Info,
  ChevronRight, ArrowUpRight
} from 'lucide-react';
import { exportToExcel } from '../../services/excel';

interface LaporanTrenPenyakitViewProps {
  rekamMedisList: RekamMedis[];
  pasienList: Pasien[];
  dokterList?: Dokter[];
}

export interface DiseaseStat {
  diagnosa: string;
  totalKasus: number;
  persentase: number;
  isContagious: boolean;
  kategoriOrgan: string;
  spesiesBreakdown: Record<string, number>;
  rawatInapCount: number;
  rawatJalanCount: number;
  terakhirMuncul: string;
}

// Helper to determine if a disease is highly contagious
const isHighlyContagious = (diagnosa: string): boolean => {
  const d = diagnosa.toLowerCase();
  const contagiousKeywords = [
    'panleukopenia', 'fpv', 'parvo', 'cpv', 'distemper', 'calici', 'fcv',
    'rhinotracheitis', 'flu', 'scabies', 'jamur', 'ringworm', 'dermatofitosis',
    'chlamydia', 'rabies', 'fip', 'felv', 'fiv', 'cacingan', 'parasit'
  ];
  return contagiousKeywords.some((k) => d.includes(k));
};

// Helper to categorize disease by organ system or type
const categorizeDisease = (diagnosa: string): string => {
  const d = diagnosa.toLowerCase();
  if (d.includes('panleuk') || d.includes('calici') || d.includes('parvo') || d.includes('distemper') || d.includes('rhino') || d.includes('fip') || d.includes('virus')) {
    return 'Infeksius & Viral';
  }
  if (d.includes('scabies') || d.includes('jamur') || d.includes('ringworm') || d.includes('dermatit') || d.includes('kulit') || d.includes('alopesia') || d.includes('flea')) {
    return 'Kulit & Parasit';
  }
  if (d.includes('diare') || d.includes('gastro') || d.includes('muntah') || d.includes('cacing') || d.includes('obstipasi') || d.includes('lambung')) {
    return 'Pencernaan (Gastrointestinal)';
  }
  if (d.includes('flu') || d.includes('batuk') || d.includes('pneumonia') || d.includes('napas') || d.includes('bronkhit')) {
    return 'Respirasi (Pernapasan)';
  }
  if (d.includes('flutd') || d.includes('cystitis') || d.includes('ginjal') || d.includes('kencing') || d.includes('urinar') || d.includes('batu')) {
    return 'Saluran Kemih (Urinari)';
  }
  if (d.includes('abses') || d.includes('luka') || d.includes('fractur') || d.includes('patah') || d.includes('hernia') || d.includes('operasi') || d.includes('steril')) {
    return 'Bedah & Trauma';
  }
  return 'Lain-lain / Umum';
};

export const LaporanTrenPenyakitView: React.FC<LaporanTrenPenyakitViewProps> = ({
  rekamMedisList = [],
  pasienList = [],
}) => {
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'this_month' | 'this_year' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSpesies, setSelectedSpesies] = useState<string>('Semua');
  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  // Pasien Quick Lookup Map
  const pasienMap = new Map<string, Pasien>();
  pasienList.forEach((p) => pasienMap.set(p.id, p));

  // Extract unique species list from pasienList
  const speciesList = Array.from(
    new Set(pasienList.map((p) => p.jenisHewan).filter(Boolean))
  );

  // Filter Rekam Medis by Date & Species
  const filteredRM = rekamMedisList.filter((rm) => {
    // Exclude records with blank diagnoses
    if (!rm.assessment?.diagnosaUtama || rm.assessment.diagnosaUtama.trim() === '') {
      return false;
    }

    // Date Filter
    if (periodFilter === 'today' && rm.tanggal !== todayStr) return false;
    if (periodFilter === 'this_month' && !rm.tanggal.startsWith(currentMonthStr)) return false;
    if (periodFilter === 'this_year' && !rm.tanggal.startsWith(currentYearStr)) return false;
    if (periodFilter === 'custom') {
      if (startDate && rm.tanggal < startDate) return false;
      if (endDate && rm.tanggal > endDate) return false;
    }

    // Species Filter
    if (selectedSpesies !== 'Semua') {
      const p = pasienMap.get(rm.pasienId);
      if (!p || p.jenisHewan !== selectedSpesies) return false;
    }

    return true;
  });

  // Aggregate Disease Statistics
  const diseaseMap: Record<string, {
    diagnosa: string;
    totalKasus: number;
    spesiesBreakdown: Record<string, number>;
    rawatInapCount: number;
    rawatJalanCount: number;
    terakhirMuncul: string;
  }> = {};

  filteredRM.forEach((rm) => {
    const rawDiag = rm.assessment.diagnosaUtama.trim();
    // Normalize diagnosis name (Capitalize title style)
    const normKey = rawDiag.toLowerCase();
    const pasien = pasienMap.get(rm.pasienId);
    const jenisHewan = pasien ? pasien.jenisHewan : 'Lainnya';

    if (!diseaseMap[normKey]) {
      diseaseMap[normKey] = {
        diagnosa: rawDiag,
        totalKasus: 0,
        spesiesBreakdown: {},
        rawatInapCount: 0,
        rawatJalanCount: 0,
        terakhirMuncul: rm.tanggal,
      };
    }

    const stat = diseaseMap[normKey];
    stat.totalKasus += 1;
    stat.spesiesBreakdown[jenisHewan] = (stat.spesiesBreakdown[jenisHewan] || 0) + 1;

    if (rm.plan?.statusLanjutan === 'Rawat Inap') {
      stat.rawatInapCount += 1;
    } else {
      stat.rawatJalanCount += 1;
    }

    if (rm.tanggal > stat.terakhirMuncul) {
      stat.terakhirMuncul = rm.tanggal;
    }
  });

  const totalFilteredKasus = filteredRM.length;

  // Process and compute stats
  let diseaseStatsList: DiseaseStat[] = Object.values(diseaseMap).map((d) => {
    const isContagious = isHighlyContagious(d.diagnosa);
    const kategoriOrgan = categorizeDisease(d.diagnosa);
    const persentase = totalFilteredKasus > 0 ? Math.round((d.totalKasus / totalFilteredKasus) * 1000) / 10 : 0;

    return {
      diagnosa: d.diagnosa,
      totalKasus: d.totalKasus,
      persentase,
      isContagious,
      kategoriOrgan,
      spesiesBreakdown: d.spesiesBreakdown,
      rawatInapCount: d.rawatInapCount,
      rawatJalanCount: d.rawatJalanCount,
      terakhirMuncul: d.terakhirMuncul,
    };
  });

  // Filter by search query and category
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    diseaseStatsList = diseaseStatsList.filter((d) =>
      d.diagnosa.toLowerCase().includes(q) || d.kategoriOrgan.toLowerCase().includes(q)
    );
  }

  if (selectedKategori !== 'Semua') {
    diseaseStatsList = diseaseStatsList.filter((d) => d.kategoriOrgan === selectedKategori);
  }

  // Sort by highest cases
  diseaseStatsList.sort((a, b) => b.totalKasus - a.totalKasus);

  // Kategori Organ Summary Statistics
  const organStatsMap: Record<string, number> = {};
  diseaseStatsList.forEach((d) => {
    organStatsMap[d.kategoriOrgan] = (organStatsMap[d.kategoriOrgan] || 0) + d.totalKasus;
  });

  // Highly Contagious Case Count
  const totalContagiousCases = diseaseStatsList
    .filter((d) => d.isContagious)
    .reduce((acc, i) => acc + i.totalKasus, 0);

  // Total Rawat Inap from Diagnoses
  const totalRawatInapKasus = diseaseStatsList.reduce((acc, i) => acc + i.rawatInapCount, 0);

  // Top 1 Disease
  const topDisease = diseaseStatsList.length > 0 ? diseaseStatsList[0] : null;

  // Monthly Disease Trend Data (Last 6 Months)
  const getMonthlyTrend = () => {
    const monthCounts: Record<string, number> = {};
    const top5Names = diseaseStatsList.slice(0, 5).map((d) => d.diagnosa.toLowerCase());

    rekamMedisList.forEach((rm) => {
      if (!rm.assessment?.diagnosaUtama) return;
      const diag = rm.assessment.diagnosaUtama.trim().toLowerCase();
      if (top5Names.includes(diag)) {
        const m = rm.tanggal.substring(0, 7); // YYYY-MM
        monthCounts[m] = (monthCounts[m] || 0) + 1;
      }
    });

    return Object.entries(monthCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);
  };

  const monthlyTrendData = getMonthlyTrend();

  // Export Excel
  const handleExportExcel = () => {
    const dataToExport = diseaseStatsList.map((d, index) => ({
      'Peringkat': index + 1,
      'Diagnosa Penyakit': d.diagnosa,
      'Kategori Organ / Sistem': d.kategoriOrgan,
      'Sifat Menular': d.isContagious ? 'YA (Wabah / Menular)' : 'Tidak',
      'Total Kasus Terdeteksi': d.totalKasus,
      'Persentase Distribusi (%)': `${d.persentase}%`,
      'Spesies Terdampak': Object.entries(d.spesiesBreakdown)
        .map(([sp, count]) => `${sp}: ${count}`)
        .join(', '),
      'Kasus Rawat Jalan': d.rawatJalanCount,
      'Kasus Rawat Inap': d.rawatInapCount,
      'Terakhir Terdiagnosa': d.terakhirMuncul,
    }));

    const periodLabel =
      periodFilter === 'today'
        ? `Hari_Ini_${todayStr}`
        : periodFilter === 'this_month'
        ? `Bulan_${currentMonthStr}`
        : periodFilter === 'this_year'
        ? `Tahun_${currentYearStr}`
        : 'Semua_Periode';

    exportToExcel(dataToExport, `Laporan_Tren_Penyakit_Klinik_${periodLabel}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-rose-800 via-purple-900 to-indigo-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center space-x-2 bg-rose-500/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md text-rose-200 border border-rose-400/30">
            <Activity className="w-3.5 h-3.5" />
            <span>Sistem Laporan Epidemiologi & Tren Penyakit Hewan</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Laporan Tren Penyakit Hewan
          </h1>
          <p className="text-rose-100 text-xs md:text-sm max-w-2xl">
            Analisis peringkat diagnosa medis paling sering muncul, deteksi potensi wabah penyakit menular, serta distribusi kasus berdasarkan spesies pasien.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="relative z-10 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2 text-xs md:text-sm cursor-pointer border border-rose-400/30"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel Tren</span>
        </button>
      </div>

      {/* Date Period & Species Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-2 font-bold text-slate-700">
          <Calendar className="w-4 h-4 text-rose-600" />
          <span>Filter Periode Diagnosa:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPeriodFilter('today')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'today'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setPeriodFilter('this_month')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'this_month'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Bulan Ini ({currentMonthStr})
          </button>
          <button
            onClick={() => setPeriodFilter('this_year')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'this_year'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tahun Ini ({currentYearStr})
          </button>
          <button
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'all'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Periode
          </button>
        </div>

        {/* Species Select */}
        <div className="flex items-center space-x-2 border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100">
          <span className="font-bold text-slate-600">Spesies:</span>
          <select
            value={selectedSpesies}
            onChange={(e) => setSelectedSpesies(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="Semua">Semua Spesies</option>
            {speciesList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date Inputs */}
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

      {/* Main KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Kasus Diperiksa</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-900">
              {totalFilteredKasus} <span className="text-xs font-normal text-slate-500">Rekam Medis</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Dari pasien {selectedSpesies === 'Semua' ? 'semua jenis' : selectedSpesies}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Diagnosa Terbanyak (#1)</p>
            <h3 className="text-base md:text-lg font-black text-indigo-800 line-clamp-1">
              {topDisease ? topDisease.diagnosa : '-'}
            </h3>
            <p className="text-[10px] text-indigo-600 font-bold">
              {topDisease ? `${topDisease.totalKasus} Kasus (${topDisease.persentase}%)` : 'Belum Ada Data'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs flex items-center space-x-4 bg-gradient-to-br from-rose-50/50 to-orange-50/30">
          <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-rose-800 font-bold">Penyakit Menular / Wabah</p>
            <h3 className="text-xl md:text-2xl font-black text-rose-700">
              {totalContagiousCases} <span className="text-xs font-normal text-rose-600">Kasus</span>
            </h3>
            <p className="text-[10px] text-rose-600 font-bold">
              Potensi Penularan Antar Hewan
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Kasus Rawat Inap</p>
            <h3 className="text-xl md:text-2xl font-black text-amber-700">
              {totalRawatInapKasus} <span className="text-xs font-normal text-slate-500">Pasien</span>
            </h3>
            <p className="text-[10px] text-amber-600 font-medium">
              {totalFilteredKasus > 0
                ? `${Math.round((totalRawatInapKasus / totalFilteredKasus) * 100)}% Butuh Opname`
                : '0%'}
            </p>
          </div>
        </div>
      </div>

      {/* Contagious Warning Alert if contagious cases detected */}
      {totalContagiousCases > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-red-500/10 border-2 border-rose-300 p-4 rounded-2xl flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-extrabold text-rose-900">
              Peringatan Keamanan Hayati (Biosecurity Alert): Terdeteksi {totalContagiousCases} Kasus Penyakit Menular!
            </h4>
            <p className="text-rose-800">
              Terdapat beberapa rekam medis dengan diagnosa penyakit infeksius/parasit seperti <strong>Panleukopenia, Calicivirus, Parvovirus, atau Scabies</strong>. Pastikan petugas menerapkan prosedur desinfeksi meja periksa, ruang isolasi rawat inap, dan mengedukasi pemilik hewan tentang protokol karantina & vaksinasi.
            </p>
          </div>
        </div>
      )}

      {/* Category Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            {[
              'Semua',
              'Infeksius & Viral',
              'Kulit & Parasit',
              'Pencernaan (Gastrointestinal)',
              'Respirasi (Pernapasan)',
              'Saluran Kemih (Urinari)',
              'Bedah & Trauma',
              'Lain-lain / Umum',
            ].map((kat) => (
              <button
                key={kat}
                onClick={() => setSelectedKategori(kat)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedKategori === kat
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {kat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari diagnosa penyakit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Ranked Table of Disease Diagnoses */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <span>Peringkat Frekuensi Diagnosa Penyakit</span>
            </h3>
            <p className="text-xs text-slate-500">
              Urutan diagnosa dari yang terbanyak ditangani oleh tim medis klinik
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200">
            {diseaseStatsList.length} Diagnosa Unik
          </span>
        </div>

        {diseaseStatsList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600 text-sm">Belum ada rekam medis yang cocok untuk filter ini</p>
            <p className="text-xs">Ubah filter periode, spesies hewan, atau pencarian Anda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-4 text-center">Peringkat</th>
                  <th className="p-4">Diagnosa Penyakit</th>
                  <th className="p-4">Kategori Organ / Sistem</th>
                  <th className="p-4 text-center">Menular?</th>
                  <th className="p-4 text-center">Total Kasus</th>
                  <th className="p-4">Distribusi Persentase</th>
                  <th className="p-4">Spesies Terdampak</th>
                  <th className="p-4 text-center">Status Lanjutan</th>
                  <th className="p-4 text-right">Terakhir Muncul</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diseaseStatsList.map((item, idx) => (
                  <tr key={item.diagnosa} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-center">
                      <span
                        className={`w-7 h-7 inline-flex items-center justify-center rounded-full font-black text-xs ${
                          idx === 0
                            ? 'bg-amber-400 text-amber-950 shadow-sm'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-900'
                            : idx === 2
                            ? 'bg-amber-700/20 text-amber-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-slate-900 text-sm">
                      {item.diagnosa}
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.kategoriOrgan}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      {item.isContagious ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Menular</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">-</span>
                      )}
                    </td>

                    <td className="p-4 text-center font-black text-slate-900 text-sm">
                      {item.totalKasus}
                    </td>

                    <td className="p-4 w-48">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span>{item.persentase}%</span>
                          <span className="text-slate-400">{item.totalKasus}/{totalFilteredKasus}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              idx === 0
                                ? 'bg-rose-600'
                                : idx === 1
                                ? 'bg-indigo-600'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.min(item.persentase, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(item.spesiesBreakdown).map(([sp, count]) => (
                          <span
                            key={sp}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {sp}: <strong>{count}</strong>
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          RJ: {item.rawatJalanCount}
                        </span>
                        {item.rawatInapCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            RI: {item.rawatInapCount}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-right text-slate-500 font-medium">
                      {item.terakhirMuncul}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Trend Cards / Visual Graph Summary */}
      {monthlyTrendData.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-rose-600" />
                <span>Grafik Perkembangan Kasus 5 Penyakit Teratas (6 Bulan Terakhir)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Laju pertumbuhan diagnosa penyakit utama per bulan untuk memprediksi musim wabah
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {monthlyTrendData.map(([bulan, count]) => (
              <div key={bulan} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{bulan}</p>
                <h4 className="text-lg font-black text-rose-700">{count} Kasus</h4>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        (count / Math.max(...monthlyTrendData.map((m) => m[1] || 1))) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
