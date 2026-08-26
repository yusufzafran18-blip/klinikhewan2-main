import React, { useState } from 'react';
import { Transaksi, RekamMedis, RawatInap, Pasien, DataKlinik, AppSettings, User, ResepItem, AlkesUsageItem, TindakanMedisItem, Barang, Tindakan } from '../../types';
import {
  CreditCard, Search, Printer, AlertTriangle, CheckCircle,
  XCircle, FileSpreadsheet, RotateCcw, ShieldAlert, DollarSign, FileText,
  BedDouble, Stethoscope, Pill, Syringe, Package, Receipt
} from 'lucide-react';
import { ThermalReceiptModal } from '../common/ThermalReceiptModal';
import { InpatientA4ReceiptModal } from '../common/InpatientA4ReceiptModal';
import { OutpatientA4ReceiptModal } from '../common/OutpatientA4ReceiptModal';
import { exportToExcel } from '../../services/excel';

interface KasirViewProps {
  transaksiList: Transaksi[];
  rekamMedisList: RekamMedis[];
  rawatInapList: RawatInap[];
  pasienList: Pasien[];
  klinik: DataKlinik;
  settings: AppSettings;
  activeUser: User;
  barangList?: Barang[];
  tindakanList?: Tindakan[];
  onSaveRawatInap?: (inap: RawatInap) => void | Promise<void>;
  onSaveRekamMedis?: (rm: RekamMedis) => void | Promise<void>;
  onUseInventory?: (items: { barangId?: string; nama?: string; jumlah: number }[], options?: any) => Promise<boolean | void> | boolean | void;
  onRevertInventory?: (items: { barangId?: string; nama?: string; jumlah: number }[], options?: any) => Promise<boolean | void> | boolean | void;
  onSaveTransaksi: (trx: Transaksi) => void | Promise<void>;
  onVoidTransaksi: (id: string, alasan: string, user: string) => void;
}

