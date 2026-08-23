import React, { useState } from 'react';
import { Pasien, RekamMedis, Dokter, RiwayatVaksinasi, DataKlinik, JenisHewan, JenisKelaminHewan, Spesies } from '../../types';
import { ModulePermissions } from '../../utils/rbac';
import {
  Users, Plus, Search, Eye, Award, FileText, FileSpreadsheet,
  Edit, Trash2, HeartPulse, ShieldAlert, Phone, Mail, MapPin, X
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('Semua');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPasien, setEditingPasien] = useState<Pasien | null>(null);

  // Detail Modal State
  const [selectedPasienForDetail, setSelectedPasienForDetail] = useState<Pasien | null>(null);
  const [selectedPasienForSurat, setSelectedPasienForSurat] = useState<Pasien | null>(null);

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

      {/* Filters Bar */}
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
        </div>
      </div>

      {/* Grid Card Pasien */}
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
                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
                      title="Lihat Detail & Rekam Medis"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedPasienForSurat(p)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
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
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add/Edit Pasien */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 animate-in fade-in duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingPasien ? 'Edit Data Pasien' : 'Registrasi Pasien Hewan Baru'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Hewan</label>
                  <input
                    type="text"
                    required
                    value={namaHewan}
                    onChange={(e) => setNamaHewan(e.target.value)}
                    placeholder="Contoh: Mochi"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis / Spesies *</label>
                  <select
                    value={jenisHewan}
                    onChange={(e) => setJenisHewan(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold"
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
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={jenisKelamin}
                    onChange={(e) => setJenisKelamin(e.target.value as JenisKelaminHewan)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Warna / Corak</label>
                  <input
                    type="text"
                    value={warna}
                    onChange={(e) => setWarna(e.target.value)}
                    placeholder="Contoh: Putih Oranye"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-800 mb-2">Data Pemilik (Owner)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pemilik</label>
                    <input
                      type="text"
                      required
                      value={namaOwner}
                      onChange={(e) => setNamaOwner(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp / HP</label>
                    <input
                      type="text"
                      required
                      value={noHpOwner}
                      onChange={(e) => setNoHpOwner(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200"
                >
                  Simpan Pasien
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Pasien & Riwayat Medis */}
      {selectedPasienForDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <img src={selectedPasienForDetail.fotoUrl} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedPasienForDetail.namaHewan} ({selectedPasienForDetail.kodePasien})</h3>
                  <p className="text-xs text-slate-500">Owner: {selectedPasienForDetail.namaOwner} • {selectedPasienForDetail.noHpOwner}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPasienForDetail(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
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

    </div>
  );
};
