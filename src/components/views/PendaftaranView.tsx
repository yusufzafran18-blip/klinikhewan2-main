import React, { useState, useEffect } from 'react';
import { Pendaftaran, Pasien, Dokter, User, Spesies, JenisHewan, JenisKelaminHewan, JenisLayananPendaftaran } from '../../types';
import {
  ClipboardList, Plus, Search, Clock, CheckCircle2, XCircle,
  Stethoscope, Calendar, Phone, User as UserIcon, BedDouble,
  ArrowRight, ShieldAlert, Sparkles, Check, AlertCircle, Info,
  Filter, HeartPulse, MapPin, Tag, RefreshCw, Printer
} from 'lucide-react';

interface PendaftaranViewProps {
  pendaftaranList: Pendaftaran[];
  pasienList: Pasien[];
  dokterList: Dokter[];
  spesiesList?: Spesies[];
  activeUser: User;
  onSavePendaftaran: (pdf: Pendaftaran) => void | Promise<void>;
  onSavePasien?: (pasien: Pasien) => void | Promise<void>;
  onUpdateStatus: (id: string, status: 'Antri' | 'Diperiksa' | 'Selesai' | 'Batal') => void;
  onStartExamine: (pendaftaran: Pendaftaran) => void;
  onNavigateToRawatInap?: (inapId?: string) => void;
  onNavigateToRawatJalan?: (pendaftaran?: Pendaftaran) => void;
  preselectedPasienId?: string;
  onClearPreselectedPasien?: () => void;
}