export const KasirView: React.FC<KasirViewProps> = ({
  transaksiList = [],
  rekamMedisList = [],
  rawatInapList = [],
  pasienList = [],
  klinik,
  settings,
  activeUser,
  barangList = [],
  tindakanList = [],
  onSaveRawatInap,
  onSaveRekamMedis,
  onUseInventory,
  onRevertInventory,
  onSaveTransaksi,
  onVoidTransaksi,
}) => {
  const [activeBillTab, setActiveBillTab] = useState<'rm' | 'inap'>('rm');
  const [selectedRMForPay, setSelectedRMForPay] = useState<RekamMedis | null>(null);
  const [selectedInapForPay, setSelectedInapForPay] = useState<RawatInap | null>(null);
  const [printingTrx, setPrintingTrx] = useState<Transaksi | null>(null);
  const [printingInapA4Trx, setPrintingInapA4Trx] = useState<{ trx?: Transaksi; inap?: RawatInap } | null>(null);
  const [printingOutpatientA4Trx, setPrintingOutpatientA4Trx] = useState<{ trx?: Transaksi; rm?: RekamMedis } | null>(null);
  const [showVoidModal, setShowVoidModal] = useState<string | null>(null);
  const [alasanBatal, setAlasanBatal] = useState('');

  // Payment Form States
  const [diskon, setDiskon] = useState(0);
  const [metodePembayaran, setMetodePembayaran] = useState<'Tunai' | 'Transfer QRIS' | 'Debit/Kredit' | 'E-Wallet'>('Transfer QRIS');
  const [jumlahBayar, setJumlahBayar] = useState<number>(0);

  // Helper calculate Inpatient stay days
  const calculateInapDays = (tanggalMasuk: string, tanggalKeluar?: string) => {
    const masuk = new Date(tanggalMasuk);
    const keluar = tanggalKeluar ? new Date(tanggalKeluar) : new Date();
    const diff = Math.ceil((keluar.getTime() - masuk.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, isNaN(diff) ? 1 : diff);
  };

  // Helper compute Inpatient total
  const computeInapTotal = (inap: RawatInap) => {
    const days = calculateInapDays(inap.tanggalMasuk, inap.tanggalKeluarAktif);
    const sewaKandang = days * (inap.tarifPerHari || 100000);
    const obatTotal = (inap.pemberianObatList || []).reduce((s, it) => s + (it.subtotal ?? (it.hargaSatuan || 0) * (it.jumlah || 0)), 0);
    const alkesTotal = (inap.penggunaanAlkesList || []).reduce((s, it) => s + (it.subtotal ?? (it.hargaSatuan || 0) * (it.jumlah || 0)), 0);
    const barangTotal = (inap.pemakaianBarangList || []).reduce((s, it) => s + (it.subtotal ?? (it.hargaSatuan || 0) * (it.jumlah || 0)), 0);
    const tindakanTotal = (inap.tindakanMedisList || []).reduce((s, it) => s + (it.subtotal ?? (it.hargaSatuan || 0) * (it.jumlah || 0)), 0);
    const extra = inap.biayaTambahan || 0;
    return {
      days,
      sewaKandang,
      obatTotal,
      alkesTotal,
      barangTotal,
      tindakanTotal,
      extra,
      total: sewaKandang + obatTotal + alkesTotal + barangTotal + tindakanTotal + extra,
    };
  };

  // Helper compute Outpatient / Rekam Medis total
  const computeRMTotal = (rm: RekamMedis) => {
    const tindakanTotal = (rm.plan?.tindakanList || []).reduce(
      (s, it) => s + Number(it.tarif || (it as any).hargaSatuan || (it as any).biaya || (it as any).subtotal || 0),
      0
    );
    const obatTotal = (rm.plan?.resepList || []).reduce(
      (s, it) => s + Number(it.subtotal ?? ((it.hargaSatuan || 0) * (it.jumlah || 0))),
      0
    );
    const racikanTotal = (rm.plan?.racikanList || []).reduce(
      (s, it) => s + Number(it.totalHarga || 0),
      0
    );
    const alkesTotal = (rm.plan?.penggunaanAlkesList || []).reduce(
      (s, it) => s + Number(it.subtotal ?? ((it.hargaSatuan || 0) * (it.jumlah || 0))),
      0
    );
    const barangTotal = (rm.plan?.pemakaianBarangList || []).reduce(
      (s, it) => s + Number(it.subtotal ?? ((it.hargaSatuan || 0) * (it.jumlah || 0))),
      0
    );

    const nonTindakanTotal = obatTotal + racikanTotal + alkesTotal + barangTotal;
    const effectiveTindakanTotal = (tindakanTotal === 0 && (!rm.plan?.tindakanList || rm.plan.tindakanList.length === 0) && Number(rm.totalBiaya || 0) > nonTindakanTotal)
      ? Number(rm.totalBiaya) - nonTindakanTotal
      : tindakanTotal;

    const total = effectiveTindakanTotal + nonTindakanTotal;
    return {
      tindakanTotal: effectiveTindakanTotal,
      obatTotal,
      racikanTotal,
      alkesTotal,
      barangTotal,
      total: total > 0 ? total : Number(rm.totalBiaya || 0),
    };
  };

  // Unpaid Medical Records
  const unpaidRMList = rekamMedisList.filter((rm) => rm.statusPembayaran === 'Belum Lunas');

  // Unpaid Inpatient Bills (Aktif or Selesai with Belum Lunas and not already paid in transaksiList)
  const unpaidInapList = rawatInapList.filter((inap) => {
    const hasPaidTrx = transaksiList.some((t) => t.rawatInapId === inap.id && t.status === 'Lunas');
    return !hasPaidTrx && inap.statusPembayaran !== 'Lunas' && inap.status !== 'Dibatalkan';
  });

  const handleSelectRM = (rm: RekamMedis) => {
    setSelectedRMForPay(rm);
    setSelectedInapForPay(null);
    setDiskon(0);
    const bill = computeRMTotal(rm);
    setJumlahBayar(bill.total);
  };

  const handleSelectInap = (inap: RawatInap) => {
    setSelectedInapForPay(inap);
    setSelectedRMForPay(null);
    setDiskon(0);
    const bill = computeInapTotal(inap);
    setJumlahBayar(bill.total);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRMForPay && !selectedInapForPay) return;

    const count = transaksiList.length + 1;
    const noNota = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(count).padStart(3, '0')}`;

    if (selectedRMForPay) {
      const pasien = pasienList.find((p) => p.id === selectedRMForPay.pasienId);
      const rmBill = computeRMTotal(selectedRMForPay);
      const subtotal = rmBill.total;
      const grandTotal = Math.max(0, subtotal - diskon);
      const kembalian = Math.max(0, jumlahBayar - grandTotal);

      // Build comprehensive line items for RM
      const effectiveTindakanItems = (selectedRMForPay.plan?.tindakanList && selectedRMForPay.plan.tindakanList.length > 0)
        ? selectedRMForPay.plan.tindakanList.map((t, idx) => ({
            id: 'ti-' + (t.tindakanId || idx),
            jenis: 'Tindakan' as const,
            namaItem: `[Jasa Pelayanan] ${t.namaTindakan}`,
            jumlah: 1,
            hargaSatuan: Number(t.tarif || 0),
            subtotal: Number(t.tarif || 0),
          }))
        : (rmBill.tindakanTotal > 0 ? [{
            id: 'ti-default',
            jenis: 'Tindakan' as const,
            namaItem: '[Jasa Pelayanan] Pemeriksaan & Konsultasi Dokter',
            jumlah: 1,
            hargaSatuan: rmBill.tindakanTotal,
            subtotal: rmBill.tindakanTotal,
          }] : []);

      const items = [
        ...effectiveTindakanItems,
        ...(selectedRMForPay.plan?.resepList || []).map((r, idx) => ({
          id: 'ri-' + idx,
          jenis: 'Obat' as const,
          namaItem: `${r.namaBarang} (${r.dosis})`,
          jumlah: Number(r.jumlah || 1),
          hargaSatuan: Number(r.hargaSatuan || 0),
          subtotal: Number(r.subtotal ?? ((r.hargaSatuan || 0) * (r.jumlah || 1))),
        })),
        ...(selectedRMForPay.plan?.racikanList || []).map((rac, idx) => ({
          id: 'rac-' + idx,
          jenis: 'Obat Racikan' as const,
          namaItem: rac.namaRacikan,
          jumlah: 1,
          hargaSatuan: Number(rac.totalHarga || 0),
          subtotal: Number(rac.totalHarga || 0),
        })),
        ...(selectedRMForPay.plan?.penggunaanAlkesList || []).map((a, idx) => ({
          id: 'alkes-' + idx,
          jenis: 'Alkes' as const,
          namaItem: `${a.namaAlkes} (${a.satuan || 'Pcs'})`,
          jumlah: Number(a.jumlah || 1),
          hargaSatuan: Number(a.hargaSatuan || 0),
          subtotal: Number(a.subtotal ?? ((a.hargaSatuan || 0) * (a.jumlah || 1))),
        })),
        ...(selectedRMForPay.plan?.pemakaianBarangList || []).map((b, idx) => ({
          id: 'brg-' + idx,
          jenis: 'Barang' as const,
          namaItem: b.namaBarang,
          jumlah: Number(b.jumlah || 1),
          hargaSatuan: Number(b.hargaSatuan || 0),
          subtotal: Number(b.subtotal ?? ((b.hargaSatuan || 0) * (b.jumlah || 1))),
        })),
      ];

      const newTrx: Transaksi = {
        id: 'trx-' + Date.now(),
        noNota,
        tanggal: new Date().toISOString().replace('T', ' ').slice(0, 16),
        rekamMedisId: selectedRMForPay.id,
        pasienId: selectedRMForPay.pasienId,
        namaPelanggan: `${pasien?.namaOwner || 'Owner'} (${pasien?.namaHewan || 'Pasien'})`,
        typeTransaksi: 'Rekam Medis',
        items,
        subtotal,
        diskon,
        pajak: 0,
        grandTotal,
        metodePembayaran,
        jumlahBayar,
        kembalian,
        status: 'Lunas',
        kasirId: activeUser.id,
      };

      await onSaveTransaksi(newTrx);
      setSelectedRMForPay(null);
      setPrintingTrx(newTrx);
    } else if (selectedInapForPay) {
      const pasien = pasienList.find((p) => p.id === selectedInapForPay.pasienId);
      const bill = computeInapTotal(selectedInapForPay);
      const subtotal = bill.total;
      const grandTotal = Math.max(0, subtotal - diskon);
      const kembalian = Math.max(0, jumlahBayar - grandTotal);

      // Build comprehensive line items for Inpatient
      const items = [
        {
          id: 'inap-sewa-1',
          jenis: 'Tindakan' as const,
          namaItem: `Sewa Kandang & Monitoring (${selectedInapForPay.noKandang} - ${bill.days} Hari)`,
          jumlah: bill.days,
          hargaSatuan: selectedInapForPay.tarifPerHari || 100000,
          subtotal: bill.sewaKandang,
        },
        ...(selectedInapForPay.pemberianObatList || []).map((o, idx) => ({
          id: `inap-obat-${idx}`,
          jenis: 'Obat' as const,
          namaItem: `${o.namaBarang} (${o.dosis || '-'})`,
          jumlah: o.jumlah,
          hargaSatuan: o.hargaSatuan || 0,
          subtotal: o.subtotal ?? (o.jumlah * (o.hargaSatuan || 0)),
        })),
        ...(selectedInapForPay.penggunaanAlkesList || []).map((a, idx) => ({
          id: `inap-alkes-${idx}`,
          jenis: 'Barang/Pakan' as const,
          namaItem: `${a.namaAlkes} (${a.satuan || 'Pcs'})`,
          jumlah: a.jumlah,
          hargaSatuan: a.hargaSatuan || 0,
          subtotal: a.subtotal ?? (a.jumlah * (a.hargaSatuan || 0)),
        })),
        ...(selectedInapForPay.pemakaianBarangList || []).map((b, idx) => ({
          id: `inap-barang-${idx}`,
          jenis: 'Barang/Pakan' as const,
          namaItem: `${b.namaBarang} (${b.aturanPakai || b.dosis || 'Pakan/Barang Inap'})`,
          jumlah: b.jumlah,
          hargaSatuan: b.hargaSatuan || 0,
          subtotal: b.subtotal ?? (b.jumlah * (b.hargaSatuan || 0)),
        })),
        ...(selectedInapForPay.tindakanMedisList || []).map((t, idx) => ({
          id: `inap-tindakan-${idx}`,
          jenis: 'Tindakan' as const,
          namaItem: t.namaTindakan,
          jumlah: t.jumlah || 1,
          hargaSatuan: t.hargaSatuan || 0,
          subtotal: t.subtotal ?? ((t.jumlah || 1) * (t.hargaSatuan || 0)),
        })),
      ];

      const newTrx: Transaksi = {
        id: 'trx-' + Date.now(),
        noNota,
        tanggal: new Date().toISOString().replace('T', ' ').slice(0, 16),
        rawatInapId: selectedInapForPay.id,
        pasienId: selectedInapForPay.pasienId,
        namaPelanggan: `${pasien?.namaOwner || 'Owner'} (${pasien?.namaHewan || 'Pasien Rawat Inap'})`,
        typeTransaksi: 'Rawat Inap',
        items,
        subtotal,
        diskon,
        pajak: 0,
        grandTotal,
        metodePembayaran,
        jumlahBayar,
        kembalian,
        status: 'Lunas',
        kasirId: activeUser.id,
      };

      await onSaveTransaksi(newTrx);
      setSelectedInapForPay(null);
      setPrintingTrx(newTrx);
    }
  };

  const handleVoidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showVoidModal) return;
    if (!alasanBatal) return alert('Silakan masukkan alasan pembatalan!');

    onVoidTransaksi(showVoidModal, alasanBatal, activeUser.nama);
    setShowVoidModal(null);
    setAlasanBatal('');
  };

  const handleExportExcel = () => {
    const data = transaksiList.map((t) => ({
      'No. Nota': t.noNota,
      'Tanggal': t.tanggal,
      'Pelanggan': t.namaPelanggan,
      'Tipe': t.typeTransaksi,
      'Subtotal': t.subtotal,
      'Diskon': t.diskon,
      'Grand Total': t.grandTotal,
      'Metode': t.metodePembayaran,
      'Status': t.status,
      'Kasir': t.kasirId,
    }));
    exportToExcel(data, 'Laporan_Kasir_Transaksi_VetCare');
  };

  const currentBillTotal = selectedRMForPay
    ? computeRMTotal(selectedRMForPay).total
    : selectedInapForPay
    ? computeInapTotal(selectedInapForPay).total
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Kasir POS Pembayaran & Cetak Nota</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Proses tagihan Rawat Jalan & Rawat Inap (Sewa kandang, obat, alkes, pakan, tindakan) serta cetak nota Thermal & A4/F4
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 flex items-center space-x-1.5"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel Transaksi</span>
        </button>
      </div>

      {/* Grid: Unpaid Invoices & Form Bayar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pending Bills Column */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-full">
              <button
                type="button"
                onClick={() => setActiveBillTab('rm')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                  activeBillTab === 'rm'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Rawat Jalan ({unpaidRMList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveBillTab('inap')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                  activeBillTab === 'inap'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Rawat Inap ({unpaidInapList.length})
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {activeBillTab === 'rm' ? (
              unpaidRMList.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">Semua tagihan rekam medis telah lunas terbayar.</p>
              ) : (
                unpaidRMList.map((rm) => {
                  const pasien = pasienList.find((p) => p.id === rm.pasienId);
                  const isSelected = selectedRMForPay?.id === rm.id;
                  const bill = computeRMTotal(rm);

                  return (
                    <div
                      key={rm.id}
                      onClick={() => handleSelectRM(rm)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200'
                          : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-extrabold text-xs text-slate-800">{pasien?.namaHewan} ({pasien?.jenisHewan})</p>
                          <p className="text-[11px] text-slate-500">Owner: {pasien?.namaOwner}</p>
                        </div>
                        <span className="text-xs font-black text-indigo-700">Rp {bill.total.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
                        <span>{rm.noRM}</span>
                        <span>Tgl: {rm.tanggal}</span>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              unpaidInapList.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">Tidak ada tagihan rawat inap yang belum dibayar.</p>
              ) : (
                unpaidInapList.map((inap) => {
                  const pasien = pasienList.find((p) => p.id === inap.pasienId);
                  const bill = computeInapTotal(inap);
                  const isSelected = selectedInapForPay?.id === inap.id;

                  return (
                    <div
                      key={inap.id}
                      onClick={() => handleSelectInap(inap)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200'
                          : 'bg-slate-50 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                              {inap.noKandang}
                            </span>
                            <span className="text-[10px] text-slate-500">{bill.days} Hari</span>
                          </div>
                          <p className="font-extrabold text-xs text-slate-800 mt-1">{pasien?.namaHewan} ({pasien?.jenisHewan})</p>
                          <p className="text-[11px] text-slate-500">Owner: {pasien?.namaOwner}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-amber-700">Rp {bill.total.toLocaleString('id-ID')}</span>
                          <span className="block text-[9px] text-slate-400 mt-0.5">{inap.status}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
                        <span>Masuk: {inap.tanggalMasuk}</span>
                        <span className="text-indigo-600 font-semibold">{inap.diagnosaInap}</span>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Payment Form Column */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          {!selectedRMForPay && !selectedInapForPay ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
              <CreditCard className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs font-semibold">Pilih salah satu tagihan rawat jalan / rawat inap di sebelah kiri untuk diproses kasir.</p>
            </div>
          ) : (
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                    {selectedRMForPay ? (
                      <>
                        <Stethoscope className="w-4 h-4 text-indigo-600" />
                        <span>Proses Pembayaran Rawat Jalan (No. RM: {selectedRMForPay.noRM})</span>
                      </>
                    ) : (
                      <>
                        <BedDouble className="w-4 h-4 text-amber-600" />
                        <span>Proses Pembayaran Rawat Inap ({selectedInapForPay?.noKandang})</span>
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pasien: {pasienList.find((p) => p.id === (selectedRMForPay?.pasienId || selectedInapForPay?.pasienId))?.namaHewan} —
                    Owner: {pasienList.find((p) => p.id === (selectedRMForPay?.pasienId || selectedInapForPay?.pasienId))?.namaOwner}
                  </p>
                </div>
                <span className="text-lg font-black text-indigo-700">
                  Rp {currentBillTotal.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Rincian Item Tagihan */}
              {selectedRMForPay && (() => {
                const rmBill = computeRMTotal(selectedRMForPay);
                return (
                  <div className="bg-slate-50 p-3.5 rounded-xl space-y-2.5 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                      <p className="font-bold text-slate-800">Rincian Komponen Biaya Rawat Jalan:</p>
                      <span className="font-extrabold text-indigo-700">Total: Rp {rmBill.total.toLocaleString('id-ID')}</span>
                    </div>

                    {/* Jasa Pelayanan & Tindakan Medis */}
                    {(selectedRMForPay.plan?.tindakanList && selectedRMForPay.plan.tindakanList.length > 0) ? (
                      selectedRMForPay.plan.tindakanList.map((t, i) => (
                        <div key={'t-' + i} className="flex justify-between text-indigo-900 font-medium">
                          <span className="flex items-center space-x-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>[Jasa Pelayanan] {t.namaTindakan}</span>
                          </span>
                          <span className="font-semibold font-mono">Rp {(Number(t.tarif) || 0).toLocaleString('id-ID')}</span>
                        </div>
                      ))
                    ) : (
                      rmBill.tindakanTotal > 0 && (
                        <div className="flex justify-between text-indigo-900 font-medium">
                          <span className="flex items-center space-x-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>[Jasa Pelayanan] Pemeriksaan & Konsultasi Dokter</span>
                          </span>
                          <span className="font-semibold font-mono">Rp {rmBill.tindakanTotal.toLocaleString('id-ID')}</span>
                        </div>
                      )
                    )}

                    {/* Resep Obat */}
                    {(selectedRMForPay.plan?.resepList || []).map((r, i) => (
                      <div key={'r-' + i} className="flex justify-between text-emerald-800">
                        <span className="flex items-center space-x-1.5">
                          <Pill className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>[Obat] {r.namaBarang} ({r.jumlah} x Rp {(r.hargaSatuan || 0).toLocaleString('id-ID')})</span>
                        </span>
                        <span className="font-semibold">Rp {(r.subtotal ?? ((r.hargaSatuan || 0) * (r.jumlah || 0))).toLocaleString('id-ID')}</span>
                      </div>
                    ))}

                    {/* Obat Racikan */}
                    {(selectedRMForPay.plan?.racikanList || []).map((rac, i) => (
                      <div key={'rac-' + i} className="flex justify-between text-teal-800">
                        <span className="flex items-center space-x-1.5">
                          <Pill className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>[Racikan] {rac.namaRacikan} ({rac.jumlahBungkus} Bks)</span>
                        </span>
                        <span className="font-semibold">Rp {(rac.totalHarga || 0).toLocaleString('id-ID')}</span>
                      </div>
                    ))}

                    {/* Penggunaan Alkes & BMHP */}
                    {(selectedRMForPay.plan?.penggunaanAlkesList || []).map((a, i) => (
                      <div key={'alkes-' + i} className="flex justify-between text-amber-800">
                        <span className="flex items-center space-x-1.5">
                          <Syringe className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>[Alkes] {a.namaAlkes} ({a.jumlah} {a.satuan || 'Pcs'} x Rp {(a.hargaSatuan || 0).toLocaleString('id-ID')})</span>
                        </span>
                        <span className="font-semibold">Rp {(a.subtotal ?? ((a.hargaSatuan || 0) * (a.jumlah || 0))).toLocaleString('id-ID')}</span>
                      </div>
                    ))}

                    {/* Pemakaian Barang / Pakan */}
                    {(selectedRMForPay.plan?.pemakaianBarangList || []).map((b, i) => (
                      <div key={'brg-' + i} className="flex justify-between text-sky-800">
                        <span className="flex items-center space-x-1.5">
                          <Package className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span>[Pakan/Barang] {b.namaBarang} ({b.jumlah} x Rp {(b.hargaSatuan || 0).toLocaleString('id-ID')})</span>
                        </span>
                        <span className="font-semibold">Rp {(b.subtotal ?? ((b.hargaSatuan || 0) * (b.jumlah || 0))).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {selectedInapForPay && (() => {
                const bill = computeInapTotal(selectedInapForPay);
                return (
                  <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
                    <p className="font-bold text-slate-700 mb-1">Rincian Komponen Biaya Rawat Inap:</p>
                    
                    {/* Sewa Kandang */}
                    <div className="flex justify-between text-slate-600">
                      <span>• Sewa Kandang & Perawatan ({bill.days} Hari x Rp {(selectedInapForPay.tarifPerHari || 100000).toLocaleString('id-ID')})</span>
                      <span className="font-semibold">Rp {bill.sewaKandang.toLocaleString('id-ID')}</span>
                    </div>

                    {/* Obat */}
                    {(selectedInapForPay.pemberianObatList || []).map((o, i) => (
                      <div key={i} className="flex justify-between text-emerald-800">
                        <span>• [Obat] {o.namaBarang} ({o.jumlah} x Rp {(o.hargaSatuan || 0).toLocaleString('id-ID')})</span>
                        <span className="font-semibold">Rp {(o.subtotal ?? (o.jumlah * (o.hargaSatuan || 0))).toLocaleString('id-ID')}</span>
                      </div>
                    ))}

                    {/* Alkes */}
                    {(selectedInapForPay.penggunaanAlkesList || []).map((a, i) => (
                      <div key={i} className="flex justify-between text-amber-800">
                        <span>• [Alkes] {a.namaAlkes} ({a.jumlah} {a.satuan || 'Pcs'} x Rp {(a.hargaSatuan || 0).toLocaleString('id-ID')})</span>
                        <span className="font-semibold">Rp {(a.subtotal ?? (a.jumlah * (a.hargaSatuan || 0))).toLocaleString('id-ID')}</span>
                      </div>
                    ))}

                    {/* Barang / Pakan */}
                    {(selectedInapForPay.pemakaianBarangList || []).map((b, i) => (
                      <div key={i} className="flex justify-between text-sky-800">
                        <span>• [Pakan/Barang] {b.namaBarang} ({b.jumlah} x Rp {(b.hargaSatuan || 0).toLocaleString('id-ID')})</span>
                        <span className="font-semibold">Rp {(b.subtotal ?? (b.jumlah * (b.hargaSatuan || 0))).toLocaleString('id-ID')}</span>
                      </div>
                    ))}

                    {/* Tindakan */}
                    {(selectedInapForPay.tindakanMedisList || []).map((t, i) => (
                      <div key={i} className="flex justify-between text-purple-800">
                        <span>• [Tindakan] {t.namaTindakan} ({t.jumlah} x Rp {(t.hargaSatuan || 0).toLocaleString('id-ID')})</span>
                        <span className="font-semibold">Rp {(t.subtotal ?? (t.jumlah * (t.hargaSatuan || 0))).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Input Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Diskon Potongan (Rp)</label>
                  <input
                    type="number"
                    value={diskon}
                    onChange={(e) => setDiskon(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-rose-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={metodePembayaran}
                    onChange={(e) => setMetodePembayaran(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800"
                  >
                    <option value="Transfer QRIS">Transfer QRIS</option>
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="Debit/Kredit">Kartu Debit / Kredit</option>
                    <option value="E-Wallet">E-Wallet (GoPay/OVO/ShopeePay)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jumlah Uang Diterima (Rp)</label>
                  <input
                    type="number"
                    required
                    value={jumlahBayar}
                    onChange={(e) => setJumlahBayar(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-black text-indigo-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kembalian Uang (Rp)</label>
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 font-black text-emerald-700 text-sm">
                    Rp {Math.max(0, jumlahBayar - (currentBillTotal - diskon)).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRMForPay(null);
                    setSelectedInapForPay(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Bayar & Cetak Nota</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>

      {/* Tabel Riwayat Transaksi Kasir & Pembatalan */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Riwayat Transaksi Kasir POS</h3>
          <span className="text-xs text-slate-400">Thermal 58mm / 80mm & A4 / F4 Support</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">No. Nota & Tgl</th>
                <th className="p-4">Nama Pelanggan</th>
                <th className="p-4">Tipe Transaksi</th>
                <th className="p-4">Total Bayar</th>
                <th className="p-4">Metode</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {transaksiList.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Belum ada riwayat transaksi kasir.</td></tr>
              ) : (
                transaksiList.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/80">
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">{trx.noNota}</span>
                      <span className="text-[10px] text-slate-400">{trx.tanggal}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{trx.namaPelanggan}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        trx.typeTransaksi === 'Rawat Inap'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {trx.typeTransaksi}
                      </span>
                    </td>
                    <td className="p-4 font-black text-slate-900">Rp {(trx.grandTotal || 0).toLocaleString('id-ID')}</td>
                    <td className="p-4">{trx.metodePembayaran}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        trx.status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setPrintingTrx(trx)}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-all"
                          title="Cetak Struk Printer Thermal"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Thermal</span>
                        </button>

                        <button
                          onClick={() => {
                            if (trx.typeTransaksi === 'Rekam Medis') {
                              const matchedRM = rekamMedisList.find(
                                (r) => r.id === trx.rekamMedisId || r.pasienId === trx.pasienId
                              );
                              setPrintingOutpatientA4Trx({ trx, rm: matchedRM });
                            } else {
                              const matchedInap = rawatInapList.find(
                                (i) => i.id === trx.rawatInapId || i.pasienId === trx.pasienId
                              );
                              setPrintingInapA4Trx({ trx, inap: matchedInap });
                            }
                          }}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-all"
                          title="Cetak Nota Rincian Biaya A4 / F4"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Nota A4/F4</span>
                        </button>

                        {trx.status === 'Lunas' && (
                          <button
                            onClick={() => setShowVoidModal(trx.id)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Batalkan Transaksi (Void)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

      {/* Modal Cetak Nota A4/F4 Rawat Inap */}
      {printingInapA4Trx && (
        (() => {
          const trx = printingInapA4Trx.trx;
          const matchedInap = printingInapA4Trx.inap || rawatInapList.find(
            (inap) => (trx && inap.id === trx.rawatInapId) || (trx && inap.pasienId === trx.pasienId)
          ) || {
            id: trx?.rawatInapId || 'inap-trx-' + Date.now(),
            pasienId: trx?.pasienId || '',
            noKandang: 'Kandang Rawat Inap',
            tanggalMasuk: trx?.tanggal || new Date().toISOString().slice(0, 10),
            tanggalKeluarAktif: trx?.tanggal || new Date().toISOString().slice(0, 10),
            dokterPenanggungJawabId: '',
            diagnosaInap: 'Perawatan Medis Rawat Inap',
            tarifPerHari: 100000,
            status: 'Selesai / Pulang' as const,
            statusPembayaran: 'Lunas' as const,
            monitoringLogs: [],
            pemberianObatList: [],
            penggunaanAlkesList: [],
            pemakaianBarangList: [],
            tindakanMedisList: [],
          };

          return (
            <InpatientA4ReceiptModal
              rawatInap={matchedInap}
              pasien={pasienList.find((p) => p.id === (trx?.pasienId || matchedInap.pasienId))}
              dokter={undefined}
              klinik={klinik}
              rekamMedisList={rekamMedisList}
              transaksi={trx}
              barangList={barangList}
              tindakanList={tindakanList}
              onSaveRawatInap={onSaveRawatInap}
              onUseInventory={onUseInventory}
              onRevertInventory={onRevertInventory}
              onClose={() => setPrintingInapA4Trx(null)}
            />
          );
        })()
      )}

      {/* Modal Cetak Nota A4/F4 Rawat Jalan */}
      {printingOutpatientA4Trx && (
        (() => {
          const trx = printingOutpatientA4Trx.trx;
          const matchedRM = printingOutpatientA4Trx.rm || rekamMedisList.find(
            (r) => (trx && r.id === trx.rekamMedisId) || (trx && r.pasienId === trx.pasienId)
          ) || {
            id: trx?.rekamMedisId || 'rm-trx-' + Date.now(),
            pasienId: trx?.pasienId || '',
            dokterId: '',
            tanggal: trx?.tanggal?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            noRM: 'RM-TRX',
            subjective: '',
            objective: { beratBadan: 0, suhu: 0 },
            assessment: 'Pemeriksaan Rawat Jalan',
            plan: {
              tindakanList: [],
              resepList: [],
              racikanList: [],
              penggunaanAlkesList: [],
              pemakaianBarangList: [],
            },
            totalBiaya: trx?.subtotal || 0,
            statusPembayaran: 'Lunas' as const,
          };

          return (
            <OutpatientA4ReceiptModal
              rekamMedis={matchedRM}
              pasien={pasienList.find((p) => p.id === (trx?.pasienId || matchedRM.pasienId))}
              dokter={undefined}
              klinik={klinik}
              transaksi={trx}
              barangList={barangList}
              tindakanList={tindakanList}
              onSaveRekamMedis={onSaveRekamMedis}
              onSaveTransaksi={onSaveTransaksi}
              onUseInventory={onUseInventory}
              onRevertInventory={onRevertInventory}
              onClose={() => setPrintingOutpatientA4Trx(null)}
            />
          );
        })()
      )}

      {/* Modal Void Pembatalan Transaksi */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-base pb-3 border-b border-slate-100">
              <ShieldAlert className="w-5 h-5" />
              <span>Pembatalan Transaksi (Void)</span>
            </div>

            <form onSubmit={handleVoidSubmit} className="space-y-4 mt-4 text-xs">
              <p className="text-slate-600">
                Masukkan alasan resmi pembatalan transaksi ini. Pembatalan akan dicatat ke dalam audit log keamanan.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Pembatalan</label>
                <textarea
                  rows={3}
                  required
                  value={alasanBatal}
                  onChange={(e) => setAlasanBatal(e.target.value)}
                  placeholder="Salah input nominal, produk diretur..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowVoidModal(null)} className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 font-bold text-white rounded-xl shadow-md shadow-rose-200">
                  Konfirmasi Batal Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
