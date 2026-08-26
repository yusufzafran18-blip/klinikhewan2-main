import React, { useState } from 'react';
import { Barang, Transaksi, DataKlinik, AppSettings, User, DetailTransaksiItem } from '../../types';
import {
  ShoppingBag, Search, Plus, Minus, Trash2, Printer, CreditCard
} from 'lucide-react';
import { ThermalReceiptModal } from '../common/ThermalReceiptModal';

interface PenjualanDirectViewProps {
  barangList: Barang[];
  klinik: DataKlinik;
  settings: AppSettings;
  activeUser: User;
  onSaveTransaksi: (trx: Transaksi) => void | Promise<void>;
}

interface CartItem {
  barang: Barang;
  qty: number;
}

export const PenjualanDirectView: React.FC<PenjualanDirectViewProps> = ({
  barangList = [],
  klinik,
  settings,
  activeUser,
  onSaveTransaksi,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [namaPelanggan, setNamaPelanggan] = useState('Pelanggan Umum (Walk-in)');
  const [metode, setMetode] = useState<'Tunai' | 'Transfer QRIS' | 'Debit/Kredit' | 'E-Wallet'>('Tunai');
  const [diskon, setDiskon] = useState(0);
  const [jumlahBayar, setJumlahBayar] = useState(0);
  const [printingTrx, setPrintingTrx] = useState<Transaksi | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic categories from master barang
  const categoryOptions = React.useMemo(() => {
    const set = new Set<string>();
    barangList.forEach((b) => {
      if (b.kategori) set.add(b.kategori);
    });
    return ['Semua', ...Array.from(set)];
  }, [barangList]);

  const getStock = (b: Barang) => Number(b.stokCurrent ?? (b as any).stok ?? 0);

  const handleAddToCart = (b: Barang) => {
    const currentStock = getStock(b);
    if (currentStock <= 0) return alert(`Stok untuk "${b.namaBarang}" habis!`);
    const existing = cart.find((item) => item.barang.id === b.id);
    if (existing) {
      if (existing.qty + 1 > currentStock) {
        return alert(`Jumlah (${existing.qty + 1}) melebihi stok tersedia (${currentStock} ${b.satuan || ''})!`);
      }
      setCart(cart.map((item) => item.barang.id === b.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { barang: b, qty: 1 }]);
    }
  };

  const handleUpdateQty = (barangId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.barang.id === barangId) {
        const newQty = item.qty + delta;
        if (newQty <= 0) return null as any;
        const availableStock = getStock(item.barang);
        if (newQty > availableStock) {
          alert(`Jumlah melebihi stok tersedia (${availableStock} ${item.barang.satuan || ''})!`);
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const handleRemoveFromCart = (barangId: string) => {
    setCart(cart.filter((item) => item.barang.id !== barangId));
  };

  const subtotal = cart.reduce((acc, i) => acc + (i.barang.hargaJual * i.qty), 0);
  const grandTotal = Math.max(0, subtotal - diskon);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Keranjang belanja kosong!');
    if (isProcessing) return;

    // Check stock availability before submitting
    for (const item of cart) {
      const latestBarang = barangList.find((b) => b.id === item.barang.id) || item.barang;
      const available = getStock(latestBarang);
      if (item.qty > available) {
        return alert(`Stok tidak mencukupi untuk "${item.barang.namaBarang}". Tersedia: ${available}, diminta: ${item.qty}`);
      }
    }

    try {
      setIsProcessing(true);
      const count = Date.now().toString().slice(-4);
      const noNota = `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${count}`;

      const items: DetailTransaksiItem[] = cart.map((i) => ({
        id: i.barang.id,
        barangId: i.barang.id,
        jenis: (i.barang.kategori === 'Obat' ? 'Obat' : 'Barang/Pakan') as any,
        namaItem: i.barang.namaBarang,
        jumlah: i.qty,
        hargaSatuan: i.barang.hargaJual,
        subtotal: i.barang.hargaJual * i.qty,
      }));

      const newTrx: Transaksi = {
        id: 'trx-pos-' + Date.now(),
        noNota,
        tanggal: new Date().toISOString().replace('T', ' ').slice(0, 16),
        namaPelanggan: namaPelanggan.trim() || 'Pelanggan Umum (Walk-in)',
        typeTransaksi: 'Penjualan Direct (PetShop)',
        items,
        subtotal,
        diskon,
        pajak: 0,
        grandTotal,
        metodePembayaran: metode,
        jumlahBayar: jumlahBayar || grandTotal,
        kembalian: Math.max(0, (jumlahBayar || grandTotal) - grandTotal),
        status: 'Lunas',
        kasirId: activeUser.id,
      };

      await onSaveTransaksi(newTrx);
      setCart([]);
      setPrintingTrx(newTrx);
    } catch (err: any) {
      alert(`Terjadi kesalahan saat memproses transaksi: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBarang = barangList.filter((b) => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch =
      !query ||
      b.namaBarang.toLowerCase().includes(query) ||
      (b.kodeBarang && b.kodeBarang.toLowerCase().includes(query)) ||
      (b.kategori && b.kategori.toLowerCase().includes(query));
    const matchCat = categoryFilter === 'Semua' || b.kategori === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Penjualan Direct / PetShop POS</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Kasir cepat untuk pakan, obat bebas, shampoo, & aksesoris hewan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Catalog List Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari produk petshop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-300 font-semibold bg-white text-slate-700"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'Semua' ? 'Semua Kategori' : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredBarang.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-xs text-slate-600">Tidak ada produk yang cocok</p>
                <p className="text-[11px] text-slate-400">Silakan gunakan kata kunci lain atau pilih Semua Kategori</p>
              </div>
            ) : (
              filteredBarang.map((b) => {
                const stock = getStock(b);
                const isOutOfStock = stock <= 0;
                return (
                  <div
                    key={b.id}
                    onClick={() => handleAddToCart(b)}
                    className={`bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs transition-all flex flex-col justify-between ${
                      isOutOfStock
                        ? 'opacity-60 cursor-not-allowed bg-slate-50'
                        : 'hover:border-indigo-500 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {b.kategori || 'Produk'}
                        </span>
                        {b.kodeBarang && (
                          <span className="text-[9px] font-medium text-slate-400">{b.kodeBarang}</span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 mt-2 line-clamp-2">{b.namaBarang}</h4>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-700">Rp {(b.hargaJual || 0).toLocaleString('id-ID')}</span>
                      <span className={`text-[10px] font-bold ${!isOutOfStock ? 'text-slate-500' : 'text-rose-600'}`}>
                        Stok: {stock} {b.satuan || ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Shopping Cart Column */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Keranjang POS ({cart.length} Item)
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Kosongkan
                </button>
              )}
            </div>

            <div className="space-y-2 mt-3 max-h-60 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">Pilih produk di katalog untuk ditambahkan ke keranjang.</p>
              ) : (
                cart.map((i) => (
                  <div key={i.barang.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{i.barang.namaBarang}</p>
                      <p className="text-[10px] text-indigo-700 font-bold">
                        Rp {((i.barang.hargaJual || 0) * i.qty).toLocaleString('id-ID')}{' '}
                        <span className="text-slate-400 font-normal">(@ Rp {(i.barang.hargaJual || 0).toLocaleString('id-ID')})</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(i.barang.id, -1)}
                        className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus className="w-3 h-3 text-slate-600" />
                      </button>
                      <span className="font-bold w-6 text-center">{i.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(i.barang.id, 1)}
                        className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-slate-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(i.barang.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                        title="Hapus dari keranjang"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleCheckout} className="space-y-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Pembeli</label>
              <input
                type="text"
                value={namaPelanggan}
                onChange={(e) => setNamaPelanggan(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 font-medium"
              />
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span>Subtotal:</span>
              <span className="font-bold">Rp {(subtotal || 0).toLocaleString('id-ID')}</span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span>Diskon (Rp):</span>
              <input
                type="number"
                value={diskon}
                onChange={(e) => setDiskon(parseInt(e.target.value) || 0)}
                className="w-24 p-1 text-right font-bold border border-slate-300 rounded"
              />
            </div>

            <div className="flex justify-between items-center text-sm font-black text-indigo-700 pt-2 border-t border-slate-200">
              <span>Total Bayar:</span>
              <span>Rp {(grandTotal || 0).toLocaleString('id-ID')}</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
              <select value={metode} onChange={(e) => setMetode(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300 font-bold">
                <option value="Tunai">Tunai / Cash</option>
                <option value="Transfer QRIS">Transfer QRIS</option>
                <option value="Debit/Kredit">Kartu Debit/Kredit</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={cart.length === 0 || isProcessing}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-emerald-200 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isProcessing ? 'Memproses Transaksi...' : 'Selesai & Cetak Struk'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Modal Thermal Print */}
      {printingTrx && (
        <ThermalReceiptModal
          transaksi={printingTrx}
          klinik={klinik}
          settings={settings}
          onClose={() => setPrintingTrx(null)}
        />
      )}

    </div>
  );
};
