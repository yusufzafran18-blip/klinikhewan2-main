import React, { useState } from 'react';
import { Pasien, Dokter, RiwayatVaksinasi, DataKlinik } from '../../types';
import { printSuratSehatPDF, printVaksinCertificatePDF } from '../../services/pdf';
import { X, FileCheck, Award, Printer } from 'lucide-react';

interface SuratModalProps {
  pasien: Pasien;
  dokterList: Dokter[];
  vaksinList: RiwayatVaksinasi[];
  klinik: DataKlinik;
  onClose: () => void;
}

export const SuratModal: React.FC<SuratModalProps> = ({
  pasien,
  dokterList,
  vaksinList,
  klinik,
  onClose,
}) => {
  const [activeType, setActiveType] = useState<'sehat' | 'vaksin'>('sehat');
  const [selectedDokterId, setSelectedDokterId] = useState<string>(dokterList[0]?.id || '');
  const [peruntukan, setPeruntukan] = useState('Persyaratan Perjalanan / Penitipan / Grooming');
  const [selectedVaksinId, setSelectedVaksinId] = useState<string>(vaksinList[0]?.id || '');

  const handlePrintSuratSehat = () => {
    const dokter = dokterList.find((d) => d.id === selectedDokterId) || dokterList[0];
    if (!dokter) return alert('Pilih dokter penanggung jawab');
    printSuratSehatPDF(pasien, dokter, klinik, peruntukan);
  };

  const handlePrintSertifikatVaksin = () => {
    const dokter = dokterList.find((d) => d.id === selectedDokterId) || dokterList[0];
    const vaksin = vaksinList.find((v) => v.id === selectedVaksinId);
    if (!dokter) return alert('Pilih dokter penanggung jawab');
    if (!vaksin) return alert('Pilih catatan riwayat vaksinasi');
    printVaksinCertificatePDF(pasien, vaksin, dokter, klinik);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Cetak Surat & Sertifikat Medis</h3>
            <p className="text-xs text-slate-500">Pasien: <span className="font-semibold text-slate-800">{pasien.namaHewan}</span> ({pasien.namaOwner})</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="my-4 flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveType('sehat')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeType === 'sehat' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Surat Keterangan Sehat</span>
          </button>
          <button
            onClick={() => setActiveType('vaksin')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeType === 'vaksin' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Sertifikat Vaksinasi</span>
          </button>
        </div>

        {activeType === 'sehat' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dokter Pemeriksa & TTD</label>
              <select
                value={selectedDokterId}
                onChange={(e) => setSelectedDokterId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {dokterList.map((d) => (
                  <option key={d.id} value={d.id}>{d.nama} ({d.sip})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keperluan / Peruntukan Surat</label>
              <input
                type="text"
                value={peruntukan}
                onChange={(e) => setPeruntukan(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                placeholder="Contoh: Persyaratan Penerbangan Pet & Boarding"
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
              <p className="font-bold">Ketentuan Surat Sehat PDF:</p>
              <p>Surat ini menyatakan bahwa {pasien.namaHewan} ({pasien.jenisHewan}) bebas penyakit menular dan layak untuk perjalanan/penitipan.</p>
            </div>

            <button
              onClick={handlePrintSuratSehat}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-200 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Download & Cetak Surat Sehat (PDF)</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Catatan Vaksinasi Pasien</label>
              {vaksinList.length === 0 ? (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  Belum ada riwayat vaksinasi terdaftar untuk pasien ini. Silakan input vaksinasi terlebih dahulu.
                </div>
              ) : (
                <select
                  value={selectedVaksinId}
                  onChange={(e) => setSelectedVaksinId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {vaksinList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.namaVaksin} — Tgl: {v.tanggalVaksin} (Batch: {v.batchNo})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dokter Hewan Penanggung Jawab</label>
              <select
                value={selectedDokterId}
                onChange={(e) => setSelectedDokterId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {dokterList.map((d) => (
                  <option key={d.id} value={d.id}>{d.nama} ({d.sip})</option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrintSertifikatVaksin}
              disabled={vaksinList.length === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-200 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Download Sertifikat Vaksin PDF</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
