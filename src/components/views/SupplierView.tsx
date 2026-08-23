import React, { useState } from 'react';
import { Supplier } from '../../types';
import { Building2, Plus, Search, Save, Trash2, X } from 'lucide-react';

interface SupplierViewProps {
  supplierList: Supplier[];
  onSaveSupplier: (supplier: Supplier) => void | Promise<void>;
  onDeleteSupplier: (id: string) => void | Promise<void>;
}

export const SupplierView: React.FC<SupplierViewProps> = ({ supplierList = [], onSaveSupplier, onDeleteSupplier }) => {
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [kodeSupplier, setKodeSupplier] = useState('');
  const [namaSupplier, setNamaSupplier] = useState('');
  const [kontak, setKontak] = useState('');
  const [noHp, setNoHp] = useState('');
  const [alamat, setAlamat] = useState('');

  const openForm = (supplier?: Supplier) => {
    setEditing(supplier || null);
    setKodeSupplier(supplier?.kodeSupplier || `SUP-${String(Date.now()).slice(-5)}`);
    setNamaSupplier(supplier?.namaSupplier || '');
    setKontak(supplier?.kontak || '');
    setNoHp(supplier?.noHp || '');
    setAlamat(supplier?.alamat || '');
    setShowForm(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!namaSupplier.trim()) return alert('Nama supplier wajib diisi.');
    try {
      await onSaveSupplier({
        id: editing?.id || `sup-${Date.now()}`,
        kodeSupplier: kodeSupplier.trim() || `SUP-${String(Date.now()).slice(-5)}`,
        namaSupplier: namaSupplier.trim(),
        kontak: kontak.trim(),
        noHp: noHp.trim(),
        alamat: alamat.trim(),
      });
      setShowForm(false);
    } catch (error: any) {
      alert(`Supplier gagal disimpan: ${error.message}`);
    }
  };

  const filtered = supplierList.filter((supplier) =>
    `${supplier.kodeSupplier || ''} ${supplier.namaSupplier} ${supplier.kontak} ${supplier.noHp}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-indigo-600" /><div><h2 className="text-lg font-bold text-slate-800">Master Supplier</h2><p className="mt-1 text-xs text-slate-500">Kelola supplier untuk transaksi pembelian stok barang.</p></div></div>
        <button type="button" onClick={() => openForm()} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200"><Plus className="h-4 w-4" />Tambah Supplier</button>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kode, nama, kontak, atau nomor HP supplier..." className="w-full text-xs outline-none" /></div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-4">Kode</th><th className="p-4">Nama Supplier</th><th className="p-4">Kontak</th><th className="p-4">No. HP</th><th className="p-4">Alamat</th><th className="p-4 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada supplier.</td></tr> : filtered.map((supplier) => <tr key={supplier.id} className="hover:bg-slate-50"><td className="p-4 font-mono font-bold text-indigo-700">{supplier.kodeSupplier || '-'}</td><td className="p-4 font-bold text-slate-800">{supplier.namaSupplier}</td><td className="p-4">{supplier.kontak || '-'}</td><td className="p-4">{supplier.noHp || '-'}</td><td className="p-4">{supplier.alamat || '-'}</td><td className="p-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => openForm(supplier)} className="rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-700">Edit</button><button type="button" onClick={async () => { if (confirm(`Hapus supplier ${supplier.namaSupplier}?`)) await onDeleteSupplier(supplier.id); }} className="rounded-lg bg-rose-50 p-1.5 text-rose-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div></div>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><form onSubmit={save} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 text-xs shadow-2xl"><div className="flex items-center justify-between border-b pb-3"><h3 className="text-base font-bold">{editing ? 'Edit Supplier' : 'Tambah Supplier'}</h3><button type="button" onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-500" /></button></div><label className="block font-semibold">Kode Supplier<input value={kodeSupplier} onChange={(event) => setKodeSupplier(event.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="block font-semibold">Nama Supplier<input required value={namaSupplier} onChange={(event) => setNamaSupplier(event.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="block font-semibold">Kontak / Sales<input value={kontak} onChange={(event) => setKontak(event.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="block font-semibold">Nomor HP<input value={noHp} onChange={(event) => setNoHp(event.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="block font-semibold">Alamat<textarea value={alamat} onChange={(event) => setAlamat(event.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><div className="flex justify-end gap-2 border-t pt-3"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-slate-100 px-4 py-2 font-bold">Batal</button><button type="submit" className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white"><Save className="h-4 w-4" />Simpan</button></div></form></div>}
    </div>
  );
};
