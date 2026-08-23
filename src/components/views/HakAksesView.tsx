import React, { useState } from 'react';
import { User, UserRole, RBACConfig, ModulePermissionItem, RolePermissionActions } from '../../types';
import {
  ShieldCheck, Users, KeyRound, Eye, Save, RotateCcw, Search, Plus, CheckCircle2,
  X, AlertCircle, Edit, Trash2, Lock, UserPlus, Check, Filter, Shield, Activity,
  Sliders, Info, Zap
} from 'lucide-react';
import { DEFAULT_RBAC_MODULES, storageService } from '../../services/storage';

interface HakAksesViewProps {
  userList: User[];
  activeUser: User;
  rbacConfig: RBACConfig;
  onSaveRBACConfig: (config: RBACConfig) => void;
  onSaveUser: (u: User) => void;
  onDeleteUser?: (id: string) => void;
  onSwitchUserContext?: (u: User) => void;
}

const ROLE_LABELS: Record<UserRole, { label: string; bg: string; text: string; border: string; desc: string }> = {
  super_admin: {
    label: 'Super Admin',
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300',
    desc: 'Pemilik/Owner Klinik dengan hak akses penuh tanpa batas ke semua data, pengaturan, dan transaksi.'
  },
  admin: {
    label: 'Admin Operasional',
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    border: 'border-indigo-300',
    desc: 'Manajer Operasional dengan akses kelola master data, laporan keuangan, pendaftaran, dan kasir.'
  },
  dokter: {
    label: 'Dokter Hewan',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    desc: 'Tenaga Medis dengan hak akses khusus ke Rekam Medis SOAP, Rawat Jalan/Inap, dan Tren Penyakit.'
  },
  staf: {
    label: 'Staf / Resepsionis',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    desc: 'Garda depan untuk pendaftaran pasien, janji temu, kasir nota/petshop, dan persediaan stok.'
  }
};

