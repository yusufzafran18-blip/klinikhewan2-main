import React, { useState, useEffect, useRef } from 'react';
import { Barang, KategoriBarang } from '../../types';
import { ModulePermissions } from '../../utils/rbac';
import { Package, Plus, Search, AlertTriangle, FileSpreadsheet, Edit, Trash2 } from 'lucide-react';
import { exportToExcel } from '../../services/excel';

interface InventoryViewProps {
  barangList: Barang[];
  permissions?: ModulePermissions;
  onSaveBarang: (barang: Barang) => void | Promise<void>;
  onDeleteBarang: (id: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  barangList = [],
  permissions,
  onSaveBarang,
  onDeleteBarang,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showStockCardModal, setShowStockCardModal] = useState(false);
  const [editingBarang, setEditingBarang] = useState<Barang | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');

  type StockMutationType = 'Masuk' | 'Keluar' | 'Penyesuaian';
  type StockMutation = {
    id: string;
    barangId: string;
    tanggal: string;
    jenis: StockMutationType;
    jumlah: number;
    keterangan: string;
    saldoSetelah: number;
  };

  const [stockCardList, setStockCardList] = useState<StockMutation[]>([
    {
      id: 'stock-demo-1',
      barangId: barangList[0]?.id || '',
      tanggal: new Date().toISOString().slice(0, 10),
      jenis: 'Masuk',
      jumlah: 20,
      keterangan: 'Pembelian awal periode',
      saldoSetelah: barangList[0]?.stokCurrent || 0,
    },
  ]);

