import React, { useState } from 'react';
import {
  RekamMedis, Pasien, Dokter, Barang, Tindakan, Pendaftaran,
  ObatRacikan, ResepItem, TindakanItem, DataKlinik
} from '../../types';
import {
  Stethoscope, Plus, Trash2, Printer, Search, FileText,
  Upload, CheckCircle, ArrowLeft, Pill, HeartPulse, Camera
} from 'lucide-react';
import { printRekamMedisPDF } from '../../services/pdf';

interface RekamMedisViewProps {
  rekamMedisList: RekamMedis[];
  pasienList: Pasien[];
  dokterList: Dokter[];
  barangList: Barang[];
  tindakanList: Tindakan[];
  pendaftaranList: Pendaftaran[];
  klinik: DataKlinik;
  activePendaftaran?: Pendaftaran | null;
  onSaveRekamMedis: (rm: RekamMedis) => void | Promise<void>;
  onClearActivePendaftaran: () => void;
}

export const RekamMedisView: React.FC<RekamMedisViewProps> = ({
  rekamMedisList = [],
  pasienList = [],
  dokterList = [],
  barangList = [],
  tindakanList = [],
  pendaftaranList = [],
  klinik,
  activePendaftaran,
  onSaveRekamMedis,
  onClearActivePendaftaran,
}) => {
  const [showFormModal, setShowFormModal] = useState(!!activePendaftaran);
  const [searchQuery, setSearchQuery] = useState('');

  // Form SOAP State
  const [selectedPasienId, setSelectedPasienId] = useState(activePendaftaran?.pasienId || pasienList[0]?.id || '');
  const [selectedDokterId, setSelectedDokterId] = useState(activePendaftaran?.dokterId || dokterList[0]?.id || '');

  // Subjective
  const [keluhan, setKeluhan] = useState(activePendaftaran?.keluhanUtama || '');
  const [anamnesa, setAnamnesa] = useState('');
  const [makanMinum, setMakanMinum] = useState<'Normal' | 'Menurun' | 'Muntah' | 'Diare' | 'Tidak Makan'>('Normal');
  const [durasiSakit, setDurasiSakit] = useState('1 Hari');

  // Objective
  const [beratBadan, setBeratBadan] = useState<number>(3.5);
  const [suhu, setSuhu] = useState<number>(38.5);
  const [frekuensiNapas, setFrekuensiNapas] = useState<number>(24);
  const [detakJantung, setDetakJantung] = useState<number>(120);
  const [crt, setCrt] = useState<'< 2 Detik' | '> 2 Detik'>('< 2 Detik');
  const [dehidrasi, setDehidrasi] = useState<'Normal' | 'Mulai Dehidrasi (5%)' | 'Sedang (8%)' | 'Berat (>10%)'>('Normal');
  const [pemeriksaanFisik, setPemeriksaanFisik] = useState('Kondisi umum compos mentis, mukosa merah muda, auskultasi paru bersih.');

  // Assessment
  const [diagnosaUtama, setDiagnosaUtama] = useState('');
  const [diagnosaBanding, setDiagnosaBanding] = useState('');

  // Plan
  const [selectedTindakanItems, setSelectedTindakanItems] = useState<TindakanItem[]>([]);
  const [selectedResepItems, setSelectedResepItems] = useState<ResepItem[]>([]);
  
  // Racikan State
  const [racikanList, setRacikanList] = useState<ObatRacikan[]>([]);
  const [showRacikanBuilder, setShowRacikanBuilder] = useState(false);
  const [namaRacikan, setNamaRacikan] = useState('Puyer Anti Batuk');
  const [jumlahBungkus, setJumlahBungkus] = useState(5);
  const [aturanPakaiRacikan, setAturanPakaiRacikan] = useState('2x1 bungkus sesudah makan');

  const [pakanAnjuran, setPakanAnjuran] = useState('');
  const [statusLanjutan, setStatusLanjutan] = useState<'Rawat Jalan' | 'Rawat Inap' | 'Rujukan' | 'Meninggal'>('Rawat Jalan');
  const [tanggalKontrolUlang, setTanggalKontrolUlang] = useState('');

  // Upload Foto
  const [lampiranList, setLampiranList] = useState<{ nama: string; url: string; tipe: 'Foto' | 'X-Ray' | 'Hasil Lab' | 'Dokumen' }[]>([]);

  // Add Item Helpers
  const handleAddTindakan = (tindakanId: string) => {
    const t = tindakanList.find((item) => item.id === tindakanId);
    if (!t) return;
    if (selectedTindakanItems.some((item) => item.tindakanId === tindakanId)) return;
    setSelectedTindakanItems([
      ...selectedTindakanItems,
      { tindakanId: t.id, namaTindakan: t.namaTindakan, tarif: t.tarif }
    ]);
  };

  const handleRemoveTindakan = (tindakanId: string) => {
    setSelectedTindakanItems(selectedTindakanItems.filter((i) => i.tindakanId !== tindakanId));
  };

  const handleAddResepObat = (barangId: string) => {
    const b = barangList.find((item) => item.id === barangId);
    if (!b) return;
    setSelectedResepItems([
      ...selectedResepItems,
      {
        barangId: b.id,
        namaBarang: b.namaBarang,
        jumlah: 1,
        dosis: '2x1 tablet',
        aturanPakai: 'Sesudah makan',
        hargaSatuan: b.hargaJual,
        subtotal: b.hargaJual,
      }
    ]);
  };

  const handleUpdateResepQty = (index: number, qty: number) => {
    const updated = [...selectedResepItems];
    updated[index].jumlah = qty;
    updated[index].subtotal = qty * updated[index].hargaSatuan;
    setSelectedResepItems(updated);
  };

  const handleRemoveResep = (index: number) => {
    setSelectedResepItems(selectedResepItems.filter((_, i) => i !== index));
  };

  const handleAddSampleRacikan = () => {
    const newRacikan: ObatRacikan = {
      id: 'rac-' + Date.now(),
      namaRacikan,
      jumlahBungkus,
      aturanPakai: aturanPakaiRacikan,
      biayaJasaRacik: 10000,
      items: [
        { barangId: 'brg-10', namaObat: 'Doxycycline 100mg Tab', dosisDetail: '1/4 tab', jumlah: 2, hargaSatuan: 5000, subtotal: 10000 }
      ],
      totalHarga: 20000,
    };
    setRacikanList([...racikanList, newRacikan]);
    setShowRacikanBuilder(false);
  };

  const handleSaveSOAP = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = rekamMedisList.length + 1;
    const noRM = `RM-2026-${String(count).padStart(4, '0')}`;

    const totalTindakan = selectedTindakanItems.reduce((acc, i) => acc + i.tarif, 0);
    const totalResep = selectedResepItems.reduce((acc, i) => acc + i.subtotal, 0);
    const totalRacikan = racikanList.reduce((acc, i) => acc + i.totalHarga, 0);
    const totalBiaya = totalTindakan + totalResep + totalRacikan;

    const newRM: RekamMedis = {
      id: 'rm-' + Date.now(),
      noRM,
      pendaftaranId: activePendaftaran?.id,
      pasienId: selectedPasienId,
      dokterId: selectedDokterId,
      tanggal: new Date().toISOString().split('T')[0],
      subjective: {
        keluhan,
        anamnesa,
        makanMinum,
        durasiSakit,
      },
      objective: {
        beratBadan,
        suhu,
        frekuensiNapas,
        detakJantung,
        crt,
        dehidrasi,
        pemeriksaanFisik,
      },
      assessment: {
        diagnosaUtama,
        diagnosaBanding,
      },
      plan: {
        tindakanList: selectedTindakanItems,
        resepList: selectedResepItems,
        racikanList,
        pakanAnjuran,
        statusLanjutan,
        tanggalKontrolUlang,
      },
      lampiranDokumen: lampiranList,
      totalBiaya,
      statusPembayaran: 'Belum Lunas',
    };

    await onSaveRekamMedis(newRM);
    setShowFormModal(false);
    onClearActivePendaftaran();
  };

  const filteredRM = rekamMedisList.filter((rm) => {
    const pasien = pasienList.find((p) => p.id === rm.pasienId);
    const text = `${rm.noRM} ${pasien?.namaHewan} ${pasien?.namaOwner} ${rm.assessment.diagnosaUtama}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Stethoscope className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Pemeriksaan Rekam Medis (SOAP)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Diagnosis klinis, resep obat racikan/non-racikan, tindakan medis & lampiran foto</p>
        </div>

        <button
          onClick={() => setShowFormModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Input Rekam Medis Baru</span>
        </button>
      </div>

      {/* Active Examination Prompt Banner */}
      {activePendaftaran && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between text-xs text-indigo-900 animate-bounce">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Sedang Memeriksa Antrian #{activePendaftaran.noAntrian}</p>
              <p className="text-indigo-700">Lanjutkan pengisian form SOAP medis untuk pendaftaran ini.</p>
            </div>
          </div>
          <button
            onClick={() => setShowFormModal(true)}
            className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-xs hover:bg-indigo-700"
          >
            Buka Form SOAP
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Cari No. RM, nama hewan, nama owner, atau diagnosa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Rekam Medis List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">No. RM & Tanggal</th>
                <th className="p-4">Pasien & Owner</th>
                <th className="p-4">Dokter Pemeriksa</th>
                <th className="p-4">Diagnosa Utama (SOAP)</th>
                <th className="p-4">Total Biaya</th>
                <th className="p-4">Status Lanjutan</th>
                <th className="p-4 text-right">Cetak PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRM.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada riwayat rekam medis.
                  </td>
                </tr>
              ) : (
                filteredRM.map((rm) => {
                  const pasien = pasienList.find((p) => p.id === rm.pasienId);
                  const dokter = dokterList.find((d) => d.id === rm.dokterId);

                  return (
                    <tr key={rm.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <span className="font-extrabold text-indigo-700 block">{rm.noRM}</span>
                        <span className="text-[10px] text-slate-400">{rm.tanggal}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{pasien?.namaHewan}</p>
                        <p className="text-[10px] text-slate-400">{pasien?.jenisHewan} • Owner: {pasien?.namaOwner}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{dokter?.nama}</p>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="font-bold text-slate-800 truncate">{rm.assessment.diagnosaUtama}</p>
                        <p className="text-[10px] text-slate-400 truncate">Suhu: {rm.objective.suhu}°C | BB: {rm.objective.beratBadan}kg</p>
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">
                        Rp {(rm.totalBiaya || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          rm.plan.statusLanjutan === 'Rawat Inap' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {rm.plan.statusLanjutan}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            if (pasien && dokter) {
                              printRekamMedisPDF(rm, pasien, dokter, klinik);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center space-x-1 ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form SOAP Rekam Medis */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 animate-in fade-in duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Formulir Rekam Medis Dokter (SOAP)</h3>
                <p className="text-xs text-slate-500">Pemeriksaan fisik, diagnosa, tindakan, resep obat & obat racikan</p>
              </div>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  onClearActivePendaftaran();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSOAP} className="space-y-6 mt-4">
              
              {/* Header Info Dokter & Pasien */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pasien Hewan</label>
                  <select
                    value={selectedPasienId}
                    onChange={(e) => setSelectedPasienId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  >
                    {pasienList.map((p) => (
                      <option key={p.id} value={p.id}>{p.kodePasien} - {p.namaHewan} ({p.jenisHewan}) - Owner: {p.namaOwner}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dokter Hewan Pemeriksa</label>
                  <select
                    value={selectedDokterId}
                    onChange={(e) => setSelectedDokterId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  >
                    {dokterList.map((d) => (
                      <option key={d.id} value={d.id}>{d.nama} ({d.sip})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* S: SUBJECTIVE */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center mr-2 text-[10px]">S</span>
                  Subjective (Anamnesa & Keluhan Owner)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Keluhan Utama & Anamnesa</label>
                    <input
                      type="text"
                      required
                      value={keluhan}
                      onChange={(e) => setKeluhan(e.target.value)}
                      placeholder="Muntah, lemas, nafsu makan turun..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nafsu Makan / Minum</label>
                    <select
                      value={makanMinum}
                      onChange={(e) => setMakanMinum(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Menurun">Menurun</option>
                      <option value="Muntah">Muntah</option>
                      <option value="Diare">Diare</option>
                      <option value="Tidak Makan">Tidak Makan sama sekali</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* O: OBJECTIVE */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center mr-2 text-[10px]">O</span>
                  Objective (Hasil Pemeriksaan Fisik & Tanda Vital)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Berat Badan (Kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={beratBadan}
                      onChange={(e) => setBeratBadan(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Suhu Tubuh (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={suhu}
                      onChange={(e) => setSuhu(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CRT</label>
                    <select value={crt} onChange={(e) => setCrt(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300">
                      <option value="< 2 Detik">&lt; 2 Detik (Normal)</option>
                      <option value="> 2 Detik">&gt; 2 Detik (Lambat)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dehidrasi</label>
                    <select value={dehidrasi} onChange={(e) => setDehidrasi(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300">
                      <option value="Normal">Normal</option>
                      <option value="Mulai Dehidrasi (5%)">Mulai Dehidrasi (5%)</option>
                      <option value="Sedang (8%)">Sedang (8%)</option>
                      <option value="Berat (>10%)">Berat (&gt;10%)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 text-xs mb-1">Temuan Pemeriksaan Fisik Detail</label>
                  <textarea
                    rows={2}
                    value={pemeriksaanFisik}
                    onChange={(e) => setPemeriksaanFisik(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  ></textarea>
                </div>
              </div>

              {/* A: ASSESSMENT */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center mr-2 text-[10px]">A</span>
                  Assessment (Diagnosa Dokter)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Diagnosa Utama (Primary Diagnosis)</label>
                    <input
                      type="text"
                      required
                      value={diagnosaUtama}
                      onChange={(e) => setDiagnosaUtama(e.target.value)}
                      placeholder="Contoh: Gastritis Akut / Panleukopenia"
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Diagnosa Banding (Differential)</label>
                    <input
                      type="text"
                      value={diagnosaBanding}
                      onChange={(e) => setDiagnosaBanding(e.target.value)}
                      placeholder="Contoh: Obsttruksi Benda Asing"
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* P: PLAN (Tindakan & Resep Obat + Racikan) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center mr-2 text-[10px]">P</span>
                  Plan (Tindakan, Resep Obat, & Obat Racikan)
                </h4>

                {/* Pilih Tindakan */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Tindakan Medis & Prosedur</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleAddTindakan(e.target.value);
                        e.target.value = '';
                      }}
                      className="text-xs p-1.5 rounded-lg border border-slate-300"
                    >
                      <option value="">+ Tambah Tindakan</option>
                      {tindakanList.map((t) => (
                        <option key={t.id} value={t.id}>{t.namaTindakan} (Rp {(t.tarif || 0).toLocaleString('id-ID')})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedTindakanItems.map((item) => (
                      <span key={item.tindakanId} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200">
                        {item.namaTindakan} - Rp {(item.tarif || 0).toLocaleString('id-ID')}
                        <button type="button" onClick={() => handleRemoveTindakan(item.tindakanId)} className="ml-2 text-rose-600 hover:text-rose-800">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pilih Resep Obat */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Resep Obat Non-Racikan</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleAddResepObat(e.target.value);
                        e.target.value = '';
                      }}
                      className="text-xs p-1.5 rounded-lg border border-slate-300"
                    >
                      <option value="">+ Tambah Obat</option>
                      {barangList.filter((b) => b.kategori === 'Obat').map((b) => (
                        <option key={b.id} value={b.id}>{b.namaBarang} (Stok: {b.stokCurrent})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-1">
                    {selectedResepItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-800">{item.namaBarang}</span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            value={item.jumlah}
                            onChange={(e) => handleUpdateResepQty(idx, parseInt(e.target.value) || 1)}
                            className="w-14 p-1 rounded border border-slate-300 text-center font-bold"
                          />
                          <input
                            type="text"
                            value={item.dosis}
                            onChange={(e) => {
                              const updated = [...selectedResepItems];
                              updated[idx].dosis = e.target.value;
                              setSelectedResepItems(updated);
                            }}
                            className="w-28 p-1 rounded border border-slate-300 text-[11px]"
                            placeholder="Aturan Pakai"
                          />
                          <span className="font-bold text-indigo-700">Rp {(item.subtotal || 0).toLocaleString('id-ID')}</span>
                          <button type="button" onClick={() => handleRemoveResep(idx)} className="text-rose-600 hover:text-rose-800">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modul Obat Racikan */}
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 flex items-center">
                      <Pill className="w-4 h-4 mr-1 text-purple-600" /> Modul Obat Racikan (Puyer / Kapsul)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSampleRacikan}
                      className="px-2.5 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-xs"
                    >
                      + Tambah Racikan (Rp 20.000)
                    </button>
                  </div>

                  <div className="space-y-1">
                    {racikanList.map((rac, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-purple-200 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-purple-900">{rac.namaRacikan} ({rac.jumlahBungkus} Bungkus)</p>
                          <p className="text-[10px] text-slate-500">{rac.aturanPakai}</p>
                        </div>
                        <span className="font-extrabold text-purple-800">Rp {(rac.totalHarga || 0).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Lanjutan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Tindakan Lanjutan</label>
                    <select
                      value={statusLanjutan}
                      onChange={(e) => setStatusLanjutan(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    >
                      <option value="Rawat Jalan">Rawat Jalan</option>
                      <option value="Rawat Inap">Rawat Inap Kandang</option>
                      <option value="Rujukan">Rujukan RS</option>
                      <option value="Meninggal">Pasien Meninggal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Anjuran Pakan / Nutrisi</label>
                    <input
                      type="text"
                      value={pakanAnjuran}
                      onChange={(e) => setPakanAnjuran(e.target.value)}
                      placeholder="Royal Canin Recovery Wet 1/2 kaleng..."
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200"
                >
                  Simpan Rekam Medis (SOAP)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
