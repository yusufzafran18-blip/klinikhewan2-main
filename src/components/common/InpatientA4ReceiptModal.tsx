import React, { useState } from 'react';
import { RawatInap, Pasien, Dokter, DataKlinik, RekamMedis, Transaksi } from '../../types';
import {
  Printer, X, BedDouble, Stethoscope, Syringe, Package, DollarSign,
  Plus, Trash2, Edit2, CheckCircle2, MessageSquare, FileText, Building2
} from 'lucide-react';
import { generateWaLink } from '../../services/wa';
import { normalizeClinicProfile } from '../../utils/clinic';

export interface InpatientBillItem {
  id: string;
  kategori: 'Jasa & Perawatan' | 'Obat-Obatan' | 'Alkes & BMHP';
  namaItem: string;
  spesifikasi?: string; // e.g. Dosis, Merk, atau Keterangan
  jumlah: number;
  satuan: string; // Hari, Vial, Ampul, Pcs, Botol, Kali, Pkt
  hargaSatuan: number;
  subtotal: number;
}

interface InpatientA4ReceiptModalProps {
  rawatInap: RawatInap;
  pasien?: Pasien;
  dokter?: Dokter;
  klinik: DataKlinik;
  rekamMedisList?: RekamMedis[];
  transaksi?: Transaksi;
  onClose: () => void;
}