  const [stockCardBarangId, setStockCardBarangId] = useState(barangList[0]?.id || '');
  const [stockCardType, setStockCardType] = useState<StockMutationType>('Masuk');
  const [stockCardQty, setStockCardQty] = useState(1);
  const [stockCardKeterangan, setStockCardKeterangan] = useState('');
  const [stockCardTanggal, setStockCardTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [stockFilterStart, setStockFilterStart] = useState('');
  const [stockFilterEnd, setStockFilterEnd] = useState('');
  const [stockCardSearch, setStockCardSearch] = useState('');
  const lastKnownStockRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const nextMap: Record<string, number> = {};
    barangList.forEach((item) => {
      nextMap[item.id] = item.stokCurrent ?? 0;
    });

    Object.entries(nextMap).forEach(([barangId, currentStock]) => {
      const previousStock = lastKnownStockRef.current[barangId];
      if (previousStock === undefined) {
        lastKnownStockRef.current[barangId] = currentStock;
        return;
      }
      if (currentStock === previousStock) return;

      const barang = barangList.find((item) => item.id === barangId);
      if (!barang) return;

      const jenis: StockMutationType = currentStock > previousStock ? 'Masuk' : 'Keluar';
      const delta = Math.abs(currentStock - previousStock);
      const keterangan = currentStock > previousStock
        ? `Perubahan otomatis stok masuk (${barang.namaBarang})`
        : `Perubahan otomatis stok keluar (${barang.namaBarang})`;

      setStockCardList((prev) => [
        {
          id: `stock-auto-${Date.now()}-${barangId}`,
          barangId,
          tanggal: new Date().toISOString().slice(0, 10),
          jenis,
          jumlah: delta,
          keterangan,
          saldoSetelah: currentStock,
        },
        ...prev,
      ]);

      lastKnownStockRef.current[barangId] = currentStock;
    });

    Object.keys(lastKnownStockRef.current).forEach((barangId) => {
      if (!nextMap[barangId]) {
        delete lastKnownStockRef.current[barangId];
      }
    });
  }, [barangList]);

  // Form State
  const [namaBarang, setNamaBarang] = useState('');
  const [kategori, setKategori] = useState<KategoriBarang>('Obat');
  const [satuan, setSatuan] = useState('Tablet');
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
    setSatuan(b.satuan);
    setHargaBeli(b.hargaBeli);
    setHargaJual(b.hargaJual);
    setStokCurrent(b.stokCurrent);
    setStokMinimum(b.stokMinimum);
    setTanggalKadaluarsa(b.tanggalKadaluarsa || '');
    setLokasiRak(b.lokasiRak || '');
    setShowModal(true);
  };

  const recordStockMutation = (
    barang: Barang,
    nextStock: number,
    jenis: StockMutationType,
    keterangan: string,
    tanggal = new Date().toISOString().slice(0, 10)
  ) => {
    const previousStock = barang.stokCurrent ?? 0;
    const delta = nextStock - previousStock;
    const safeDelta = Math.abs(delta) || 0;

    if (safeDelta === 0 && jenis !== 'Penyesuaian') return;

    const mutation: StockMutation = {
      id: `stock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      barangId: barang.id,
      tanggal,
      jenis,
      jumlah: safeDelta,
      keterangan: keterangan || 'Pencatatan otomatis perubahan stok',
      saldoSetelah: nextStock,
    };

    setStockCardList((prev) => [mutation, ...prev]);
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
    lastKnownStockRef.current[newBarang.id] = newBarang.stokCurrent ?? 0;
    await onSaveBarang(newBarang);

    if (isNew) {
      recordStockMutation(newBarang, newBarang.stokCurrent, 'Masuk', `Barang baru ditambahkan ke inventaris (${newBarang.namaBarang})`);
    } else if (previousStock !== newBarang.stokCurrent) {
      const mutationType: StockMutationType = newBarang.stokCurrent > previousStock ? 'Masuk' : 'Keluar';
      const actionText = mutationType === 'Masuk'
        ? `Penambahan stok otomatis akibat perubahan data inventaris (${newBarang.namaBarang})`
        : `Pengurangan stok otomatis akibat perubahan data inventaris (${newBarang.namaBarang})`;
      recordStockMutation(newBarang, newBarang.stokCurrent, mutationType, actionText);
    }

    setShowModal(false);
  };

  const handleExportExcel = () => {
    const data = barangList.map((b) => ({
      'Kode Barang': b.kodeBarang,
      'Nama Barang': b.namaBarang,
      'Kategori': b.kategori,
      'Satuan': b.satuan,
      'Harga Beli': b.hargaBeli,
      'Harga Jual': b.hargaJual,
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
    if (!stockCardBarangId) return;

    const selectedBarang = barangList.find((b) => b.id === stockCardBarangId);
    if (!selectedBarang) return;

    const qty = Math.max(0, stockCardQty || 0);
    const nextStock = stockCardType === 'Masuk'
      ? selectedBarang.stokCurrent + qty
      : stockCardType === 'Keluar'
        ? Math.max(0, selectedBarang.stokCurrent - qty)
        : selectedBarang.stokCurrent;

    lastKnownStockRef.current[selectedBarang.id] = nextStock;
    await onSaveBarang({
      ...selectedBarang,
      stokCurrent: nextStock,
    });

    const newMutation: StockMutation = {
      id: `stock-${Date.now()}`,
      barangId: selectedBarang.id,
      tanggal: stockCardTanggal,
      jenis: stockCardType,
      jumlah: qty,
      keterangan: stockCardKeterangan || 'Pencatatan stok manual',
      saldoSetelah: nextStock,
    };

    setStockCardList((prev) => [newMutation, ...prev]);
    setShowStockCardModal(false);
    setStockCardQty(1);
    setStockCardKeterangan('');
    setStockCardType('Masuk');
    setStockCardTanggal(new Date().toISOString().slice(0, 10));
  };

  const filteredStockCardList = stockCardList.filter((entry) => {
    const barang = barangList.find((b) => b.id === entry.barangId);
    const matchSearch = !stockCardSearch ||
      `${barang?.namaBarang || ''} ${barang?.kodeBarang || ''}`.toLowerCase().includes(stockCardSearch.toLowerCase());

    if (stockFilterStart && entry.tanggal < stockFilterStart) return false;
    if (stockFilterEnd && entry.tanggal > stockFilterEnd) return false;
    if (!matchSearch) return false;
    return true;
  });

  const stockCardSummary = filteredStockCardList.slice(0, 8);

  const stockSummaryStats = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayIn = stockCardList.filter((entry) => entry.tanggal === today && entry.jenis === 'Masuk').reduce((sum, entry) => sum + entry.jumlah, 0);
    const todayOut = stockCardList.filter((entry) => entry.tanggal === today && entry.jenis === 'Keluar').reduce((sum, entry) => sum + entry.jumlah, 0);
    const lowStockCount = barangList.filter((b) => b.stokCurrent <= b.stokMinimum).length;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyEntries = stockCardList.filter((entry) => entry.tanggal.startsWith(currentMonth));
    const monthIn = monthlyEntries.filter((entry) => entry.jenis === 'Masuk').reduce((sum, entry) => sum + entry.jumlah, 0);
    const monthOut = monthlyEntries.filter((entry) => entry.jenis === 'Keluar').reduce((sum, entry) => sum + entry.jumlah, 0);

    return { todayIn, todayOut, lowStockCount, monthIn, monthOut };
  })();

  const handleExportStockCardExcel = () => {
    const data = filteredStockCardList.map((entry) => {
      const barang = barangList.find((b) => b.id === entry.barangId);
      return {
        'Tanggal': entry.tanggal,
        'Nama Barang': barang?.namaBarang || 'Barang dihapus',
        'Kode Barang': barang?.kodeBarang || '-',
        'Jenis Mutasi': entry.jenis,
        'Jumlah': entry.jumlah,
        'Keterangan': entry.keterangan,
        'Saldo Setelah': entry.saldoSetelah,
      };
    });

    exportToExcel(data, 'Kartu_Stok_Barang');
  };

  const renderStockTable = (entries: StockMutation[]) => {
    return entries.map((entry) => {
      const barang = barangList.find((b) => b.id === entry.barangId);
      const masuk = entry.jenis === 'Masuk' ? entry.jumlah : '-';
      const keluar = entry.jenis === 'Keluar' ? entry.jumlah : '-';
      return `
        <tr>
          <td>${barang?.namaBarang || 'Barang dihapus'}</td>
          <td>${barang?.kodeBarang || '-'}</td>
          <td>${entry.tanggal}</td>
          <td>${masuk}</td>
          <td>${keluar}</td>
          <td>${entry.saldoSetelah}</td>
          <td>${entry.keterangan || '-'}</td>
        </tr>
      `;
    }).join('');
  };

  const openPrintStockWindow = (entries: StockMutation[], title: string) => {
    const rows = renderStockTable(entries);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      window.alert('Browser memblokir popup untuk mencetak dokumen stok.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
            h2 { margin-bottom: 8px; }
            p { color: #475569; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <p>Dokumen atau catatan yang mencatat barang masuk, barang keluar, serta jumlah persediaan yang tersedia.</p>
          <table>
            <thead>
              <tr>
                <th>Nama / Kode Barang</th>
                <th>Kode</th>
                <th>Tanggal Transaksi</th>
                <th>Barang Masuk</th>
                <th>Barang Keluar</th>
                <th>Saldo / Stok Akhir</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="7">Tidak ada data stok untuk dicetak.</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handlePrintStockCard = () => {
    openPrintStockWindow(filteredStockCardList, 'Dokumen / Catatan Stok Barang');
  };

  const handlePrintOneStockCard = (entry: StockMutation) => {
    openPrintStockWindow([entry], `Laporan Stok Barang - ${entry.id}`);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Inventaris Stok Obat & Alkes</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Manajemen stok farmasi, pakan, alert stok minimum & tanggal kadaluarsa</p>
        </div>

        <div className="flex items-center space-x-2">
          {permissions?.canExport !== false && (
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 flex items-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          )}
          {permissions?.canCreate !== false && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Barang Baru</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Cari kode atau nama barang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-300"
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Obat">Obat / Farmasi</option>
            <option value="Alkes">Alat Kesehatan / BMHP</option>
            <option value="Pakan">Pakan Medis / PetShop</option>
            <option value="Vaksin">Vaksin</option>
            <option value="Aksesoris">Aksesoris</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Kode & Nama Barang</th>
                <th className="p-4">Kategori & Rak</th>
                <th className="p-4">Harga Beli / Jual</th>
                <th className="p-4">Stok Saat Ini</th>
                <th className="p-4">Expired Date</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBarang.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Tidak ada barang inventaris.</td></tr>
              ) : (
                filteredBarang.map((b) => {
                  const isLow = b.stokCurrent <= b.stokMinimum;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80">
                      <td className="p-4">
                        <span className="font-bold text-slate-800 text-sm block">{b.namaBarang}</span>
                        <span className="text-[10px] text-slate-400">{b.kodeBarang} • {b.satuan}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-700">{b.kategori}</p>
                        <p className="text-[10px] text-slate-400">Rak: {b.lokasiRak || '-'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-400">Beli: Rp {(b.hargaBeli || 0).toLocaleString('id-ID')}</p>
                        <p className="font-bold text-indigo-700">Jual: Rp {(b.hargaJual || 0).toLocaleString('id-ID')}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                            isLow ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {b.stokCurrent} {b.satuan}
                          </span>
                          {isLow && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Min: {b.stokMinimum}</span>
                      </td>
                      <td className="p-4 text-slate-500 font-semibold">{b.tanggalKadaluarsa || '-'}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {permissions?.canEdit !== false && (
                            <button onClick={() => handleOpenEdit(b)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer" title="Edit Barang"><Edit className="w-4 h-4" /></button>
                          )}
                          {permissions?.canDelete !== false && (
                            <button onClick={() => onDeleteBarang(b.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer" title="Hapus Barang"><Trash2 className="w-4 h-4" /></button>
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

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Dokumen / Catatan Stok Barang</h3>
              <p className="text-[11px] text-slate-500">
                Dokumen atau catatan yang digunakan untuk mencatat barang masuk, barang keluar, dan jumlah persediaan yang tersedia.
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Fungsi: memudahkan pengawasan persediaan, mengetahui jumlah stok secara cepat, serta membantu mencegah kekurangan atau kelebihan barang.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintStockCard}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold cursor-pointer"
              >
                Cetak Dokumen
              </button>
              <button
                type="button"
                onClick={handleExportStockCardExcel}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold cursor-pointer"
              >
                Export Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
              <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold">Stok Masuk Hari Ini</p>
              <p className="mt-2 text-xl font-black text-emerald-800">{stockSummaryStats.todayIn}</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3">
              <p className="text-[10px] uppercase tracking-wide text-rose-700 font-bold">Stok Keluar Hari Ini</p>
              <p className="mt-2 text-xl font-black text-rose-800">{stockSummaryStats.todayOut}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
              <p className="text-[10px] uppercase tracking-wide text-amber-700 font-bold">Stok Bulan Ini</p>
              <p className="mt-2 text-xl font-black text-amber-800">{stockSummaryStats.monthIn} / {stockSummaryStats.monthOut}</p>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-700 font-bold">Barang Butuh Alert</p>
              <p className="mt-2 text-xl font-black text-slate-800">{stockSummaryStats.lowStockCount}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Cari barang</label>
              <input
                type="text"
                value={stockCardSearch}
                onChange={(e) => setStockCardSearch(e.target.value)}
                placeholder="Cari nama/kode barang..."
                className="w-full p-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Tanggal mulai</label>
              <input
                type="date"
                value={stockFilterStart}
                onChange={(e) => setStockFilterStart(e.target.value)}
                className="w-full sm:w-auto p-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Tanggal akhir</label>
              <input
                type="date"
                value={stockFilterEnd}
                onChange={(e) => setStockFilterEnd(e.target.value)}
                className="w-full sm:w-auto p-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setStockCardSearch('');
                setStockFilterStart('');
                setStockFilterEnd('');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-2">Nama / Kode Barang</th>
                <th className="p-2">Tanggal Transaksi</th>
                <th className="p-2">Barang Masuk</th>
                <th className="p-2">Barang Keluar</th>
                <th className="p-2">Saldo / Stok Akhir</th>
                <th className="p-2">Keterangan</th>
                <th className="p-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockCardSummary.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-slate-400">Belum ada dokumen catatan stok.</td></tr>
              ) : (
                stockCardSummary.map((entry) => {
                  const barang = barangList.find((b) => b.id === entry.barangId);
                  const masuk = entry.jenis === 'Masuk' ? entry.jumlah : '-';
                  const keluar = entry.jenis === 'Keluar' ? entry.jumlah : '-';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="p-2">
                        <div className="font-semibold text-slate-700">{barang?.namaBarang || 'Barang dihapus'}</div>
                        <div className="text-[10px] text-slate-400">{barang?.kodeBarang || '-'}</div>
                      </td>
                      <td className="p-2">{entry.tanggal}</td>
                      <td className="p-2 font-bold text-emerald-700">{masuk}</td>
                      <td className="p-2 font-bold text-rose-700">{keluar}</td>
                      <td className="p-2 font-bold text-indigo-700">{entry.saldoSetelah}</td>
                      <td className="p-2 text-slate-500">{entry.keterangan}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handlePrintOneStockCard(entry)}
                          className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold cursor-pointer"
                        >
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in duration-150 text-xs">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              {editingBarang ? 'Edit Data Barang' : 'Tambah Barang / Obat Baru'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Barang / Obat</label>
                <input type="text" required value={namaBarang} onChange={(e) => setNamaBarang(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select value={kategori} onChange={(e) => setKategori(e.target.value as any)} className="w-full p-2.5 rounded-xl border border-slate-300">
                    <option value="Obat">Obat / Farmasi</option>
                    <option value="Alkes">Alkes / BMHP</option>
                    <option value="Pakan">Pakan Medis</option>
                    <option value="Vaksin">Vaksin</option>
                    <option value="Aksesoris">Aksesoris</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <input type="text" value={satuan} onChange={(e) => setSatuan(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Beli (Rp)</label>
                  <input type="number" value={hargaBeli} onChange={(e) => setHargaBeli(parseInt(e.target.value) || 0)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual (Rp)</label>
                  <input type="number" value={hargaJual} onChange={(e) => setHargaJual(parseInt(e.target.value) || 0)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-indigo-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Saat Ini</label>
                  <input type="number" value={stokCurrent} onChange={(e) => setStokCurrent(parseInt(e.target.value) || 0)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Minimum Alert</label>
                  <input type="number" value={stokMinimum} onChange={(e) => setStokMinimum(parseInt(e.target.value) || 0)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-rose-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lokasi Rak</label>
                  <input type="text" value={lokasiRak} onChange={(e) => setLokasiRak(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Kadaluarsa</label>
                  <input type="date" value={tanggalKadaluarsa} onChange={(e) => setTanggalKadaluarsa(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl">Batal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 font-bold text-white rounded-xl shadow-md shadow-indigo-200">Simpan Barang</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockCardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Tambah Kartu Stok Barang</h3>
              <button type="button" onClick={() => setShowStockCardModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><span className="text-lg">×</span></button>
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Barang</label>
                <select value={stockCardBarangId} onChange={(e) => setStockCardBarangId(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300">
                  {barangList.map((b) => (
                    <option key={b.id} value={b.id}>{b.namaBarang} ({b.kodeBarang})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Mutasi</label>
                  <select value={stockCardType} onChange={(e) => setStockCardType(e.target.value as StockMutationType)} className="w-full p-2.5 rounded-xl border border-slate-300">
                    <option value="Masuk">Masuk</option>
                    <option value="Keluar">Keluar</option>
                    <option value="Penyesuaian">Penyesuaian</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jumlah</label>
                  <input type="number" value={stockCardQty} onChange={(e) => setStockCardQty(parseInt(e.target.value) || 0)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal</label>
                <input type="date" value={stockCardTanggal} onChange={(e) => setStockCardTanggal(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan</label>
                <input type="text" value={stockCardKeterangan} onChange={(e) => setStockCardKeterangan(e.target.value)} placeholder="Contoh: Pembelian supplier, pemakaian klinik, penyesuaian opname" className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowStockCardModal(false)} className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl">Batal</button>
                <button type="button" onClick={handleAddStockCard} className="px-4 py-2 bg-indigo-600 font-bold text-white rounded-xl shadow-md shadow-indigo-200">Simpan Kartu Stok</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
