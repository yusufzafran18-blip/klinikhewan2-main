import React from 'react';
import { ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';
import { User, UserRole } from '../../types';

interface AccessDeniedViewProps {
  activeUser: User;
  tabId: string;
  onGoToDashboard: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  activeUser,
  tabId,
  onGoToDashboard,
}) => {
  const roleLabels: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin Operational',
    staf: 'Staf / Kasir',
    dokter: 'Dokter Hewan',
  };

  const formattedTabName = tabId.replace('_', ' ').toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-rose-200 p-8 sm:p-12 shadow-xl text-center space-y-6 max-w-2xl mx-auto my-8 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
        <ShieldAlert className="w-9 h-9" />
      </div>

      <div className="space-y-2">
        <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-xs font-black uppercase tracking-wider">
          Otorisasi Dibatasi (RBAC)
        </span>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Akses Modul Ditolak
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
          Akun Anda (<strong>{activeUser.nama || activeUser.username}</strong>) bertindak sebagai role <span className="font-bold text-indigo-600">{roleLabels[activeUser.role] || activeUser.role}</span> dan tidak memiliki hak akses untuk membuka modul <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-rose-700 font-bold">{formattedTabName}</code>.
        </p>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-left space-y-2 max-w-md mx-auto">
        <div className="flex items-center space-x-2 font-bold text-slate-700">
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <span>Sistem Otorisasi Berbasis Peran (RBAC)</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Matriks hak akses dikelola melalui menu <strong>Hak Akses & Role</strong> oleh Super Admin / Admin Klinik. Hubungi administrator jika Anda memerlukan akses ke fitur ini.
        </p>
      </div>

      <div className="pt-2">
        <button
          onClick={onGoToDashboard}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center space-x-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard Utama</span>
        </button>
      </div>
    </div>
  );
};
