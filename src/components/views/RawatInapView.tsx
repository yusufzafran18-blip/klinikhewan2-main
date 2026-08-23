import React, { useState } from 'react';
import { RawatInap, Pasien, Dokter, DataKlinik, MonitoringLog, RekamMedis, Transaksi } from '../../types';
import {
  BedDouble, Plus, Activity, MessageSquare, X, Printer
} from 'lucide-react';
import { generateWaLink, waTemplates } from '../../services/wa';
import { InpatientA4ReceiptModal } from '../common/InpatientA4ReceiptModal';

interface RawatInapViewProps {
  rawatInapList: RawatInap[];
  pasienList: Pasien[];
  dokterList: Dokter[];
  klinik: DataKlinik;
  rekamMedisList?: RekamMedis[];
  transaksiList?: Transaksi[];
  onSaveRawatInap: (inap: RawatInap) => void | Promise<void>;
  onAddLogMonitoring: (inapId: string, log: MonitoringLog) => void;
  onUseInventory?: (items: { barangId?: string; nama?: string; jumlah: number }[]) => void | Promise<void>;
  onCheckoutInap: (inapId: string) => void;
}

export const RawatInapView: React.FC<RawatInapViewProps> = ({
  rawatInapList = [],
  pasienList = [],
  dokterList = [],
  klinik,
  rekamMedisList = [],
  transaksiList = [],
  onSaveRawatInap,
  onAddLogMonitoring,
  onUseInventory,
  onCheckoutInap,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInapForLog, setSelectedInapForLog] = useState<RawatInap | null>(null);
  const [printingInap, setPrintingInap] = useState<RawatInap | null>(null);

  // Form Add Inap State
  const [selectedPasienId, setSelectedPasienId] = useState(pasienList[0]?.id || '');
  const [noKandang, setNoKandang] = useState('Kandang Kucing A-02');
  const [dokterId, setDokterId] = useState(dokterList[0]?.id || '');
  const [diagnosaInap, setDiagnosaInap] = useState('Gastritis & Dehidrasi');
  const [tarifPerHari, setTarifPerHari] = useState(100000);


  // Form Add Log State
  const [logShift, setLogShift] = useState<'Pagi' | 'Siang' | 'Malam'>('Siang');
  const [logSuhu, setLogSuhu] = useState<number>(38.8);
  const [logMakan, setLogMakan] = useState<'Lahap' | 'Sedikit' | 'Suap' | 'Muntah' | 'NGT'>('Sedikit');
  const [logBab, setLogBab] = useState<'Normal' | 'Diare' | 'Feses Berdarah' | 'Tidak BAB' | 'Anuria/Susah BAK'>('Normal');
  const [logKondisi, setLogKondisi] = useState('Mulai aktif, responsive');
  const [logInjeksi, setLogInjeksi] = useState('Injeksi Ondansetron 0.5ml');
  const [logPetugas, setLogPetugas] = useState('Rina Staf');

  const handleSaveInap = async (e: React.FormEvent) => {
    e.preventDefault();
    const newInap: RawatInap = {
      id: 'inap-' + Date.now(),
      pasienId: selectedPasienId,
      noKandang,
      tanggalMasuk: new Date().toISOString().replace('T', ' ').slice(0, 16),
      dokterPenanggungJawabId: dokterId,
      diagnosaInap,
      tarifPerHari,
      status: 'Aktif',
      monitoringLogs: [],
      pemberianObatList: [],
      penggunaanAlkesList: [],
      tindakanMedisList: [],
    };
    await onSaveRawatInap(newInap);
    setShowAddModal(false);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInapForLog) return;

    const newLog: MonitoringLog = {
      id: 'mon-' + Date.now(),
      tanggalWaktu: new Date().toISOString().replace('T', ' ').slice(0, 16),
      shift: logShift,
      suhu: logSuhu,
      nafsuMakan: logMakan,
      babBak: logBab,
      kondisiUmum: logKondisi,
      obatDiinjeksi: logInjeksi,
      catatanPetugas: 'Monitoring terjaga baik',
      petugasName: logPetugas,
    };

    onAddLogMonitoring(selectedInapForLog.id, newLog);
    setSelectedInapForLog(null);
  };

  const handleSendWaUpdate = (inap: RawatInap) => {
    const pasien = pasienList.find((p) => p.id === inap.pasienId);
    if (!pasien) return;

    const lastLog = inap.monitoringLogs[inap.monitoringLogs.length - 1];
    const kondisi = lastLog ? lastLog.kondisiUmum : inap.diagnosaInap;
    const suhu = lastLog ? lastLog.suhu : 38.5;

    const waText = waTemplates.inpatientUpdate(pasien, inap, kondisi, suhu, klinik);
    window.open(generateWaLink(pasien.noHpOwner, waText), '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <BedDouble className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Rawat Inap & Monitoring Kandang</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Sistem pemantauan vital sign per shift, pemberian injeksi obat, & laporan berkala ke owner</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Masuk Rawat Inap Baru</span>
        </button>
      </div>

      {/* Grid Kandang Aktif */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rawatInapList.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
            Saat ini tidak ada pasien yang sedang rawat inap di kandang.
          </div>
        ) : (
          rawatInapList.map((inap) => {
            const pasien = pasienList.find((p) => p.id === inap.pasienId);
            const dokter = dokterList.find((d) => d.id === inap.dokterPenanggungJawabId);

            return (
              <div key={inap.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                
                {/* Header Kandang */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                      {inap.noKandang}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-800 mt-1.5">{pasien?.namaHewan} ({pasien?.jenisHewan})</h3>
                    <p className="text-xs text-slate-500">Owner: <span className="font-semibold text-slate-700">{pasien?.namaOwner}</span> ({pasien?.noHpOwner})</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inap.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {inap.status}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">Masuk: {inap.tanggalMasuk}</p>
                  </div>
                </div>

                {/* Info Diagnosa & Dokter */}
                <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                  <p><span className="text-slate-400">Diagnosa Inap:</span> <span className="font-bold text-slate-800">{inap.diagnosaInap}</span></p>
                  <p><span className="text-slate-400">DPJP Dokter:</span> <span className="font-bold text-indigo-700">{dokter?.nama}</span></p>
                  <p><span className="text-slate-400">Tarif Kandang:</span> <span className="font-extrabold text-slate-900">Rp {(inap.tarifPerHari || 0).toLocaleString('id-ID')}/Hari</span></p>
                </div>

                {/* Log Monitoring Terakhir */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center">
                      <Activity className="w-3.5 h-3.5 text-indigo-600 mr-1" /> Log Monitoring Per Shift ({inap.monitoringLogs.length})
                    </span>
                    <button
                      onClick={() => setSelectedInapForLog(inap)}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      + Input Log Shift
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {inap.monitoringLogs.length === 0 ? (
                      <p className="text-[11px] text-slate-400 p-3 bg-slate-50 rounded-lg text-center">Belum ada catatan monitoring shift.</p>
                    ) : (
                      inap.monitoringLogs.map((log) => (
                        <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>Shift {log.shift} — {log.tanggalWaktu}</span>
                            <span className="text-rose-600">Suhu: {log.suhu}°C</span>
                          </div>
                          <p className="text-slate-600"><span className="font-semibold">Makan:</span> {log.nafsuMakan} | <span className="font-semibold">Injeksi:</span> {log.obatDiinjeksi}</p>
                          <p className="text-slate-500 italic text-[11px]">{log.kondisiUmum} — {log.petugasName}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {(inap.pemberianObatList?.length || inap.penggunaanAlkesList?.length || inap.tindakanMedisList?.length) ? (
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
                   <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Riwayat Penggunaan</p>
                   {inap.pemberianObatList?.length ? (
                     <div className="space-y-1 text-[11px] text-slate-700">
                       <span className="font-bold text-slate-800">Obat:</span>
                       {inap.pemberianObatList.slice(0, 3).map((o, i) => (
                         <span key={i} className="ml-1">{o.namaBarang} x{o.jumlah}</span>
                       ))}
                     </div>
                   ) : null}
                   {inap.penggunaanAlkesList?.length ? (
                     <div className="space-y-1 text-[11px] text-slate-700">
                       <span className="font-bold text-slate-800">Alkes:</span>
                       {inap.penggunaanAlkesList.slice(0, 3).map((a, i) => (
                         <span key={i} className="ml-1">{a.namaAlkes} x{a.jumlah}</span>
                       ))}
                     </div>
                   ) : null}
                   {inap.tindakanMedisList?.length ? (
                     <div className="space-y-1 text-[11px] text-slate-700">
                       <span className="font-bold text-slate-800">Tindakan:</span>
                       {inap.tindakanMedisList.slice(0, 3).map((t, i) => (
                         <span key={i} className="ml-1">{t.namaTindakan} x{t.jumlah}</span>
                       ))}
                     </div>
                   ) : null}
                 </div>
                ) : null}

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSendWaUpdate(inap)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1 cursor-pointer transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WA Update</span>
                    </button>

                    <button
                      onClick={() => setPrintingInap(inap)}
                      className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-xs flex items-center space-x-1 cursor-pointer transition-all border border-indigo-200"
                      title="Cetak Nota Rincian Inap A4 / F4"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Nota (A4/F4)</span>
                    </button>

                  </div>


                  {inap.status === 'Aktif' && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => onCheckoutInap(inap.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-all"
                      >
                        Selesai / Pulang
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Rawat Inap */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Masuk Rawat Inap Kandang</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveInap} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Pasien</label>
                <select value={selectedPasienId} onChange={(e) => setSelectedPasienId(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300">
                  {pasienList.map((p) => (
                    <option key={p.id} value={p.id}>{p.namaHewan} ({p.jenisHewan}) - Owner: {p.namaOwner}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">No / Label Kandang</label>
                <input type="text" value={noKandang} onChange={(e) => setNoKandang(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dokter Penanggung Jawab (DPJP)</label>
                <select value={dokterId} onChange={(e) => setDokterId(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300">
                  {dokterList.map((d) => (
                    <option key={d.id} value={d.id}>{d.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Diagnosa Rawat Inap</label>
                <input type="text" value={diagnosaInap} onChange={(e) => setDiagnosaInap(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tarif Inap Per Hari (Rp)</label>
                <input type="number" value={tarifPerHari} onChange={(e) => setTarifPerHari(parseInt(e.target.value) || 0)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold" />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl">Batal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 font-bold text-white rounded-xl shadow-md shadow-indigo-200">Simpan Inap</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Monitoring Log */}
      {selectedInapForLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Input Log Monitoring Shift</h3>
              <button onClick={() => setSelectedInapForLog(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift Petugas</label>
                  <select value={logShift} onChange={(e) => setLogShift(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300">
                    <option value="Pagi">Shift Pagi</option>
                    <option value="Siang">Shift Siang</option>
                    <option value="Malam">Shift Malam</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Suhu Tubuh (°C)</label>
                  <input type="number" step="0.1" value={logSuhu} onChange={(e) => setLogSuhu(parseFloat(e.target.value) || 0)} className="w-full p-2 rounded-lg border border-slate-300 font-bold" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nafsu Makan</label>
                <select value={logMakan} onChange={(e) => setLogMakan(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300">
                  <option value="Lahap">Lahap</option>
                  <option value="Sedikit">Makan Sedikit</option>
                  <option value="Suap">Harus Disuap</option>
                  <option value="Muntah">Muntah</option>
                  <option value="NGT">NGT / Selang</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Obat Diinjeksi / Diberikan</label>
                <input type="text" value={logInjeksi} onChange={(e) => setLogInjeksi(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Kondisi Umum</label>
                <textarea rows={2} value={logKondisi} onChange={(e) => setLogKondisi(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300"></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setSelectedInapForLog(null)} className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl">Batal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 font-bold text-white rounded-xl shadow-md shadow-indigo-200">Simpan Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Nota A4/F4 Rawat Inap */}
      {printingInap && (
        <InpatientA4ReceiptModal
          rawatInap={printingInap}
          pasien={pasienList.find((p) => p.id === printingInap.pasienId)}
          dokter={dokterList.find((d) => d.id === printingInap.dokterPenanggungJawabId)}
          klinik={klinik}
          rekamMedisList={rekamMedisList}
          transaksi={transaksiList.find((t) => t.rawatInapId === printingInap.id)}
          onClose={() => setPrintingInap(null)}
        />
      )}

    </div>
  );
};
