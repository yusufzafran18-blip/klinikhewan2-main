import React, { useState } from 'react';
import {
  RekamMedis, Pasien, Dokter, Barang, Tindakan, Pendaftaran,
  DataKlinik, Transaksi, ResepItem, ObatRacikan
} from '../../types';
import {
  Stethoscope, Search, Plus, Printer, Calendar, Pill, CheckCircle2,
  MessageSquare, FileText, User, ArrowRight, Eye, Tag, AlertCircle,
  Clock, HeartPulse, RefreshCw, Filter, X, ChevronRight, ShieldAlert,
  Sparkles, Check, Send
} from 'lucide-react';
import { generateWaLink, waTemplates } from '../../services/wa';
import { printOutpatientCarePDF } from '../../services/pdf';

interface RawatJalanViewProps {
  rekamMedisList: RekamMedis[];
  pasienList: Pasien[];
  dokterList: Dokter[];
  barangList: Barang[];
  tindakanList: Tindakan[];
  pendaftaranList: Pendaftaran[];
  klinik: DataKlinik;
  transaksiList?: Transaksi[];
  onNavigateToSOAP?: (pendaftaran?: Pendaftaran) => void;
  onNavigateToKasir?: (rekamMedisId?: string) => void;
  onSaveRekamMedis?: (rm: RekamMedis) => void | Promise<void>;
  onCancelRekamMedis?: (rmId: string, alasan: string, user: string) => void | Promise<void>;
  activeUserName?: string;
}

