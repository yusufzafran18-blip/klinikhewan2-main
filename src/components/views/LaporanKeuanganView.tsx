import React, { useState } from 'react';
import { Transaksi } from '../../types';
import { LineChart, FileSpreadsheet, CreditCard, DollarSign, ArrowUpRight, TrendingUp } from 'lucide-react';
import { exportToExcel } from '../../services/excel';

interface LaporanKeuanganViewProps {
  transaksiList: Transaksi[];
  onNavigateToLaba?: () => void;
}

export const LaporanKeuanganView: React.FC<LaporanKeuanganViewProps> = ({
  transaksiList = [],
  onNavigateToLaba,
}) => {
  const lunasTrx = transaksiList.filter((t) => t.status === 'Lunas');
  
  const totalOmzet = lunasTrx.reduce((acc, t) => acc + t.grandTotal, 0);
  const totalDiskon = lunasTrx.reduce((acc, t) => acc + t.diskon, 0);

  const handleExportExcel = () => {
    const data = lunasTrx.map((t) => ({
      'No. Nota': t.noNota,
      'Tanggal': t.tanggal,
      'Pelanggan': t.namaPelanggan,
      'Tipe Transaksi': t.typeTransaksi,
      'Subtotal': t.subtotal,
      'Diskon': t.diskon,
      'Grand Total': t.grandTotal,
      'Metode Bayar': t.metodePembayaran,
    }));
    exportToExcel(data, 'Laporan_Keuangan_Pendapatan_VetCare');
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <LineChart className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Laporan Keuangan & Rekapitulasi Kas</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Laporan omzet transaksi berobat, petshop, dan rekapitulasi pembayaran</p>
        </div>

        <div className="flex items-center space-x-2">
          {onNavigateToLaba && (
            <button
              onClick={onNavigateToLaba}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center space-x-1.5 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Laporan Laba Penjualan</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel Keuangan</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Pendapatan (Omzet)</span>
          <p className="text-2xl font-black text-slate-900 mt-2">Rp {(totalOmzet || 0).toLocaleString('id-ID')}</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center"><ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> Laporan Realtime</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Transaksi Lunas</span>
          <p className="text-2xl font-black text-indigo-700 mt-2">{lunasTrx.length} Nota</p>
          <p className="text-[11px] text-slate-400 mt-1">Tersimpan di sistem</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Diskon Diberikan</span>
          <p className="text-2xl font-black text-rose-600 mt-2">Rp {(totalDiskon || 0).toLocaleString('id-ID')}</p>
          <p className="text-[11px] text-slate-400 mt-1">Potongan harga promo</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800">
          Rincian Transaksi Masuk
        </div>
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
            <tr>
              <th className="p-4">No. Nota & Tgl</th>
              <th className="p-4">Nama Pelanggan</th>
              <th className="p-4">Subtotal</th>
              <th className="p-4">Diskon</th>
              <th className="p-4">Grand Total</th>
              <th className="p-4">Metode Bayar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lunasTrx.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/80">
                <td className="p-4 font-bold text-slate-800">{t.noNota} <span className="text-[10px] text-slate-400 font-normal block">{t.tanggal}</span></td>
                <td className="p-4">{t.namaPelanggan}</td>
                <td className="p-4">Rp {(t.subtotal || 0).toLocaleString('id-ID')}</td>
                <td className="p-4 text-rose-600 font-bold">Rp {(t.diskon || 0).toLocaleString('id-ID')}</td>
                <td className="p-4 font-black text-indigo-700">Rp {(t.grandTotal || 0).toLocaleString('id-ID')}</td>
                <td className="p-4 font-bold">{t.metodePembayaran}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
