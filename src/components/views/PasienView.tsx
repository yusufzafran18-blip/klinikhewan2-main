import React, { useState } from 'react';
import { Pasien, RekamMedis, Dokter, RiwayatVaksinasi, DataKlinik, JenisHewan, JenisKelaminHewan, Spesies } from '../../types';
import { ModulePermissions } from '../../utils/rbac';
import {
  Users, Plus, Search, Eye, Award, FileText, FileSpreadsheet,
  Edit, Trash2, HeartPulse, ShieldAlert, Phone, Mail, MapPin, X,
  LayoutGrid, List, AlertTriangle
} from 'lucide-react';
import { exportToExcel } from '../../services/excel';
import { SuratModal } from '../common/SuratModal';

interface PasienViewProps {
  pasienList: Pasien[];
  rekamMedisList: RekamMedis[];
  dokterList: Dokter[];
  vaksinasiList: RiwayatVaksinasi[];
  spesiesList?: Spesies[];
  klinik: DataKlinik;
  permissions?: ModulePermissions;
  onSavePasien: (pasien: Pasien) => void;
  onDeletePasien: (id: string) => void;
  onRegisterTreatment?: (pasienId: string) => void;
}

export const PasienView: React.FC<PasienViewProps> = ({
  pasienList = [],
  rekamMedisList = [],
  dokterList = [],
  vaksinasiList = [],
  spesiesList = [],
  klinik,
  permissions,
  onSavePasien,
  onDeletePasien,
  onRegisterTreatment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPasien, setEditingPasien] = useState<Pasien | null>(null);

  // Detail Modal State & Delete Confirmation State
  const [selectedPasienForDetail, setSelectedPasienForDetail] = useState<Pasien | null>(null);
  const [selectedPasienForSurat, setSelectedPasienForSurat] = useState<Pasien | null>(null);
  const [pasienToDelete, setPasienToDelete] = useState<Pasien | null>(null);

  const handleConfirmDelete = () => {
    if (!pasienToDelete) return;
    onDeletePasien(pasienToDelete.id);
    if (selectedPasienForDetail?.id === pasienToDelete.id) {
      setSelectedPasienForDetail(null);
    }
    setPasienToDelete(null);
  };

  // Default species list options
  const defaultSpecies = ['Kucing', 'Anjing', 'Kelinci', 'Burung', 'Reptil', 'Hamster', 'Sugar Glider', 'Lainnya'];
  const speciesOptions = spesiesList.length > 0 
    ? Array.from(new Set(spesiesList.map(s => s.namaSpesies))) 
    : defaultSpecies;

  // Form inputs
  const [namaHewan, setNamaHewan] = useState('');
  const [jenisHewan, setJenisHewan] = useState<JenisHewan>(speciesOptions[0] || 'Kucing');
  const [ras, setRas] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<JenisKelaminHewan>('Jantan Kastrasi');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [warna, setWarna] = useState('');
  const [noMicrochip, setNoMicrochip] = useState('');
  const [namaOwner, setNamaOwner] = useState('');
  const [noHpOwner, setNoHpOwner] = useState('');
  const [alamatOwner, setAlamatOwner] = useState('');
  const [catatanKhusus, setCatatanKhusus] = useState('');

  const handleOpenAdd = () => {
    setEditingPasien(null);
    setNamaHewan('');
    setJenisHewan(speciesOptions[0] || 'Kucing');
    setRas('Domestic Short Hair');
    setJenisKelamin('Jantan Kastrasi');
    setTanggalLahir('2024-01-01');
    setWarna('Hitam Putih');
    setNoMicrochip('');
    setNamaOwner('');
    setNoHpOwner('');
    setAlamatOwner('');
    setCatatanKhusus('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (p: Pasien) => {
    setEditingPasien(p);
    setNamaHewan(p.namaHewan);
    setJenisHewan(p.jenisHewan);
    setRas(p.ras);
    setJenisKelamin(p.jenisKelamin);
    setTanggalLahir(p.tanggalLahir);
    setWarna(p.warna);
    setNoMicrochip(p.noMicrochip || '');
    setNamaOwner(p.namaOwner);
    setNoHpOwner(p.noHpOwner);
    setAlamatOwner(p.alamatOwner);
    setCatatanKhusus(p.catatanKhusus || '');
    setShowFormModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !editingPasien;
    const count = pasienList.length + 1;
    const kode = isNew ? `PAS-2026-${String(count).padStart(3, '0')}` : editingPasien.kodePasien;

    const newPasien: Pasien = {
      id: editingPasien ? editingPasien.id : 'pas-' + Date.now(),
      kodePasien: kode,
      namaHewan,
      jenisHewan,
      ras,
      jenisKelamin,
      tanggalLahir,
      umurFormat: '2 Tahun 4 Bulan',
      warna,
      noMicrochip: noMicrochip || undefined,
      namaOwner,
      noHpOwner,
      alamatOwner,
      fotoUrl: editingPasien?.fotoUrl || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&auto=format&fit=crop&q=80',
      catatanKhusus: catatanKhusus || undefined,
      createdAt: editingPasien ? editingPasien.createdAt : new Date().toISOString().split('T')[0],
    };

    onSavePasien(newPasien);
    setShowFormModal(false);
  };

  const handleExportExcel = () => {
    const exportData = pasienList.map((p) => ({
      'Kode Pasien': p.kodePasien,
      'Nama Hewan': p.namaHewan,
      'Jenis Hewan': p.jenisHewan,
      'Ras/Breed': p.ras,
      'Jenis Kelamin': p.jenisKelamin,
      'Tgl Lahir': p.tanggalLahir,
      'Warna': p.warna,
      'No. Microchip': p.noMicrochip || '-',
      'Nama Owner': p.namaOwner,
      'No HP Owner': p.noHpOwner,
      'Alamat': p.alamatOwner,
      'Catatan Khusus': p.catatanKhusus || '-'
    }));
    exportToExcel(exportData, 'Data_Pasien_VetCare');
  };

  const filteredPasien = pasienList.filter((p) => {
    const matchSearch = `${p.kodePasien} ${p.namaHewan} ${p.namaOwner} ${p.ras}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSpecies = speciesFilter === 'Semua' || p.jenisHewan === speciesFilter;
    return matchSearch && matchSpecies;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Master Data Pasien & Owner</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Kelola direktori hewan peliharaan, riwayat rekam medis, & riwayat vaksinasi</p>
        </div>

        <div className="flex items-center space-x-2">
          {permissions?.canExport !== false && (
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 flex items-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          )}
          {permissions?.canCreate !== false && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pasien Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar & Clinical Flow Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 flex items-start space-x-3">
        <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
          <HeartPulse className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <p className="font-extrabold text-indigo-950">Pedoman Alur Berobat Pasien Terdaftar (Pasien Lama):</p>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Pasien yang sudah terdaftar di master data ini <strong>tidak perlu diinput ulang</strong> saat datang berobat. Cukup klik tombol <strong>"Daftar Berobat"</strong> pada baris pasien untuk langsung membuat nomor antrian dan menentukan alokasi <strong>Rawat Jalan (Poli)</strong> atau <strong>Rawat Inap (Kandang)</strong>.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center space-x-2 w-full sm:w-auto flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama hewan, kode pasien, atau nama owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Spesies:</span>
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Semua">Semua Spesies</option>
            {speciesOptions.map((sp) => (
              <option key={sp} value={sp}>{sp}</option>
            ))}
          </select>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Kartu (Grid)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Tabel Data"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Grid or Table View */}
      {viewMode === 'grid' ? (
        /* Grid Card Pasien */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPasien.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
              Tidak ada data pasien hewan yang sesuai pencarian.
            </div>
          ) : (
            filteredPasien.map((p) => {
              const rmCount = rekamMedisList.filter((r) => r.pasienId === p.id).length;
              const vakCount = vaksinasiList.filter((v) => v.pasienId === p.id).length;

              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={p.fotoUrl || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&auto=format&fit=crop&q=80'}
                          alt={p.namaHewan}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-extrabold text-slate-800">{p.namaHewan}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                              {p.kodePasien}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{p.jenisHewan} • {p.ras}</p>
                        </div>
                      </div>

                      {onRegisterTreatment && (
                        <button
                          onClick={() => onRegisterTreatment(p.id)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer transition-all"
                          title="Daftarkan Berobat (Rawat Jalan / Rawat Inap)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Daftar Berobat</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Jenis Kelamin:</span>
                        <span className="font-semibold text-slate-700">{p.jenisKelamin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Owner (Pemilik):</span>
                        <span className="font-bold text-slate-800">{p.namaOwner} ({p.noHpOwner})</span>
                      </div>
                      {p.catatanKhusus && (
                        <div className="mt-2 p-2 bg-rose-50 text-rose-800 rounded-lg text-[11px] font-medium border border-rose-100">
                          ⚠️ <span className="font-bold">Alergi/Catatan:</span> {p.catatanKhusus}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center"><HeartPulse className="w-3.5 h-3.5 mr-1 text-indigo-500" /> {rmCount} RM</span>
                      <span className="flex items-center"><Award className="w-3.5 h-3.5 mr-1 text-emerald-500" /> {vakCount} Vaksin</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setSelectedPasienForDetail(p)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                        title="Lihat Detail & Rekam Medis"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedPasienForSurat(p)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                        title="Cetak Surat Sehat / Vaksin"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {permissions?.canEdit !== false && (
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Edit Pasien"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {permissions?.canDelete !== false && (
                        <button
                          onClick={() => setPasienToDelete(p)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Hapus Data Pasien"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Table View Pasien */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Pasien Hewan</th>
                  <th className="p-3.5">Spesies / Ras</th>
                  <th className="p-3.5">Data Pemilik (Owner)</th>
                  <th className="p-3.5">Kelamin / Umur</th>
                  <th className="p-3.5 text-center">Riwayat</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPasien.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Tidak ada data pasien hewan yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredPasien.map((p) => {
                    const rmCount = rekamMedisList.filter((r) => r.pasienId === p.id).length;
                    const vakCount = vaksinasiList.filter((v) => v.pasienId === p.id).length;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center space-x-3">
                            <img
                              src={p.fotoUrl || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&auto=format&fit=crop&q=80'}
                              alt={p.namaHewan}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5">
                                <span>{p.namaHewan}</span>
                              </div>
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                                {p.kodePasien}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-800 block">{p.jenisHewan}</span>
                          <span className="text-slate-500 text-[11px]">{p.ras || '-'}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-800 block">{p.namaOwner}</span>
                          <span className="text-indigo-600 font-mono text-[11px]">{p.noHpOwner}</span>
                          {p.alamatOwner && (
                            <span className="text-slate-400 text-[10px] block truncate max-w-xs">{p.alamatOwner}</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-700 block">{p.jenisKelamin}</span>
                          <span className="text-slate-400 text-[11px]">{p.umurFormat || p.tanggalLahir || '-'}</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="inline-flex flex-col space-y-1 text-[11px]">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">{rmCount} RM</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{vakCount} Vaksin</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {onRegisterTreatment && (
                              <button
                                onClick={() => onRegisterTreatment(p.id)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors mr-1"
                                title="Daftar Berobat"
                              >
                                Berobat
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedPasienForDetail(p)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                              title="Lihat Detail & Rekam Medis"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedPasienForSurat(p)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                              title="Cetak Surat Sehat / Vaksin"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {permissions?.canEdit !== false && (
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                title="Edit Pasien"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {permissions?.canDelete !== false && (
                              <button
                                onClick={() => setPasienToDelete(p)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="Hapus Data Pasien"
                              >
                                <Trash2 className="w-4 h-4" />
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
      )}

      {/* Modal Add/Edit Pasien */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Fixed Header */}
            <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingPasien ? 'Edit Data Pasien' : 'Registrasi Pasien Hewan Baru'}
                </h3>
                <p className="text-xs text-slate-500">Lengkapi data identitas anabul dan kontak pemilik</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                title="Tutup Form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Hewan *</label>
                    <input
                      type="text"
                      required
                      value={namaHewan}
                      onChange={(e) => setNamaHewan(e.target.value)}
                      placeholder="Contoh: Mochi"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis / Spesies *</label>
                    <select
                      value={jenisHewan}
                      onChange={(e) => setJenisHewan(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold outline-none"
                    >
                      {speciesOptions.map((sp) => (
                        <option key={sp} value={sp}>{sp}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ras / Breed</label>
                    <input
                      type="text"
                      value={ras}
                      onChange={(e) => setRas(e.target.value)}
                      placeholder="Contoh: Persia / Golden Retriever"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={jenisKelamin}
                      onChange={(e) => setJenisKelamin(e.target.value as JenisKelaminHewan)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Jantan">Jantan</option>
                      <option value="Jantan Kastrasi">Jantan Kastrasi (Steril)</option>
                      <option value="Betina">Betina</option>
                      <option value="Betina Steril">Betina Steril (Spayed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Lahir / Perkiraan</label>
                    <input
                      type="date"
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Warna / Corak</label>
                    <input
                      type="text"
                      value={warna}
                      onChange={(e) => setWarna(e.target.value)}
                      placeholder="Contoh: Putih Oranye"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-slate-800 mb-2">Data Pemilik (Owner)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pemilik *</label>
                      <input
                        type="text"
                        required
                        value={namaOwner}
                        onChange={(e) => setNamaOwner(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp / HP *</label>
                      <input
                        type="text"
                        required
                        value={noHpOwner}
                        onChange={(e) => setNoHpOwner(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                    <input
                      type="text"
                      value={alamatOwner}
                      onChange={(e) => setAlamatOwner(e.target.value)}
                      placeholder="Jl. Pemuda No. 45 Jember"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alergi Obat / Catatan Khusus</label>
                  <textarea
                    rows={2}
                    value={catatanKhusus}
                    onChange={(e) => setCatatanKhusus(e.target.value)}
                    placeholder="Alergi penicillin, rewel saat disuntik..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  ></textarea>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
                {editingPasien && permissions?.canDelete !== false ? (
                  <button
                    type="button"
                    onClick={() => {
                      const p = editingPasien;
                      setShowFormModal(false);
                      setPasienToDelete(p);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                    title="Hapus Data Pasien Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Pasien</span>
                  </button>
                ) : <div />}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer"
                  >
                    Simpan Pasien
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Pasien & Riwayat Medis */}
      {selectedPasienForDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center space-x-3">
                <img src={selectedPasienForDetail.fotoUrl} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedPasienForDetail.namaHewan} ({selectedPasienForDetail.kodePasien})</h3>
                  <p className="text-xs text-slate-500">Owner: {selectedPasienForDetail.namaOwner} • {selectedPasienForDetail.noHpOwner}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPasienForDetail(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="bg-slate-50 p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><span className="text-slate-400 block">Spesies/Ras:</span><span className="font-bold">{selectedPasienForDetail.jenisHewan} / {selectedPasienForDetail.ras}</span></div>
                <div><span className="text-slate-400 block">Kelamin:</span><span className="font-bold">{selectedPasienForDetail.jenisKelamin}</span></div>
                <div><span className="text-slate-400 block">Umur:</span><span className="font-bold">{selectedPasienForDetail.umurFormat || '-'}</span></div>
                <div><span className="text-slate-400 block">Microchip:</span><span className="font-bold">{selectedPasienForDetail.noMicrochip || '-'}</span></div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Riwayat Rekam Medis Pasien</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {rekamMedisList.filter((r) => r.pasienId === selectedPasienForDetail.id).length === 0 ? (
                    <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">Belum ada riwayat rekam medis.</p>
                  ) : (
                    rekamMedisList
                      .filter((r) => r.pasienId === selectedPasienForDetail.id)
                      .map((rm) => (
                        <div key={rm.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between font-bold text-indigo-700">
                            <span>{rm.noRM} — {rm.tanggal}</span>
                            <span>Status: {rm.plan.statusLanjutan}</span>
                          </div>
                          <p><span className="font-semibold text-slate-700">Diagnosa:</span> {rm.assessment.diagnosaUtama}</p>
                          <p className="text-slate-500"><span className="font-semibold">Keluhan:</span> {rm.subjective.keluhan}</p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Detail Footer with Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              {permissions?.canDelete !== false ? (
                <button
                  type="button"
                  onClick={() => {
                    const p = selectedPasienForDetail;
                    setPasienToDelete(p);
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                  title="Hapus Data Pasien Ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Pasien Ini</span>
                </button>
              ) : <div />}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const p = selectedPasienForDetail;
                    setSelectedPasienForDetail(null);
                    setSelectedPasienForSurat(p);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Cetak Surat</span>
                </button>
                {permissions?.canEdit !== false && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = selectedPasienForDetail;
                      setSelectedPasienForDetail(null);
                      handleOpenEdit(p);
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Pasien</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Surat Modal */}
      {selectedPasienForSurat && (
        <SuratModal
          pasien={selectedPasienForSurat}
          dokterList={dokterList}
          vaksinList={vaksinasiList.filter((v) => v.pasienId === selectedPasienForSurat.id)}
          klinik={klinik}
          onClose={() => setSelectedPasienForSurat(null)}
        />
      )}

      {/* Modal Konfirmasi Hapus Pasien */}
      {pasienToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900">
                    Hapus Data Pasien?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tindakan ini akan menghapus data hewan dan informasi kontak pemilik dari sistem klinik.
                  </p>
                </div>
              </div>

              {/* Patient info preview card */}
              <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center space-x-3">
                <img
                  src={pasienToDelete.fotoUrl || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&auto=format&fit=crop&q=80'}
                  alt={pasienToDelete.namaHewan}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-800 truncate">{pasienToDelete.namaHewan}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold shrink-0">
                      {pasienToDelete.kodePasien}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">
                    {pasienToDelete.jenisHewan} • {pasienToDelete.ras}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Pemilik: <span className="font-semibold text-slate-700">{pasienToDelete.namaOwner}</span> ({pasienToDelete.noHpOwner})
                  </p>
                </div>
              </div>

              {/* Related records alert if any */}
              {(() => {
                const relatedRmCount = rekamMedisList.filter((r) => r.pasienId === pasienToDelete.id).length;
                const relatedVaksinCount = vaksinasiList.filter((v) => v.pasienId === pasienToDelete.id).length;
                if (relatedRmCount > 0 || relatedVaksinCount > 0) {
                  return (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Perhatian:</span> Pasien ini memiliki{' '}
                        {relatedRmCount > 0 && <span className="font-bold">{relatedRmCount} Rekam Medis</span>}
                        {relatedRmCount > 0 && relatedVaksinCount > 0 && ' dan '}
                        {relatedVaksinCount > 0 && <span className="font-bold">{relatedVaksinCount} Riwayat Vaksinasi</span>}.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <p className="text-xs text-rose-600 font-medium mt-3 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                ⚠️ Apakah Anda yakin ingin menghapus data pasien ini secara permanen?
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPasienToDelete(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-200 cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Pasien</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
