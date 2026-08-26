import React, { useState } from 'react';
import { RekamMedis, Pasien, Dokter, DataKlinik, Transaksi, TindakanItem, ResepItem, ObatRacikan, AlkesUsageItem } from '../../types';
import {
  Printer, X, Stethoscope, Pill, Syringe, Package, DollarSign,
  Plus, Trash2, Edit2, CheckCircle2, MessageSquare, FileText, Calendar, Building2
} from 'lucide-react';
import { generateWaLink } from '../../services/wa';
import { normalizeClinicProfile } from '../../utils/clinic';

export interface OutpatientBillItem {
  id: string;
  kategori: 'Jasa & Tindakan' | 'Obat-Obatan' | 'Obat Racikan' | 'Alkes & BMHP' | 'Pakan & Barang';
  namaItem: string;
  spesifikasi?: string; // Dosis, Aturan pakai, Satuan, Keterangan
  jumlah: number;
  satuan: string;
  hargaSatuan: number;
  subtotal: number;
}

interface OutpatientA4ReceiptModalProps {
  rekamMedis: RekamMedis;
  pasien?: Pasien;
  dokter?: Dokter;
  klinik: DataKlinik;
  transaksi?: Transaksi;
  onClose: () => void;
}

export const OutpatientA4ReceiptModal: React.FC<OutpatientA4ReceiptModalProps> = ({
  rekamMedis,
  pasien,
  dokter,
  klinik,
  transaksi,
  onClose,
}) => {
  const normKlinik = normalizeClinicProfile(klinik);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [isEditMode, setIsEditMode] = useState(false);

  // Generate initial itemized billing list from RekamMedis or Transaksi
  const buildInitialItems = (): OutpatientBillItem[] => {
    // If transaksi already contains itemized rows, prioritize them
    if (transaksi && transaksi.items && transaksi.items.length > 0) {
      return transaksi.items.map((it, idx) => {
        let kat: OutpatientBillItem['kategori'] = 'Jasa & Tindakan';
        if (it.jenis === 'Obat') kat = 'Obat-Obatan';
        else if (it.jenis === 'Obat Racikan') kat = 'Obat Racikan';
        else if (it.jenis === 'Barang/Pakan') {
          kat = it.namaItem.toLowerCase().includes('infus') || it.namaItem.toLowerCase().includes('spuit') || it.namaItem.toLowerCase().includes('alkes') || it.namaItem.toLowerCase().includes('catheter')
            ? 'Alkes & BMHP'
            : 'Pakan & Barang';
        }

        return {
          id: `item-trx-${idx}`,
          kategori: kat,
          namaItem: it.namaItem,
          spesifikasi: '',
          jumlah: it.jumlah || 1,
          satuan: kat === 'Jasa & Tindakan' ? 'Tindakan' : 'Pcs',
          hargaSatuan: it.hargaSatuan || 0,
          subtotal: it.subtotal || ((it.jumlah || 1) * (it.hargaSatuan || 0)),
        };
      });
    }

    const items: OutpatientBillItem[] = [];

    // 1. Tindakan Medis & Prosedur
    if (rekamMedis.plan?.tindakanList && rekamMedis.plan.tindakanList.length > 0) {
      rekamMedis.plan.tindakanList.forEach((t, i) => {
        items.push({
          id: `item-tindakan-${i}`,
          kategori: 'Jasa & Tindakan',
          namaItem: t.namaTindakan,
          spesifikasi: t.keterangan || 'Konsultasi & Penanganan Medis',
          jumlah: 1,
          satuan: 'Tindakan',
          hargaSatuan: t.tarif || 0,
          subtotal: t.tarif || 0,
        });
      });
    } else {
      items.push({
        id: 'item-tindakan-default',
        kategori: 'Jasa & Tindakan',
        namaItem: 'Pemeriksaan Klinis & Konsultasi Dokter Hewan',
        spesifikasi: 'Pemeriksaan fisik umum & penegakan diagnosa',
        jumlah: 1,
        satuan: 'Pemeriksaan',
        hargaSatuan: 50000,
        subtotal: 50000,
      });
    }

    // 2. Resep Obat Non-Racikan
    if (rekamMedis.plan?.resepList && rekamMedis.plan.resepList.length > 0) {
      rekamMedis.plan.resepList.forEach((r, i) => {
        items.push({
          id: `item-resep-${i}`,
          kategori: 'Obat-Obatan',
          namaItem: r.namaBarang,
          spesifikasi: `Dosis: ${r.dosis || '-'} (${r.aturanPakai || 'Sesuai Anjuran'})`,
          jumlah: r.jumlah || 1,
          satuan: 'Pcs',
          hargaSatuan: r.hargaSatuan || 0,
          subtotal: r.subtotal || ((r.hargaSatuan || 0) * (r.jumlah || 1)),
        });
      });
    }

    // 3. Obat Racikan
    if (rekamMedis.plan?.racikanList && rekamMedis.plan.racikanList.length > 0) {
      rekamMedis.plan.racikanList.forEach((rac, i) => {
        const itemNames = (rac.items || []).map((it) => it.namaObat).join(', ');
        items.push({
          id: `item-racikan-${i}`,
          kategori: 'Obat Racikan',
          namaItem: `[Racikan] ${rac.namaRacikan}`,
          spesifikasi: `${rac.jumlahBungkus} Bungkus (${rac.aturanPakai || '3x1 bungkus'}) ${itemNames ? `• Komposisi: ${itemNames}` : ''}`,
          jumlah: rac.jumlahBungkus || 1,
          satuan: 'Bungkus',
          hargaSatuan: rac.totalHarga ? Math.round(rac.totalHarga / (rac.jumlahBungkus || 1)) : 0,
          subtotal: rac.totalHarga || 0,
        });
      });
    }

    // 4. Penggunaan Alkes & BMHP
    if (rekamMedis.plan?.penggunaanAlkesList && rekamMedis.plan.penggunaanAlkesList.length > 0) {
      rekamMedis.plan.penggunaanAlkesList.forEach((a, i) => {
        items.push({
          id: `item-alkes-${i}`,
          kategori: 'Alkes & BMHP',
          namaItem: a.namaAlkes,
          spesifikasi: a.satuan || 'BMHP Disposable',
          jumlah: a.jumlah || 1,
          satuan: a.satuan || 'Pcs',
          hargaSatuan: a.hargaSatuan || 0,
          subtotal: a.subtotal || ((a.hargaSatuan || 0) * (a.jumlah || 1)),
        });
      });
    }

    // 5. Pemakaian Barang / Pakan Diet / Nutrisi
    if (rekamMedis.plan?.pemakaianBarangList && rekamMedis.plan.pemakaianBarangList.length > 0) {
      rekamMedis.plan.pemakaianBarangList.forEach((b, i) => {
        items.push({
          id: `item-barang-${i}`,
          kategori: 'Pakan & Barang',
          namaItem: b.namaBarang,
          spesifikasi: b.dosis || b.aturanPakai || 'Pakan/Nutrisi Rawat Jalan',
          jumlah: b.jumlah || 1,
          satuan: b.aturanPakai || 'Pcs',
          hargaSatuan: b.hargaSatuan || 0,
          subtotal: b.subtotal || ((b.hargaSatuan || 0) * (b.jumlah || 1)),
        });
      });
    }

    return items;
  };

  const [billItems, setBillItems] = useState<OutpatientBillItem[]>(buildInitialItems);
  const [customDiscount, setCustomDiscount] = useState<number>(transaksi?.diskon || 0);

  // New Item State for Edit Mode
  const [newItemKategori, setNewItemKategori] = useState<OutpatientBillItem['kategori']>('Jasa & Tindakan');
  const [newItemNama, setNewItemNama] = useState('');
  const [newItemSpesifikasi, setNewItemSpesifikasi] = useState('');
  const [newItemJumlah, setNewItemJumlah] = useState(1);
  const [newItemSatuan, setNewItemSatuan] = useState('Pcs');
  const [newItemHarga, setNewItemHarga] = useState(0);

  // Calculate Subtotals per Category
  const subtotalTindakan = billItems
    .filter((it) => it.kategori === 'Jasa & Tindakan')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const subtotalObat = billItems
    .filter((it) => it.kategori === 'Obat-Obatan' || it.kategori === 'Obat Racikan')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const subtotalAlkes = billItems
    .filter((it) => it.kategori === 'Alkes & BMHP')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const subtotalBarang = billItems
    .filter((it) => it.kategori === 'Pakan & Barang')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const grandSubtotal = billItems.reduce((sum, it) => sum + it.subtotal, 0);
  const finalGrandTotal = Math.max(0, grandSubtotal - customDiscount);

  // Print Handler
  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `Nota_Rawat_Jalan_${rekamMedis.noRM}_${pasien?.namaHewan || 'Pasien'}_${normKlinik.namaKlinik}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  };

  // WhatsApp Sender Handler
  const handleSendWA = () => {
    if (!pasien?.noTelp) {
      window.alert('Nomor WhatsApp pemilik tidak ditemukan pada data pasien.');
      return;
    }

    const itemSummary = billItems
      .map((it, idx) => `${idx + 1}. ${it.namaItem} (${it.jumlah} ${it.satuan}) - Rp ${it.subtotal.toLocaleString('id-ID')}`)
      .join('\n');

    const waText = `*KWITANSI & RINCIAN RAWAT JALAN*\n*${normKlinik.namaKlinik}*\n` +
      `--------------------------------\n` +
      `No. RM: ${rekamMedis.noRM}\n` +
      `No. Invoice: ${transaksi?.noNota || 'INV-' + rekamMedis.noRM}\n` +
      `Tanggal: ${rekamMedis.tanggal}\n` +
      `Pasien: ${pasien?.namaHewan} (${pasien?.jenisHewan || 'Hewan'})\n` +
      `Pemilik: ${pasien?.namaOwner}\n` +
      `Dokter: ${dokter?.nama || 'Dokter Jaga'}\n` +
      `Diagnosa: ${rekamMedis.assessment?.diagnosaUtama || '-'}\n` +
      `--------------------------------\n` +
      `*RINCIAN BIAYA:*\n${itemSummary}\n\n` +
      `*Subtotal:* Rp ${grandSubtotal.toLocaleString('id-ID')}\n` +
      (customDiscount > 0 ? `*Diskon:* -Rp ${customDiscount.toLocaleString('id-ID')}\n` : '') +
      `*TOTAL TAGIHAN:* Rp ${finalGrandTotal.toLocaleString('id-ID')}\n` +
      `*Status:* ${transaksi?.status || rekamMedis.statusPembayaran || 'Belum Lunas'}\n` +
      (rekamMedis.plan?.tanggalKontrolUlang ? `\n*Jadwal Kontrol:* ${rekamMedis.plan.tanggalKontrolUlang}\n` : '') +
      `--------------------------------\n` +
      `Terima kasih telah mempercayakan kesehatan anabul Anda kepada ${normKlinik.namaKlinik}.`;

    window.open(generateWaLink(pasien.noTelp, waText), '_blank');
  };

  // Add Item to Bill
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemNama || newItemJumlah <= 0) return;

    const newItem: OutpatientBillItem = {
      id: `custom-item-${Date.now()}`,
      kategori: newItemKategori,
      namaItem: newItemNama,
      spesifikasi: newItemSpesifikasi,
      jumlah: newItemJumlah,
      satuan: newItemSatuan,
      hargaSatuan: newItemHarga,
      subtotal: newItemJumlah * newItemHarga,
    };

    setBillItems([...billItems, newItem]);
    setNewItemNama('');
    setNewItemSpesifikasi('');
    setNewItemJumlah(1);
    setNewItemHarga(0);
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    setBillItems(billItems.filter((it) => it.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-h-[96vh] flex flex-col overflow-hidden print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none ${
          paperSize === 'A4' ? 'max-w-[860px]' : 'max-w-[900px]'
        }`}
      >
        {/* MODAL CONTROL HEADER (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600/30 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <span>Cetak Nota & Rincian Biaya Rawat Jalan</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {paperSize} Mode
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Format Resmi Kwitansi Pasien Poliklinik / Rawat Jalan</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Paper Size Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  paperSize === 'A4' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 (210×297)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  paperSize === 'F4' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                F4 / Folio (215×330)
              </button>
            </div>

            {/* Toggle Edit Mode */}
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                isEditMode
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Selesai Edit' : 'Edit Item'}</span>
            </button>

            {/* WhatsApp Share */}
            <button
              type="button"
              onClick={handleSendWA}
              title="Kirim Kwitansi via WhatsApp"
              className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-900/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak (PDF)</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* EDIT MODE BAR (Optional Custom Item Insertion) */}
        {isEditMode && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 shrink-0 text-xs print:hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center space-x-1">
                <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                <span>Tambah / Modifikasi Rincian Biaya Cetak:</span>
              </span>
              <div className="flex items-center space-x-2">
                <label className="font-semibold text-amber-900">Diskon (Rp):</label>
                <input
                  type="number"
                  min="0"
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-32 px-2.5 py-1 bg-white rounded-lg border border-amber-300 font-bold text-amber-900 focus:outline-hidden"
                />
              </div>
            </div>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-6 gap-2 pt-1">
              <select
                value={newItemKategori}
                onChange={(e) => setNewItemKategori(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white rounded-lg border border-amber-300 text-slate-800"
              >
                <option value="Jasa & Tindakan">Jasa & Tindakan</option>
                <option value="Obat-Obatan">Obat-Obatan</option>
                <option value="Obat Racikan">Obat Racikan</option>
                <option value="Alkes & BMHP">Alkes & BMHP</option>
                <option value="Pakan & Barang">Pakan & Barang</option>
              </select>

              <input
                type="text"
                placeholder="Nama Layanan / Obat / BMHP"
                value={newItemNama}
                onChange={(e) => setNewItemNama(e.target.value)}
                className="sm:col-span-2 px-2.5 py-1.5 bg-white rounded-lg border border-amber-300 text-slate-800"
                required
              />

              <input
                type="text"
                placeholder="Spesifikasi / Dosis"
                value={newItemSpesifikasi}
                onChange={(e) => setNewItemSpesifikasi(e.target.value)}
                className="px-2.5 py-1.5 bg-white rounded-lg border border-amber-300 text-slate-800"
              />

              <div className="flex space-x-1">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={newItemJumlah}
                  onChange={(e) => setNewItemJumlah(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1.5 bg-white rounded-lg border border-amber-300 text-slate-800 text-center font-bold"
                />
                <input
                  type="text"
                  placeholder="Satuan"
                  value={newItemSatuan}
                  onChange={(e) => setNewItemSatuan(e.target.value)}
                  className="w-16 px-2 py-1.5 bg-white rounded-lg border border-amber-300 text-slate-800"
                />
              </div>

              <div className="flex space-x-1.5">
                <input
                  type="number"
                  min="0"
                  placeholder="Harga (Rp)"
                  value={newItemHarga}
                  onChange={(e) => setNewItemHarga(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-amber-300 text-slate-800 font-bold"
                  required
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PRINTABLE NOTA CONTAINER */}
        <div className="p-6 sm:p-8 overflow-y-auto print:overflow-visible print:p-0 print:m-0 flex-1 bg-white font-sans text-slate-800 text-xs">
          <div
            id="outpatient-a4-printable"
            className={`mx-auto bg-white print:w-full ${
              paperSize === 'A4' ? 'min-h-[297mm] max-w-[210mm]' : 'min-h-[330mm] max-w-[215mm]'
            } flex flex-col justify-between`}
          >
            {/* 1. KOP KLINIK FORMAL */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  {normKlinik.logoUrl ? (
                    <img
                      src={normKlinik.logoUrl}
                      alt={normKlinik.namaKlinik}
                      className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-xs">
                      <Stethoscope className="w-8 h-8 text-emerald-400" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                      {normKlinik.namaKlinik}
                    </h1>
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                      Layanan Kesehatan Hewan, Rawat Jalan & Bedah Terpadu
                    </p>
                    <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                      {normKlinik.alamat}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Telp/WA: <span className="font-semibold text-slate-700">{normKlinik.noTelp || normKlinik.noWhatsApp}</span> | Izin: <span className="font-semibold text-slate-700">{normKlinik.npwp || '503/SIP-KH/2026'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right border-l-2 border-slate-200 pl-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Kwitansi Pembayaran
                  </span>
                  <p className="font-black text-sm sm:text-base text-slate-900 font-mono">
                    {transaksi?.noNota || `INV-${rekamMedis.noRM}`}
                  </p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-[10px] uppercase tracking-wider">
                    {transaksi?.status === 'Lunas' || rekamMedis.statusPembayaran === 'Lunas' ? 'LUNAS' : 'TAGIHAN RAWAT JALAN'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. JUDUL DOKUMEN & METADATA GRID */}
            <div className="mb-4">
              <div className="text-center py-1.5 mb-3 bg-slate-900 text-white rounded-lg">
                <h2 className="font-black text-xs sm:text-sm tracking-wide uppercase">
                  RINCIAN BIAYA PEMERIKSAAN & PENGOBATAN RAWAT JALAN (OUTPATIENT)
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] leading-relaxed">
                {/* Kolom Kiri: Info Pasien & Owner */}
                <div className="space-y-1 border-r border-slate-200 pr-3">
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium">No. Rekam Medis:</span>
                    <span className="font-bold text-slate-900 font-mono">{rekamMedis.noRM}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium">Nama Pasien:</span>
                    <span className="font-bold text-slate-900">{pasien?.namaHewan || 'Pasien Hewan'} ({pasien?.jenisHewan || 'Hewan'} - {pasien?.ras || 'Campuran'})</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium">Nama Pemilik:</span>
                    <span className="font-bold text-slate-800">{pasien?.namaOwner || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium">No. WhatsApp:</span>
                    <span className="font-semibold text-slate-700">{pasien?.noTelp || '-'}</span>
                  </div>
                </div>

                {/* Kolom Kanan: Info Pemeriksaan & Dokter */}
                <div className="space-y-1 pl-1">
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Tanggal Periksa:</span>
                    <span className="font-bold text-slate-900">{rekamMedis.tanggal}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Dokter DPJP:</span>
                    <span className="font-bold text-slate-900">{dokter?.nama || 'Dokter Hewan Pemeriksa'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Diagnosa Utama:</span>
                    <span className="font-bold text-emerald-800">{rekamMedis.assessment?.diagnosaUtama || 'Pemeriksaan Rawat Jalan'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Tanda Vital:</span>
                    <span className="font-semibold text-slate-700">
                      BB: {rekamMedis.objective?.beratBadan || '-'} kg | Suhu: {rekamMedis.objective?.suhu || '-'} °C | CRT: {rekamMedis.objective?.crt || '<2 dtk'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. TABEL ITEM RINCIAN BIAYA (Itemized Table) */}
            <div className="mb-4">
              <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-2 border border-slate-400 text-center w-8">No</th>
                    <th className="p-2 border border-slate-400 w-32">Kategori</th>
                    <th className="p-2 border border-slate-400">Deskripsi Layanan / Obat / BMHP</th>
                    <th className="p-2 border border-slate-400 text-center w-12">Qty</th>
                    <th className="p-2 border border-slate-400 text-center w-14">Satuan</th>
                    <th className="p-2 border border-slate-400 text-right w-24">Harga (Rp)</th>
                    <th className="p-2 border border-slate-400 text-right w-28">Subtotal (Rp)</th>
                    {isEditMode && <th className="p-2 border border-slate-400 text-center w-8 print:hidden">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {billItems.length === 0 ? (
                    <tr>
                      <td colSpan={isEditMode ? 8 : 7} className="p-4 text-center text-slate-400 italic">
                        Tidak ada rincian tagihan tercatat.
                      </td>
                    </tr>
                  ) : (
                    billItems.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-2 border border-slate-200 text-center font-semibold text-slate-600">{idx + 1}</td>
                        <td className="p-2 border border-slate-200 font-semibold text-slate-700">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.kategori === 'Jasa & Tindakan'
                                ? 'bg-indigo-100 text-indigo-800'
                                : item.kategori === 'Obat-Obatan'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.kategori === 'Obat Racikan'
                                ? 'bg-purple-100 text-purple-800'
                                : item.kategori === 'Alkes & BMHP'
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.kategori}
                          </span>
                        </td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-900">
                          <div>{item.namaItem}</div>
                          {item.spesifikasi && (
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                              {item.spesifikasi}
                            </div>
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-bold text-slate-800">{item.jumlah}</td>
                        <td className="p-2 border border-slate-200 text-center text-slate-600">{item.satuan}</td>
                        <td className="p-2 border border-slate-200 text-right text-slate-700 font-mono font-medium">
                          {(item.hargaSatuan || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 border border-slate-200 text-right font-bold text-slate-900 font-mono">
                          {(item.subtotal || 0).toLocaleString('id-ID')}
                        </td>
                        {isEditMode && (
                          <td className="p-1 border border-slate-200 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
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

            {/* 4. RINGKASAN SUB-KATEGORI & GRAND TOTAL BOX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Kolom Kiri: Catatan & Anjuran Dokter */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] space-y-1.5">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Anjuran Perawatan & Kontrol:</span>
                </h4>
                {rekamMedis.plan?.pakanAnjuran && (
                  <p><span className="font-semibold text-slate-700">Anjuran Pakan / Diet:</span> {rekamMedis.plan.pakanAnjuran}</p>
                )}
                {rekamMedis.plan?.catatanTambahan && (
                  <p><span className="font-semibold text-slate-700">Catatan Perawatan:</span> {rekamMedis.plan.catatanTambahan}</p>
                )}
                {rekamMedis.plan?.tanggalKontrolUlang ? (
                  <div className="bg-amber-100 text-amber-900 p-1.5 rounded-lg font-bold flex items-center space-x-1 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Jadwal Kontrol Ulang: {rekamMedis.plan.tanggalKontrolUlang}</span>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Kontrol kembali bila gejala berlanjut dalam 3-5 hari.</p>
                )}
              </div>

              {/* Kolom Kanan: Rincian Angka Keuangan */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1 font-medium">
                {subtotalTindakan > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Jasa & Tindakan:</span>
                    <span className="font-mono">Rp {subtotalTindakan.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {subtotalObat > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Farmasi / Obat:</span>
                    <span className="font-mono">Rp {subtotalObat.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {subtotalAlkes > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Alkes & BMHP:</span>
                    <span className="font-mono">Rp {subtotalAlkes.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {subtotalBarang > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Pakan & Nutrisi:</span>
                    <span className="font-mono">Rp {subtotalBarang.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="border-t border-slate-300 pt-1 flex justify-between font-bold text-slate-800">
                  <span>Subtotal:</span>
                  <span className="font-mono">Rp {grandSubtotal.toLocaleString('id-ID')}</span>
                </div>

                {customDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Diskon / Potongan:</span>
                    <span className="font-mono">- Rp {customDiscount.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">GRAND TOTAL:</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    Rp {finalGrandTotal.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 pt-0.5 flex justify-between">
                  <span>Metode: <strong className="text-slate-700">{transaksi?.metodePembayaran || 'Tunai / QRIS'}</strong></span>
                  <span>Status: <strong className="text-emerald-700">{transaksi?.status || rekamMedis.statusPembayaran || 'Lunas'}</strong></span>
                </div>
              </div>
            </div>

            {/* 5. TANDA TANGAN & PENGESAHAN (Signatures) */}
            <div className="pt-2 border-t border-slate-300 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-700">
              <div>
                <p className="text-slate-500">Pemilik Pasien,</p>
                <div className="h-14 flex items-end justify-center">
                  <span className="font-bold text-slate-900 border-b border-slate-400 pb-0.5 px-4">
                    {pasien?.namaOwner || 'Owner / Klien'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-slate-500">Kasir / Bagian Administrasi,</p>
                <div className="h-14 flex items-end justify-center">
                  <span className="font-bold text-slate-900 border-b border-slate-400 pb-0.5 px-4">
                    {transaksi?.kasirId ? 'Petugas Kasir' : 'Kasir Poliklinik'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-slate-500">Tanggal: {rekamMedis.tanggal}</p>
                <p className="text-slate-500">Dokter Hewan Pemeriksa,</p>
                <div className="h-14 flex items-end justify-center">
                  <span className="font-bold text-slate-900 border-b border-slate-400 pb-0.5 px-2">
                    {dokter?.nama || normKlinik.namaPenanggungJawab || 'drh. Penanggung Jawab'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">SIP: {dokter?.sip || '503/SIP-KH/2026'}</p>
              </div>
            </div>

            {/* 6. FOOTER WATERMARK */}
            <div className="mt-3 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400">
              Dokumen ini diterbitkan secara resmi oleh SIM-Klinik Hewan {normKlinik.namaKlinik}. Terima kasih atas kunjungan Anda.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
