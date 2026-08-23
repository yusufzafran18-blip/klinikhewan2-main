import React, { useState } from 'react';
import { Transaksi, RekamMedis, RawatInap, Pasien, DataKlinik, AppSettings, User } from '../../types';
import {
  CreditCard, Search, Printer, AlertTriangle, CheckCircle,
  XCircle, FileSpreadsheet, RotateCcw, ShieldAlert, DollarSign, FileText
} from 'lucide-react';
import { ThermalReceiptModal } from '../common/ThermalReceiptModal';
import { InpatientA4ReceiptModal } from '../common/InpatientA4ReceiptModal';
import { exportToExcel } from '../../services/excel';

interface KasirViewProps {
  transaksiList: Transaksi[];
  rekamMedisList: RekamMedis[];
  rawatInapList: RawatInap[];
  pasienList: Pasien[];
  klinik: DataKlinik;
  settings: AppSettings;
  activeUser: User;
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
  onSaveTransaksi,
  onVoidTransaksi,
}) => {
  const [selectedRMForPay, setSelectedRMForPay] = useState<RekamMedis | null>(null);
  const [printingTrx, setPrintingTrx] = useState<Transaksi | null>(null);
  const [printingInapA4Trx, setPrintingInapA4Trx] = useState<Transaksi | null>(null);
  const [showVoidModal, setShowVoidModal] = useState<string | null>(null);
  const [alasanBatal, setAlasanBatal] = useState('');

  // Payment Form States
  const [diskon, setDiskon] = useState(0);
  const [metodePembayaran, setMetodePembayaran] = useState<'Tunai' | 'Transfer QRIS' | 'Debit/Kredit' | 'E-Wallet'>('Transfer QRIS');
  const [jumlahBayar, setJumlahBayar] = useState<number>(0);

  // Unpaid Medical Records
  const unpaidRMList = rekamMedisList.filter((rm) => rm.statusPembayaran === 'Belum Lunas');

  const handleSelectRM = (rm: RekamMedis) => {
    setSelectedRMForPay(rm);
    setDiskon(0);
    setJumlahBayar(rm.totalBiaya);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRMForPay) return;

    const pasien = pasienList.find((p) => p.id === selectedRMForPay.pasienId);
    const count = transaksiList.length + 1;
    const noNota = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(count).padStart(3, '0')}`;

    const subtotal = selectedRMForPay.totalBiaya;
    const grandTotal = Math.max(0, subtotal - diskon);
    const kembalian = Math.max(0, jumlahBayar - grandTotal);

    // Build line items
    const items = [
      ...selectedRMForPay.plan.tindakanList.map((t, idx) => ({
        id: 'ti-' + idx,
        jenis: 'Tindakan' as const,
        namaItem: t.namaTindakan,
        jumlah: 1,
        hargaSatuan: t.tarif,
        subtotal: t.tarif,
      })),
      ...selectedRMForPay.plan.resepList.map((r, idx) => ({
        id: 'ri-' + idx,
        jenis: 'Obat' as const,
        namaItem: `${r.namaBarang} (${r.dosis})`,
        jumlah: r.jumlah,
        hargaSatuan: r.hargaSatuan,
        subtotal: r.subtotal,
      })),
      ...selectedRMForPay.plan.racikanList.map((rac, idx) => ({
        id: 'rac-' + idx,
        jenis: 'Obat Racikan' as const,
        namaItem: rac.namaRacikan,
        jumlah: 1,
        hargaSatuan: rac.totalHarga,
        subtotal: rac.totalHarga,
      }))
    ];

    const newTrx: Transaksi = {
      id: 'trx-' + Date.now(),
      noNota,
      tanggal: new Date().toISOString().replace('T', ' ').slice(0, 16),
      rekamMedisId: selectedRMForPay.id,
      pasienId: selectedRMForPay.pasienId,
      namaPelanggan: `${pasien?.namaOwner || 'Owner'} (${pasien?.namaHewan || 'Anabul'})`,
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Kasir POS Pembayaran & Cetak Nota</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Proses tagihan rekam medis, cetak nota printer thermal 58mm / 80mm, & pembatalan transaksi</p>
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
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tagihan RM Belum Lunas ({unpaidRMList.length})</h3>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {unpaidRMList.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">Semua tagihan rekam medis telah lunas terbayar.</p>
            ) : (
              unpaidRMList.map((rm) => {
                const pasien = pasienList.find((p) => p.id === rm.pasienId);
                const isSelected = selectedRMForPay?.id === rm.id;

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
                      <span className="text-xs font-black text-indigo-700">Rp {(rm.totalBiaya || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
                      <span>{rm.noRM}</span>
                      <span>Tgl: {rm.tanggal}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment Form Column */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          {!selectedRMForPay ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
              <CreditCard className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs font-semibold">Pilih salah satu tagihan berobat di sebelah kiri untuk diproses kasir.</p>
            </div>
          ) : (
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Proses Pembayaran Kasir</h3>
                  <p className="text-xs text-slate-500">No. RM: {selectedRMForPay.noRM}</p>
                </div>
                <span className="text-lg font-black text-indigo-700">
                  Rp {(selectedRMForPay.totalBiaya || 0).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Rincian Item Tagihan */}
              <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-slate-700 mb-1">Rincian Komponen Biaya Medis:</p>
                {(selectedRMForPay.plan?.tindakanList || []).map((t, i) => (
                  <div key={i} className="flex justify-between text-slate-600">
                    <span>• {t.namaTindakan}</span>
                    <span className="font-semibold">Rp {(t.tarif || 0).toLocaleString('id-ID')}</span>
                  </div>
                ))}
                {(selectedRMForPay.plan?.resepList || []).map((r, i) => (
                  <div key={i} className="flex justify-between text-slate-600">
                    <span>• {r.namaBarang} ({r.jumlah} x Rp {(r.hargaSatuan || 0).toLocaleString('id-ID')})</span>
                    <span className="font-semibold">Rp {(r.subtotal || 0).toLocaleString('id-ID')}</span>
                  </div>
                ))}
                {(selectedRMForPay.plan?.racikanList || []).map((rac, i) => (
                  <div key={i} className="flex justify-between text-slate-600">
                    <span>• {rac.namaRacikan} ({rac.jumlahBungkus} Bks)</span>
                    <span className="font-semibold">Rp {(rac.totalHarga || 0).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

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
                    Rp {Math.max(0, jumlahBayar - ((selectedRMForPay.totalBiaya || 0) - diskon)).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedRMForPay(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Bayar & Cetak Nota Thermal</span>
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
          <span className="text-xs text-slate-400">Thermal 58mm / 80mm Support</span>
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
                    <td className="p-4"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">{trx.typeTransaksi}</span></td>
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

                        {(trx.typeTransaksi === 'Rawat Inap' || trx.rawatInapId || true) && (
                          <button
                            onClick={() => setPrintingInapA4Trx(trx)}
                            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-all"
                            title="Cetak Nota Rincian Inap A4 / F4"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Nota A4/F4</span>
                          </button>
                        )}

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
          const matchedInap = rawatInapList.find(
            (inap) => inap.id === printingInapA4Trx.rawatInapId || inap.pasienId === printingInapA4Trx.pasienId
          ) || {
            id: printingInapA4Trx.rawatInapId || 'inap-trx-' + printingInapA4Trx.id,
            pasienId: printingInapA4Trx.pasienId || '',
            noKandang: 'Kandang Rawat Inap Utama',
            tanggalMasuk: printingInapA4Trx.tanggal,
            tanggalKeluarAktif: printingInapA4Trx.tanggal,
            dokterPenanggungJawabId: '',
            diagnosaInap: 'Perawatan Medis Rawat Inap',
            tarifPerHari: 100000,
            status: 'Selesai / Pulang' as const,
            monitoringLogs: [],
          };

          return (
            <InpatientA4ReceiptModal
              rawatInap={matchedInap}
              pasien={pasienList.find((p) => p.id === printingInapA4Trx.pasienId)}
              dokter={undefined}
              klinik={klinik}
              rekamMedisList={rekamMedisList}
              transaksi={printingInapA4Trx}
              onClose={() => setPrintingInapA4Trx(null)}
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
