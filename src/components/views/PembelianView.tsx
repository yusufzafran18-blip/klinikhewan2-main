import React, { useState } from 'react';
import { PembelianSupplier, Supplier, Barang } from '../../types';
import { ShoppingCart, Plus, Search, FileSpreadsheet, Trash2, X, Save } from 'lucide-react';
import { exportToExcel } from '../../services/excel';

interface PembelianViewProps {
  pembelianList: PembelianSupplier[];
  supplierList: Supplier[];
  barangList: Barang[];
  onSavePembelian: (po: PembelianSupplier) => void | Promise<void>;
}

export const PembelianView: React.FC<PembelianViewProps> = ({
  pembelianList = [],
  supplierList = [],
  barangList = [],
  onSavePembelian,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [supplierId, setSupplierId] = useState(supplierList[0]?.id || '');
  const [noFaktur, setNoFaktur] = useState('PO-2026-001');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'Selesai' | 'Draft'>('Selesai');
  const [selectedBarangId, setSelectedBarangId] = useState('');
  const [jumlah, setJumlah] = useState(1);
  const [hargaBeli, setHargaBeli] = useState(0);
  const [expiredDate, setExpiredDate] = useState('');
  const [items, setItems] = useState<PembelianSupplier['items']>([]);
  const [poNumber, setPoNumber] = useState('');
  const [barangSearch, setBarangSearch] = useState('');

  const openModal = () => {
    setSupplierId(supplierList[0]?.id || '');
    setNoFaktur(`PO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`);
    setPoNumber(`PO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`);
    setTanggal(new Date().toISOString().slice(0, 10));
    setStatus('Selesai');
    setSelectedBarangId(barangList[0]?.id || '');
    setJumlah(1);
    setHargaBeli(barangList[0]?.hargaBeli || 0);
    setExpiredDate('');
    setItems([]);
    setBarangSearch('');
    setShowModal(true);
  };

  const addItem = () => {
    const barang = barangList.find((item) => item.id === selectedBarangId);
    if (!barang || jumlah < 1 || hargaBeli < 0) return;
    const item = {
      barangId: barang.id,
      namaBarang: barang.namaBarang,
      jumlah,
      hargaBeli,
      subtotal: jumlah * hargaBeli,
      expiredDate: expiredDate || undefined,
    };
    setItems((current) => [...current, item]);
    setJumlah(1);
    setExpiredDate('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supplierId) return alert('Pilih supplier terlebih dahulu.');
    if (items.length === 0) return alert('Tambahkan minimal satu barang pembelian.');
    const supplier = supplierList.find((item) => item.id === supplierId);
    if (!supplier) return alert('Supplier tidak ditemukan.');
    const purchase: PembelianSupplier = {
      id: `po-${Date.now()}`,
      nomorPO: poNumber,
      noFaktur,
      tanggal,
      namaSupplier: supplier.id,
      items,
      grandTotal: items.reduce((total, item) => total + item.subtotal, 0),
      status,
    };
    try {
      await onSavePembelian(purchase);
      setShowModal(false);
    } catch (error: any) {
      alert(`Pembelian gagal disimpan ke MySQL: ${error.message}`);
    }
  };

  const handleExportExcel = () => {
    const data = pembelianList.map((p) => ({
      'No. PO': p.nomorPO || p.noFaktur,
      'No. Faktur': p.noFaktur,
      'Tanggal': p.tanggal,
      'Supplier': supplierList.find((s) => s.id === p.namaSupplier)?.namaSupplier || p.namaSupplier,
      'Total Nominal': p.grandTotal,
      'Status': p.status,
    }));
    exportToExcel(data, 'Laporan_Pembelian_PO_Supplier');
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Pembelian & Stock In (PO Supplier)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Pencatatan faktur barang masuk dari distributor farmasi / distributor pakan</p>
        </div>

        <button
          onClick={openModal}
          className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pembelian</span>
        </button>
        <button
          onClick={handleExportExcel}
          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center space-x-1.5"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel</span>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div><h3 className="text-lg font-bold text-slate-900">Transaksi Pembelian Stok Barang</h3><p className="text-xs text-slate-500">Barang masuk akan menambah stok setelah transaksi berstatus Selesai.</p></div>
              <button type="button" onClick={() => setShowModal(false)}><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="font-semibold">Supplier<select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal"><option value="">Pilih supplier</option>{supplierList.map((s) => <option key={s.id} value={s.id}>{s.namaSupplier}</option>)}</select></label>
                <label className="font-semibold">No. PO<input required value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
                <label className="font-semibold">No. Faktur<input required value={noFaktur} onChange={(e) => setNoFaktur(e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
                <label className="font-semibold">Tanggal<input required type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
              </div>
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-5">
                <label className="font-semibold sm:col-span-2">Cari / Pilih Barang<input value={barangSearch} onChange={(e) => setBarangSearch(e.target.value)} placeholder="Ketik nama barang" className="mt-1 w-full rounded-lg border p-2 font-normal" /><select size={4} value={selectedBarangId} onChange={(e) => { setSelectedBarangId(e.target.value); setHargaBeli(barangList.find((b) => b.id === e.target.value)?.hargaBeli || 0); }} className="mt-1 w-full rounded-lg border p-2 font-normal"><option value="">Pilih barang</option>{barangList.filter((b) => b.namaBarang.toLowerCase().startsWith(barangSearch.toLowerCase())).map((b) => <option key={b.id} value={b.id}>{b.kodeBarang} - {b.namaBarang} ({b.satuan})</option>)}</select></label>
                <label className="font-semibold">Jumlah<input type="number" min="1" value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
                <label className="font-semibold">Harga Beli<input type="number" min="0" value={hargaBeli} onChange={(e) => setHargaBeli(Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
                <label className="font-semibold">Kadaluarsa<input type="date" value={expiredDate} onChange={(e) => setExpiredDate(e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
                <button type="button" onClick={addItem} className="rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white sm:col-span-5"><Plus className="mr-1 inline h-4 w-4" />Tambah Item</button>
              </div>
              <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-3">Barang</th><th className="p-3">Satuan</th><th className="p-3">Jumlah</th><th className="p-3">Harga</th><th className="p-3">Subtotal</th><th /></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.barangId}-${index}`} className="border-t"><td className="p-3">{item.namaBarang}</td><td className="p-3">{barangList.find((b) => b.id === item.barangId)?.satuan || '-'}</td><td className="p-3">{item.jumlah}</td><td className="p-3">Rp {item.hargaBeli.toLocaleString('id-ID')}</td><td className="p-3 font-bold">Rp {item.subtotal.toLocaleString('id-ID')}</td><td className="p-3"><button type="button" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4 text-rose-600" /></button></td></tr>)}</tbody></table></div>
              <div className="flex items-center justify-between"><label className="font-semibold">Status<select value={status} onChange={(e) => setStatus(e.target.value as 'Selesai' | 'Draft')} className="ml-2 rounded-lg border p-2 font-normal"><option value="Selesai">Selesai (tambah stok)</option><option value="Draft">Draft</option></select></label><strong className="text-base">Total: Rp {items.reduce((total, item) => total + item.subtotal, 0).toLocaleString('id-ID')}</strong></div>
              <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setShowModal(false)} className="rounded-lg bg-slate-100 px-4 py-2 font-bold">Batal</button><button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white"><Save className="mr-1 inline h-4 w-4" />Simpan ke MySQL</button></div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">No. PO / Faktur & Tanggal</th>
                <th className="p-4">Distributor / Supplier</th>
                <th className="p-4">Item Masuk</th>
                <th className="p-4">Total Nominal</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pembelianList.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Belum ada riwayat PO pembelian supplier.</td></tr>
              ) : (
                pembelianList.map((p) => {
                  const supplier = supplierList.find((s) => s.id === p.namaSupplier);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="p-4">
                        <span className="text-[10px] text-indigo-600 block">PO: {p.nomorPO || p.noFaktur}</span>
                        <span className="font-bold text-slate-800 block">{p.noFaktur}</span>
                        <span className="text-[10px] text-slate-400">{p.tanggal}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{supplier?.namaSupplier || p.namaSupplier || 'Supplier'}</td>
                      <td className="p-4">
                        {(p.items || []).map((i, idx) => (
                          <div key={idx} className="text-[11px] text-slate-600">• {i.namaBarang} ({i.jumlah} x Rp {(i.hargaBeliSatuan || 0).toLocaleString('id-ID')})</div>
                        ))}
                      </td>
                      <td className="p-4 font-black text-slate-900">Rp {(p.grandTotal || 0).toLocaleString('id-ID')}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
