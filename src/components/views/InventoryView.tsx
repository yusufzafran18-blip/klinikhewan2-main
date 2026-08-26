import React, { useState } from 'react';
import { Barang, KategoriBarang, MutasiStok, JenisMutasiStok, TipeReferensiMutasi, DataKlinik } from '../../types';
import { ModulePermissions } from '../../utils/rbac';
import {
  Package, Plus, Search, AlertTriangle, FileSpreadsheet, Edit, Trash2,
  Printer, ArrowDownRight, ArrowUpRight, RefreshCw, Filter, Calendar,
  FileText, CheckCircle2, X, Building2, User
} from 'lucide-react';
import { exportToExcel } from '../../services/excel';

interface InventoryViewProps {
  barangList: Barang[];
  mutasiStokList: MutasiStok[];
  permissions?: ModulePermissions;
  klinik?: DataKlinik;
  activeUserName?: string;
  onSaveBarang: (barang: Barang) => void | Promise<void>;
  onDeleteBarang: (id: string) => void;
  onSaveMutasiStok?: (mutasiList: MutasiStok[]) => void | Promise<void>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  barangList = [],
  mutasiStokList = [],
  permissions,
  klinik,
  activeUserName = 'Petugas Farmasi / Kasir',
  onSaveBarang,
  onDeleteBarang,
  onSaveMutasiStok,
}) => {
  // Main Tab / View states
  const [showModal, setShowModal] = useState(false);
  const [showStockCardModal, setShowStockCardModal] = useState(false);
  const [showPrintDocModal, setShowPrintDocModal] = useState(false);
  const [selectedSinglePrintEntry, setSelectedSinglePrintEntry] = useState<MutasiStok | null>(null);
  const [editingBarang, setEditingBarang] = useState<Barang | null>(null);
  
  // Inventory list search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');

  // Manual Stock Mutation Form state
  const [stockCardBarangId, setStockCardBarangId] = useState(barangList[0]?.id || '');
  const [stockCardType, setStockCardType] = useState<JenisMutasiStok>('Masuk');
  const [stockCardQty, setStockCardQty] = useState(1);
  const [stockCardKeterangan, setStockCardKeterangan] = useState('');
  const [stockCardTanggal, setStockCardTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [stockCardReferensi, setStockCardReferensi] = useState('');

  // Stock Document filter state
  const [stockFilterStart, setStockFilterStart] = useState('');
  const [stockFilterEnd, setStockFilterEnd] = useState('');
  const [stockCardSearch, setStockCardSearch] = useState('');
  const [stockJenisFilter, setStockJenisFilter] = useState<string>('Semua');
  const [stockTipeRefFilter, setStockTipeRefFilter] = useState<string>('Semua');

  // Item Form State
  const [namaBarang, setNamaBarang] = useState('');
  const [kategori, setKategori] = useState<KategoriBarang>('Obat');
  const [satuan, setSatuan] = useState<'Tablet' | 'Botol' | 'Ampul' | 'Sachet' | 'Kg' | 'Pcs' | 'Box'>('Tablet');
  const [hargaBeli, setHargaBeli] = useState(5000);
  const [hargaJual, setHargaJual] = useState(8000);
  const [stokCurrent, setStokCurrent] = useState(50);
  const [stokMinimum, setStokMinimum] = useState(10);
  const [tanggalKadaluarsa, setTanggalKadaluarsa] = useState('2027-12-31');
  const [lokasiRak, setLokasiRak] = useState('Rak Obat A-1');

  const handleOpenAdd = () => {
    setEditingBarang(null);
    setNamaBarang('');
    setKategori('Obat');
    setSatuan('Tablet');
    setHargaBeli(5000);
    setHargaJual(8000);
    setStokCurrent(50);
    setStokMinimum(10);
    setTanggalKadaluarsa('2027-12-31');
    setLokasiRak('Rak Obat A-1');
    setShowModal(true);
  };

  const handleOpenEdit = (b: Barang) => {
    setEditingBarang(b);
    setNamaBarang(b.namaBarang);
    setKategori(b.kategori);
    setSatuan(b.satuan as any);
    setHargaBeli(b.hargaBeli);
    setHargaJual(b.hargaJual);
    setStokCurrent(b.stokCurrent);
    setStokMinimum(b.stokMinimum);
    setTanggalKadaluarsa(b.tanggalKadaluarsa || '');
    setLokasiRak(b.lokasiRak || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !editingBarang;
    const kode = isNew ? `BRG-${Date.now().toString().slice(-4)}` : editingBarang.kodeBarang;

    const newBarang: Barang = {
      id: editingBarang ? editingBarang.id : 'brg-' + Date.now(),
      kodeBarang: kode,
      namaBarang,
      kategori,
      satuan,
      hargaBeli,
      hargaJual,
      stokCurrent,
      stokMinimum,
      tanggalKadaluarsa: tanggalKadaluarsa || undefined,
      lokasiRak: lokasiRak || undefined,
    };

    const previousStock = editingBarang?.stokCurrent ?? 0;
    await onSaveBarang(newBarang);

    // If stock changed or new item, record a mutation
    if (isNew) {
      const initMutation: MutasiStok = {
        id: `mutasi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        barangId: newBarang.id,
        kodeBarang: newBarang.kodeBarang,
        namaBarang: newBarang.namaBarang,
        kategori: newBarang.kategori,
        satuan: newBarang.satuan,
        tanggal: new Date().toISOString().slice(0, 10),
        waktu: new Date().toTimeString().slice(0, 5),
        jenis: 'Masuk',
        jumlah: newBarang.stokCurrent,
        saldoSebelum: 0,
        saldoSetelah: newBarang.stokCurrent,
        keterangan: `Barang baru ditambahkan ke inventaris (${newBarang.namaBarang})`,
        referensi: newBarang.kodeBarang,
        tipeReferensi: 'Inisialisasi',
        petugas: activeUserName,
      };
      if (onSaveMutasiStok) {
        await onSaveMutasiStok([initMutation, ...mutasiStokList]);
      }
    } else if (previousStock !== newBarang.stokCurrent) {
      const delta = Math.abs(newBarang.stokCurrent - previousStock);
      const jenis: JenisMutasiStok = newBarang.stokCurrent > previousStock ? 'Masuk' : 'Keluar';
      const editMutation: MutasiStok = {
        id: `mutasi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        barangId: newBarang.id,
        kodeBarang: newBarang.kodeBarang,
        namaBarang: newBarang.namaBarang,
        kategori: newBarang.kategori,
        satuan: newBarang.satuan,
        tanggal: new Date().toISOString().slice(0, 10),
        waktu: new Date().toTimeString().slice(0, 5),
        jenis,
        jumlah: delta,
        saldoSebelum: previousStock,
        saldoSetelah: newBarang.stokCurrent,
        keterangan: `Penyesuaian data inventaris master (${newBarang.namaBarang})`,
        referensi: newBarang.kodeBarang,
        tipeReferensi: 'Penyesuaian Manual',
        petugas: activeUserName,
      };
      if (onSaveMutasiStok) {
        await onSaveMutasiStok([editMutation, ...mutasiStokList]);
      }
    }

    setShowModal(false);
  };

  const handleExportExcel = () => {
    const data = barangList.map((b) => ({
      'Kode Barang': b.kodeBarang,
      'Nama Barang': b.namaBarang,
      'Kategori': b.kategori,
      'Satuan': b.satuan,
      'Harga Beli (Rp)': b.hargaBeli,
      'Harga Jual (Rp)': b.hargaJual,
      'Stok Saat Ini': b.stokCurrent,
      'Stok Minimum': b.stokMinimum,
      'Lokasi Rak': b.lokasiRak || '-',
      'Expired Date': b.tanggalKadaluarsa || '-',
    }));
    exportToExcel(data, 'Stok_Inventaris_Obat_VetCare');
  };

  const filteredBarang = barangList.filter((b) => {
    const matchSearch = `${b.namaBarang} ${b.kodeBarang}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'Semua' || b.kategori === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleAddStockCard = async () => {
    const targetId = stockCardBarangId || barangList[0]?.id;
    if (!targetId) return;

    const selectedBarang = barangList.find((b) => b.id === targetId);
    if (!selectedBarang) return;

    const qty = Math.max(0, stockCardQty || 0);
    const prevStock = selectedBarang.stokCurrent ?? 0;
    const nextStock = stockCardType === 'Masuk'
      ? prevStock + qty
      : stockCardType === 'Keluar'
        ? Math.max(0, prevStock - qty)
        : stockCardQty; // If adjustment, set directly to value

    const actualQty = stockCardType === 'Penyesuaian' ? Math.abs(nextStock - prevStock) : qty;

    await onSaveBarang({
      ...selectedBarang,
      stokCurrent: nextStock,
    });

    const newMutation: MutasiStok = {
      id: `mutasi-man-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      barangId: selectedBarang.id,
      kodeBarang: selectedBarang.kodeBarang,
      namaBarang: selectedBarang.namaBarang,
      kategori: selectedBarang.kategori,
      satuan: selectedBarang.satuan,
      tanggal: stockCardTanggal,
      waktu: new Date().toTimeString().slice(0, 5),
      jenis: stockCardType,
      jumlah: actualQty,
      saldoSebelum: prevStock,
      saldoSetelah: nextStock,
      keterangan: stockCardKeterangan || (stockCardType === 'Masuk' ? 'Penambahan stok manual' : stockCardType === 'Keluar' ? 'Pengurangan stok manual' : 'Penyesuaian stok opname manual'),
      referensi: stockCardReferensi || 'MANUAL',
      tipeReferensi: 'Penyesuaian Manual',
      petugas: activeUserName,
    };

    if (onSaveMutasiStok) {
      await onSaveMutasiStok([newMutation, ...mutasiStokList]);
    }

    setShowStockCardModal(false);
    setStockCardQty(1);
    setStockCardKeterangan('');
    setStockCardReferensi('');
    setStockCardType('Masuk');
    setStockCardTanggal(new Date().toISOString().slice(0, 10));
  };

  const filteredStockCardList = mutasiStokList.filter((entry) => {
    const barang = barangList.find((b) => b.id === entry.barangId);
    const searchableText = `${barang?.namaBarang || ''} ${entry.namaBarang || ''} ${barang?.kodeBarang || ''} ${entry.kodeBarang || ''} ${entry.referensi || ''} ${entry.keterangan || ''} ${entry.pasienNama || ''} ${entry.ownerNama || ''}`.toLowerCase();
    
    const matchSearch = !stockCardSearch || searchableText.includes(stockCardSearch.toLowerCase().trim());
    if (stockFilterStart && entry.tanggal < stockFilterStart) return false;
    if (stockFilterEnd && entry.tanggal > stockFilterEnd) return false;
    if (stockJenisFilter !== 'Semua' && entry.jenis !== stockJenisFilter) return false;
    if (stockTipeRefFilter !== 'Semua' && entry.tipeReferensi !== stockTipeRefFilter) return false;
    if (!matchSearch) return false;
    return true;
  });

  const stockSummaryStats = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayEntries = mutasiStokList.filter((entry) => entry.tanggal === today);
    const todayIn = todayEntries.filter((entry) => entry.jenis === 'Masuk').reduce((sum, entry) => sum + (entry.jumlah || 0), 0);
    const todayOut = todayEntries.filter((entry) => entry.jenis === 'Keluar').reduce((sum, entry) => sum + (entry.jumlah || 0), 0);
    const todayRJ = todayEntries.filter((entry) => entry.tipeReferensi === 'Rawat Jalan').reduce((sum, entry) => sum + (entry.jumlah || 0), 0);
    const lowStockCount = barangList.filter((b) => (b.stokCurrent || 0) <= (b.stokMinimum || 0)).length;
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyEntries = mutasiStokList.filter((entry) => entry.tanggal && entry.tanggal.startsWith(currentMonth));
    const monthIn = monthlyEntries.filter((entry) => entry.jenis === 'Masuk').reduce((sum, entry) => sum + (entry.jumlah || 0), 0);
    const monthOut = monthlyEntries.filter((entry) => entry.jenis === 'Keluar').reduce((sum, entry) => sum + (entry.jumlah || 0), 0);

    return { todayIn, todayOut, todayRJ, lowStockCount, monthIn, monthOut };
  })();

  const handleExportStockCardExcel = () => {
    const data = filteredStockCardList.map((entry, index) => {
      const barang = barangList.find((b) => b.id === entry.barangId);
      return {
        'No': index + 1,
        'Tanggal': entry.tanggal,
        'Waktu': entry.waktu || '-',
        'No. Dokumen / Referensi': entry.referensi || '-',
        'Sumber / Tipe Mutasi': entry.tipeReferensi || 'Rawat Jalan',
        'Kode Barang': entry.kodeBarang || barang?.kodeBarang || '-',
        'Nama Barang': entry.namaBarang || barang?.namaBarang || 'Barang',
        'Kategori': entry.kategori || barang?.kategori || '-',
        'Satuan': entry.satuan || barang?.satuan || '-',
        'Jenis Mutasi': entry.jenis,
        'Qty Masuk': entry.jenis === 'Masuk' ? entry.jumlah : 0,
        'Qty Keluar': entry.jenis === 'Keluar' ? entry.jumlah : 0,
        'Saldo Stok Akhir': entry.saldoSetelah,
        'Pasien': entry.pasienNama || '-',
        'Owner / Client': entry.ownerNama || '-',
        'Keterangan Lengkap': entry.keterangan || '-',
        'Petugas': entry.petugas || '-',
      };
    });

    exportToExcel(data, 'Dokumen_Catatan_Mutasi_Stok_Barang');
  };

  const handlePrintAllStock = () => {
    setSelectedSinglePrintEntry(null);
    setShowPrintDocModal(true);
  };

  const handlePrintSingle = (entry: MutasiStok) => {
    setSelectedSinglePrintEntry(entry);
    setShowPrintDocModal(true);
  };

  return (
    <div className="space-y-6" id="inventory-view-container">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs" id="inventory-header-card">
        <div>
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Inventaris Stok Obat, Alkes & Catatan Stok</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen stok barang medis, BMHP, pencatatan otomatis mutasi rawat jalan, rawat inap, & dokumen audit stok
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {permissions?.canExport !== false && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel Inventaris</span>
            </button>
          )}
          {permissions?.canCreate !== false && (
            <>
              <button
                type="button"
                onClick={() => {
                  setStockCardBarangId(barangList[0]?.id || '');
                  setStockCardQty(1);
                  setStockCardKeterangan('');
                  setStockCardReferensi('');
                  setStockCardTanggal(new Date().toISOString().slice(0, 10));
                  setShowStockCardModal(true);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Input Mutasi Manual</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Master Barang</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" id="inventory-stats-grid">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Total Master Barang</p>
          <p className="mt-1 text-2xl font-black text-slate-800">{barangList.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Item aktif di sistem</p>
        </div>
        <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold">Stok Masuk Hari Ini</p>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-800">{stockSummaryStats.todayIn}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Bulan ini: +{stockSummaryStats.monthIn}</p>
        </div>
        <div className="bg-rose-50/80 border border-rose-100 rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-rose-700 font-bold">Stok Keluar Hari Ini</p>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-rose-800">{stockSummaryStats.todayOut}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Bulan ini: -{stockSummaryStats.monthOut}</p>
        </div>
        <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-indigo-700 font-bold">Pemakaian Rawat Jalan</p>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-indigo-900">{stockSummaryStats.todayRJ}</p>
          <p className="text-[10px] text-indigo-600 mt-0.5">Dikeluarkan hari ini</p>
        </div>
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-amber-800 font-bold">Alert Stok Rendah</p>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-amber-900">{stockSummaryStats.lowStockCount}</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Stok &le; Batas Minimum</p>
        </div>
      </div>

      {/* Table 1: Master Inventaris Barang */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden" id="master-inventory-table-container">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Daftar Stok Inventaris Barang & Obat</h3>
            <p className="text-xs text-slate-500">Katalog barang aktif, harga jual/beli, lokasi rak, dan tanggal expired</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama / kode barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Obat">Obat / Farmasi</option>
              <option value="Alkes">Alkes / BMHP</option>
              <option value="Pakan">Pakan Medis</option>
              <option value="Vaksin">Vaksin</option>
              <option value="Aksesoris">Aksesoris</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Kode & Nama Barang</th>
                <th className="p-3.5">Kategori & Lokasi Rak</th>
                <th className="p-3.5">Harga Beli / Jual</th>
                <th className="p-3.5">Stok Saat Ini</th>
                <th className="p-3.5">Tanggal Expired</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBarang.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Tidak ada barang inventaris yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                filteredBarang.map((b) => {
                  const isLow = (b.stokCurrent || 0) <= (b.stokMinimum || 0);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-slate-800 text-xs block">{b.namaBarang}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{b.kodeBarang} • Satuan: {b.satuan}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {b.kategori}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">Rak: {b.lokasiRak || '-'}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="text-slate-400 text-[11px]">Beli: Rp {(b.hargaBeli || 0).toLocaleString('id-ID')}</p>
                        <p className="font-bold text-indigo-700">Jual: Rp {(b.hargaJual || 0).toLocaleString('id-ID')}</p>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                            isLow ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {b.stokCurrent} {b.satuan}
                          </span>
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Min Alert: {b.stokMinimum}</span>
                      </td>
                      <td className="p-3.5 text-slate-500 font-medium">{b.tanggalKadaluarsa || '-'}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {permissions?.canEdit !== false && (
                            <button
                              onClick={() => handleOpenEdit(b)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                              title="Edit Barang"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {permissions?.canDelete !== false && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Yakin ingin menghapus barang ${b.namaBarang}?`)) {
                                  onDeleteBarang(b.id);
                                }
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="Hapus Barang"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: DOKUMEN / CATATAN STOK BARANG (Kartu Stok & Riwayat Mutasi Lengkap) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4" id="dokumen-catatan-stok-section">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800">Dokumen / Catatan Mutasi Stok Barang</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Buku catatan audit resmi yang mencatat setiap barang masuk (pembelian/penyesuaian) dan barang keluar (pemberian obat, alkes, & pemakaian barang rawat jalan / inap / POS kasir)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintAllStock}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen Stok</span>
            </button>
            <button
              type="button"
              onClick={handleExportStockCardExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel Mutasi</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 flex flex-wrap gap-2.5 items-end text-xs">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Cari Dokumen / Pasien / Barang</label>
            <div className="flex items-center bg-white px-2.5 py-1.5 rounded-xl border border-slate-300">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                type="text"
                value={stockCardSearch}
                onChange={(e) => setStockCardSearch(e.target.value)}
                placeholder="No Nota, No RM, Pasien, Nama Obat..."
                className="w-full text-xs bg-transparent focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Jenis Mutasi</label>
            <select
              value={stockJenisFilter}
              onChange={(e) => setStockJenisFilter(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-white text-xs font-medium"
            >
              <option value="Semua">Semua Jenis (Masuk & Keluar)</option>
              <option value="Masuk">Masuk (+)</option>
              <option value="Keluar">Keluar (-)</option>
              <option value="Penyesuaian">Penyesuaian</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Sumber Transaksi</label>
            <select
              value={stockTipeRefFilter}
              onChange={(e) => setStockTipeRefFilter(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-white text-xs font-medium"
            >
              <option value="Semua">Semua Sumber</option>
              <option value="Rawat Jalan">Rawat Jalan (Poli/SOAP)</option>
              <option value="Rawat Inap">Rawat Inap (Kandang)</option>
              <option value="Penjualan Direct (PetShop)">Penjualan Direct / PetShop</option>
              <option value="Pembelian">Pembelian Supplier</option>
              <option value="Penyesuaian Manual">Penyesuaian Manual / Opname</option>
              <option value="Inisialisasi">Inisialisasi Stok Awal</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Tanggal Mulai</label>
            <input
              type="date"
              value={stockFilterStart}
              onChange={(e) => setStockFilterStart(e.target.value)}
              className="p-1.5 rounded-xl border border-slate-300 bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Tanggal Akhir</label>
            <input
              type="date"
              value={stockFilterEnd}
              onChange={(e) => setStockFilterEnd(e.target.value)}
              className="p-1.5 rounded-xl border border-slate-300 bg-white text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setStockCardSearch('');
              setStockFilterStart('');
              setStockFilterEnd('');
              setStockJenisFilter('Semua');
              setStockTipeRefFilter('Semua');
            }}
            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Mutasi Stok Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Waktu & Tanggal</th>
                <th className="p-3">No. Dokumen / Referensi</th>
                <th className="p-3">Nama & Kode Barang</th>
                <th className="p-3">Pasien / Pelanggan</th>
                <th className="p-3 text-center">Jenis</th>
                <th className="p-3 text-right">Masuk</th>
                <th className="p-3 text-right">Keluar</th>
                <th className="p-3 text-right">Saldo Akhir</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-center">Cetak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStockCardList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Belum ada dokumen catatan mutasi stok yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredStockCardList.slice(0, 100).map((entry) => {
                  const barang = barangList.find((b) => b.id === entry.barangId);
                  const isMasuk = entry.jenis === 'Masuk';
                  const isKeluar = entry.jenis === 'Keluar';

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 block">{entry.tanggal}</span>
                        <span className="text-[10px] text-slate-400">{entry.waktu || '00:00'} WIB</span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-700 text-xs block">
                          {entry.referensi || '-'}
                        </span>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold ${
                          entry.tipeReferensi === 'Rawat Jalan' ? 'bg-indigo-100 text-indigo-800' :
                          entry.tipeReferensi === 'Rawat Inap' ? 'bg-purple-100 text-purple-800' :
                          entry.tipeReferensi === 'Pembelian' ? 'bg-emerald-100 text-emerald-800' :
                          entry.tipeReferensi === 'Penjualan Direct (PetShop)' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {entry.tipeReferensi || 'Rawat Jalan'}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800">{entry.namaBarang || barang?.namaBarang || 'Barang'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {entry.kodeBarang || barang?.kodeBarang || '-'} • Satuan: {entry.satuan || barang?.satuan || 'Pcs'}
                        </div>
                      </td>

                      <td className="p-3">
                        {entry.pasienNama ? (
                          <>
                            <div className="font-semibold text-slate-800">{entry.pasienNama}</div>
                            <div className="text-[10px] text-slate-500">Owner: {entry.ownerNama || '-'}</div>
                          </>
                        ) : entry.ownerNama ? (
                          <div className="font-medium text-slate-700">{entry.ownerNama}</div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isMasuk ? 'bg-emerald-100 text-emerald-800' :
                          isKeluar ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {entry.jenis}
                        </span>
                      </td>

                      <td className="p-3 text-right font-black text-emerald-700 whitespace-nowrap">
                        {isMasuk ? `+${entry.jumlah}` : '-'}
                      </td>

                      <td className="p-3 text-right font-black text-rose-700 whitespace-nowrap">
                        {isKeluar ? `-${entry.jumlah}` : '-'}
                      </td>

                      <td className="p-3 text-right font-black text-indigo-800 whitespace-nowrap text-xs">
                        {entry.saldoSetelah}
                      </td>

                      <td className="p-3 max-w-xs">
                        <p className="text-[11px] text-slate-700 line-clamp-2">{entry.keterangan || '-'}</p>
                        {entry.petugas && (
                          <p className="text-[10px] text-slate-400 mt-0.5">Petugas: {entry.petugas}</p>
                        )}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handlePrintSingle(entry)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                          title="Cetak Bukti Catatan Stok Ini"
                        >
                          <Printer className="w-3 h-3 inline mr-1" />
                          Cetak
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredStockCardList.length > 100 && (
          <p className="text-[11px] text-slate-400 text-center italic">
            Menampilkan 100 dari {filteredStockCardList.length} entri riwayat stok. Gunakan filter tanggal untuk mempersempit hasil.
          </p>
        )}
      </div>

      {/* Modal: Tambah Master Barang Baru / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingBarang ? 'Edit Data Master Barang' : 'Tambah Master Barang / Obat Baru'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Barang / Obat</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Amoxicillin 500mg, Spuit 3cc, dll."
                  value={namaBarang}
                  onChange={(e) => setNamaBarang(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="Obat">Obat / Farmasi</option>
                    <option value="Alkes">Alkes / BMHP</option>
                    <option value="Pakan">Pakan Medis</option>
                    <option value="Vaksin">Vaksin</option>
                    <option value="Aksesoris">Aksesoris</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <select
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Botol">Botol</option>
                    <option value="Ampul">Ampul</option>
                    <option value="Sachet">Sachet</option>
                    <option value="Kg">Kg</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Box">Box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Beli Supplier (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={hargaBeli}
                    onChange={(e) => setHargaBeli(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual Pasien (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={hargaJual}
                    onChange={(e) => setHargaJual(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-indigo-700 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Saat Ini</label>
                  <input
                    type="number"
                    min={0}
                    value={stokCurrent}
                    onChange={(e) => setStokCurrent(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Minimum Alert</label>
                  <input
                    type="number"
                    min={0}
                    value={stokMinimum}
                    onChange={(e) => setStokMinimum(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-rose-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lokasi Rak / Lemari</label>
                  <input
                    type="text"
                    value={lokasiRak}
                    onChange={(e) => setLokasiRak(e.target.value)}
                    placeholder="Contoh: Rak Obat A-1"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Expired Date</label>
                  <input
                    type="date"
                    value={tanggalKadaluarsa}
                    onChange={(e) => setTanggalKadaluarsa(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl cursor-pointer hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl shadow-md shadow-indigo-200 cursor-pointer"
                >
                  Simpan Master Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Input Mutasi Stok Manual (Penambahan / Pengurangan / Opname) */}
      {showStockCardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Catat Mutasi Stok Manual</h3>
                <p className="text-[11px] text-slate-500">Mencatat barang masuk, barang keluar, atau penyesuaian stok opname manual</p>
              </div>
              <button type="button" onClick={() => setShowStockCardModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Barang / Obat</label>
                <select
                  value={stockCardBarangId}
                  onChange={(e) => setStockCardBarangId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  {barangList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.namaBarang} ({b.kodeBarang}) - Stok Saat Ini: {b.stokCurrent} {b.satuan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Mutasi</label>
                  <select
                    value={stockCardType}
                    onChange={(e) => setStockCardType(e.target.value as JenisMutasiStok)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    <option value="Masuk">Barang Masuk (+)</option>
                    <option value="Keluar">Barang Keluar (-)</option>
                    <option value="Penyesuaian">Penyesuaian / Stok Opname</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {stockCardType === 'Penyesuaian' ? 'Jumlah Stok Baru Sebenarnya' : 'Jumlah Mutasi'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={stockCardQty}
                    onChange={(e) => setStockCardQty(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Transaksi</label>
                  <input
                    type="date"
                    value={stockCardTanggal}
                    onChange={(e) => setStockCardTanggal(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Referensi / Bukti</label>
                  <input
                    type="text"
                    value={stockCardReferensi}
                    onChange={(e) => setStockCardReferensi(e.target.value)}
                    placeholder="Contoh: OPNAME-2026-01, PO-SUPP-1"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan / Alasan Mutasi</label>
                <textarea
                  rows={2}
                  value={stockCardKeterangan}
                  onChange={(e) => setStockCardKeterangan(e.target.value)}
                  placeholder="Contoh: Pembelian langsung tanpa PO, barang expired dibuang, selisih hitung fisik..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStockCardModal(false)}
                  className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl cursor-pointer hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddStockCard}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-xl shadow-md shadow-emerald-200 cursor-pointer"
                >
                  Simpan Mutasi Stok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cetak Dokumen / Catatan Stok Barang (Print Preview Resmi Berkepala Klinik) */}
      {showPrintDocModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 text-xs max-h-[95vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {selectedSinglePrintEntry ? 'Cetak Bukti Catatan Mutasi Stok' : 'Cetak Dokumen Catatan Mutasi Stok Barang'}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-200"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintDocModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Letterhead & Table View */}
            <div className="p-6 bg-white border border-slate-200 rounded-xl mt-4 font-sans text-slate-900 space-y-4 print:p-0 print:border-0">
              {/* Kop Klinik */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">{klinik?.namaKlinik || 'KLINIK HEWAN & PET CARE'}</h1>
                  <p className="text-[11px] text-slate-600">{klinik?.alamat || 'Jl. Raya Kesehatan Hewan No. 123'}</p>
                  <p className="text-[10px] text-slate-500">Telp: {klinik?.noTelp || '-'} • WA: {klinik?.noWhatsApp || '-'} • SIP: {klinik?.sipKlinik || '503/SIP/VET/2026'}</p>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-center font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Dokumen Inventaris</span>
                    <span className="text-xs font-black text-slate-800">MUTASI-STOK</span>
                  </div>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center py-1">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 underline">
                  {selectedSinglePrintEntry ? 'BUKTI CATATAN MUTASI STOK BARANG / OBAT' : 'DOKUMEN CATATAN MUTASI STOK & PERSEDIAAN BARANG'}
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Waktu Cetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} {new Date().toTimeString().slice(0, 5)} WIB
                </p>
              </div>

              {/* Table Data */}
              <table className="w-full text-left text-[10px] border-collapse border border-slate-400 mt-2">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <th className="border border-slate-400 p-2 text-center w-8">No</th>
                    <th className="border border-slate-400 p-2">Tanggal / Waktu</th>
                    <th className="border border-slate-400 p-2">No. Dokumen / Ref</th>
                    <th className="border border-slate-400 p-2">Nama & Kode Barang</th>
                    <th className="border border-slate-400 p-2">Pasien / Owner</th>
                    <th className="border border-slate-400 p-2 text-center">Jenis</th>
                    <th className="border border-slate-400 p-2 text-right">Masuk</th>
                    <th className="border border-slate-400 p-2 text-right">Keluar</th>
                    <th className="border border-slate-400 p-2 text-right">Saldo Akhir</th>
                    <th className="border border-slate-400 p-2">Keterangan / Petugas</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedSinglePrintEntry ? [selectedSinglePrintEntry] : filteredStockCardList).map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 whitespace-nowrap">{item.tanggal} {item.waktu || ''}</td>
                      <td className="border border-slate-300 p-2 font-mono font-semibold">{item.referensi || '-'} ({item.tipeReferensi || 'Rawat Jalan'})</td>
                      <td className="border border-slate-300 p-2 font-bold">{item.namaBarang || '-'} ({item.kodeBarang || '-'})</td>
                      <td className="border border-slate-300 p-2">{item.pasienNama ? `${item.pasienNama} (${item.ownerNama || '-'})` : (item.ownerNama || '-')}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{item.jenis}</td>
                      <td className="border border-slate-300 p-2 text-right font-bold text-emerald-700">{item.jenis === 'Masuk' ? item.jumlah : '-'}</td>
                      <td className="border border-slate-300 p-2 text-right font-bold text-rose-700">{item.jenis === 'Keluar' ? item.jumlah : '-'}</td>
                      <td className="border border-slate-300 p-2 text-right font-bold text-indigo-900">{item.saldoSetelah}</td>
                      <td className="border border-slate-300 p-2 text-[9px]">{item.keterangan || '-'} (Oleh: {item.petugas || '-'})</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 pt-8 text-center text-xs">
                <div>
                  <p className="font-semibold text-slate-700">Petugas Gudang / Farmasi</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline text-slate-900">{activeUserName}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Penanggung Jawab Medis / Pimpinan</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline text-slate-900">{klinik?.namaPenanggungJawab || 'Drh. Penanggung Jawab'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
