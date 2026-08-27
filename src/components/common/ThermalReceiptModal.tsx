import React, { useState, useEffect } from 'react';
import { Transaksi, DataKlinik, AppSettings } from '../../types';
import { Printer, X, MessageSquare } from 'lucide-react';
import { generateWaLink, waTemplates } from '../../services/wa';
import { normalizeClinicProfile } from '../../utils/clinic';

interface ThermalReceiptModalProps {
  transaksi: Transaksi;
  klinik: DataKlinik;
  settings: AppSettings;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  transaksi,
  klinik,
  settings,
  onClose,
}) => {
  klinik = normalizeClinicProfile(klinik);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(settings.printerThermalWidth || '58mm');
  const [isPrinting, setIsPrinting] = useState(false);

  // Allow closing via Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    const prevTitle = document.title;
    document.title = `Nota_${transaksi.noNota || 'Kasir'}_${klinik.namaKlinik}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
      setIsPrinting(false);
    }, 1000);
  };

  const handleSendWA = () => {
    if (transaksi.pasienId) {
      const waText = waTemplates.receiptSummary(transaksi, klinik);
      // fallback phone number
      const phone = '081234567890';
      window.open(generateWaLink(phone, waText), '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Fixed Top Header Control - NEVER gets cropped */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cetak Nota Kasir Thermal</h3>
              <p className="text-xs text-slate-500">Pilih format kertas & cetak langsung</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Toggle 58mm / 80mm */}
          <div className="flex items-center justify-center space-x-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                paperWidth === '58mm'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Thermal 58 mm (Kecil)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                paperWidth === '80mm'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Thermal 80 mm (Standar)
            </button>
          </div>

          {/* Printable Thermal Container Area */}
          <div className="bg-slate-100 p-4 rounded-xl overflow-x-auto flex justify-center">
            <div
              id="thermal-receipt-printable"
              className={`thermal-receipt bg-white font-mono text-[11px] leading-tight text-black p-3 shadow-md border border-slate-300 ${
                paperWidth === '58mm' ? 'w-[230px]' : 'w-[310px]'
              }`}
            >
              {/* Header Nota */}
              <div className="text-center font-bold mb-1 flex flex-col items-center">
                {klinik.logoUrl && (
                  <img
                    src={klinik.logoUrl}
                    alt={klinik.namaKlinik}
                    className="thermal-logo w-14 h-14 object-contain mx-auto mb-1"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                <p className="text-sm font-extrabold uppercase leading-tight">{klinik.namaKlinik}</p>
                <p className="font-normal text-[10px] normal-case leading-tight">{klinik.alamat}</p>
                <p className="font-normal text-[10px] leading-tight">Telp: {klinik.noTelp || (klinik as any).telepon}</p>
              </div>

              <div className="border-b border-dashed border-slate-400 my-2"></div>

              {/* Info Transaksi */}
              <div className="space-y-0.5 text-[10px]">
                <div className="flex gap-2">
                  <span className="w-[68px] shrink-0">No Nota</span><span>: {transaksi.noNota}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-[68px] shrink-0">Tanggal</span><span>: {transaksi.tanggal}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-[68px] shrink-0">Kasir</span><span>: {transaksi.kasirId || '-'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-[68px] shrink-0">Pelanggan</span><span className="truncate">: {transaksi.namaPelanggan}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 my-2"></div>

              {/* Items Table */}
              <div className="space-y-1.5 text-[10px]">
                {(transaksi.items || []).map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="font-semibold break-words">{item.namaItem}</p>
                    <div className="flex justify-between pl-2">
                      <span>{item.jumlah} x Rp {(item.hargaSatuan || 0).toLocaleString('id-ID')}</span>
                      <span className="font-bold text-slate-900">Rp {(item.subtotal || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-b border-dashed border-slate-400 my-2"></div>

              {/* Summary Pricing */}
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rp {(transaksi.subtotal || 0).toLocaleString('id-ID')}</span>
                </div>
                {(transaksi.diskon || 0) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>-Rp {(transaksi.diskon || 0).toLocaleString('id-ID')}</span>
                  </div>
                )}
                {(transaksi.pajak || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Pajak ({settings.pPNPersen}%):</span>
                    <span>Rp {(transaksi.pajak || 0).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="border-b border-solid border-slate-400 my-1"></div>
                <div className="flex justify-between text-sm font-bold border-y border-solid border-black py-1">
                  <span>TOTAL:</span>
                  <span>Rp {(transaksi.grandTotal || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bayar:</span>
                  <span>Rp {(transaksi.jumlahBayar || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kembali:</span>
                  <span>Rp {(transaksi.kembalian || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode:</span>
                  <span className="font-bold uppercase">{transaksi.metodePembayaran}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 my-2"></div>

              {/* Footer Nota */}
              <div className="text-center text-[9px] whitespace-pre-line mt-2 leading-tight">
                {klinik.footerNota || 'Terima kasih atas kunjungan Anda'}
              </div>
              <p className="text-center text-[8px] mt-2">VetCare POS</p>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Actions Control */}
        <div className="p-4 sm:p-5 border-t border-slate-100 shrink-0 bg-slate-50 flex items-center justify-between gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all"
          >
            Tutup
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSendWA}
              className="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-emerald-200 transition-all cursor-pointer"
              title="Kirim Ringkasan Nota via WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Kirim WA</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Mencetak...' : 'Cetak Nota Thermal'}</span>
            </button>
          </div>
        </div>

        <style>{`
          @media print {
            @page {
              size: ${paperWidth === '58mm' ? '58mm auto' : '80mm auto'};
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              height: auto !important;
              min-height: 0 !important;
              width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
              overflow: visible !important;
            }
            body * {
              visibility: hidden !important;
            }
            #thermal-receipt-printable, #thermal-receipt-printable * {
              visibility: visible !important;
            }
            #thermal-receipt-printable {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
              max-width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
              height: auto !important;
              min-height: 0 !important;
              box-sizing: border-box !important;
              padding: 3mm 2.5mm !important;
              border: 0 !important;
              box-shadow: none !important;
              color: #000 !important;
              background: #fff !important;
              font-size: ${paperWidth === '58mm' ? '12px' : '14px'} !important;
              line-height: 1.3 !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              break-after: avoid !important;
            }
            #thermal-receipt-printable [class~="text-[8px]"] { font-size: ${paperWidth === '58mm' ? '10px' : '11px'} !important; }
            #thermal-receipt-printable [class~="text-[9px]"] { font-size: ${paperWidth === '58mm' ? '11px' : '12px'} !important; }
            #thermal-receipt-printable [class~="text-[10px]"] { font-size: ${paperWidth === '58mm' ? '12px' : '14px'} !important; }
            #thermal-receipt-printable [class~="text-xs"] { font-size: ${paperWidth === '58mm' ? '14px' : '16px'} !important; }
            #thermal-receipt-printable .thermal-logo { width: ${paperWidth === '58mm' ? '17mm' : '20mm'} !important; height: ${paperWidth === '58mm' ? '17mm' : '20mm'} !important; }
            #thermal-receipt-printable .my-2 { margin-top: 2.5mm !important; margin-bottom: 2.5mm !important; }
            #thermal-receipt-printable .space-y-1\.5 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5mm !important; }
            #thermal-receipt-printable .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 1mm !important; }
          }
        `}</style>

      </div>
    </div>
  );
};