export const RawatJalanView: React.FC<RawatJalanViewProps> = ({
  rekamMedisList = [],
  pasienList = [],
  dokterList = [],
  barangList = [],
  tindakanList = [],
  pendaftaranList = [],
  klinik,
  transaksiList = [],
  onNavigateToSOAP,
  onNavigateToKasir,
  onSaveRekamMedis,
  onCancelRekamMedis,
  activeUserName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'today' | 'control_needed' | 'with_recipe'>('all');
  
  // Modals state
  const [selectedRmForDetail, setSelectedRmForDetail] = useState<RekamMedis | null>(null);
  const [selectedRmForEtiket, setSelectedRmForEtiket] = useState<RekamMedis | null>(null);
  const [showAddOutpatientModal, setShowAddOutpatientModal] = useState(false);
  // Cancel modal for Rawat Jalan (replace prompt-based flow)
  const [showCancelRmModal, setShowCancelRmModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Quick Add Outpatient Form State
  const [formPasienId, setFormPasienId] = useState(pasienList[0]?.id || '');
  const [formDokterId, setFormDokterId] = useState(dokterList[0]?.id || '');
  const [formKeluhan, setFormKeluhan] = useState('Pemeriksaan kesehatan rutin & pengobatan jalan');
  const [formDiagnosa, setFormDiagnosa] = useState('Flu Kucing Ringan / Mild URTI');
  const [formResepList, setFormResepList] = useState<ResepItem[]>([]);
  const [formPakan, setFormPakan] = useState('');
  const [formCatatan, setFormCatatan] = useState('Istirahat cukup dan jaga kehangatan kandang');
  const [formKontrolDate, setFormKontrolDate] = useState('');

  // Temp Resep builder inside modal
  const [selectedBarangId, setSelectedBarangId] = useState(barangList[0]?.id || '');
  const [resepJumlah, setResepJumlah] = useState(1);
  const [resepDosis, setResepDosis] = useState('2x1 sdt');
  const [resepAturan, setAturan] = useState('Sesudah Makan');

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter rawat jalan records (statusLanjutan === 'Rawat Jalan' or all outpatient SOAP)
  const outpatientRecords = rekamMedisList.filter(
    (rm) => rm.plan?.statusLanjutan === 'Rawat Jalan' || !rm.plan?.statusLanjutan || rm.plan?.statusLanjutan === 'Rawat Jalan'
  );

  // Derived Statistics
  const totalOutpatient = outpatientRecords.length;
  const todayOutpatient = outpatientRecords.filter((rm) => rm.tanggal === todayStr).length;
  const controlNeededCount = outpatientRecords.filter(
    (rm) => rm.plan?.tanggalKontrolUlang && rm.plan.tanggalKontrolUlang >= todayStr
  ).length;
  const withRecipeCount = outpatientRecords.filter(
    (rm) => (rm.plan?.resepList && rm.plan.resepList.length > 0) || (rm.plan?.racikanList && rm.plan.racikanList.length > 0)
  ).length;

  // Filtered List
  const filteredList = outpatientRecords.filter((rm) => {
    const pasien = pasienList.find((p) => p.id === rm.pasienId);
    const dokter = dokterList.find((d) => d.id === rm.dokterId);

    const matchesSearch =
      (rm.noRM && rm.noRM.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pasien?.namaHewan && pasien.namaHewan.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pasien?.namaOwner && pasien.namaOwner.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rm.assessment?.diagnosaUtama && rm.assessment.diagnosaUtama.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (dokter?.nama && dokter.nama.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'today') return rm.tanggal === todayStr;
    if (statusFilter === 'control_needed') return !!rm.plan?.tanggalKontrolUlang && rm.plan.tanggalKontrolUlang >= todayStr;
    if (statusFilter === 'with_recipe') {
      return (rm.plan?.resepList && rm.plan.resepList.length > 0) || (rm.plan?.racikanList && rm.plan.racikanList.length > 0);
    }

    return true;
  });

  // Handle Adding Medicine Item in Quick Modal
  const handleAddResepItem = () => {
    const barang = barangList.find((b) => b.id === selectedBarangId);
    if (!barang) return;

    const newItem: ResepItem = {
      barangId: barang.id,
      namaBarang: barang.namaBarang,
      jumlah: resepJumlah,
      dosis: resepDosis,
      aturanPakai: resepAturan,
      hargaSatuan: barang.hargaJual,
      subtotal: barang.hargaJual * resepJumlah,
    };

    setFormResepList([...formResepList, newItem]);
  };

  const handleRemoveResepItem = (index: number) => {
    setFormResepList(formResepList.filter((_, idx) => idx !== index));
  };

  // Handle Submit New Outpatient
  const handleSubmitNewOutpatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveRekamMedis) return;

    const pasien = pasienList.find((p) => p.id === formPasienId);
    const totalHargaObat = formResepList.reduce((sum, item) => sum + item.subtotal, 0);

    const newRm: RekamMedis = {
      id: 'rm-' + Date.now(),
      noRM: `RM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      pendaftaranId: '',
      pasienId: formPasienId,
      dokterId: formDokterId,
      tanggal: todayStr,
      subjective: {
        keluhan: formKeluhan,
        anamnesa: 'Pemeriksaan rawat jalan rutin.',
        makanMinum: 'Normal',
        durasiSakit: '1-3 Hari',
      },
      objective: {
        beratBadan: 3.5,
        suhu: 38.5,
        frekuensiNapas: 24,
        detakJantung: 120,
        crt: '< 2 Detik',
        dehidrasi: 'Normal',
        pemeriksaanFisik: 'Kondisi umum compos mentis, aktif, tanda vital stabil.',
      },
      assessment: {
        diagnosaUtama: formDiagnosa,
        diagnosaBanding: '-',
      },
      plan: {
        tindakanList: [{ tindakanId: 'tdk-1', namaTindakan: 'Pemeriksaan & Konsultasi Dokter', tarif: 75000 }],
        resepList: formResepList,
        racikanList: [],
        pakanAnjuran: formPakan,
        catatanTambahan: formCatatan,
        statusLanjutan: 'Rawat Jalan',
        tanggalKontrolUlang: formKontrolDate,
      },
      totalBiaya: 75000 + totalHargaObat,
      statusPembayaran: 'Belum Lunas',
    };

    await onSaveRekamMedis(newRm);
    setShowAddOutpatientModal(false);

    // Reset Form
    setFormKeluhan('Pemeriksaan kesehatan rutin & pengobatan jalan');
    setFormDiagnosa('Flu Kucing Ringan / Mild URTI');
    setFormResepList([]);
    setFormKontrolDate('');
  };

  // WhatsApp Follow-up Link Handler
  const handleSendWaFollowup = (rm: RekamMedis) => {
    const pasien = pasienList.find((p) => p.id === rm.pasienId);
    if (!pasien) return;

    let resepStr = '- Tidak ada resep khusus';
    const resepParts: string[] = [];

    if (rm.plan?.resepList && rm.plan.resepList.length > 0) {
      rm.plan.resepList.forEach((r) => {
        resepParts.push(`• ${r.namaBarang}: ${r.dosis} (${r.aturanPakai})`);
      });
    }
    if (rm.plan?.racikanList && rm.plan.racikanList.length > 0) {
      rm.plan.racikanList.forEach((rac) => {
        resepParts.push(`• [Racikan] ${rac.namaRacikan}: ${rac.aturanPakai}`);
      });
    }

    if (resepParts.length > 0) resepStr = resepParts.join('\n');

    const waText = waTemplates.outpatientFollowup(
      pasien,
      rm.assessment?.diagnosaUtama || 'Pengobatan Jalan',
      resepStr,
      rm.plan?.tanggalKontrolUlang || '',
      klinik
    );

    window.open(generateWaLink(pasien.noHpOwner, waText), '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-200" />
            <span>Manajemen Pelayanan Medis</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Layanan Rawat Jalan (Outpatient)
          </h1>
          <p className="text-emerald-100 text-xs md:text-sm max-w-2xl">
            Kelola konsultasi, rekam medis SOAP rawat jalan, aturan pakai obat, etiket resep, serta pengingat jadwal kontrol pasien secara terpadu.
          </p>
        </div>

        <div className="relative z-10 flex items-center space-x-3">
          {onNavigateToSOAP && (
            <button
              onClick={() => onNavigateToSOAP()}
              className="px-4 py-2.5 bg-white text-teal-800 font-bold rounded-2xl hover:bg-emerald-50 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2 text-xs md:text-sm cursor-pointer"
            >
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <span>Input SOAP Rawat Jalan</span>
            </button>
          )}

          <button
            onClick={() => setShowAddOutpatientModal(true)}
            className="px-4 py-2.5 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-300/30 text-white font-bold rounded-2xl transition-all duration-200 backdrop-blur-md flex items-center space-x-2 text-xs md:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Form Rawat Jalan Ringkas</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Rawat Jalan</p>
            <h3 className="text-2xl font-extrabold text-slate-800">{totalOutpatient}</h3>
            <p className="text-[10px] text-emerald-600 font-medium">Kunjungan Terdata</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Kunjungan Hari Ini</p>
            <h3 className="text-2xl font-extrabold text-slate-800">{todayOutpatient}</h3>
            <p className="text-[10px] text-teal-600 font-medium">{todayStr}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Perlu Kontrol Ulang</p>
            <h3 className="text-2xl font-extrabold text-amber-600">{controlNeededCount}</h3>
            <p className="text-[10px] text-amber-600 font-medium">Jadwal Terjadwal</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Resep Obat Jalan</p>
            <h3 className="text-2xl font-extrabold text-slate-800">{withRecipeCount}</h3>
            <p className="text-[10px] text-indigo-600 font-medium">Obat / Racikan</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pasien, owner, no. rekam medis, diagnosa, atau dokter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({totalOutpatient})
            </button>
            <button
              onClick={() => setStatusFilter('today')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'today'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hari Ini ({todayOutpatient})
            </button>
            <button
              onClick={() => setStatusFilter('control_needed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'control_needed'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Perlu Kontrol ({controlNeededCount})
            </button>
            <button
              onClick={() => setStatusFilter('with_recipe')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'with_recipe'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Dengan Resep ({withRecipeCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid / List of Outpatient Cases */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak ada data rawat jalan ditemukan</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Gunakan kata kunci pencarian lain atau klik tombol "Input SOAP Rawat Jalan" untuk mencatat pemeriksaan pasien baru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredList.map((rm) => {
            const pasien = pasienList.find((p) => p.id === rm.pasienId);
            const dokter = dokterList.find((d) => d.id === rm.dokterId);
            const hasRecipe = (rm.plan?.resepList && rm.plan.resepList.length > 0) || (rm.plan?.racikanList && rm.plan.racikanList.length > 0);
            const isToday = rm.tanggal === todayStr;

            return (
              <div
                key={rm.id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Header Card */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                        {pasien?.fotoUrl ? (
                          <img src={pasien.fotoUrl} alt={pasien.namaHewan} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                            {pasien?.namaHewan?.[0] || 'P'}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-extrabold text-slate-900 text-base">{pasien?.namaHewan || 'Pasien'}</h3>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            {pasien?.jenisHewan || 'Hewan'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Owner: <span className="font-semibold text-slate-700">{pasien?.namaOwner || '-'}</span> ({pasien?.noHpOwner || '-'})
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 block">
                        {rm.noRM}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">{rm.tanggal}</p>
                    </div>
                  </div>

                  {/* Diagnosa & Vital Signs */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium text-[11px]">Diagnosa Utama:</span>
                      <span className="font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                        {rm.assessment?.diagnosaUtama || 'Pemeriksaan Umum'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-200/60 text-slate-600">
                      <div>BB: <span className="font-semibold text-slate-800">{rm.objective?.beratBadan || '-'} kg</span></div>
                      <div>Suhu: <span className="font-semibold text-slate-800">{rm.objective?.suhu || '-'} °C</span></div>
                      <div>Dokter: <span className="font-semibold text-slate-800">{dokter?.nama?.split(',')[0] || '-'}</span></div>
                    </div>
                  </div>

                  {/* Resep Summary Pills */}
                  {hasRecipe && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                        <Pill className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Resep & Obat Jalan:</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rm.plan?.resepList?.map((r, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100 font-medium"
                          >
                            {r.namaBarang} ({r.dosis})
                          </span>
                        ))}
                        {rm.plan?.racikanList?.map((rac, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-100 font-medium"
                          >
                            [Racikan] {rac.namaRacikan} ({rac.aturanPakai})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tanggal Kontrol Ulang Badge */}
                  {rm.plan?.tanggalKontrolUlang && (
                    <div className="flex items-center justify-between bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 text-xs">
                      <div className="flex items-center space-x-2 text-amber-800 font-semibold text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>Jadwal Kontrol Ulang:</span>
                      </div>
                      <span className="font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-md text-[11px]">
                        {rm.plan.tanggalKontrolUlang}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleSendWaFollowup(rm)}
                      title="Kirim Edukasi & Pengingat Kontrol ke WhatsApp Owner"
                      className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (pasien && dokter) printOutpatientCarePDF(rm, pasien, dokter, klinik);
                      }}
                      title="Cetak Surat Pemeriksaan Rawat Jalan (PDF)"
                      className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {hasRecipe && (
                      <button
                        onClick={() => setSelectedRmForEtiket(rm)}
                        title="Cetak Etiket Aturan Pakai Obat Jalan"
                        className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 text-xs flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Etiket Obat</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setSelectedRmForDetail(rm)}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Detail SOAP
                    </button>

                    {onNavigateToKasir && (
                      <button
                        onClick={() => onNavigateToKasir(rm.id)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-colors flex items-center space-x-1"
                      >
                        <span>Kasir</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: DETAIL SOAP MODAL */}
      {selectedRmForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Detail Rekam Medis Rawat Jalan ({selectedRmForDetail.noRM})
                  </h3>
                  <p className="text-xs text-slate-500">Tanggal Periksa: {selectedRmForDetail.tanggal}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRmForDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SOAP Sections */}
            <div className="space-y-4 text-xs">
              {/* Subjective */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-slate-800 text-sm text-emerald-700">Subjective (S)</h4>
                <p><span className="font-semibold text-slate-700">Keluhan Utama:</span> {selectedRmForDetail.subjective.keluhan}</p>
                <p><span className="font-semibold text-slate-700">Anamnesa:</span> {selectedRmForDetail.subjective.anamnesa}</p>
                <p>
                  <span className="font-semibold text-slate-700">Nafsu Makan/Minum:</span> {selectedRmForDetail.subjective.makanMinum} |{' '}
                  <span className="font-semibold text-slate-700">Durasi:</span> {selectedRmForDetail.subjective.durasiSakit}
                </p>
              </div>

              {/* Objective */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-slate-800 text-sm text-teal-700">Objective (O)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-700 font-medium">
                  <div>BB: <span className="font-bold text-slate-900">{selectedRmForDetail.objective.beratBadan} kg</span></div>
                  <div>Suhu: <span className="font-bold text-slate-900">{selectedRmForDetail.objective.suhu} °C</span></div>
                  <div>CRT: <span className="font-bold text-slate-900">{selectedRmForDetail.objective.crt}</span></div>
                  <div>Dehidrasi: <span className="font-bold text-slate-900">{selectedRmForDetail.objective.dehidrasi}</span></div>
                </div>
                <p className="pt-2"><span className="font-semibold text-slate-700">Pemeriksaan Fisik:</span> {selectedRmForDetail.objective.pemeriksaanFisik}</p>
              </div>

              {/* Assessment */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-slate-800 text-sm text-indigo-700">Assessment (A)</h4>
                <p><span className="font-semibold text-slate-700">Diagnosa Utama:</span> <strong className="text-slate-900">{selectedRmForDetail.assessment.diagnosaUtama}</strong></p>
                {selectedRmForDetail.assessment.diagnosaBanding && (
                  <p><span className="font-semibold text-slate-700">Diagnosa Banding:</span> {selectedRmForDetail.assessment.diagnosaBanding}</p>
                )}
              </div>

              {/* Plan */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-sm text-purple-700">Plan (P)</h4>
                
                {selectedRmForDetail.plan.tindakanList?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700">Tindakan Medis:</span>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-slate-800">
                      {selectedRmForDetail.plan.tindakanList.map((t, i) => (
                        <li key={i}>{t.namaTindakan} - Rp {t.tarif.toLocaleString('id-ID')}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedRmForDetail.plan.resepList?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700">Resep Obat Jalan:</span>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-slate-800">
                      {selectedRmForDetail.plan.resepList.map((r, i) => (
                        <li key={i}>
                          <strong>{r.namaBarang}</strong> ({r.jumlah} Pcs) - Dosis: {r.dosis} ({r.aturanPakai})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedRmForDetail.plan.pakanAnjuran && (
                  <p><span className="font-semibold text-slate-700">Anjuran Pakan:</span> {selectedRmForDetail.plan.pakanAnjuran}</p>
                )}

                {selectedRmForDetail.plan.catatanTambahan && (
                  <p><span className="font-semibold text-slate-700">Catatan Dokter:</span> {selectedRmForDetail.plan.catatanTambahan}</p>
                )}

                {selectedRmForDetail.plan.tanggalKontrolUlang && (
                  <p className="bg-amber-100 text-amber-900 p-2 rounded-xl font-bold">
                    Jadwal Kontrol Ulang: {selectedRmForDetail.plan.tanggalKontrolUlang}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              {typeof onCancelRekamMedis === 'function' && (
                <button
                  onClick={() => {
                    setCancelReason('');
                    setShowCancelRmModal(true);
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Batalkan Rekam Medis
                </button>
              )}

              <button
                onClick={() => setSelectedRmForDetail(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

            {/* Cancel Modal for Rawat Jalan (replaces prompt) */}
            {showCancelRmModal && selectedRmForDetail && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Batalkan Rekam Medis</h3>
                      <p className="text-sm text-slate-600">Masukkan alasan pembatalan untuk rekam medis <strong>{selectedRmForDetail.noRM}</strong>:</p>
                    </div>
                    <button onClick={() => { setShowCancelRmModal(false); setCancelReason(''); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Tuliskan alasan pembatalan..."
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none"
                    rows={4}
                  />

                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => { setShowCancelRmModal(false); setCancelReason(''); }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (!cancelReason) return;
                        onCancelRekamMedis?.(selectedRmForDetail.id, cancelReason, activeUserName || 'system');
                        setShowCancelRmModal(false);
                        setSelectedRmForDetail(null);
                        setCancelReason('');
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm"
                    >
                      Konfirmasi Batalkan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ETIKET ATURAN PAKAI OBAT STICKER MODAL */}
      {selectedRmForEtiket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Cetak Etiket Aturan Pakai Obat Jalan
                </h3>
              </div>
              <button
                onClick={() => setSelectedRmForEtiket(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Etiket Preview Cards */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {selectedRmForEtiket.plan?.resepList?.map((r, idx) => {
                const pasien = pasienList.find((p) => p.id === selectedRmForEtiket.pasienId);
                const dokter = dokterList.find((d) => d.id === selectedRmForEtiket.dokterId);

                return (
                  <div
                    key={idx}
                    className="p-4 bg-amber-50/60 rounded-2xl border-2 border-dashed border-amber-300 space-y-2 text-xs relative font-sans"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                      <div>
                        <h4 className="font-extrabold text-amber-900 text-sm uppercase">{klinik.namaKlinik}</h4>
                        <p className="text-[10px] text-amber-700">Apotek & Layanan Medis Veteriner</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                        {selectedRmForEtiket.tanggal}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-amber-950">
                      <div>Pasien: <strong>{pasien?.namaHewan}</strong> ({pasien?.jenisHewan})</div>
                      <div>Owner: <strong>{pasien?.namaOwner}</strong></div>
                      <div>No. RM: {selectedRmForEtiket.noRM}</div>
                      <div>Dokter: {dokter?.nama?.split(',')[0]}</div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1 text-center">
                      <p className="font-extrabold text-slate-900 text-sm">{r.namaBarang}</p>
                      <div className="text-indigo-900 font-extrabold text-sm py-1 bg-indigo-50 rounded-lg border border-indigo-100">
                        {r.dosis} ({r.aturanPakai})
                      </div>
                      <p className="text-[10px] text-slate-500 italic">Jumlah: {r.jumlah} Pcs / Dosis Tepat Sesuai Anjuran Dokter</p>
                    </div>
                  </div>
                );
              })}

              {(!selectedRmForEtiket.plan?.resepList || selectedRmForEtiket.plan.resepList.length === 0) && (
                <p className="text-center text-slate-500 text-xs py-4">Tidak ada resep obat jalan terdaftar pada rekam medis ini.</p>
              )}
            </div>

            {/* Print & Close Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">Etiket standar siap ditempel pada wadah/botol obat</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedRmForEtiket(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    const prevTitle = document.title;
                    document.title = `Etiket_Obat_${selectedRmForEtiket?.pasienNama || 'Pasien'}`;
                    window.print();
                    setTimeout(() => { document.title = prevTitle; }, 500);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Etiket Stiker</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH RAWAT JALAN RINGKAS */}
      {showAddOutpatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Formulir Konsultasi & Rawat Jalan Baru
                </h3>
              </div>
              <button
                onClick={() => setShowAddOutpatientModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewOutpatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilih Pasien / Hewan *</label>
                  <select
                    value={formPasienId}
                    onChange={(e) => setFormPasienId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {pasienList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.namaHewan} ({p.jenisHewan}) - Owner: {p.namaOwner}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dokter Pemeriksa *</label>
                  <select
                    value={formDokterId}
                    onChange={(e) => setFormDokterId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {dokterList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keluhan Utama *</label>
                <input
                  type="text"
                  value={formKeluhan}
                  onChange={(e) => setFormKeluhan(e.target.value)}
                  placeholder="Contoh: Bersin-bersin, gatal telinga, flu ringan"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Diagnosa Utama Rawat Jalan *</label>
                <input
                  type="text"
                  value={formDiagnosa}
                  onChange={(e) => setFormDiagnosa(e.target.value)}
                  placeholder="Contoh: Otitis Externa, Scabies, Flu Kucing"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              {/* Add Resep Items Builder */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                  <Pill className="w-4 h-4 text-indigo-600" />
                  <span>Tambah Resep Obat Jalan:</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <select
                      value={selectedBarangId}
                      onChange={(e) => setSelectedBarangId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none"
                    >
                      {barangList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.namaBarang} (Stok: {b.stokCurrent}) - Rp {b.hargaJual.toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={resepDosis}
                      onChange={(e) => setResepDosis(e.target.value)}
                      placeholder="Dosis (mis: 2x 1.5ml)"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddResepItem}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-colors"
                    >
                      + Tambah Obat
                    </button>
                  </div>
                </div>

                {/* Resep Items Table */}
                {formResepList.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {formResepList.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{item.namaBarang}</span>
                          <span className="ml-2 text-indigo-600 font-semibold">({item.dosis})</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-slate-700">Rp {item.subtotal.toLocaleString('id-ID')}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveResepItem(idx)}
                            className="text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan & Anjuran Dokter</label>
                  <input
                    type="text"
                    value={formCatatan}
                    onChange={(e) => setFormCatatan(e.target.value)}
                    placeholder="Instruksi perawatan di rumah"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jadwal Kontrol Ulang (Opsional)</label>
                  <input
                    type="date"
                    value={formKontrolDate}
                    onChange={(e) => setFormKontrolDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddOutpatientModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 cursor-pointer transition-colors"
                >
                  Simpan Rawat Jalan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