export const PendaftaranView: React.FC<PendaftaranViewProps> = ({
  pendaftaranList = [],
  pasienList = [],
  dokterList = [],
  spesiesList = [],
  activeUser,
  onSavePendaftaran,
  onSavePasien,
  onUpdateStatus,
  onStartExamine,
  onNavigateToRawatInap,
  onNavigateToRawatJalan,
  preselectedPasienId,
  onClearPreselectedPasien,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [activeRegistrationType, setActiveRegistrationType] = useState<'existing' | 'new'>('existing');
  
  // Tab Filter in Queue List
  const [serviceFilter, setServiceFilter] = useState<'all' | 'Rawat Jalan' | 'Rawat Inap'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Antri' | 'Diperiksa' | 'Selesai' | 'Batal'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields - Existing Patient
  const [selectedPasienId, setSelectedPasienId] = useState('');
  const [pasienSearchTerm, setPasienSearchTerm] = useState('');

  // Form Fields - New Patient & Owner
  const defaultSpecies = ['Kucing', 'Anjing', 'Kelinci', 'Burung', 'Reptil', 'Hamster', 'Sugar Glider', 'Lainnya'];
  const speciesOptions = spesiesList.length > 0 
    ? Array.from(new Set(spesiesList.map(s => s.namaSpesies))) 
    : defaultSpecies;

  const [newOwnerNama, setNewOwnerNama] = useState('');
  const [newOwnerHp, setNewOwnerHp] = useState('');
  const [newOwnerAlamat, setNewOwnerAlamat] = useState('');
  const [newHewanNama, setNewHewanNama] = useState('');
  const [newHewanJenis, setNewHewanJenis] = useState<JenisHewan>(speciesOptions[0] || 'Kucing');
  const [newHewanRas, setNewHewanRas] = useState('Domestic Short Hair');
  const [newHewanGender, setNewHewanGender] = useState<JenisKelaminHewan>('Jantan');
  const [newHewanTglLahir, setNewHewanTglLahir] = useState(new Date().toISOString().slice(0, 10));
  const [newHewanWarna, setNewHewanWarna] = useState('');
  const [newHewanCatatan, setNewHewanCatatan] = useState('');

  // Form Fields - Treatment & Allocation
  const [selectedJenisLayanan, setSelectedJenisLayanan] = useState<JenisLayananPendaftaran>('Rawat Jalan');
  const [selectedDokterId, setSelectedDokterId] = useState(dokterList[0]?.id || '');
  const [keluhan, setKeluhan] = useState('');
  const [layananSpesifik, setLayananSpesifik] = useState('Pemeriksaan Umum / Konsultasi');
  
  // Specific for Rawat Inap
  const [noKandang, setNoKandang] = useState('Kandang Kucing A-01');
  const [tarifPerHari, setTarifPerHari] = useState(100000);

  // Trigger modal if preselectedPasienId exists
  useEffect(() => {
    if (preselectedPasienId) {
      setSelectedPasienId(preselectedPasienId);
      setActiveRegistrationType('existing');
      setShowModal(true);
      if (onClearPreselectedPasien) {
        onClearPreselectedPasien();
      }
    }
  }, [preselectedPasienId, onClearPreselectedPasien]);

  const selectedPasienDetail = pasienList.find((p) => p.id === selectedPasienId);

  // Filtered dropdown for existing patients
  const selectablePasiens = pasienList.filter((p) => {
    if (!pasienSearchTerm) return true;
    const term = pasienSearchTerm.toLowerCase();
    return (
      p.namaHewan.toLowerCase().includes(term) ||
      p.namaOwner.toLowerCase().includes(term) ||
      p.kodePasien.toLowerCase().includes(term) ||
      p.jenisHewan.toLowerCase().includes(term) ||
      (p.noHpOwner && p.noHpOwner.includes(term))
    );
  });

  const handleOpenModal = (type: 'existing' | 'new' = 'existing') => {
    setActiveRegistrationType(type);
    if (type === 'existing' && !selectedPasienId && pasienList.length > 0) {
      setSelectedPasienId(pasienList[0].id);
    }
    if (!selectedDokterId && dokterList.length > 0) {
      setSelectedDokterId(dokterList[0].id);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetPasienId = selectedPasienId;

    // If new patient, register patient & owner first to master data
    if (activeRegistrationType === 'new') {
      if (!newOwnerNama.trim()) return alert('Mohon isi nama pemilik (Owner)!');
      if (!newOwnerHp.trim()) return alert('Mohon isi nomor HP/WhatsApp pemilik!');
      if (!newHewanNama.trim()) return alert('Mohon isi nama hewan/pasien!');

      const newPasienCount = pasienList.length + 1;
      const newPasienId = 'pasien-' + Date.now();
      const newPasien: Pasien = {
        id: newPasienId,
        kodePasien: `PAS-${new Date().getFullYear()}-${String(newPasienCount).padStart(3, '0')}`,
        namaHewan: newHewanNama.trim(),
        jenisHewan: newHewanJenis,
        ras: newHewanRas || 'Domestic',
        jenisKelamin: newHewanGender,
        tanggalLahir: newHewanTglLahir,
        warna: newHewanWarna || 'Tricolor',
        namaOwner: newOwnerNama.trim(),
        noHpOwner: newOwnerHp.trim(),
        alamatOwner: newOwnerAlamat.trim() || 'Alamat Belum Diisi',
        catatanKhusus: newHewanCatatan || 'Pasien Baru via Pendaftaran',
        createdAt: new Date().toISOString().split('T')[0],
      };

      if (onSavePasien) {
        await onSavePasien(newPasien);
      }
      targetPasienId = newPasienId;
    } else {
      if (!targetPasienId) return alert('Silakan pilih pasien yang terdaftar!');
    }

    if (!selectedDokterId) return alert('Silakan pilih dokter pemeriksa/penanggung jawab!');

    const todayDate = new Date().toISOString().split('T')[0];
    const todayPendaftarans = pendaftaranList.filter((p) => p.tanggal === todayDate);
    const prefix = selectedJenisLayanan === 'Rawat Inap' ? 'RI' : 'RJ';
    const noAntrian = `${prefix}-${String(todayPendaftarans.length + 1).padStart(3, '0')}`;

    const newPendaftaran: Pendaftaran = {
      id: 'pdf-' + Date.now(),
      noAntrian,
      pasienId: targetPasienId,
      dokterId: selectedDokterId,
      tanggal: todayDate,
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      keluhanUtama: keluhan.trim() || (selectedJenisLayanan === 'Rawat Inap' ? 'Observasi Rawat Inap' : 'Pemeriksaan Rutin'),
      layananDipilih: selectedJenisLayanan === 'Rawat Inap' ? `Rawat Inap - ${noKandang}` : layananSpesifik,
      jenisLayanan: selectedJenisLayanan,
      rawatInapDetail: selectedJenisLayanan === 'Rawat Inap' ? {
        noKandang,
        tarifPerHari,
        diagnosaAwal: keluhan.trim() || 'Observasi Rawat Inap',
      } : undefined,
      status: 'Antri',
      petugasId: activeUser.id,
    };

    await onSavePendaftaran(newPendaftaran);
    setShowModal(false);

    // Reset Form Fields
    setKeluhan('');
    setPasienSearchTerm('');
    if (activeRegistrationType === 'new') {
      setNewOwnerNama('');
      setNewOwnerHp('');
      setNewOwnerAlamat('');
      setNewHewanNama('');
      setNewHewanWarna('');
      setNewHewanCatatan('');
    }
  };

  // Filter queue list
  const filteredPendaftaran = pendaftaranList.filter((p) => {
    const pasien = pasienList.find((ps) => ps.id === p.pasienId);
    const text = `${p.noAntrian} ${pasien?.namaHewan} ${pasien?.namaOwner} ${p.keluhanUtama} ${p.layananDipilih}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Service filter (Rawat Jalan / Rawat Inap)
    const pService = p.jenisLayanan || (p.layananDipilih?.toLowerCase().includes('inap') ? 'Rawat Inap' : 'Rawat Jalan');
    if (serviceFilter !== 'all' && pService !== serviceFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;

    return true;
  });

  // Statistics counters
  const totalAntrianHariIni = pendaftaranList.filter((p) => p.tanggal === new Date().toISOString().split('T')[0]).length;
  const countRawatJalan = pendaftaranList.filter((p) => {
    const s = p.jenisLayanan || (p.layananDipilih?.toLowerCase().includes('inap') ? 'Rawat Inap' : 'Rawat Jalan');
    return s === 'Rawat Jalan' && (p.status === 'Antri' || p.status === 'Diperiksa');
  }).length;
  const countRawatInap = pendaftaranList.filter((p) => {
    const s = p.jenisLayanan || (p.layananDipilih?.toLowerCase().includes('inap') ? 'Rawat Inap' : 'Rawat Jalan');
    return s === 'Rawat Inap' && (p.status === 'Antri' || p.status === 'Diperiksa');
  }).length;
  const countSelesai = pendaftaranList.filter((p) => p.status === 'Selesai').length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Visual Clinical Workflow Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
              <ClipboardList className="w-3.5 h-3.5 text-indigo-200" />
              <span>Alur Registrasi & Triase Layanan Terpadu</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              Pendaftaran Pasien & Alokasi Perawatan
            </h1>
            <p className="text-indigo-100 text-xs md:text-sm leading-relaxed">
              Daftarkan pasien lama atau pasien baru, tentukan jenis perawatan (<strong>Rawat Jalan</strong> atau <strong>Rawat Inap</strong>), dan sistem akan otomatis meneruskan antrian ke dokter poli atau ruang rawat inap.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenModal('existing')}
              className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold rounded-2xl transition-all shadow-md flex items-center space-x-2 text-xs md:text-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Daftar Pasien Lama</span>
            </button>

            <button
              onClick={() => handleOpenModal('new')}
              className="px-4 py-2.5 bg-indigo-950/50 hover:bg-indigo-950/70 border border-white/20 text-white font-bold rounded-2xl transition-all backdrop-blur-md flex items-center space-x-2 text-xs md:text-sm cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-emerald-300" />
              <span>+ Pasien & Owner Baru</span>
            </button>
          </div>
        </div>

        {/* Visual Workflow Steps Bar */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/60 flex items-center justify-center font-black text-white text-xs shrink-0">
              1
            </div>
            <div>
              <p className="font-bold text-white">Identifikasi Pasien</p>
              <p className="text-[11px] text-indigo-200">Pasien Baru (Input Master) / Pasien Lama (Pilih Langsung)</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/60 flex items-center justify-center font-black text-white text-xs shrink-0">
              2
            </div>
            <div>
              <p className="font-bold text-white">Tentukan Layanan</p>
              <p className="text-[11px] text-indigo-200">Pilih 🩺 Rawat Jalan (Poli) atau 🏥 Rawat Inap (Kandang)</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/60 flex items-center justify-center font-black text-white text-xs shrink-0">
              3
            </div>
            <div>
              <p className="font-bold text-white">Masuk Antrian Otomatis</p>
              <p className="text-[11px] text-indigo-200">Data otomatis terdistribusi ke modul Rawat Jalan / Inap</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Pendaftaran Hari Ini</p>
            <h3 className="text-xl font-extrabold text-slate-800">{totalAntrianHariIni}</h3>
            <p className="text-[10px] text-indigo-600 font-semibold">Total Registrasi</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Antrian Rawat Jalan</p>
            <h3 className="text-xl font-extrabold text-emerald-600">{countRawatJalan}</h3>
            <p className="text-[10px] text-emerald-600 font-semibold">Poli & Konsultasi</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Antrian Rawat Inap</p>
            <h3 className="text-xl font-extrabold text-purple-600">{countRawatInap}</h3>
            <p className="text-[10px] text-purple-600 font-semibold">Opname Kandang</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Selesai Ditangani</p>
            <h3 className="text-xl font-extrabold text-slate-800">{countSelesai}</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Pelayanan Selesai</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Main Service Filter Buttons */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setServiceFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                serviceFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Antrian ({pendaftaranList.length})
            </button>

            <button
              onClick={() => setServiceFilter('Rawat Jalan')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                serviceFilter === 'Rawat Jalan'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>🩺 Antrian Rawat Jalan ({pendaftaranList.filter(p => (p.jenisLayanan || 'Rawat Jalan') === 'Rawat Jalan').length})</span>
            </button>

            <button
              onClick={() => setServiceFilter('Rawat Inap')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                serviceFilter === 'Rawat Inap'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>🏥 Antrian Rawat Inap ({pendaftaranList.filter(p => p.jenisLayanan === 'Rawat Inap' || p.layananDipilih?.toLowerCase().includes('inap')).length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari antrian, nama anabul, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />
          </div>
        </div>

        {/* Sub Status Filters */}
        <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] text-slate-400 font-semibold mr-1">Status:</span>
          {(['all', 'Antri', 'Diperiksa', 'Selesai', 'Batal'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {st === 'all' ? 'Semua Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Queue List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">No. Antrian</th>
                <th className="p-4">Jenis Rawat / Layanan</th>
                <th className="p-4">Pasien Hewan & Owner</th>
                <th className="p-4">Dokter PJ / Poli</th>
                <th className="p-4">Keluhan / Anamnesa</th>
                <th className="p-4">Waktu</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi Terpadu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPendaftaran.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">Tidak ada data pendaftaran yang sesuai</p>
                    <p className="text-xs text-slate-400 mt-0.5">Silakan tambahkan pendaftaran pasien baru atau ubah filter pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredPendaftaran.map((p) => {
                  const pasien = pasienList.find((ps) => ps.id === p.pasienId);
                  const dokter = dokterList.find((d) => d.id === p.dokterId);
                  const isRawatInap = p.jenisLayanan === 'Rawat Inap' || p.layananDipilih?.toLowerCase().includes('inap');

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <span className={`px-3 py-1.5 font-black rounded-xl text-xs border ${
                          isRawatInap
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {p.noAntrian}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {isRawatInap ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200/80 rounded-lg text-[11px] font-bold">
                              <BedDouble className="w-3.5 h-3.5" />
                              <span>Rawat Inap</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-lg text-[11px] font-bold">
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Rawat Jalan</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium truncate max-w-[140px]">
                          {p.layananDipilih || (isRawatInap ? 'Opname' : 'Pemeriksaan Umum')}
                        </p>
                      </td>

                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{pasien?.namaHewan || 'Pasien'}</p>
                          <p className="text-[11px] text-slate-400">
                            {pasien?.jenisHewan} ({pasien?.ras || 'Ras -'}) • Owner: <span className="text-slate-700 font-semibold">{pasien?.namaOwner}</span>
                          </p>
                          {pasien?.noHpOwner && (
                            <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              <span>{pasien.noHpOwner}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-800">{dokter?.nama || 'Dokter'}</p>
                        <p className="text-[10px] text-slate-400">{dokter?.spesialisasi || 'Dokter Hewan'}</p>
                      </td>

                      <td className="p-4 max-w-xs">
                        <p className="truncate text-slate-700 font-medium">{p.keluhanUtama || '-'}</p>
                        {isRawatInap && p.rawatInapDetail?.noKandang && (
                          <span className="inline-block mt-0.5 text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">
                            {p.rawatInapDetail.noKandang}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.waktu} WIB</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{p.tanggal}</span>
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
                          {/* Contextual Action based on Service */}
                          {!isRawatInap ? (
                            // Rawat Jalan Action
                            <>
                              {p.status === 'Antri' && (
                                <button
                                  onClick={() => {
                                    onUpdateStatus(p.id, 'Diperiksa');
                                    onStartExamine(p);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1 transition-all shadow-xs cursor-pointer"
                                  title="Mulai Rekam Medis (SOAP)"
                                >
                                  <Stethoscope className="w-3.5 h-3.5" />
                                  <span>Mulai SOAP RJ</span>
                                </button>
                              )}

                              {p.status === 'Diperiksa' && (
                                <button
                                  onClick={() => onStartExamine(p)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-xs cursor-pointer"
                                  title="Lanjutkan Pemeriksaan SOAP"
                                >
                                  <Stethoscope className="w-3.5 h-3.5" />
                                  <span>Lanjut SOAP</span>
                                </button>
                              )}
                            </>
                          ) : (
                            // Rawat Inap Action
                            <button
                              onClick={() => {
                                if (onNavigateToRawatInap) {
                                  onNavigateToRawatInap(p.rawatInapId);
                                }
                              }}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1 transition-all shadow-xs cursor-pointer"
                              title="Buka Lembar Monitoring Rawat Inap"
                            >
                              <BedDouble className="w-3.5 h-3.5" />
                              <span>Monitoring Rawat Inap</span>
                            </button>
                          )}

                          {p.status !== 'Selesai' && p.status !== 'Batal' && (
                            <button
                              onClick={() => onUpdateStatus(p.id, 'Batal')}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="Batalkan Pendaftaran"
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

      {/* Modal Form Pendaftaran Berobat & Alokasi Layanan */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 my-8 animate-in fade-in duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Form Pendaftaran Berobat & Alur Layanan</h3>
                  <p className="text-xs text-slate-500">Registrasi pasien, verifikasi data owner, dan alokasi rawat jalan/inap</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 mt-4">
              
              {/* STEP 1: PILIH PASIEN LAMA VS PASIEN BARU */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Status Pasien</span>
                  </label>

                  <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveRegistrationType('existing')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeRegistrationType === 'existing'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ✓ Pasien Lama (Sudah Terdaftar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveRegistrationType('new')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeRegistrationType === 'new'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      + Pasien Baru (Belum Terdaftar)
                    </button>
                  </div>
                </div>

                {/* Option A: Pasien Lama */}
                {activeRegistrationType === 'existing' ? (
                  <div className="space-y-3 pt-1">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ketik untuk mencari nama hewan, nama owner, no HP, atau no RM..."
                        value={pasienSearchTerm}
                        onChange={(e) => setPasienSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <select
                      value={selectedPasienId}
                      onChange={(e) => setSelectedPasienId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                      required
                    >
                      <option value="">-- Pilih Pasien Hewan Terdaftar ({selectablePasiens.length} Pasien Ditemukan) --</option>
                      {selectablePasiens.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.kodePasien} | {p.namaHewan} ({p.jenisHewan} - {p.ras}) — Owner: {p.namaOwner} ({p.noHpOwner})
                        </option>
                      ))}
                    </select>

                    {/* Quick Preview Card of Selected Patient */}
                    {selectedPasienDetail && (
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-xs text-emerald-950 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 text-sm">{selectedPasienDetail.namaHewan}</span>
                            <span className="px-2 py-0.5 bg-emerald-200/70 text-emerald-900 rounded-md text-[10px] font-bold">{selectedPasienDetail.jenisHewan}</span>
                            <span className="text-slate-500 text-[11px]">({selectedPasienDetail.ras})</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            Owner: <strong className="text-slate-800">{selectedPasienDetail.namaOwner}</strong> • Telp: {selectedPasienDetail.noHpOwner}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-md">
                            Alamat: {selectedPasienDetail.alamatOwner}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Data Terverifikasi</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Option B: Form Input Pasien & Owner Baru Langsung
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start space-x-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>Data Pasien & Owner yang Anda input di bawah ini akan <strong>otomatis disimpan ke Master Data Pasien</strong> dan langsung didaftarkan ke antrian pelayanan.</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Pemilik / Owner *</label>
                        <input
                          type="text"
                          required
                          placeholder="Nama lengkap owner"
                          value={newOwnerNama}
                          onChange={(e) => setNewOwnerNama(e.target.value)}
                          className="w-full text-xs p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">No. HP / WhatsApp *</label>
                        <input
                          type="text"
                          required
                          placeholder="08123456789"
                          value={newOwnerHp}
                          onChange={(e) => setNewOwnerHp(e.target.value)}
                          className="w-full text-xs p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Owner</label>
                        <input
                          type="text"
                          placeholder="Alamat domisili pemilik"
                          value={newOwnerAlamat}
                          onChange={(e) => setNewOwnerAlamat(e.target.value)}
                          className="w-full text-xs p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Hewan / Anabul *</label>
                        <input
                          type="text"
                          required
                          placeholder="Nama panggilan hewan"
                          value={newHewanNama}
                          onChange={(e) => setNewHewanNama(e.target.value)}
                          className="w-full text-xs p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis / Spesies Hewan *</label>
                        <select
                          value={newHewanJenis}
                          onChange={(e) => setNewHewanJenis(e.target.value as JenisHewan)}
                          className="w-full text-xs p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          {speciesOptions.map((sp) => (
                            <option key={sp} value={sp}>{sp}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Ras / Breed</label>
                        <input
                          type="text"
                          placeholder="Persia / Beagle / Kampung / dsb"
                          value={newHewanRas}
                          onChange={(e) => setNewHewanRas(e.target.value)}
                          className="w-full text-xs p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                        <select
                          value={newHewanGender}
                          onChange={(e) => setNewHewanGender(e.target.value as JenisKelaminHewan)}
                          className="w-full text-xs p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="Jantan">Jantan</option>
                          <option value="Betina">Betina</option>
                          <option value="Jantan Kastrasi">Jantan Kastrasi</option>
                          <option value="Betina Steril">Betina Steril</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: PENENTUAN STATUS PERAWATAN (RAWAT JALAN VS RAWAT INAP) */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Tentukan Jenis Pelayanan / Perawatan *</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card Option: Rawat Jalan */}
                  <label
                    onClick={() => setSelectedJenisLayanan('Rawat Jalan')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start space-x-3 ${
                      selectedJenisLayanan === 'Rawat Jalan'
                        ? 'border-emerald-500 bg-emerald-50/80 shadow-md shadow-emerald-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="jenisLayanan"
                      checked={selectedJenisLayanan === 'Rawat Jalan'}
                      onChange={() => setSelectedJenisLayanan('Rawat Jalan')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <Stethoscope className="w-4 h-4 text-emerald-600" />
                        <span className="font-extrabold text-slate-900 text-xs">🩺 Rawat Jalan (Poli)</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Konsultasi dokter, pemeriksaan fisik, vaksinasi, pemberian resep, atau tindakan tanpa menginap.
                      </p>
                      <span className="inline-block text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded">
                        ➔ Otomatis masuk antrian Rawat Jalan
                      </span>
                    </div>
                  </label>

                  {/* Card Option: Rawat Inap */}
                  <label
                    onClick={() => setSelectedJenisLayanan('Rawat Inap')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start space-x-3 ${
                      selectedJenisLayanan === 'Rawat Inap'
                        ? 'border-purple-500 bg-purple-50/80 shadow-md shadow-purple-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="jenisLayanan"
                      checked={selectedJenisLayanan === 'Rawat Inap'}
                      onChange={() => setSelectedJenisLayanan('Rawat Inap')}
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <BedDouble className="w-4 h-4 text-purple-600" />
                        <span className="font-extrabold text-slate-900 text-xs">🏥 Rawat Inap (Opname)</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Perawatan intensif kandang, terapi infus, monitoring berkala, dan pengawasan medis 24 jam.
                      </p>
                      <span className="inline-block text-[10px] text-purple-700 font-bold bg-purple-100/70 px-2 py-0.5 rounded">
                        ➔ Otomatis masuk antrian Rawat Inap
                      </span>
                    </div>
                  </label>
                </div>

                {/* Sub-inputs if Rawat Jalan */}
                {selectedJenisLayanan === 'Rawat Jalan' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Pilihan Layanan Rawat Jalan</label>
                    <select
                      value={layananSpesifik}
                      onChange={(e) => setLayananSpesifik(e.target.value)}
                      className="w-full text-xs p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Pemeriksaan Umum / Konsultasi">Pemeriksaan Umum / Konsultasi</option>
                      <option value="Vaksinasi Rutin">Vaksinasi Rutin</option>
                      <option value="Pemeriksaan Kulit & Dermatologi">Pemeriksaan Kulit & Dermatologi</option>
                      <option value="Pemeriksaan Gigi / Scaling">Pemeriksaan Gigi / Scaling</option>
                      <option value="Tindakan Bedah Minor Jalan">Tindakan Bedah Minor Jalan</option>
                      <option value="Grooming Medis / Kutu & Jamur">Grooming Medis / Kutu & Jamur</option>
                    </select>
                  </div>
                )}

                {/* Sub-inputs if Rawat Inap */}
                {selectedJenisLayanan === 'Rawat Inap' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">No. / Ruang Kandang</label>
                      <select
                        value={noKandang}
                        onChange={(e) => setNoKandang(e.target.value)}
                        className="w-full text-xs p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                      >
                        <option value="Kandang Kucing A-01">Kandang Kucing A-01</option>
                        <option value="Kandang Kucing A-02">Kandang Kucing A-02</option>
                        <option value="Kandang Kucing A-03">Kandang Kucing A-03</option>
                        <option value="Kandang Anjing B-01">Kandang Anjing B-01</option>
                        <option value="Kandang Anjing B-02">Kandang Anjing B-02</option>
                        <option value="Kandang Isolasi C-01">Kandang Isolasi C-01 (Infeksius)</option>
                        <option value="Kandang Khusus Observasi">Kandang Khusus Observasi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tarif Rawat Inap (Rp / Hari)</label>
                      <input
                        type="number"
                        value={tarifPerHari}
                        onChange={(e) => setTarifPerHari(Number(e.target.value) || 0)}
                        className="w-full text-xs p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: DOKTER PEMERIKSA & KELUHAN */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Dokter Penanggung Jawab & Keluhan Pasien *</span>
                </label>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pilih Dokter Hewan *</label>
                  <select
                    value={selectedDokterId}
                    onChange={(e) => setSelectedDokterId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  >
                    {dokterList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama} — {d.spesialisasi}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Keluhan Utama / Gejala Awal</label>
                  <textarea
                    rows={3}
                    value={keluhan}
                    onChange={(e) => setKeluhan(e.target.value)}
                    placeholder="Tuliskan keluhan yang dirasakan, contoh: Anabul muntah 2x, lemas, nafsu makan turun sejak 2 hari yang lalu..."
                    className="w-full text-xs p-2.5 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  ></textarea>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Batal
                </button>
                
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center space-x-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Simpan & Daftarkan ke {selectedJenisLayanan === 'Rawat Inap' ? 'Rawat Inap' : 'Rawat Jalan'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
