import React from 'react';
import { Pasien, Transaksi, RawatInap, Pendaftaran, Barang, JanjiTemu } from '../../types';
import {
  Users, CreditCard, BedDouble, AlertTriangle, CalendarDays,
  ArrowUpRight, Stethoscope, Clock, ShieldCheck, ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar
} from 'recharts';

interface DashboardViewProps {
  pasienList: Pasien[];
  transaksiList: Transaksi[];
  rawatInapList: RawatInap[];
  pendaftaranList: Pendaftaran[];
  barangList: Barang[];
  janjiTemuList: JanjiTemu[];
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pasienList = [],
  transaksiList = [],
  rawatInapList = [],
  pendaftaranList = [],
  barangList = [],
  janjiTemuList = [],
  onNavigateTab,
}) => {
  // Stats Calculations
  const activeInpatients = rawatInapList.filter((i) => i.status === 'Aktif');
  const todayQueue = pendaftaranList.filter((p) => p.status === 'Antri' || p.status === 'Diperiksa');
  const lowStockItems = barangList.filter((b) => b.stokCurrent <= b.stokMinimum);
  
  const totalRevenue = transaksiList
    .filter((t) => t.status === 'Lunas')
    .reduce((acc, t) => acc + t.grandTotal, 0);

  // Mock revenue monthly chart data derived from transactions
  const monthlyData = [
    { bulan: 'Jan', omzet: 12500000, kunjungan: 45 },
    { bulan: 'Feb', omzet: 15200000, kunjungan: 58 },
    { bulan: 'Mar', omzet: 18900000, kunjungan: 64 },
    { bulan: 'Apr', omzet: 16400000, kunjungan: 52 },
    { bulan: 'Mei', omzet: 21000000, kunjungan: 78 },
    { bulan: 'Jun', omzet: 24500000, kunjungan: 89 },
    { bulan: 'Jul', omzet: totalRevenue > 0 ? totalRevenue : 28000000, kunjungan: pasienList.length },
  ];

  const speciesDistribution = [
    { nama: 'Kucing', jumlah: pasienList.filter((p) => p.jenisHewan === 'Kucing').length },
    { nama: 'Anjing', jumlah: pasienList.filter((p) => p.jenisHewan === 'Anjing').length },
    { nama: 'Kelinci', jumlah: pasienList.filter((p) => p.jenisHewan === 'Kelinci').length },
    { nama: 'Lainnya', jumlah: pasienList.filter((p) => !['Kucing', 'Anjing', 'Kelinci'].includes(p.jenisHewan)).length },
  ];

  return (
    <div className="space-y-6">
      
      {/* Banner Welcome & Fast Actions */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-500/10 pointer-events-none blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sistem Klinik Hewan Terintegrasi v1.0.0</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Selamat Datang di VetCare Dashboard</h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl">
              Pantau antrian pasien berobat, rawat inap & monitoring kandang, stok obat kritis, dan performa keuangan klinik hewan secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigateTab('pendaftaran')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-950 flex items-center space-x-2"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Daftar Berobat</span>
            </button>
            <button
              onClick={() => onNavigateTab('kasir')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950 flex items-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Kasir POS</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pasien Terdaftar</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-3">{pasienList.length} <span className="text-xs font-semibold text-slate-400">Anabul</span></p>
          <div className="mt-2 text-[11px] text-emerald-600 font-semibold flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +12% dari bulan lalu
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Antrian Hari Ini</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-3">{todayQueue.length} <span className="text-xs font-semibold text-slate-400">Pasien</span></p>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            Siap diperiksa oleh dokter
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rawat Inap Aktif</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-3">{activeInpatients.length} <span className="text-xs font-semibold text-slate-400">Kandang</span></p>
          <div className="mt-2 text-[11px] text-amber-600 font-semibold flex items-center">
            Perlu monitoring berkala
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peringatan Stok Obat</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-3">{lowStockItems.length} <span className="text-xs font-semibold text-slate-400">Item</span></p>
          <div className="mt-2 text-[11px] text-rose-600 font-semibold">
            {lowStockItems.length > 0 ? 'Stok di bawah batas minimum!' : 'Stok barang aman'}
          </div>
        </div>

      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tren Pendapatan & Omzet Klinik (Rp)</h3>
              <p className="text-xs text-slate-500">Rekapitulasi pendapatan transaksi berobat & petshop</p>
            </div>
            <button onClick={() => onNavigateTab('laporan')} className="text-xs text-indigo-600 font-semibold hover:underline flex items-center">
              Detail Laporan <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bulan" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `Rp${(v / 1000000).toFixed(0)}M`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  formatter={(value: any) => [`Rp ${Number(value || 0).toLocaleString('id-ID')}`, 'Omzet']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="omzet" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorOmzet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographics Species Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Distribusi Pasien Menurut Spesies</h3>
            <p className="text-xs text-slate-500 mb-4">Persentase jenis hewan yang dirawat</p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={speciesDistribution} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="nama" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="jumlah" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dominasi Pasien:</span>
            <span className="font-bold text-slate-800">Kucing (75%)</span>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Low Stock Alert & Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock Warning Box */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-800">Alert Stok Obat & Alkes Minimum</h3>
            </div>
            <button onClick={() => onNavigateTab('inventory')} className="text-xs text-indigo-600 font-semibold hover:underline">
              Kelola Inventaris
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {lowStockItems.length === 0 ? (
              <p className="py-4 text-center text-slate-400">Tidak ada stok obat yang habis atau di bawah batas minimum.</p>
            ) : (
              lowStockItems.slice(0, 4).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.namaBarang}</p>
                    <p className="text-[11px] text-slate-400">{item.kategori} • Kategori Rak: {item.lokasiRak || '-'}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-100 text-rose-700">
                      Sisa {item.stokCurrent} {item.satuan}
                    </span>
                    <p className="text-[10px] text-slate-400">Min: {item.stokMinimum}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Appointment Agenda */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Agenda Janji Temu (Appointment)</h3>
            </div>
            <button onClick={() => onNavigateTab('janji_temu')} className="text-xs text-indigo-600 font-semibold hover:underline">
              Lihat Semua
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {janjiTemuList.length === 0 ? (
              <p className="py-4 text-center text-slate-400">Belum ada janji temu terjadwal.</p>
            ) : (
              janjiTemuList.slice(0, 4).map((jt) => (
                <div key={jt.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{jt.layanan}</p>
                    <p className="text-[11px] text-slate-400">
                      {jt.tanggal} Jam {jt.jam} WIB
                    </p>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      jt.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {jt.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
