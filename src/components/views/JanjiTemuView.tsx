import React, { useState } from 'react';
import { JanjiTemu, Pasien, Dokter, DataKlinik } from '../../types';
import { CalendarDays, Plus, MessageSquare, Check, X, Search } from 'lucide-react';
import { generateWaLink, waTemplates } from '../../services/wa';

interface JanjiTemuViewProps {
  janjiTemuList: JanjiTemu[];
  pasienList: Pasien[];
  dokterList: Dokter[];
  klinik: DataKlinik;
  onSaveJanjiTemu: (jt: JanjiTemu) => void | Promise<void>;
  onUpdateStatus: (id: string, status: 'Diajukan' | 'Disetujui' | 'Dibatalkan' | 'Selesai') => void;
}

export const JanjiTemuView: React.FC<JanjiTemuViewProps> = ({
  janjiTemuList = [],
  pasienList = [],
  dokterList = [],
  klinik,
  onSaveJanjiTemu,
  onUpdateStatus,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedPasienId, setSelectedPasienId] = useState(pasienList[0]?.id || '');
  const [selectedDokterId, setSelectedDokterId] = useState(dokterList[0]?.id || '');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jam, setJam] = useState('10:00');
  const [layanan, setLayanan] = useState('Vaksinasi Rutin & Checkup');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const pasien = pasienList.find((p) => p.id === selectedPasienId);
    const newJT: JanjiTemu = {
      id: 'jt-' + Date.now(),
      pasienId: selectedPasienId,
      dokterId: selectedDokterId,
      tanggal,
      jam,
      layanan,
      catatan: '',
      status: 'Disetujui',
      noHpPengingat: pasien?.noHpOwner || '',
    };
    try {
      await onSaveJanjiTemu(newJT);
      setShowModal(false);
    } catch (error: any) {
      alert(`Janji temu gagal disimpan: ${error.message}`);
    }
  };

  const handleSendReminderWA = (jt: JanjiTemu) => {
    const pasien = pasienList.find((p) => p.id === jt.pasienId);
    if (!pasien) return;
    const dokter = dokterList.find((d) => d.id === jt.dokterId);
    const waText = waTemplates.appointmentReminder(jt, pasien, dokter?.nama || 'Dokter Klinik', klinik);
    window.open(generateWaLink(pasien.noHpOwner, waText), '_blank');
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Agenda Janji Temu (Appointment Booking)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Penjadwalan konsul dokter, operasi steril, vaksinasi & pengingat otomatis WhatsApp</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Janji Temu Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Tanggal & Jam</th>
                <th className="p-4">Pasien & Owner</th>
                <th className="p-4">Dokter Tujuan</th>
                <th className="p-4">Layanan</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {janjiTemuList.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada janji temu terjadwal.</td></tr>
              ) : (
                janjiTemuList.map((jt) => {
                  const pasien = pasienList.find((p) => p.id === jt.pasienId);
                  const dokter = dokterList.find((d) => d.id === jt.dokterId);

                  return (
                    <tr key={jt.id} className="hover:bg-slate-50/80">
                      <td className="p-4">
                        <span className="font-bold text-slate-800 block">{jt.tanggal}</span>
                        <span className="text-[10px] text-slate-400">Pukul {jt.jam} WIB</span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{pasien?.namaHewan}</p>
                        <p className="text-[10px] text-slate-400">Owner: {pasien?.namaOwner} ({pasien?.noHpOwner})</p>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{dokter?.nama}</td>
                      <td className="p-4 font-semibold text-indigo-700">{jt.layanan}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          jt.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                          jt.status === 'Diajukan' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {jt.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleSendReminderWA(jt)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Remind WA</span>
                          </button>
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

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Buat Janji Temu Baru</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Pasien</label>
                <select value={selectedPasienId} onChange={(e) => setSelectedPasienId(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300">
                  {pasienList.map((p) => (
                    <option key={p.id} value={p.id}>{p.namaHewan} ({p.jenisHewan}) - Owner: {p.namaOwner}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Dokter</label>
                <select value={selectedDokterId} onChange={(e) => setSelectedDokterId(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300">
                  {dokterList.map((d) => (
                    <option key={d.id} value={d.id}>{d.nama}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal</label>
                  <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam WIB</label>
                  <input type="text" value={jam} onChange={(e) => setJam(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Layanan</label>
                <input type="text" value={layanan} onChange={(e) => setLayanan(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl">Batal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 font-bold text-white rounded-xl shadow-md shadow-indigo-200">Simpan Janji Temu</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
