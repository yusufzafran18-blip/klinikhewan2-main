import React, { useState } from 'react';
import { User, Dokter, Tindakan, PakanHewan, Role, Spesies } from '../../types';
import { Database, Plus, Shield, Stethoscope, Scissors, Edit, Trash2, PawPrint } from 'lucide-react';

interface MasterDataViewProps {
  userList: User[];
  dokterList: Dokter[];
  tindakanList: Tindakan[];
  pakanList: PakanHewan[];
  spesiesList?: Spesies[];
  activeUser: User;
  onSaveUser: (u: User) => void | Promise<void>;
  onSaveDokter: (d: Dokter) => void | Promise<void>;
  onDeleteDokter?: (id: string) => void;
  onSaveTindakan: (t: Tindakan) => void | Promise<void>;
  onDeleteTindakan?: (id: string) => void;
  onSavePakan: (p: PakanHewan) => void;
  onSaveSpesies?: (s: Spesies) => void | Promise<void>;
  onDeleteSpesies?: (id: string) => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  userList = [],
  dokterList = [],
  tindakanList = [],
  pakanList = [],
  spesiesList = [],
  activeUser,
  onSaveUser,
  onSaveDokter,
  onDeleteDokter,
  onSaveTindakan,
  onDeleteTindakan,
  onSavePakan,
  onSaveSpesies,
  onDeleteSpesies,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'dokter' | 'tindakan' | 'spesies'>('users');

  // Modal User
  const [showUserModal, setShowUserModal] = useState(false);
  const [username, setUsername] = useState('');
  const [namaUser, setNamaUser] = useState('');
  const [role, setRole] = useState<Role>('staf');

  // Modal Dokter
  const [showDokterModal, setShowDokterModal] = useState(false);
  const [editingDokter, setEditingDokter] = useState<Dokter | null>(null);
  const [namaDokter, setNamaDokter] = useState('');
  const [sip, setSip] = useState('');
  const [spesialisasi, setSpesialisasi] = useState('Dokter Hewan Praktisi Umum');
  const [noHp, setNoHp] = useState('');

  // Modal Tindakan
  const [showTindakanModal, setShowTindakanModal] = useState(false);
  const [editingTindakan, setEditingTindakan] = useState<Tindakan | null>(null);
  const [namaTindakan, setNamaTindakan] = useState('');
  const [kategoriTindakan, setKategoriTindakan] = useState<'Pemeriksaan' | 'Tindakan Medis' | 'Operasi' | 'Vaksinasi' | 'Grooming' | 'Laboratorium'>('Tindakan Medis');
  const [tarif, setTarif] = useState(50000);

  // Modal Spesies
  const [showSpesiesModal, setShowSpesiesModal] = useState(false);
  const [editingSpesies, setEditingSpesies] = useState<Spesies | null>(null);
  const [namaSpesies, setNamaSpesies] = useState('');
  const [keteranganSpesies, setKeteranganSpesies] = useState('');

  const handleOpenAddDokter = () => {
    setEditingDokter(null);
    setNamaDokter('');
    setSip('');
    setSpesialisasi('Dokter Hewan Praktisi Umum');
    setNoHp('');
    setShowDokterModal(true);
  };

  const handleOpenEditDokter = (d: Dokter) => {
    setEditingDokter(d);
    setNamaDokter(d.nama);
    setSip(d.sip || '');
    setSpesialisasi(d.spesialisasi || 'Dokter Hewan Praktisi Umum');
    setNoHp(d.noHp || '');
    setShowDokterModal(true);
  };

  const handleOpenAddTindakan = () => {
    setEditingTindakan(null);
    setNamaTindakan('');
    setKategoriTindakan('Tindakan Medis');
    setTarif(50000);
    setShowTindakanModal(true);
  };

  const handleOpenEditTindakan = (t: Tindakan) => {
    setEditingTindakan(t);
    setNamaTindakan(t.namaTindakan);
    setKategoriTindakan(t.kategori);
    setTarif(t.tarif || 0);
    setShowTindakanModal(true);
  };

  const handleOpenAddSpesies = () => {
    setEditingSpesies(null);
    setNamaSpesies('');
    setKeteranganSpesies('');
    setShowSpesiesModal(true);
  };

  const handleOpenEditSpesies = (s: Spesies) => {
    setEditingSpesies(s);
    setNamaSpesies(s.namaSpesies);
    setKeteranganSpesies(s.keterangan || '');
    setShowSpesiesModal(true);
  };