export const InpatientA4ReceiptModal: React.FC<InpatientA4ReceiptModalProps> = ({
  rawatInap,
  pasien,
  dokter,
  klinik,
  rekamMedisList = [],
  transaksi,
  onClose,
}) => {
  klinik = normalizeClinicProfile(klinik);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [isEditMode, setIsEditMode] = useState(false);

  // Calculate length of stay (days)
  const calculateDays = () => {
    if (!rawatInap.tanggalMasuk) return 1;
    const tglMasuk = new Date(rawatInap.tanggalMasuk);
    const tglKeluar = rawatInap.tanggalKeluarAktif ? new Date(rawatInap.tanggalKeluarAktif) : new Date();
    const diffMs = tglKeluar.getTime() - tglMasuk.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  };

  const totalHariInap = calculateDays();

  // Find related RM if any
  const relatedRM = rekamMedisList.find(
    (rm) => rm.pasienId === rawatInap.pasienId && rm.plan?.statusLanjutan === 'Rawat Inap'
  );

  // Generate initial itemized billing list
  const buildInitialItems = (): InpatientBillItem[] => {
    if (transaksi && transaksi.items && transaksi.items.length > 0) {
      return transaksi.items.map((it, idx) => {
        let kat: 'Jasa & Perawatan' | 'Obat-Obatan' | 'Alkes & BMHP' = 'Jasa & Perawatan';
        if (it.jenis === 'Obat' || it.jenis === 'Obat Racikan') kat = 'Obat-Obatan';
        else if (it.jenis === 'Barang/Pakan') kat = 'Alkes & BMHP';

        return {
          id: 'item-trx-' + idx,
          kategori: kat,
          namaItem: it.namaItem,
          jumlah: it.jumlah,
          satuan: kat === 'Jasa & Perawatan' ? 'Hari/Kali' : 'Pcs',
          hargaSatuan: it.hargaSatuan,
          subtotal: it.subtotal,
        };
      });
    }

    const items: InpatientBillItem[] = [];

    // 1. Jasa & Perawatan Inap
    items.push({
      id: 'item-inap-1',
      kategori: 'Jasa & Perawatan',
      namaItem: `Sewa Kandang & Monitoring Harian (${rawatInap.noKandang})`,
      spesifikasi: `Tarif Inap Rp ${(rawatInap.tarifPerHari || 100000).toLocaleString('id-ID')}/hari`,
      jumlah: totalHariInap,
      satuan: 'Hari',
      hargaSatuan: rawatInap.tarifPerHari || 100000,
      subtotal: totalHariInap * (rawatInap.tarifPerHari || 100000),
    });

    items.push({
      id: 'item-inap-2',
      kategori: 'Jasa & Perawatan',
      namaItem: 'Jasa Visite & Pemeriksaan Vital Sign Dokter DPJP',
      spesifikasi: dokter ? `DPJP: ${dokter.nama}` : 'Monitoring Shift Pagi, Siang, Malam',
      jumlah: totalHariInap,
      satuan: 'Hari',
      hargaSatuan: 50000,
      subtotal: totalHariInap * 50000,
    });

    if (relatedRM?.plan?.tindakanList) {
      relatedRM.plan.tindakanList.forEach((t, i) => {
        items.push({
          id: `item-tindakan-${i}`,
          kategori: 'Jasa & Perawatan',
          namaItem: t.namaTindakan,
          spesifikasi: 'Prosedur Medis Khusus',
          jumlah: 1,
          satuan: 'Tindakan',
          hargaSatuan: t.tarif,
          subtotal: t.tarif,
        });
      });
    } else {
      items.push({
        id: 'item-inap-3',
        kategori: 'Jasa & Perawatan',
        namaItem: 'Pemasangan Infus Catheter & Fluid Therapy Care',
        spesifikasi: 'Pemasangan IV line & perawatan kanul',
        jumlah: 1,
        satuan: 'Prosedur',
        hargaSatuan: 75000,
        subtotal: 75000,
      });
    }

    // 2. Obat-Obatan
    if (relatedRM?.plan?.resepList && relatedRM.plan.resepList.length > 0) {
      relatedRM.plan.resepList.forEach((r, i) => {
        items.push({
          id: `item-obat-${i}`,
          kategori: 'Obat-Obatan',
          namaItem: r.namaBarang,
          spesifikasi: `Dosis: ${r.dosis} (${r.aturanPakai || 'Sesuai indikasi'})`,
          jumlah: r.jumlah,
          satuan: 'Pcs/Vial',
          hargaSatuan: r.hargaSatuan,
          subtotal: r.subtotal,
        });
      });
    } else {
      items.push({
        id: 'item-obat-1',
        kategori: 'Obat-Obatan',
        namaItem: 'Injeksi Ondansetron 2mg/ml Antiemetik',
        spesifikasi: 'Injeksi IV per 12 jam',
        jumlah: totalHariInap * 2,
        satuan: 'Ampul',
        hargaSatuan: 25000,
        subtotal: totalHariInap * 2 * 25000,
      });
      items.push({
        id: 'item-obat-2',
        kategori: 'Obat-Obatan',
        namaItem: 'Cefotaxime 1g Injection Antibiotik',
        spesifikasi: 'Injeksi IV per 24 jam',
        jumlah: totalHariInap,
        satuan: 'Vial',
        hargaSatuan: 45000,
        subtotal: totalHariInap * 45000,
      });
      items.push({
        id: 'item-obat-3',
        kategori: 'Obat-Obatan',
        namaItem: 'Vitamin & Hepatoprotektor Injeksi (Biodin / Hepatol)',
        spesifikasi: 'Suplemen pemulihan organ',
        jumlah: 2,
        satuan: 'Dosis',
        hargaSatuan: 30000,
        subtotal: 60000,
      });
    }

    // 3. Alkes & BMHP
    items.push({
      id: 'item-bmhp-1',
      kategori: 'Alkes & BMHP',
      namaItem: 'Infus Set Micro Terumo & IV Catheter 24G',
      spesifikasi: 'Set IV SterilDisposable',
      jumlah: 1,
      satuan: 'Set',
      hargaSatuan: 35000,
      subtotal: 35000,
    });
    items.push({
      id: 'item-bmhp-2',
      kategori: 'Alkes & BMHP',
      namaItem: 'Cairan Infus Ringer Lactate (RL) 500ml',
      spesifikasi: 'Rehidrasi elektrolit',
      jumlah: totalHariInap,
      satuan: 'Botol',
      hargaSatuan: 22000,
      subtotal: totalHariInap * 22000,
    });
    items.push({
      id: 'item-bmhp-3',
      kategori: 'Alkes & BMHP',
      namaItem: 'Spuit 1ml / 3ml, Alcohol Swab, & Underpad Perlak',
      spesifikasi: 'BMHP Steril Harian Inap',
      jumlah: totalHariInap,
      satuan: 'Paket',
      hargaSatuan: 15000,
      subtotal: totalHariInap * 15000,
    });
    items.push({
      id: 'item-bmhp-4',
      kategori: 'Alkes & BMHP',
      namaItem: 'Pakan Prescription Diet (Royal Canin Gastrointestinal Wet 195g)',
      spesifikasi: 'Nutrisi Pemulihan Pencernaan',
      jumlah: totalHariInap,
      satuan: 'Kaleng',
      hargaSatuan: 48000,
      subtotal: totalHariInap * 48000,
    });

    // Tambahkan item dari rawatInap jika tersedia (pemberian obat terstruktur)
    if (rawatInap.pemberianObatList && rawatInap.pemberianObatList.length > 0) {
      rawatInap.pemberianObatList.forEach((o, idx) => {
        items.push({
          id: `item-inap-obat-${idx}`,
          kategori: 'Obat-Obatan',
          namaItem: o.namaBarang,
          spesifikasi: o.dosis ? `Dosis: ${o.dosis}` : undefined,
          jumlah: o.jumlah || 1,
          satuan: 'Pcs',
          hargaSatuan: o.hargaSatuan || 0,
          subtotal: o.subtotal ?? (o.jumlah * (o.hargaSatuan || 0)),
        });
      });
    }

    // Tambahkan item alkes jika tersedia
    if (rawatInap.penggunaanAlkesList && rawatInap.penggunaanAlkesList.length > 0) {
      rawatInap.penggunaanAlkesList.forEach((a, idx) => {
        items.push({
          id: `item-inap-alkes-${idx}`,
          kategori: 'Alkes & BMHP',
          namaItem: a.namaAlkes,
          spesifikasi: a.satuan,
          jumlah: a.jumlah || 1,
          satuan: a.satuan || 'Pcs',
          hargaSatuan: a.hargaSatuan || 0,
          subtotal: a.subtotal ?? (a.jumlah * (a.hargaSatuan || 0)),
        });
      });
    }

    // Tambahkan item pemakaian barang / pakan jika tersedia
    if (rawatInap.pemakaianBarangList && rawatInap.pemakaianBarangList.length > 0) {
      rawatInap.pemakaianBarangList.forEach((b, idx) => {
        items.push({
          id: `item-inap-barang-${idx}`,
          kategori: 'Alkes & BMHP',
          namaItem: b.namaBarang,
          spesifikasi: b.dosis || b.aturanPakai || 'Pakan/Barang Inap',
          jumlah: b.jumlah || 1,
          satuan: b.aturanPakai || 'Pcs',
          hargaSatuan: b.hargaSatuan || 0,
          subtotal: b.subtotal ?? (b.jumlah * (b.hargaSatuan || 0)),
        });
      });
    }

    // Tambahkan tindakan medis yang dicatat selama rawat inap
    if (rawatInap.tindakanMedisList && rawatInap.tindakanMedisList.length > 0) {
      rawatInap.tindakanMedisList.forEach((t, idx) => {
        items.push({
          id: `item-inap-tindakan-${idx}`,
          kategori: 'Jasa & Perawatan',
          namaItem: t.namaTindakan,
          spesifikasi: 'Tindakan medis rawat inap',
          jumlah: t.jumlah || 1,
          satuan: 'Tindakan',
          hargaSatuan: t.hargaSatuan || 0,
          subtotal: t.subtotal ?? ((t.jumlah || 1) * (t.hargaSatuan || 0)),
        });
      });
    }

    // Tambahkan biaya tambahan jika ada
    if (rawatInap.biayaTambahan && rawatInap.biayaTambahan > 0) {
      items.push({
        id: 'item-inap-biaya-tambahan',
        kategori: 'Jasa & Perawatan',
        namaItem: 'Biaya Tambahan',
        spesifikasi: 'Biaya tambahan saat inap',
        jumlah: 1,
        satuan: 'Lump-sum',
        hargaSatuan: rawatInap.biayaTambahan,
        subtotal: rawatInap.biayaTambahan,
      });
    }

    return items;
  };

  const [billItems, setBillItems] = useState<InpatientBillItem[]>(buildInitialItems());
  const [diskonNominal, setDiskonNominal] = useState<number>(transaksi?.diskon || 0);

  // New item form state
  const [newItemKategori, setNewItemKategori] = useState<'Jasa & Perawatan' | 'Obat-Obatan' | 'Alkes & BMHP'>('Jasa & Perawatan');
  const [newItemNama, setNewItemNama] = useState('');
  const [newItemSpesifikasi, setNewItemSpesifikasi] = useState('');
  const [newItemJumlah, setNewItemJumlah] = useState(1);
  const [newItemSatuan, setNewItemSatuan] = useState('Pcs');
  const [newItemHarga, setNewItemHarga] = useState(0);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemNama.trim()) return;

    const sub = newItemJumlah * newItemHarga;
    const newItem: InpatientBillItem = {
      id: 'item-custom-' + Date.now(),
      kategori: newItemKategori,
      namaItem: newItemNama,
      spesifikasi: newItemSpesifikasi,
      jumlah: newItemJumlah,
      satuan: newItemSatuan,
      hargaSatuan: newItemHarga,
      subtotal: sub,
    };

    setBillItems([...billItems, newItem]);
    setNewItemNama('');
    setNewItemSpesifikasi('');
    setNewItemJumlah(1);
    setNewItemHarga(0);
  };

  const handleDeleteItem = (id: string) => {
    setBillItems(billItems.filter((it) => it.id !== id));
  };

  // Subtotals
  const subtotalJasa = billItems
    .filter((it) => it.kategori === 'Jasa & Perawatan')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const subtotalObat = billItems
    .filter((it) => it.kategori === 'Obat-Obatan')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const subtotalBMHP = billItems
    .filter((it) => it.kategori === 'Alkes & BMHP')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const totalKotor = subtotalJasa + subtotalObat + subtotalBMHP;
  const grandTotal = Math.max(0, totalKotor - diskonNominal);

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `Nota_Rawat_Inap_${pasien?.namaHewan || 'Pasien'}_${klinik.namaKlinik}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  };

  const handleSendWA = () => {
    if (pasien?.noHpOwner) {
      const summaryText = `*NOTA RINCIAN RAWAT INAP*
