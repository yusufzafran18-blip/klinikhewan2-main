import React, { useState } from 'react';
import { Pendaftaran, Pasien, Dokter, User } from '../../types';
import {
  ClipboardList, Plus, Search, Clock, CheckCircle2, XCircle,
  Stethoscope, Calendar, Phone, User as UserIcon
} from 'lucide-react';

interface PendaftaranViewProps {
  pendaftaranList: Pendaftaran[];
  pasienList: Pasien[];
  dokterList: Dokter[];
  activeUser: User;
  onSavePendaftaran: (pdf: Pendaftaran) => void;
  onUpdateStatus: (id: string, status: 'Antri' | 'Diperiksa' | 'Selesai' | 'Batal') => void;
  onStartExamine: (pendaftaran: Pendaftaran) => void;
}

export const PendaftaranView: React.FC<PendaftaranViewProps> = ({
  pendaftaranList = [],
  pasienList = [],
  dokterList = [],
  activeUser,
  onSavePendaftaran,
  onUpdateStatus,
  onStartExamine,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedPasienId, setSelectedPasienId] = useState('');
  const [selectedDokterId, setSelectedDokterId] = useState(dokterList[0]?.id || '');
  const [keluhan, setKeluhan] = useState('');
  const [layanan, setLayanan] = useState('Pemeriksaan Umum / Konsultasi');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPasienId) return alert('Silakan pilih pasien!');
    if (!selectedDokterId) return alert('Silakan pilih dokter!');

    const todayCount = pendaftaranList.length + 1;
    const noAntrian = `A-${String(todayCount).padStart(3, '0')}`;

    const newPendaftaran: Pendaftaran = {
      id: 'pdf-' + Date.now(),
      noAntrian,
      pasienId: selectedPasienId,
      dokterId: selectedDokterId,
      tanggal: new Date().toISOString().split('T')[0],
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      keluhanUtama: keluhan,
      layananDipilih: layanan,
      status: 'Antri',
      petugasId: activeUser.id,
    };

    onSavePendaftaran(newPendaftaran);
    setShowModal(false);
    setKeluhan('');
  };

  const filteredPendaftaran = pendaftaranList.filter((p) => {
    const pasien = pasienList.find((ps) => ps.id === p.pasienId);
    const text = `${p.noAntrian} ${pasien?.namaHewan} ${pasien?.namaOwner}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Pendaftaran Berobat & Antrian Pasien</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Registrasi pasien masuk & alokasi ke dokter hewan pemeriksa</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Daftar Berobat Baru</span>
        </button>
      </div>

      {/* Filter & Search Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Cari no. antrian, nama hewan, atau nama owner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Queue List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">No. Antrian</th>
                <th className="p-4">Pasien Hewan & Owner</th>
                <th className="p-4">Dokter Tujuan</th>
                <th className="p-4">Keluhan Utama</th>
                <th className="p-4">Waktu</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPendaftaran.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada antrian pendaftaran berobat.
                  </td>
                </tr>
              ) : (
                filteredPendaftaran.map((p) => {
                  const pasien = pasienList.find((ps) => ps.id === p.pasienId);
                  const dokter = dokterList.find((d) => d.id === p.dokterId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 font-black rounded-xl text-xs border border-indigo-200">
                          {p.noAntrian}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{pasien?.namaHewan || 'Pasien'}</p>
                          <p className="text-[11px] text-slate-400">{pasien?.jenisHewan} • Owner: <span className="text-slate-700 font-semibold">{pasien?.namaOwner}</span></p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{dokter?.nama || 'Dokter'}</p>
                        <p className="text-[10px] text-slate-400">{dokter?.spesialisasi}</p>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="truncate text-slate-700">{p.keluhanUtama || '-'}</p>
                        <span className="text-[10px] text-indigo-600 font-semibold">{p.layananDipilih}</span>
                      </td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.waktu} WIB</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.status === 'Antri' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          p.status === 'Diperiksa' ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse' :
                          p.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {p.status === 'Antri' && (
                            <button
                              onClick={() => {
                                onUpdateStatus(p.id, 'Diperiksa');
                                onStartExamine(p);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 transition-all"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Periksa (SOAP)</span>
                            </button>
                          )}
                          {p.status === 'Diperiksa' && (
                            <button
                              onClick={() => onStartExamine(p)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Lanjut SOAP</span>
                            </button>
                          )}
                          {p.status !== 'Selesai' && p.status !== 'Batal' && (
                            <button
                              onClick={() => onUpdateStatus(p.id, 'Batal')}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Batalkan Antrian"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Pendaftaran */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Form Pendaftaran Pasien Berobat</h3>
                <p className="text-xs text-slate-500">Pilih pasien hewan terdaftar & alokasikan dokter</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Pasien Hewan / Owner</label>
                <select
                  value={selectedPasienId}
                  onChange={(e) => setSelectedPasienId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                >
                  <option value="">-- Pilih Pasien Hewan --</option>
                  {pasienList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kodePasien} - {p.namaHewan} ({p.jenisHewan}) — Owner: {p.namaOwner}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Dokter Hewan Pemeriksa</label>
                <select
                  value={selectedDokterId}
                  onChange={(e) => setSelectedDokterId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                >
                  {dokterList.map((d) => (
                    <option key={d.id} value={d.id}>{d.nama} ({d.spesialisasi})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Layanan Dipilih</label>
                <select
                  value={layanan}
                  onChange={(e) => setLayanan(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Pemeriksaan Umum / Konsultasi">Pemeriksaan Umum / Konsultasi</option>
                  <option value="Vaksinasi Rutin">Vaksinasi Rutin</option>
                  <option value="Pemeriksaan Kulit & Dermatologi">Pemeriksaan Kulit & Dermatologi</option>
                  <option value="Tindakan Operasi / Bedah">Tindakan Operasi / Bedah</option>
                  <option value="Rawat Inap Intensive">Rawat Inap Intensive</option>
                  <option value="Grooming Medis">Grooming Medis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keluhan Utama Anabul</label>
                <textarea
                  rows={3}
                  value={keluhan}
                  onChange={(e) => setKeluhan(e.target.value)}
                  placeholder="Contoh: Kucing lemas, muntah 2x, tidak mau makan sejak pagi..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200"
                >
                  Simpan Pendaftaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