  const handleSaveSpesies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaSpesies.trim()) return;

    const usedCodes = new Set(
      spesiesList
        .map((spesies) => spesies.kodeSpesies?.toUpperCase())
        .filter((code): code is string => Boolean(code)),
    );
    let nextCode = 1;
    while (usedCodes.has(`SPS-${String(nextCode).padStart(3, '0')}`)) nextCode += 1;
    const kode = editingSpesies?.kodeSpesies || `SPS-${String(nextCode).padStart(3, '0')}`;

    const newSpesies: Spesies = {
      id: editingSpesies ? editingSpesies.id : 'sps-' + Date.now(),
      kodeSpesies: kode,
      namaSpesies: namaSpesies.trim(),
      keterangan: keteranganSpesies.trim() || undefined,
    };

    if (onSaveSpesies) {
      await onSaveSpesies(newSpesies);
    }
    setShowSpesiesModal(false);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: 'usr-' + Date.now(),
      username,
      nama: namaUser,
      email: `${username}@vetcare.id`,
      role,
      aktif: true,
      statusAktif: true,
    };
    await onSaveUser(newUser);
    setShowUserModal(false);
    setUsername('');
    setNamaUser('');
  };

  const handleSaveDokter = async (e: React.FormEvent) => {
    e.preventDefault();
    const newDokter: Dokter = {
      id: editingDokter?.id || 'doc-' + Date.now(),
      nama: namaDokter,
      sip: sip.trim() || `SIP-${Date.now()}`,
      spesialisasi,
      noHp,
      email: `${namaDokter.toLowerCase().replace(/\s+/g, '')}@vetcare.com`,
      jadwal: 'Senin - Sabtu (08:00 - 17:00)',
      aktif: true,
      statusAktif: true,
    };
    await onSaveDokter(newDokter);
    setShowDokterModal(false);
  };

  const handleSaveTindakan = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTindakan: Tindakan = {
      id: editingTindakan?.id || 'tnd-' + Date.now(),
      kodeTindakan: editingTindakan?.kodeTindakan || 'TND-' + Date.now().toString().slice(-3),
      namaTindakan,
      kategori: kategoriTindakan,
      tarif,
      komisiDokter: tarif * 0.4,
      jasaDokter: tarif * 0.4,
    };
    await onSaveTindakan(newTindakan);
    setShowTindakanModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Master Data Sistem Klinik</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Kelola akun pengguna, data dokter hewan, tarif tindakan, & master jenis/spesies hewan</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'users' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Pengguna & Role</span>
        </button>

        <button
          onClick={() => setActiveTab('dokter')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'dokter' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Dokter Hewan</span>
        </button>

        <button
          onClick={() => setActiveTab('tindakan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'tindakan' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Tarif & Tindakan Medis</span>
        </button>

        <button
          onClick={() => setActiveTab('spesies')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'spesies' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PawPrint className="w-4 h-4" />
          <span>Jenis / Spesies Hewan</span>
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Manajemen Pengguna Akun</h3>
            <button onClick={() => setShowUserModal(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-700">+ Akun Baru</button>
          </div>

          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Username & Nama</th>
                <th className="p-3">Hak Akses / Role</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userList.map((u) => (
                <tr key={u.id}>
                  <td className="p-3 font-bold text-slate-800">{u.nama} <span className="text-slate-400 font-normal">({u.username})</span></td>
                  <td className="p-3">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 font-extrabold rounded-lg uppercase text-[10px]">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3"><span className="text-emerald-600 font-bold">Aktif</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: DOKTER */}
      {activeTab === 'dokter' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Daftar Dokter Hewan Praktis</h3>
            <button
              onClick={handleOpenAddDokter}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Dokter Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Nama Dokter</th>
                  <th className="p-3">No. SIP</th>
                  <th className="p-3">Spesialisasi</th>
                  <th className="p-3">No HP</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dokterList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Belum ada data dokter hewan. Klik "+ Dokter Baru" untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  dokterList.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-800 flex items-center space-x-2">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{d.nama}</span>
                      </td>
                      <td className="p-3 font-mono text-indigo-700 font-semibold">{d.sip || '-'}</td>
                      <td className="p-3 font-medium text-slate-600">{d.spesialisasi}</td>
                      <td className="p-3 text-slate-600">{d.noHp || '-'}</td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditDokter(d)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Dokter"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteDokter && (
                          <button
                            onClick={() => {
                              if (confirm(`Hapus dokter "${d.nama}" dari master data?`)) {
                                onDeleteDokter(d.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Dokter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TINDAKAN */}
      {activeTab === 'tindakan' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Master Tarif & Prosedur Medis</h3>
            <button
              onClick={handleOpenAddTindakan}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tindakan Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Kode & Prosedur</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Tarif Klinik</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tindakanList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      Belum ada master tarif tindakan. Klik "+ Tindakan Baru" untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  tindakanList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-800">
                        {t.namaTindakan} <span className="text-slate-400 font-mono font-normal">({t.kodeTindakan})</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {t.kategori}
                        </span>
                      </td>
                      <td className="p-3 font-black text-indigo-700">Rp {(t.tarif || 0).toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditTindakan(t)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Tindakan"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteTindakan && (
                          <button
                            onClick={() => {
                              if (confirm(`Hapus tindakan "${t.namaTindakan}"?`)) {
                                onDeleteTindakan(t.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Tindakan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SPESIES */}
      {activeTab === 'spesies' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Master Jenis / Spesies Hewan</h3>
              <p className="text-[11px] text-slate-400">Data jenis/spesies ini otomatis terkoneksi dengan registrasi pasien baru</p>
            </div>
            <button
              onClick={handleOpenAddSpesies}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Spesies Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Kode</th>
                  <th className="p-3">Nama Jenis / Spesies</th>
                  <th className="p-3">Keterangan / Taksonomi</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {spesiesList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      Belum ada master spesies. Klik tombol "+ Spesies Baru" untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  spesiesList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono text-indigo-700 font-bold">{s.kodeSpesies || '-'}</td>
                      <td className="p-3 font-extrabold text-slate-800 flex items-center space-x-2">
                        <PawPrint className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{s.namaSpesies}</span>
                      </td>
                      <td className="p-3 text-slate-500">{s.keterangan || '-'}</td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditSpesies(s)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Spesies"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteSpesies && (
                          <button
                            onClick={() => {
                              if (confirm(`Hapus spesies "${s.namaSpesies}" dari master data?`)) {
                                onDeleteSpesies(s.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Spesies"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal User */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-xs space-y-3">
            <h3 className="font-bold text-sm">Tambah User Akun Baru</h3>
            <form onSubmit={handleSaveUser} className="space-y-3">
              <div><label className="block font-semibold mb-1">Nama Lengkap</label><input type="text" required value={namaUser} onChange={(e) => setNamaUser(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div><label className="block font-semibold mb-1">Username Login</label><input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div>
                <label className="block font-semibold mb-1">Role Hak Akses (4 Role)</label>
                <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full p-2 border rounded-lg font-bold">
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin / Kasir</option>
                  <option value="staf">Staf Paramedis</option>
                  <option value="dokter">Dokter Hewan</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dokter */}
      {showDokterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-xs space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Stethoscope className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">
                {editingDokter ? 'Edit Data Dokter Hewan' : 'Tambah Dokter Hewan Baru'}
              </h3>
            </div>

            <form onSubmit={handleSaveDokter} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Dokter *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: drh. Budi Santoso, M.Si"
                  value={namaDokter}
                  onChange={(e) => setNamaDokter(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No. SIP (Surat Izin Praktik)</label>
                <input
                  type="text"
                  placeholder="Contoh: SIP/503/2024/008"
                  value={sip}
                  onChange={(e) => setSip(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Spesialisasi / Keahlian</label>
                <input
                  type="text"
                  placeholder="Contoh: Dokter Hewan Praktisi Umum, Bedah & Anestesi"
                  value={spesialisasi}
                  onChange={(e) => setSpesialisasi(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No. HP / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDokterModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 cursor-pointer"
                >
                  Simpan Dokter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tindakan */}
      {showTindakanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-xs space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Scissors className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">
                {editingTindakan ? 'Edit Tarif & Prosedur Medis' : 'Tambah Tarif & Prosedur Medis Baru'}
              </h3>
            </div>

            <form onSubmit={handleSaveTindakan} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Prosedur / Tindakan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pemeriksaan Umum, Steril Kucing Jantan, Vaksinasi Rabies"
                  value={namaTindakan}
                  onChange={(e) => setNamaTindakan(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Tindakan *</label>
                <select
                  value={kategoriTindakan}
                  onChange={(e) => setKategoriTindakan(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                >
                  <option value="Pemeriksaan">Pemeriksaan</option>
                  <option value="Tindakan Medis">Tindakan Medis</option>
                  <option value="Operasi">Operasi</option>
                  <option value="Vaksinasi">Vaksinasi</option>
                  <option value="Grooming">Grooming</option>
                  <option value="Laboratorium">Laboratorium</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tarif Klinik (Rp) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="Contoh: 75000"
                  value={tarif}
                  onChange={(e) => setTarif(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTindakanModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 cursor-pointer"
                >
                  Simpan Tindakan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Spesies */}
      {showSpesiesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-xs space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <PawPrint className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">
                {editingSpesies ? 'Edit Master Spesies / Jenis Hewan' : 'Tambah Master Spesies / Jenis Hewan'}
              </h3>
            </div>

            <form onSubmit={handleSaveSpesies} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Jenis / Spesies *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kucing, Anjing, Hamster, Sugar Glider, Iguana"
                  value={namaSpesies}
                  onChange={(e) => setNamaSpesies(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Deskripsi Taksonomi</label>
                <input
                  type="text"
                  placeholder="Contoh: Felis catus, Mamalia Kecil, Hewan Eksotis"
                  value={keteranganSpesies}
                  onChange={(e) => setKeteranganSpesies(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSpesiesModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200"
                >
                  Simpan Spesies
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