*${klinik.namaKlinik}*
---------------------------------------
No. Nota: INV-INAP-${rawatInap.id.slice(-6).toUpperCase()}
Pasien: ${pasien.namaHewan} (${pasien.jenisHewan})
Owner: ${pasien.namaOwner}
Kandang: ${rawatInap.noKandang}
Lama Inap: ${totalHariInap} Hari
Status: ${rawatInap.status}

*Ringkasan Rincian Biaya:*
1. Jasa & Perawatan: Rp ${subtotalJasa.toLocaleString('id-ID')}
2. Obat-Obatan: Rp ${subtotalObat.toLocaleString('id-ID')}
3. Alkes & BMHP: Rp ${subtotalBMHP.toLocaleString('id-ID')}
---------------------------------------
Subtotal: Rp ${totalKotor.toLocaleString('id-ID')}
Diskon: Rp ${diskonNominal.toLocaleString('id-ID')}
*GRAND TOTAL: Rp ${grandTotal.toLocaleString('id-ID')}*

Terima kasih atas kepercayaannya. Semoga ${pasien.namaHewan} lekas pulih!`;

      window.open(generateWaLink(pasien.noHpOwner, summaryText), '_blank');
    }
  };

  const noNotaInap = transaksi?.noNota || `INV-INAP/${new Date().getFullYear()}/${rawatInap.id.slice(-5).toUpperCase()}`;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex justify-center items-start p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-4 overflow-hidden flex flex-col">
        
        {/* Top Action Control Bar (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Nota Rincian Biaya Rawat Inap (Ukuran {paperSize})
              </h3>
              <p className="text-xs text-slate-400">
                Format resmi cetak invoice A4 / F4 untuk pemilik pasien
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Paper Selector Toggle */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                  paperSize === 'A4' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Kertas A4
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                  paperSize === 'F4' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Kertas F4 / Folio
              </button>
            </div>

            {/* Edit mode toggle */}
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3.5 py-2 font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
                isEditMode
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Selesai Edit' : 'Mode Edit / Custom Item'}</span>
            </button>

            {/* WA Button */}
            {pasien?.noHpOwner && (
              <button
                type="button"
                onClick={handleSendWA}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-sm transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kirim WA Owner</span>
              </button>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl flex items-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Nota ({paperSize})</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Add Custom Item (Only when Edit Mode is ACTIVE, hidden on print) */}
        {isEditMode && (
          <div className="no-print bg-amber-50/90 border-b border-amber-200 p-4 text-xs space-y-3">
            <div className="flex items-center space-x-2 text-amber-900 font-extrabold">
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Tambah Item Rincian Baru ke Nota Rawat Inap:</span>
            </div>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-6 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Kategori</label>
                <select
                  value={newItemKategori}
                  onChange={(e) => setNewItemKategori(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                >
                  <option value="Jasa & Perawatan">Jasa & Perawatan</option>
                  <option value="Obat-Obatan">Obat-Obatan</option>
                  <option value="Alkes & BMHP">Alkes & BMHP</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nama Item / Tindakan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Salp Mata Terramycin, Oksigen 2 Jam..."
                  value={newItemNama}
                  onChange={(e) => setNewItemNama(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Jumlah & Satuan</label>
                <div className="flex space-x-1">
                  <input
                    type="number"
                    min="1"
                    value={newItemJumlah}
                    onChange={(e) => setNewItemJumlah(Number(e.target.value))}
                    className="w-16 p-2 bg-white border border-slate-300 rounded-lg text-center font-bold"
                  />
                  <input
                    type="text"
                    value={newItemSatuan}
                    onChange={(e) => setNewItemSatuan(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-center"
                    placeholder="Pcs/Ampul"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Harga Satuan (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={newItemHarga}
                  onChange={(e) => setNewItemHarga(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-indigo-700"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full p-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Item</span>
                </button>
              </div>
            </form>

            <div className="flex items-center space-x-4 pt-1">
              <label className="font-bold text-slate-700">Diskon Khusus (Rp):</label>
              <input
                type="number"
                min="0"
                step="5000"
                value={diskonNominal}
                onChange={(e) => setDiskonNominal(Number(e.target.value))}
                className="p-1.5 bg-white border border-slate-300 rounded-lg font-extrabold text-rose-600 w-36"
              />
            </div>
          </div>
        )}

        {/* Printable Area Page Container */}
        <div className="bg-slate-200/80 p-4 sm:p-8 overflow-x-auto flex justify-center">
          <div
            id="inpatient-a4-printable"
            className={`bg-white text-slate-900 shadow-xl border border-slate-300 p-8 sm:p-10 mx-auto font-sans text-xs ${
              paperSize === 'A4' ? 'w-[210mm] min-h-[297mm]' : 'w-[215mm] min-h-[330mm]'
            }`}
            style={{ boxSizing: 'border-box' }}
          >
            {/* KOP / HEADER IDENTITAS KLINIK */}
            <div className="border-b-2 border-indigo-900 pb-4 mb-5 flex justify-between items-start">
              <div className="flex items-start space-x-4">
                {klinik.logoUrl ? (
                  <img
                    src={klinik.logoUrl}
                    alt={klinik.namaKlinik}
                    className="w-20 h-20 object-contain rounded-xl border border-slate-200 p-1"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-900 text-white flex flex-col items-center justify-center shadow-md">
                    <Building2 className="w-8 h-8 text-indigo-300" />
                    <span className="text-[8px] font-black tracking-widest mt-0.5">KLINIK</span>
                  </div>
                )}

                <div className="space-y-1">
                  <h1 className="text-xl font-black text-indigo-950 uppercase tracking-wide">
                    {klinik.namaKlinik}
                  </h1>
                  <p className="text-slate-600 font-medium leading-snug max-w-md text-[11px]">
                    {klinik.alamat}
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    <span className="font-bold">Telp/WA:</span> {klinik.noTelp} / {klinik.noWhatsApp} | <span className="font-bold">Email:</span> {klinik.email}
                  </p>
                  {klinik.namaPenanggungJawab && (
                    <p className="text-[10px] text-slate-500 italic">
                      Penanggung Jawab Medis: <span className="font-semibold text-slate-700">{klinik.namaPenanggungJawab}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Document Identity Label */}
              <div className="text-right">
                <div className="inline-block bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-right shadow-xs">
                  <span className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                    FAKTUR / NOTA RESMI
                  </span>
                  <span className="block text-sm font-black tracking-tight">RAWAT INAP</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-600 space-y-0.5">
                  <p className="font-mono font-bold text-slate-900">{noNotaInap}</p>
                  <p>Tanggal: <span className="font-semibold">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                </div>
              </div>
            </div>

            {/* IDENTITAS PASIEN & RINCIAN INAP (2 Columns Grid) */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-[11px]">
              
              {/* Left Column: Data Pasien & Owner */}
              <div className="space-y-1.5 border-r border-slate-200 pr-4">
                <div className="flex items-center space-x-1.5 text-indigo-900 font-bold border-b border-slate-200 pb-1 mb-2">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="uppercase text-[10px] tracking-wider">IDENTITAS PASIEN & PEMILIK</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Nama Hewan:</span>
                  <span className="col-span-2 font-black text-indigo-950 text-xs">{pasien?.namaHewan || 'Pasien Inap'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Spesies / Ras:</span>
                  <span className="col-span-2 font-bold text-slate-800">{pasien?.jenisHewan} — {pasien?.ras || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Kelamin / Umur:</span>
                  <span className="col-span-2 text-slate-700">{pasien?.jenisKelamin || '-'} ({pasien?.umurFormat || '-'})</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Pemilik (Owner):</span>
                  <span className="col-span-2 font-bold text-slate-900">{pasien?.namaOwner} ({pasien?.noHpOwner})</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Alamat Owner:</span>
                  <span className="col-span-2 text-slate-600 leading-tight">{pasien?.alamatOwner || '-'}</span>
                </div>
              </div>

              {/* Right Column: Data Rawat Inap */}
              <div className="space-y-1.5 pl-1">
                <div className="flex items-center space-x-1.5 text-indigo-900 font-bold border-b border-slate-200 pb-1 mb-2">
                  <BedDouble className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="uppercase text-[10px] tracking-wider">RINCIAN KAMAR & KANDANG</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">No. Kandang:</span>
                  <span className="col-span-2 font-extrabold text-slate-900 bg-amber-100 text-amber-900 px-2 py-0.5 rounded w-fit text-[10px]">
                    {rawatInap.noKandang}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Dokter DPJP:</span>
                  <span className="col-span-2 font-bold text-indigo-800">{dokter?.nama || 'Dokter Hewan Jaga'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Diagnosa Inap:</span>
                  <span className="col-span-2 font-bold text-slate-800">{rawatInap.diagnosaInap}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Tanggal Masuk:</span>
                  <span className="col-span-2 text-slate-700 font-mono">{rawatInap.tanggalMasuk}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Tanggal Keluar:</span>
                  <span className="col-span-2 text-slate-700 font-mono">
                    {rawatInap.tanggalKeluarAktif || `${new Date().toISOString().slice(0, 10)} (Checkout)`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Lama Perawatan:</span>
                  <span className="col-span-2 font-black text-indigo-900">{totalHariInap} Hari Rawat Inap</span>
                </div>
              </div>

            </div>

            {/* TABEL DETAIL BIAYA RINCI (ITEMIZED BREAKDOWN) */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="font-extrabold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  <span>RINCIAN DETAIL KOMPONEN BIAYA RAWAT INAP</span>
                </h3>
                <span className="text-[10px] text-slate-500 italic">Disusun berdasarkan kategori pelayanan medis</span>
              </div>

              {/* 1. KATEGORI JASA & PERAWATAN */}
              <div className="space-y-1">
                <div className="bg-indigo-950 text-white px-3 py-1 font-bold text-[10px] uppercase tracking-wider rounded-t-md flex justify-between items-center">
                  <span>I. BIAYA JASA MEDIS, SEWA KANDANG & PERAWATAN</span>
                  <span>SUBTOTAL JASA: Rp {subtotalJasa.toLocaleString('id-ID')}</span>
                </div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] border-b border-slate-300">
                      <th className="p-2 w-8 text-center">No</th>
                      <th className="p-2">Uraian Jasa / Prosedur Medis</th>
                      <th className="p-2">Spesifikasi / Catatan</th>
                      <th className="p-2 text-center">Vol</th>
                      <th className="p-2 text-center">Satuan</th>
                      <th className="p-2 text-right">Tarif Satuan</th>
                      <th className="p-2 text-right">Subtotal (Rp)</th>
                      {isEditMode && <th className="p-2 no-print text-center w-8">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {billItems.filter((it) => it.kategori === 'Jasa & Perawatan').length === 0 ? (
                      <tr><td colSpan={7} className="p-2 text-center text-slate-400 italic">Tidak ada item jasa.</td></tr>
                    ) : (
                      billItems
                        .filter((it) => it.kategori === 'Jasa & Perawatan')
                        .map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-800">{item.namaItem}</td>
                            <td className="p-2 text-slate-500 italic text-[10px]">{item.spesifikasi || '-'}</td>
                            <td className="p-2 text-center font-bold text-slate-700">{item.jumlah}</td>
                            <td className="p-2 text-center text-slate-500">{item.satuan}</td>
                            <td className="p-2 text-right text-slate-700">Rp {item.hargaSatuan.toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right font-bold text-slate-900">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                            {isEditMode && (
                              <td className="p-2 no-print text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 2. KATEGORI PEMBERIAN OBAT-OBATAN */}
              <div className="space-y-1">
                <div className="bg-indigo-900 text-white px-3 py-1 font-bold text-[10px] uppercase tracking-wider rounded-t-md flex justify-between items-center">
                  <span>II. RINCIAN PEMBERIAN OBAT-OBATAN (INJEKSI & ORAL)</span>
                  <span>SUBTOTAL OBAT: Rp {subtotalObat.toLocaleString('id-ID')}</span>
                </div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] border-b border-slate-300">
                      <th className="p-2 w-8 text-center">No</th>
                      <th className="p-2">Nama Obat / Resep</th>
                      <th className="p-2">Dosis & Aturan Pakai</th>
                      <th className="p-2 text-center">Vol</th>
                      <th className="p-2 text-center">Satuan</th>
                      <th className="p-2 text-right">Harga Satuan</th>
                      <th className="p-2 text-right">Subtotal (Rp)</th>
                      {isEditMode && <th className="p-2 no-print text-center w-8">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {billItems.filter((it) => it.kategori === 'Obat-Obatan').length === 0 ? (
                      <tr><td colSpan={7} className="p-2 text-center text-slate-400 italic">Tidak ada rincian obat.</td></tr>
                    ) : (
                      billItems
                        .filter((it) => it.kategori === 'Obat-Obatan')
                        .map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-800">{item.namaItem}</td>
                            <td className="p-2 text-slate-600 text-[10px]">{item.spesifikasi || '-'}</td>
                            <td className="p-2 text-center font-bold text-slate-700">{item.jumlah}</td>
                            <td className="p-2 text-center text-slate-500">{item.satuan}</td>
                            <td className="p-2 text-right text-slate-700">Rp {item.hargaSatuan.toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right font-bold text-slate-900">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                            {isEditMode && (
                              <td className="p-2 no-print text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 3. KATEGORI ALKES & BMHP */}
              <div className="space-y-1">
                <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[10px] uppercase tracking-wider rounded-t-md flex justify-between items-center">
                  <span>III. ALAT KESEHATAN (ALKES), BMHP, & PAKAN DIET</span>
                  <span>SUBTOTAL ALKES: Rp {subtotalBMHP.toLocaleString('id-ID')}</span>
                </div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] border-b border-slate-300">
                      <th className="p-2 w-8 text-center">No</th>
                      <th className="p-2">Nama Barang / BMHP / Pakan</th>
                      <th className="p-2">Keterangan</th>
                      <th className="p-2 text-center">Vol</th>
                      <th className="p-2 text-center">Satuan</th>
                      <th className="p-2 text-right">Harga Satuan</th>
                      <th className="p-2 text-right">Subtotal (Rp)</th>
                      {isEditMode && <th className="p-2 no-print text-center w-8">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {billItems.filter((it) => it.kategori === 'Alkes & BMHP').length === 0 ? (
                      <tr><td colSpan={7} className="p-2 text-center text-slate-400 italic">Tidak ada rincian alkes/BMHP.</td></tr>
                    ) : (
                      billItems
                        .filter((it) => it.kategori === 'Alkes & BMHP')
                        .map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-800">{item.namaItem}</td>
                            <td className="p-2 text-slate-500 italic text-[10px]">{item.spesifikasi || '-'}</td>
                            <td className="p-2 text-center font-bold text-slate-700">{item.jumlah}</td>
                            <td className="p-2 text-center text-slate-500">{item.satuan}</td>
                            <td className="p-2 text-right text-slate-700">Rp {item.hargaSatuan.toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right font-bold text-slate-900">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                            {isEditMode && (
                              <td className="p-2 no-print text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* RINGKASAN PEMBAYARAN TOTAL & STAMP (2 Column Grid) */}
            <div className="grid grid-cols-2 gap-6 items-start border-t-2 border-indigo-900 pt-4 mb-6">
              
              {/* Left Column: Catatan & Status Stempel */}
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] space-y-1">
                  <p className="font-bold text-slate-800 uppercase tracking-wider">CATATAN & INSTRUKSI PERAWATAN:</p>
                  <p className="text-slate-600 leading-snug">
                    {klinik.footerNota || 'Harap perhatikan jadwal pemberian obat minum di rumah jika sudah dipulangkan. Hubungi klinik jika terjadi penurunan kondisi.'}
                  </p>
                </div>

                {/* Stempel Payment Badge */}
                <div className="flex items-center space-x-3 pt-1">
                  <div className="border-2 border-emerald-600 text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-lg text-center rotate-[-2deg] font-black tracking-widest text-sm shadow-xs uppercase">
                    ✓ LUNAS / PAID
                  </div>
                  <div className="text-[10px] text-slate-500">
                    <p className="font-semibold text-slate-800">Pembayaran Terverifikasi</p>
                    <p>Metode: {transaksi?.metodePembayaran || 'Kasir Klinik'}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Calculations */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Biaya Jasa & Kamar:</span>
                  <span className="font-semibold text-slate-800">Rp {subtotalJasa.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Pemberian Obat:</span>
                  <span className="font-semibold text-slate-800">Rp {subtotalObat.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Alkes & BMHP:</span>
                  <span className="font-semibold text-slate-800">Rp {subtotalBMHP.toLocaleString('id-ID')}</span>
                </div>

                {diskonNominal > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1">
                    <span>Diskon Potongan Harga:</span>
                    <span>- Rp {diskonNominal.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="border-t-2 border-slate-800 pt-2 flex justify-between items-center text-indigo-950">
                  <div>
                    <span className="block font-extrabold text-sm uppercase">TOTAL BIAYA INAP:</span>
                    <span className="text-[10px] text-slate-500 font-normal">Sudah termasuk pajak & pelayanan</span>
                  </div>
                  <span className="text-lg font-black text-indigo-900 bg-indigo-100 px-3 py-1 rounded-lg">
                    Rp {grandTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

            </div>

            {/* KOLOM TANDA TANGAN (SIGNATURE BLOCK) */}
            <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-slate-200 text-[11px] font-medium">
              <div>
                <p className="text-slate-500 mb-12">Pemilik Pasien / Penanggung Jawab,</p>
                <div className="border-b border-slate-400 w-48 mx-auto font-bold text-slate-900 pb-0.5">
                  {pasien?.namaOwner || '( Pemilik Pasien )'}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Tanda Tangan & Nama Terang</p>
              </div>

              <div>
                <p className="text-slate-500 mb-12">
                  {klinik.namaKlinik}, <br />
                  Staf Kasir / Keuangan Medis,
                </p>
                <div className="border-b border-slate-400 w-48 mx-auto font-bold text-slate-900 pb-0.5">
                  ( {dokter?.nama || klinik.namaPenanggungJawab || 'Kasir / Petugas Jaga'} )
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Stempel Klinik & Tanda Tangan</p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Print Specific Embedded Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #inpatient-a4-printable {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: none !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: ${paperSize === 'A4' ? 'A4 portrait' : '215mm 330mm portrait'};
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
};
