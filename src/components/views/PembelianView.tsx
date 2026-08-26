import React, { useState, useMemo } from 'react';
import { PembelianSupplier, Supplier, Barang, DataKlinik } from '../../types';
import {
  ShoppingCart, Plus, Search, FileSpreadsheet, Trash2, X, Save,
  Eye, Printer, CheckCircle2, AlertCircle, Loader2, Package,
  Building2, Calendar, FileText, Check, ArrowDownRight, Filter, ChevronDown, CheckCircle, Tag
} from 'lucide-react';
import { exportToExcel } from '../../services/excel';

interface PembelianViewProps {
  pembelianList: PembelianSupplier[];
  supplierList: Supplier[];
  barangList: Barang[];
  klinik?: DataKlinik;
  onSavePembelian: (po: PembelianSupplier) => void | Promise<void>;
  onCancelPembelian?: (poId: string, alasan: string, user: string, revertStock?: boolean) => void | Promise<void>;
  activeUserName?: string;
}

export const PembelianView: React.FC<PembelianViewProps> = ({
  pembelianList = [],
  supplierList = [],
  barangList = [],
  klinik,
  onSavePembelian,
  onCancelPembelian,
  activeUserName,
}) => {
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [viewingPo, setViewingPo] = useState<PembelianSupplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [noFaktur, setNoFaktur] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'Selesai' | 'Draft'>('Selesai');
  const [catatan, setCatatan] = useState('');

  // Item input states & search
  const [barangSearch, setBarangSearch] = useState('');
  const [selectedKategoriItem, setSelectedKategoriItem] = useState<string>('Semua');
  const [showBarangDropdown, setShowBarangDropdown] = useState(false);
  const [selectedBarangId, setSelectedBarangId] = useState('');
  const [jumlah, setJumlah] = useState<number>(1);
  const [hargaBeli, setHargaBeli] = useState<number>(0);
  const [expiredDate, setExpiredDate] = useState('');
  const [items, setItems] = useState<PembelianSupplier['items']>([]);

  // Filter & Search states for table
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Selesai' | 'Draft' | 'Dibatalkan'>('ALL');

  // Cancel modal state
  const [showCancelPoId, setShowCancelPoId] = useState<string | null>(null);
  const [cancelPoReason, setCancelPoReason] = useState('');
  const [cancelPoRevertStock, setCancelPoRevertStock] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);

  // Category list extracted from master barang
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    barangList.forEach((b) => {
      if (b.kategori) set.add(b.kategori);
    });
    return ['Semua', ...Array.from(set)];
  }, [barangList]);

  // Open modal with generated IDs and reset form
  const openModal = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const defaultSupplier = supplierList[0]?.id || '';
    
    setSupplierId(defaultSupplier);
    setPoNumber(`PO-${dateCode}-${randomSuffix}`);
    setNoFaktur(`INV-${dateCode}-${randomSuffix}`);
    setTanggal(new Date().toISOString().slice(0, 10));
    setStatus('Selesai');
    setCatatan('');
    setItems([]);
    setBarangSearch('');
    setSelectedKategoriItem('Semua');
    setShowBarangDropdown(false);
    setSelectedBarangId('');
    setJumlah(1);
    setHargaBeli(0);
    setExpiredDate('');
    setFormError(null);
    setShowModal(true);
  };

  // Filtered barang list for item selection (WHERE condition live filtering)
  const filteredBarangList = useMemo(() => {
    const query = barangSearch.toLowerCase().trim();
    return barangList.filter((b) => {
      const matchCat = selectedKategoriItem === 'Semua' || b.kategori === selectedKategoriItem;
      const matchQuery =
        !query ||
        b.namaBarang.toLowerCase().includes(query) ||
        (b.kodeBarang && b.kodeBarang.toLowerCase().includes(query)) ||
        (b.kategori && b.kategori.toLowerCase().includes(query)) ||
        (b.satuan && b.satuan.toLowerCase().includes(query));
      return matchCat && matchQuery;
    });
  }, [barangList, barangSearch, selectedKategoriItem]);

  const selectedBarang = useMemo(() => {
    return barangList.find((b) => b.id === selectedBarangId);
  }, [barangList, selectedBarangId]);

  // Handle select barang from live list or dropdown
  const handleSelectBarang = (b: Barang) => {
    setSelectedBarangId(b.id);
    setBarangSearch(b.namaBarang);
    setHargaBeli(b.hargaBeli || 0);
    setShowBarangDropdown(false);
    setFormError(null);
  };

  // Add item to list
  const addItem = () => {
    setFormError(null);
    const barang = barangList.find((item) => item.id === selectedBarangId);
    if (!barang) {
      setFormError('Silakan cari dan pilih barang terlebih dahulu.');
      return false;
    }
    if (!jumlah || jumlah < 1) {
      setFormError('Jumlah pembelian barang minimal 1.');
      return false;
    }
    if (hargaBeli < 0) {
      setFormError('Harga beli tidak boleh bernilai negatif.');
      return false;
    }

    const newItem = {
      barangId: barang.id,
      namaBarang: barang.namaBarang,
      jumlah: Number(jumlah),
      hargaBeli: Number(hargaBeli),
      subtotal: Number(jumlah) * Number(hargaBeli),
      expiredDate: expiredDate.trim() || undefined,
    };

    setItems((current) => [...current, newItem]);
    
    // Reset selection for next item
    setSelectedBarangId('');
    setBarangSearch('');
    setJumlah(1);
    setHargaBeli(0);
    setExpiredDate('');
    setShowBarangDropdown(false);
    return true;
  };

  const removeItem = (indexToRemove: number) => {
    setItems((current) => current.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle Save Pembelian
  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    // If no supplier selected
    if (!supplierId) {
      setFormError('Silakan pilih nama Supplier / Distributor distributor pengirim.');
      return;
    }

    const supplier = supplierList.find((item) => item.id === supplierId);
    if (!supplier) {
      setFormError('Data Supplier tidak ditemukan. Silakan pilih dari daftar.');
      return;
    }

    // Work on items list: if items is empty but user currently filled a valid barang selection, auto-add it!
    let finalItems = [...items];
    if (finalItems.length === 0 && selectedBarangId) {
      const b = barangList.find((item) => item.id === selectedBarangId);
      if (b && jumlah >= 1 && hargaBeli >= 0) {
        finalItems.push({
          barangId: b.id,
          namaBarang: b.namaBarang,
          jumlah: Number(jumlah),
          hargaBeli: Number(hargaBeli),
          subtotal: Number(jumlah) * Number(hargaBeli),
          expiredDate: expiredDate.trim() || undefined,
        });
      }
    }

    if (finalItems.length === 0) {
      setFormError('Tambahkan minimal satu item barang pada daftar pembelian.');
      return;
    }

    const grandTotal = finalItems.reduce((total, item) => total + (item.subtotal || 0), 0);

    const purchase: PembelianSupplier = {
      id: `po-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nomorPO: poNumber.trim() || `PO-${Date.now()}`,
      noFaktur: noFaktur.trim() || `INV-${Date.now()}`,
      tanggal: tanggal || new Date().toISOString().slice(0, 10),
      namaSupplier: supplier.id,
      items: finalItems,
      grandTotal,
      status,
      catatan: catatan.trim() || undefined,
    };

    setIsSaving(true);
    try {
      await onSavePembelian(purchase);
      setShowModal(false);
      setSuccessMessage(`Transaksi Pembelian ${purchase.nomorPO || purchase.noFaktur} berhasil disimpan!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Save pembelian error:', err);
      setFormError(`Gagal menyimpan transaksi pembelian: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel PO handler
  const openCancelPoModal = (poId: string) => {
    setShowCancelPoId(poId);
    setCancelPoReason('');
    setCancelPoRevertStock(true);
  };

  const confirmCancelPo = async () => {
    if (!showCancelPoId) return;
    if (typeof onCancelPembelian !== 'function') return;
    setIsCanceling(true);
    try {
      await onCancelPembelian(
        showCancelPoId,
        cancelPoReason.trim() || 'Pembatalan transaksi oleh user',
        activeUserName || 'Petugas Pengadaan',
        cancelPoRevertStock
      );
      setShowCancelPoId(null);
      setSuccessMessage('Faktur pembelian berhasil dibatalkan.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(`Gagal membatalkan transaksi: ${err.message}`);
    } finally {
      setIsCanceling(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredPembelianList.map((p) => {
      const supplier = supplierList.find((s) => s.id === p.namaSupplier);
      return {
        'No. PO': p.nomorPO || p.noFaktur,
        'No. Faktur': p.noFaktur,
        'Tanggal': p.tanggal,
        'Supplier': supplier?.namaSupplier || p.namaSupplier,
        'Jumlah Item': (p.items || []).length,
        'Total Nominal (Rp)': p.grandTotal,
        'Status': p.status,
        'Alasan Batal': p.alasanPembatalan || '-',
      };
    });
    exportToExcel(data, `Laporan_Pembelian_PO_${new Date().toISOString().slice(0, 10)}`);
  };

  // Filtered pembelian list for table
  const filteredPembelianList = useMemo(() => {
    return pembelianList.filter((p) => {
      const supplier = supplierList.find((s) => s.id === p.namaSupplier);
      const supplierName = (supplier?.namaSupplier || p.namaSupplier || '').toLowerCase();
      const poNo = (p.nomorPO || '').toLowerCase();
      const fakturNo = (p.noFaktur || '').toLowerCase();
      const query = tableSearch.toLowerCase();

      const matchSearch =
        poNo.includes(query) ||
        fakturNo.includes(query) ||
        supplierName.includes(query) ||
        (p.items || []).some((it) => it.namaBarang.toLowerCase().includes(query));

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [pembelianList, supplierList, tableSearch, statusFilter]);

  // Calculations for stats
  const stats = useMemo(() => {
    const totalTransactions = pembelianList.length;
    const completedTransactions = pembelianList.filter((p) => p.status === 'Selesai');
    const totalNominal = completedTransactions.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
    const totalItemsPurchased = completedTransactions.reduce(
      (sum, p) => sum + (p.items || []).reduce((iSum, i) => iSum + (Number(i.jumlah) || 0), 0),
      0
    );

    return { totalTransactions, totalNominal, totalItemsPurchased };
  }, [pembelianList]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-semibold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pembelian & Stock In (PO Supplier)</h2>
              <p className="text-xs text-slate-500">Pencatatan faktur barang masuk dari distributor farmasi / supplier (stok langsung bertambah saat status Selesai).</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Transaksi Pembelian</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total PO Tercatat</p>
            <p className="text-xl font-extrabold text-slate-800 mt-1">{stats.totalTransactions} <span className="text-xs font-normal text-slate-400">Transaksi</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Belanja Barang</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">Rp {stats.totalNominal.toLocaleString('id-ID')}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Item Masuk Inventori</p>
            <p className="text-xl font-extrabold text-blue-600 mt-1">{stats.totalItemsPurchased.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">Unit</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari no. PO, faktur, supplier, barang..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center">
            <Filter className="w-3 h-3 mr-1" /> Status:
          </span>
          {(['ALL', 'Selesai', 'Draft', 'Dibatalkan'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Semua' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">No. PO & Faktur</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Distributor / Supplier</th>
                <th className="p-4">Rincian Item Masuk</th>
                <th className="p-4 text-right">Total Tagihan</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPembelianList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Belum ada riwayat transaksi pembelian</p>
                    <p className="text-xs text-slate-400 mt-0.5">Klik tombol "Tambah Transaksi Pembelian" untuk mencatat barang masuk baru.</p>
                  </td>
                </tr>
              ) : (
                filteredPembelianList.map((p) => {
                  const supplier = supplierList.find((s) => s.id === p.namaSupplier);
                  const itemsCount = (p.items || []).length;
                  const totalQty = (p.items || []).reduce((sum, it) => sum + (Number(it.jumlah) || 0), 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block text-xs">{p.nomorPO || p.noFaktur}</span>
                        <span className="text-[11px] text-slate-500 block">Faktur: <span className="font-semibold text-slate-700">{p.noFaktur}</span></span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1 text-slate-700">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{p.tanggal}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-bold text-slate-800">{supplier?.namaSupplier || p.namaSupplier || 'Supplier'}</span>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="space-y-1">
                          {(p.items || []).slice(0, 3).map((i, idx) => {
                            const b = barangList.find((bItem) => bItem.id === i.barangId);
                            const unitPrice = i.hargaBeli ?? (i as any).hargaBeliSatuan ?? 0;
                            return (
                              <div key={idx} className="text-[11px] text-slate-700 flex justify-between gap-2">
                                <span className="truncate">• {i.namaBarang}</span>
                                <span className="font-semibold text-slate-500 shrink-0">
                                  {i.jumlah} {b?.satuan || 'item'} @ Rp {unitPrice.toLocaleString('id-ID')}
                                </span>
                              </div>
                            );
                          })}
                          {itemsCount > 3 && (
                            <span className="text-[10px] text-indigo-600 font-semibold block cursor-pointer" onClick={() => setViewingPo(p)}>
                              +{itemsCount - 3} item lainnya (Total {totalQty} unit)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-black text-sm text-slate-900 block">
                          Rp {(p.grandTotal || 0).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                            p.status === 'Selesai'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : p.status === 'Draft'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {p.status}
                        </span>
                        {p.alasanPembatalan && (
                          <span className="text-[10px] text-rose-500 block mt-0.5" title={p.alasanPembatalan}>
                            ({p.alasanPembatalan.slice(0, 15)}...)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingPo(p)}
                            title="Lihat Rincian & Cetak Bukti PO"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {typeof onCancelPembelian === 'function' && p.status !== 'Dibatalkan' && (
                            <button
                              type="button"
                              onClick={() => openCancelPoModal(p.id)}
                              title="Batalkan PO"
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Batalkan
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

      {/* ========================================================================= */}
      {/* MODAL TRANSAKSI PEMBELIAN STOK BARANG */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Transaksi Pembelian Stok Barang</h3>
                  <p className="text-xs text-slate-500">Pencatatan faktur barang masuk dari distributor supplier.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message Banner */}
            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Body / Form */}
            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Row 1: Header Form Information */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Distributor / Supplier <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Supplier --</option>
                    {supplierList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.namaSupplier || s.nama} {s.kontak ? `(${s.kontak})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    No. Faktur Supplier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={noFaktur}
                    onChange={(e) => setNoFaktur(e.target.value)}
                    placeholder="INV/FAKTUR-001"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    No. PO Internal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="PO-2026-001"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tanggal Transaksi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Status Penerimaan
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Selesai' | 'Draft')}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Selesai">Selesai (Langsung Tambah Stok)</option>
                    <option value="Draft">Draft (Simpan Sementara)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Catatan / Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Barang datang dengan segel baik, tempo 30 hari"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Section: Tambah Barang ke Transaksi */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>Cari & Pilih Barang Masuk (WHERE Filter Otomatis)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Ketik nama/kode untuk melihat barang langsung di bawahnya
                  </span>
                </div>

                {/* Category Pills Filter */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center mr-1">
                    <Tag className="w-3 h-3 mr-1 text-slate-400" /> Kategori:
                  </span>
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedKategoriItem(cat);
                        setShowBarangDropdown(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        selectedKategoriItem === cat
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-start">
                  {/* Search & Direct Visual Item Selector */}
                  <div className="sm:col-span-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 block text-xs">
                        Pencarian Barang (Ketik Nama / Kode / Kategori)
                      </label>
                      <span className="text-[10px] font-bold text-indigo-600">
                        {filteredBarangList.length} Barang Ditemukan
                      </span>
                    </div>

                    {/* Search Input Box */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={barangSearch}
                        onChange={(e) => {
                          setBarangSearch(e.target.value);
                          setShowBarangDropdown(true);
                        }}
                        onFocus={() => setShowBarangDropdown(true)}
                        placeholder="🔍 Ketik nama barang, kode, atau spesifikasi..."
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
                      />
                      {barangSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setBarangSearch('');
                            setSelectedBarangId('');
                            setShowBarangDropdown(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2"
                          title="Hapus pencarian"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Direct Visual Match List (Instant WHERE filtered items) */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span>Hasil Filter Langsung:</span>
                        <span className="text-slate-400">Klik baris untuk memilih</span>
                      </div>

                      <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                        {filteredBarangList.length === 0 ? (
                          <div className="p-4 text-center text-slate-400">
                            <Package className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                            <p className="font-semibold text-xs text-slate-600">Tidak ada barang yang cocok</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Coba periksa ejaan atau ubah filter kategori.
                            </p>
                          </div>
                        ) : (
                          filteredBarangList.map((b) => {
                            const isSelected = b.id === selectedBarangId;
                            return (
                              <div
                                key={b.id}
                                onClick={() => handleSelectBarang(b)}
                                className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-50/90 border-l-4 border-indigo-600'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                        b.kategori === 'Obat'
                                          ? 'bg-blue-100 text-blue-800'
                                          : b.kategori === 'Alkes'
                                          ? 'bg-amber-100 text-amber-800'
                                          : b.kategori === 'Pakan'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {b.kategori || 'Barang'}
                                    </span>
                                    <span className="font-bold text-xs text-slate-900 truncate">
                                      {b.namaBarang}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-3 text-[10px] text-slate-500 mt-1">
                                    <span>Kode: <strong>{b.kodeBarang || '-'}</strong></span>
                                    <span>•</span>
                                    <span>
                                      Stok Saat Ini:{' '}
                                      <strong className={(b.stokCurrent ?? b.stok ?? 0) <= 0 ? 'text-rose-600' : 'text-slate-800'}>
                                        {b.stokCurrent ?? b.stok ?? 0} {b.satuan || ''}
                                      </strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Master Beli:{' '}
                                      <strong className="text-emerald-700 font-bold">
                                        Rp {(b.hargaBeli || 0).toLocaleString('id-ID')}
                                      </strong>
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectBarang(b);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700'
                                  }`}
                                >
                                  {isSelected ? '✓ Terpilih' : 'Pilih'}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity, Harga Beli, Kadaluarsa & Summary */}
                  <div className="sm:col-span-6 space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
                    {/* Active Selected Barang Preview Card */}
                    {selectedBarang ? (
                      <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-1.5 text-emerald-800 font-bold text-xs">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate">{selectedBarang.namaBarang}</span>
                            <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded">
                              {selectedBarang.kategori || 'Barang'}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-900/80 mt-1">
                            Kode: <strong>{selectedBarang.kodeBarang || '-'}</strong> | Stok Gudang:{' '}
                            <strong>{selectedBarang.stokCurrent ?? selectedBarang.stok ?? 0} {selectedBarang.satuan}</strong> | Satuan: <strong>{selectedBarang.satuan || 'Pcs'}</strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBarangId('');
                            setBarangSearch('');
                            setHargaBeli(0);
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline shrink-0 cursor-pointer"
                        >
                          Ganti
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Silakan klik salah satu barang pada daftar di sebelah kiri untuk mengisi form.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Quantity */}
                      <div>
                        <label className="font-bold text-slate-700 block text-xs mb-1">
                          Jumlah ({selectedBarang?.satuan || 'Unit'}) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={jumlah}
                          onChange={(e) => setJumlah(Math.max(1, Number(e.target.value)))}
                          className="w-full rounded-lg border border-slate-300 bg-white p-2 font-bold text-center text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Harga Beli Satuan */}
                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-700 block text-xs mb-1">
                          Harga Beli Satuan (Rp) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={hargaBeli}
                          onChange={(e) => setHargaBeli(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white p-2 font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Expired Date */}
                      <div className="sm:col-span-3">
                        <label className="font-bold text-slate-700 block text-xs mb-1">
                          Tanggal Kadaluarsa / Expired (Opsional)
                        </label>
                        <input
                          type="date"
                          value={expiredDate}
                          onChange={(e) => setExpiredDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white p-2 font-normal text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Subtotal Preview & Add Button */}
                    <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div className="text-xs text-slate-600">
                        Subtotal Item:{' '}
                        <span className="font-black text-indigo-700 text-sm">
                          Rp {(Number(jumlah) * Number(hargaBeli)).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={addItem}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>+ Tambah ke Daftar Pembelian</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table of Added Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Daftar Barang yang Dibeli ({items.length} Item)</h4>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setItems([])}
                      className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[11px]">
                      <tr>
                        <th className="p-2.5">No</th>
                        <th className="p-2.5">Nama Barang</th>
                        <th className="p-2.5 text-center">Satuan</th>
                        <th className="p-2.5 text-center">Kadaluarsa</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Harga Satuan</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                        <th className="p-2.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-400 bg-slate-50/50">
                            Belum ada item barang dalam transaksi ini. Silakan pilih barang di atas dan klik "+ Tambah ke Daftar".
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => {
                          const barang = barangList.find((b) => b.id === item.barangId);
                          return (
                            <tr key={`${item.barangId}-${index}`} className="hover:bg-slate-50/80">
                              <td className="p-2.5 text-slate-400 font-semibold">{index + 1}</td>
                              <td className="p-2.5">
                                <span className="font-bold text-slate-900 block">{item.namaBarang}</span>
                                {barang?.kodeBarang && (
                                  <span className="text-[10px] text-slate-400">{barang.kodeBarang}</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center text-slate-600">{barang?.satuan || '-'}</td>
                              <td className="p-2.5 text-center text-slate-500">{item.expiredDate || '-'}</td>
                              <td className="p-2.5 text-center font-bold text-slate-900">{item.jumlah}</td>
                              <td className="p-2.5 text-right text-slate-700">Rp {item.hargaBeli.toLocaleString('id-ID')}</td>
                              <td className="p-2.5 text-right font-black text-slate-900">
                                Rp {item.subtotal.toLocaleString('id-ID')}
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Hapus baris ini"
                                >
                                  <Trash2 className="h-4 w-4" />
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

              {/* Total & Grand Summary */}
              <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-100/80 p-4 rounded-xl border border-slate-200/80 gap-2 shrink-0">
                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">{items.length}</span> jenis barang |{' '}
                  <span className="font-bold text-slate-800">
                    {items.reduce((sum, it) => sum + Number(it.jumlah || 0), 0)}
                  </span>{' '}
                  total kuantitas barang masuk
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Tagihan Transaksi Beli:</span>
                  <strong className="text-lg font-black text-emerald-700">
                    Rp {items.reduce((total, item) => total + (item.subtotal || 0), 0).toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 border-t pt-4 shrink-0">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setShowModal(false)}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-5 py-2.5 font-bold text-white shadow-md shadow-emerald-200 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      <span>Simpan Transaksi Beli</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL LIHAT DETAIL & CETAK BUKTI PO */}
      {/* ========================================================================= */}
      {viewingPo && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h4 className="text-base font-bold text-slate-900">Rincian Faktur Pembelian Stok</h4>
                <p className="text-xs text-slate-500">Nomor PO: {viewingPo.nomorPO || viewingPo.noFaktur}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPo(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">No. Faktur</span>
                  <span className="font-bold text-slate-800">{viewingPo.noFaktur}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tanggal</span>
                  <span className="font-bold text-slate-800">{viewingPo.tanggal}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Supplier</span>
                  <span className="font-bold text-slate-800">
                    {supplierList.find((s) => s.id === viewingPo.namaSupplier)?.namaSupplier || viewingPo.namaSupplier}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                      viewingPo.status === 'Selesai'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingPo.status === 'Draft'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {viewingPo.status}
                  </span>
                </div>
              </div>

              {viewingPo.catatan && (
                <div className="p-3 bg-indigo-50/60 rounded-lg text-indigo-900 text-xs">
                  <span className="font-bold">Catatan:</span> {viewingPo.catatan}
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600">
                    <tr>
                      <th className="p-2.5">Barang</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-center">Kadaluarsa</th>
                      <th className="p-2.5 text-right">Harga Beli</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewingPo.items || []).map((it, idx) => {
                      const unitPrice = it.hargaBeli ?? (it as any).hargaBeliSatuan ?? 0;
                      return (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-slate-800">{it.namaBarang}</td>
                          <td className="p-2.5 text-center font-bold">{it.jumlah}</td>
                          <td className="p-2.5 text-center text-slate-500">{it.expiredDate || '-'}</td>
                          <td className="p-2.5 text-right">Rp {unitPrice.toLocaleString('id-ID')}</td>
                          <td className="p-2.5 text-right font-black text-slate-900">
                            Rp {(it.subtotal || it.jumlah * unitPrice).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="p-3 text-right">Total Tagihan Pembelian:</td>
                      <td className="p-3 text-right text-emerald-700 font-black text-sm">
                        Rp {(viewingPo.grandTotal || 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setViewingPo(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Faktur</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BATALKAN PO */}
      {/* ========================================================================= */}
      {showCancelPoId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-1 text-base">Batalkan Transaksi Faktur PO</h4>
            <p className="text-xs text-slate-500 mb-4">
              Masukkan alasan pembatalan dan tentukan apakah penambahan stok sebelumnya harus dikurangi kembali.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Pembatalan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={cancelPoReason}
                  onChange={(e) => setCancelPoReason(e.target.value)}
                  placeholder="Contoh: Faktur salah input, barang diretur total ke distributor"
                  rows={3}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  id="revertPoStock"
                  type="checkbox"
                  checked={cancelPoRevertStock}
                  onChange={(e) => setCancelPoRevertStock(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs text-slate-700">
                  <strong>Tarik kembali stok barang</strong> (Otomatis mencatat mutasi barang keluar akibat pembatalan ini)
                </span>
              </label>
            </div>

            <div className="mt-5 flex justify-end space-x-2 border-t pt-4">
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => setShowCancelPoId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isCanceling}
                onClick={confirmCancelPo}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 transition-colors cursor-pointer flex items-center space-x-1"
              >
                {isCanceling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Konfirmasi Batalkan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