export const HakAksesView: React.FC<HakAksesViewProps> = ({
  userList = [],
  activeUser,
  rbacConfig,
  onSaveRBACConfig,
  onSaveUser,
  onDeleteUser,
  onSwitchUserContext
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'users' | 'roles' | 'simulator'>('matrix');

  // Local state for editing RBAC modules matrix
  const [modulesState, setModulesState] = useState<ModulePermissionItem[]>(
    rbacConfig?.modules && rbacConfig.modules.length > 0 ? rbacConfig.modules : DEFAULT_RBAC_MODULES
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // User management modal states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('Semua');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states for user modal
  const [username, setUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [role, setRole] = useState<UserRole>('staf');
  const [statusAktif, setStatusAktif] = useState<boolean>(true);

  // Filter modules for matrix table
  const categories = ['Semua', 'Pelayanan Medis', 'Kasir & Inventaris', 'Manajemen & Laporan', 'Sistem & Keamanan'];

  const filteredModules = modulesState.filter((m) => {
    const matchCat = categoryFilter === 'Semua' || m.kategori === categoryFilter;
    const matchSearch =
      m.namaModule.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.deskripsi.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Toggle role allowed access for a module
  const handleToggleRoleAccess = (moduleId: string, roleToToggle: UserRole) => {
    setModulesState((prev) =>
      prev.map((mod) => {
        if (mod.id !== moduleId) return mod;
        const currentRoles = mod.allowedRoles || [];
        const isAllowed = currentRoles.includes(roleToToggle);
        const newRoles = isAllowed
          ? currentRoles.filter((r) => r !== roleToToggle)
          : [...currentRoles, roleToToggle];

        // Also update roleActions view flag
        const currentActions = mod.roleActions?.[roleToToggle] || {
          canView: !isAllowed,
          canCreate: !isAllowed,
          canEdit: !isAllowed,
          canDelete: false,
          canExport: !isAllowed
        };

        const updatedRoleActions = {
          ...(mod.roleActions || {}),
          [roleToToggle]: {
            ...currentActions,
            canView: !isAllowed
          }
        };

        return {
          ...mod,
          allowedRoles: newRoles,
          roleActions: updatedRoleActions
        };
      })
    );
  };

  // Toggle fine-grained action permission
  const handleToggleAction = (
    moduleId: string,
    roleToUpdate: UserRole,
    actionKey: keyof RolePermissionActions
  ) => {
    setModulesState((prev) =>
      prev.map((mod) => {
        if (mod.id !== moduleId) return mod;
        const currentActionObj = mod.roleActions?.[roleToUpdate] || {
          canView: mod.allowedRoles.includes(roleToUpdate),
          canCreate: true,
          canEdit: true,
          canDelete: false,
          canExport: true
        };

        const updatedActionVal = !currentActionObj[actionKey];
        const newActionsObj = {
          ...currentActionObj,
          [actionKey]: updatedActionVal
        };

        return {
          ...mod,
          roleActions: {
            ...(mod.roleActions || {}),
            [roleToUpdate]: newActionsObj
          }
        };
      })
    );
  };

  const handleSaveRBACMatrix = () => {
    const updatedConfig: RBACConfig = {
      modules: modulesState,
      updatedAt: new Date().toISOString(),
      updatedBy: activeUser.nama || activeUser.username
    };
    onSaveRBACConfig(updatedConfig);
    setSaveSuccessMsg('Konfigurasi Hak Akses RBAC berhasil disimpan ke database!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleResetToDefaultRBAC = () => {
    if (confirm('Apakah Anda yakin ingin mengembalikan semua matriks Hak Akses ke standar awal sistem?')) {
      setModulesState(DEFAULT_RBAC_MODULES);
      const defaultConfig: RBACConfig = {
        modules: DEFAULT_RBAC_MODULES,
        updatedAt: new Date().toISOString(),
        updatedBy: 'System Reset'
      };
      onSaveRBACConfig(defaultConfig);
      setSaveSuccessMsg('Matriks Hak Akses berhasil direset ke standar awal!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    }
  };

  // User Management modal actions
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUsername('');
    setUserPassword('admin123');
    setNama('');
    setEmail('');
    setNoHp('');
    setRole('staf');
    setStatusAktif(true);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setUserPassword(u.password || '');
    setNama(u.nama);
    setEmail(u.email || '');
    setNoHp(u.noHp || '');
    setRole(u.role);
    setStatusAktif(u.aktif !== undefined ? u.aktif : true);
    setShowUserModal(true);
  };

  const handleSaveUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPassword = userPassword.trim() ? userPassword.trim() : (editingUser?.password || 'admin123');
    const newUser: User = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      username: username.toLowerCase().trim(),
      password: finalPassword,
      nama: nama.trim(),
      email: email.trim(),
      noHp: noHp.trim(),
      role: role,
      aktif: statusAktif,
      statusAktif: statusAktif
    };
    onSaveUser(newUser);
    setShowUserModal(false);
  };

  // Filter users list
  const filteredUsers = userList.filter((u) => {
    const matchSearch =
      u.nama.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));
    const matchRole = userRoleFilter === 'Semua' || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_70%)] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Manajemen Hak Akses & Role (RBAC)</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Security Level 1
                </span>
              </div>
              <p className="text-slate-300 text-xs md:text-sm mt-1">
                Atur otorisasi fitur, pembatasan hak akses modul per role pengguna, dan manajemen akun staf klinik.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block bg-slate-800/60 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-700/60 text-xs">
              <p className="text-slate-400 text-[10px]">Role Aktif Anda:</p>
              <p className="font-bold text-indigo-300">{ROLE_LABELS[activeUser.role]?.label || activeUser.role}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/50 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Total Modul System</p>
              <p className="text-sm font-bold text-white">{modulesState.length} Modul</p>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/50 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Tingkat Role</p>
              <p className="text-sm font-bold text-white">4 Role Otoritas</p>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/50 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Total Pengguna</p>
              <p className="text-sm font-bold text-white">{userList.length} Akun Staf</p>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/50 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Status Proteksi</p>
              <p className="text-sm font-bold text-emerald-400">Enforced Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Save Alert */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold">{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700 text-xs">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`px-4 py-3 font-bold text-xs md:text-sm border-b-2 flex items-center space-x-2 shrink-0 transition-colors ${
            activeSubTab === 'matrix'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Matriks Hak Akses Modul</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-3 font-bold text-xs md:text-sm border-b-2 flex items-center space-x-2 shrink-0 transition-colors ${
            activeSubTab === 'users'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kelola Pengguna & Role ({userList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={`px-4 py-3 font-bold text-xs md:text-sm border-b-2 flex items-center space-x-2 shrink-0 transition-colors ${
            activeSubTab === 'roles'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Panduan Otoritas Role</span>
        </button>

        <button
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-3 font-bold text-xs md:text-sm border-b-2 flex items-center space-x-2 shrink-0 transition-colors ${
            activeSubTab === 'simulator'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Simulasi Akses User</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: MATRIKS HAK AKSES MODUL */}
      {/* ========================================== */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari modul..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={handleResetToDefaultRBAC}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs inline-flex items-center space-x-1.5 transition-colors"
                title="Reset ke standar bawaan pabrik"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>

              <button
                onClick={handleSaveRBACMatrix}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs inline-flex items-center space-x-1.5 shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Matriks RBAC</span>
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider font-extrabold">
                    <th className="p-4 w-1/3 min-w-[280px]">Nama Modul & Deskripsi Fitur</th>
                    <th className="p-4 text-center min-w-[120px] bg-purple-900/60">
                      <div className="flex items-center justify-center space-x-1 text-purple-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Super Admin</span>
                      </div>
                    </th>
                    <th className="p-4 text-center min-w-[120px] bg-indigo-900/60">
                      <div className="flex items-center justify-center space-x-1 text-indigo-200">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Admin</span>
                      </div>
                    </th>
                    <th className="p-4 text-center min-w-[120px] bg-emerald-900/60">
                      <div className="flex items-center justify-center space-x-1 text-emerald-200">
                        <Users className="w-3.5 h-3.5" />
                        <span>Dokter</span>
                      </div>
                    </th>
                    <th className="p-4 text-center min-w-[120px] bg-amber-900/60">
                      <div className="flex items-center justify-center space-x-1 text-amber-200">
                        <Users className="w-3.5 h-3.5" />
                        <span>Staf</span>
                      </div>
                    </th>
                    <th className="p-4 text-center w-20">Aksi Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredModules.map((m) => {
                    const isExpanded = expandedModuleId === m.id;
                    return (
                      <React.Fragment key={m.id}>
                        <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                          {/* Module info */}
                          <td className="p-4">
                            <div className="flex items-start space-x-2.5">
                              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 mt-0.5">
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-800 text-sm">{m.namaModule}</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    {m.kategori}
                                  </span>
                                </div>
                                <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{m.deskripsi}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role Checkboxes */}
                          {(['super_admin', 'admin', 'dokter', 'staf'] as UserRole[]).map((rKey) => {
                            const isAllowed = (m.allowedRoles || []).includes(rKey);
                            const isSuper = rKey === 'super_admin';
                            return (
                              <td key={rKey} className="p-4 text-center align-middle">
                                <label className="inline-flex items-center justify-center p-2 rounded-xl hover:bg-slate-100/80 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isAllowed}
                                    disabled={isSuper && m.id === 'hak_akses'} // Prevent locking super_admin out of hak_akses
                                    onChange={() => handleToggleRoleAccess(m.id, rKey)}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                  />
                                </label>
                              </td>
                            );
                          })}

                          {/* Expand Detail Actions */}
                          <td className="p-4 text-center align-middle">
                            <button
                              onClick={() => setExpandedModuleId(isExpanded ? null : m.id)}
                              className={`p-1.5 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 border transition-colors ${
                                isExpanded
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Set Granular Action Permissions (Lihat, Edit, Hapus, Export)"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{isExpanded ? 'Tutup' : 'Set Action'}</span>
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Fine-Grained Permissions Panel */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-t border-b border-indigo-100">
                            <td colSpan={6} className="p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                                  <Sliders className="w-4 h-4 text-indigo-600" />
                                  <span>Granular Action Permissions: {m.namaModule}</span>
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  Atur izin khusus (Lihat, Tambah, Edit, Hapus, Export) per Role
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {(['super_admin', 'admin', 'dokter', 'staf'] as UserRole[]).map((rKey) => {
                                  const rInfo = ROLE_LABELS[rKey];
                                  const isAllowed = (m.allowedRoles || []).includes(rKey);
                                  const actions = m.roleActions?.[rKey] || {
                                    canView: isAllowed,
                                    canCreate: isAllowed,
                                    canEdit: isAllowed,
                                    canDelete: false,
                                    canExport: isAllowed
                                  };

                                  return (
                                    <div
                                      key={rKey}
                                      className={`p-3 rounded-xl border bg-white space-y-2 ${
                                        isAllowed ? 'border-indigo-200 shadow-xs' : 'border-slate-200 opacity-60'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rInfo.bg} ${rInfo.text} ${rInfo.border}`}>
                                          {rInfo.label}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500">
                                          {isAllowed ? 'Akses Aktif' : 'Akses Mati'}
                                        </span>
                                      </div>

                                      <div className="space-y-1.5 pt-1 text-[11px]">
                                        <label className="flex items-center justify-between cursor-pointer">
                                          <span className="text-slate-600">Lihat Modul</span>
                                          <input
                                            type="checkbox"
                                            checked={actions.canView}
                                            disabled={!isAllowed}
                                            onChange={() => handleToggleAction(m.id, rKey, 'canView')}
                                            className="w-3.5 h-3.5 text-indigo-600 rounded"
                                          />
                                        </label>

                                        <label className="flex items-center justify-between cursor-pointer">
                                          <span className="text-slate-600">Tambah Data</span>
                                          <input
                                            type="checkbox"
                                            checked={actions.canCreate}
                                            disabled={!isAllowed}
                                            onChange={() => handleToggleAction(m.id, rKey, 'canCreate')}
                                            className="w-3.5 h-3.5 text-indigo-600 rounded"
                                          />
                                        </label>

                                        <label className="flex items-center justify-between cursor-pointer">
                                          <span className="text-slate-600">Edit / Ubah</span>
                                          <input
                                            type="checkbox"
                                            checked={actions.canEdit}
                                            disabled={!isAllowed}
                                            onChange={() => handleToggleAction(m.id, rKey, 'canEdit')}
                                            className="w-3.5 h-3.5 text-indigo-600 rounded"
                                          />
                                        </label>

                                        <label className="flex items-center justify-between cursor-pointer">
                                          <span className="text-slate-600">Hapus Data</span>
                                          <input
                                            type="checkbox"
                                            checked={actions.canDelete}
                                            disabled={!isAllowed}
                                            onChange={() => handleToggleAction(m.id, rKey, 'canDelete')}
                                            className="w-3.5 h-3.5 text-rose-600 rounded"
                                          />
                                        </label>

                                        <label className="flex items-center justify-between cursor-pointer">
                                          <span className="text-slate-600">Export Excel/PDF</span>
                                          <input
                                            type="checkbox"
                                            checked={actions.canExport}
                                            disabled={!isAllowed}
                                            onChange={() => handleToggleAction(m.id, rKey, 'canExport')}
                                            className="w-3.5 h-3.5 text-indigo-600 rounded"
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: KELOLA PENGGUNA & ROLE */}
      {/* ========================================== */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama / username / email staf..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Semua">Filter Role: Semua Role</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="dokter">Dokter</option>
                <option value="staf">Staf</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center justify-center space-x-2 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah User / Staf Baru</span>
            </button>
          </div>

          {/* User List Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-extrabold border-b border-slate-200">
                    <th className="p-3.5">Pengguna / Staf</th>
                    <th className="p-3.5">Username</th>
                    <th className="p-3.5">Email & No HP</th>
                    <th className="p-3.5">Role Otoritas</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Tidak ada pengguna yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const rInfo = ROLE_LABELS[u.role] || ROLE_LABELS.staf;
                      const isSelf = u.id === activeUser.id;
                      const isAktif = u.aktif !== undefined ? u.aktif : u.statusAktif !== undefined ? u.statusAktif : true;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-xs uppercase shrink-0 shadow-xs">
                                {u.nama.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 flex items-center space-x-1.5">
                                  <span>{u.nama}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
                                      (Anda)
                                    </span>
                                  )}
                                </p>
                                <span className="text-[10px] text-slate-400">ID: {u.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 font-mono font-semibold text-slate-700">
                            @{u.username}
                          </td>

                          <td className="p-3.5">
                            <p className="text-slate-800 font-medium">{u.email || '-'}</p>
                            <p className="text-[10px] text-slate-400">{u.noHp || '-'}</p>
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${rInfo.bg} ${rInfo.text} ${rInfo.border}`}>
                              {rInfo.label}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isAktif ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isAktif ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {isAktif ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {onSwitchUserContext && (
                                <button
                                  onClick={() => onSwitchUserContext(u)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-colors"
                                  title="Simulasi / Login sebagai akun ini"
                                >
                                  Switch
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                                title="Edit data user & reset password"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {onDeleteUser && !isSelf && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Hapus akun user ${u.nama}?`)) {
                                      onDeleteUser(u.id);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors"
                                  title="Hapus user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: PANDUAN OTORITAS ROLE */}
      {/* ========================================== */}
      {activeSubTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['super_admin', 'admin', 'dokter', 'staf'] as UserRole[]).map((rKey) => {
            const rInfo = ROLE_LABELS[rKey];
            const usersCount = userList.filter((u) => u.role === rKey).length;

            return (
              <div key={rKey} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border ${rInfo.bg} ${rInfo.text} ${rInfo.border}`}>
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{rInfo.label}</h3>
                      <p className="text-[11px] font-bold text-indigo-600">{usersCount} Staf Terdaftar dalam Role Ini</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${rInfo.bg} ${rInfo.text} ${rInfo.border}`}>
                    Level: {rKey === 'super_admin' ? 'Level 1 (Highest)' : rKey === 'admin' ? 'Level 2' : rKey === 'dokter' ? 'Level 3 (Medis)' : 'Level 4 (Operasional)'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {rInfo.desc}
                </p>

                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Hak Otoritas Fitur Utama:</p>
                  <ul className="text-xs space-y-1.5 text-slate-600">
                    {rKey === 'super_admin' && (
                      <>
                        <li className="flex items-center space-x-2 text-emerald-700 font-semibold">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kontrol Penuh Konfigurasi Matriks Hak Akses RBAC</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Akses Seluruh Laporan Keuangan, Omset, Laba, & Export</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pengaturan Identitas Klinik & Backup/Restore Database</span>
                        </li>
                      </>
                    )}

                    {rKey === 'admin' && (
                      <>
                        <li className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kelola Master Data Dokter, Tarif Tindakan, & Spesies</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pengawasan Kasir Pembayaran & Stok Inventaris Barang</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Manajemen Akun Staf & Laporan Operasional Klinik</span>
                        </li>
                      </>
                    )}

                    {rKey === 'dokter' && (
                      <>
                        <li className="flex items-center space-x-2 text-emerald-700 font-semibold">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pemeriksaan Medis (SOAP), Diagnosa, & Resep Obat</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Laporan Tren Penyakit & Epidemiologi Pasien</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Monitoring Pasien Rawat Inap & Dosis Pengobatan</span>
                        </li>
                      </>
                    )}

                    {rKey === 'staf' && (
                      <>
                        <li className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Registrasi Pasien Baru & Cetak Tiket Antrean</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kasir Transaksi Nota Rekam Medis & PetShop Direct</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pencatatan Janji Temu (Appointment) & Restock Supplier</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: SIMULASI AKSES LIVE */}
      {/* ========================================== */}
      {activeSubTab === 'simulator' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Simulasi & Pengujian Tampilan Role Live</h3>
              <p className="text-xs text-slate-500">
                Pilih akun user untuk menguji bagaimana antarmuka navigasi sidebar dan batasan hak akses berjalan secara real-time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {userList.map((u) => {
              const rInfo = ROLE_LABELS[u.role] || ROLE_LABELS.staf;
              const isCurrent = u.id === activeUser.id;

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between space-y-3 transition-all ${
                    isCurrent ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rInfo.bg} ${rInfo.text} ${rInfo.border}`}>
                        {rInfo.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-extrabold text-indigo-700 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800 text-sm mt-2">{u.nama}</p>
                    <p className="text-[11px] text-slate-500">@{u.username}</p>
                  </div>

                  {onSwitchUserContext && (
                    <button
                      onClick={() => onSwitchUserContext(u)}
                      disabled={isCurrent}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white cursor-default'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {isCurrent ? 'Sedang Digunakan' : 'Simulasi Role Ini'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL USER EDIT / ADD */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>{editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna / Staf Baru'}</span>
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Staf *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rina Amalia, A.Md"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username Login *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: rina_staf"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingUser ? 'Password / Sandi Baru (Kosongkan jika tidak diubah)' : 'Password Login *'}
                </label>
                <input
                  type="text"
                  placeholder={editingUser ? 'Password tidak diubah' : 'Contoh: admin123'}
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Hak Akses *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900 bg-indigo-50/30"
                >
                  <option value="super_admin">Super Admin (Pemilik Klinik - Level 1)</option>
                  <option value="admin">Admin Operasional (Manajer - Level 2)</option>
                  <option value="dokter">Dokter Hewan (Tenaga Medis - Level 3)</option>
                  <option value="staf">Staf / Resepsionis (Frontdesk & Kasir - Level 4)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="staf@vetcare.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="081234567..."
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statusAktif}
                    onChange={(e) => setStatusAktif(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  />
                  <span>Akun Aktif (Bisa Login)</span>
                </label>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Simpan User
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
