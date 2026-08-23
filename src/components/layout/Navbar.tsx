import React, { useState } from 'react';
import { User, DataKlinik, Barang } from '../../types';
import {
  ShieldAlert, UserCheck, Bell, Printer, Stethoscope,
  ChevronDown, Wifi, RotateCcw, AlertTriangle, Menu, LogOut
} from 'lucide-react';

interface NavbarProps {
  activeUser: User;
  users?: User[];
  userList?: User[];
  onSelectUser?: (user: User) => void;
  onRoleChange?: (role: any) => void;
  onLogout?: () => void;
  klinik: DataKlinik;
  lowStockItems?: Barang[];
  barangList?: Barang[];
  onOpenInventory?: () => void;
  onOpenSettings?: () => void;
  onNavigateTab?: (tab: any) => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  users = [],
  userList = [],
  onSelectUser,
  onRoleChange,
  onLogout,
  klinik,
  lowStockItems,
  barangList = [],
  onOpenInventory,
  onOpenSettings,
  onNavigateTab,
  onToggleMobileMenu,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showStockDropdown, setShowStockDropdown] = useState(false);

  const effectiveLowStock = lowStockItems || (barangList || []).filter((b) => b.stokCurrent <= b.stokMinimum);
  const effectiveUsers = users.length > 0 ? users : userList;

  const handleOpenInventory = () => {
    if (onOpenInventory) onOpenInventory();
    else if (onNavigateTab) onNavigateTab('inventory');
    setShowStockDropdown(false);
  };

  const handleOpenSettings = () => {
    if (onOpenSettings) onOpenSettings();
    else if (onNavigateTab) onNavigateTab('pengaturan');
  };

  const handleSelectUser = (u: User) => {
    if (onSelectUser) onSelectUser(u);
    else if (onRoleChange) onRoleChange(u.role);
    setShowRoleMenu(false);
  };

  const roleLabels: Record<string, { label: string; color: string }> = {
    super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    admin: { label: 'Admin User', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    staf: { label: 'User Staf / Kasir', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    dokter: { label: 'User Dokter', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  };

  return (
    <header id="app-navbar" className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Mobile Menu Toggle + Logo & Clinic Name */}
          <div className="flex items-center space-x-3">
            {onToggleMobileMenu && (
              <button
                id="btn-mobile-menu"
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                title="Buka Navigasi Utama"
              >
                <Menu className="w-6 h-6 text-slate-700" />
              </button>
            )}

            {klinik.logoUrl ? (
              <img
                src={klinik.logoUrl}
                alt={klinik.namaKlinik}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-md shadow-indigo-100 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-800 leading-tight">{klinik.namaKlinik}</h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Wifi className="w-3 h-3 mr-1 text-emerald-500 animate-pulse" /> Online / Hybrid
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">{klinik.alamat.slice(0, 45)}...</p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">

            {/* Low Stock Notification Bell */}
            <div className="relative">
              <button
                id="btn-stock-bell"
                onClick={() => setShowStockDropdown(!showStockDropdown)}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors focus:outline-hidden"
                title="Peringatan Stok Minimum"
              >
                <Bell className="w-5 h-5" />
                {effectiveLowStock.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
                    {effectiveLowStock.length}
                  </span>
                )}
              </button>

              {/* Stock Warning Dropdown */}
              {showStockDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-rose-600 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Alert Stok Obat Minimum ({effectiveLowStock.length})</span>
                    </div>
                    <button
                      onClick={handleOpenInventory}
                      className="text-xs text-indigo-600 font-medium hover:underline"
                    >
                      Kelola Stok
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {effectiveLowStock.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">Semua stok obat & barang aman.</div>
                    ) : (
                      effectiveLowStock.map((b) => (
                        <div key={b.id} className="p-3 hover:bg-slate-50 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800">{b.namaBarang}</p>
                            <p className="text-slate-400 text-[11px]">{b.kategori} • Rak: {b.lokasiRak || '-'}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700">
                              Sisa {b.stokCurrent} {b.satuan}
                            </span>
                            <p className="text-[10px] text-slate-400">Min: {b.stokMinimum}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Printer Setup shortcut */}
            <button
              id="btn-printer-setup"
              onClick={handleOpenSettings}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors hidden sm:flex items-center space-x-1"
              title="Setup Printer Thermal 58/80mm"
            >
              <Printer className="w-5 h-5 text-indigo-600" />
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                id="btn-user-profile"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {activeUser.nama.slice(0, 2)}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-bold text-slate-800 leading-none">{activeUser.nama}</p>
                  <span className={`inline-block px-1.5 py-0.5 mt-0.5 rounded text-[10px] font-bold border ${roleLabels[activeUser.role]?.color || 'bg-slate-100'}`}>
                    {roleLabels[activeUser.role]?.label || activeUser.role}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* User Profile Popup */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center space-x-3 p-2.5 bg-slate-50 rounded-xl mb-1">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm uppercase shadow-sm shrink-0">
                      {activeUser.nama.slice(0, 2)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-black text-slate-800 truncate">{activeUser.nama}</p>
                      <p className="text-[11px] font-medium text-slate-500 truncate">@{activeUser.username}</p>
                      <span className={`inline-block px-1.5 py-0.5 mt-0.5 rounded text-[9px] font-bold border ${roleLabels[activeUser.role]?.color}`}>
                        {roleLabels[activeUser.role]?.label}
                      </span>
                    </div>
                  </div>

                  {activeUser.email && (
                    <div className="px-2 py-1 text-[11px] text-slate-500 truncate">
                      ✉️ {activeUser.email}
                    </div>
                  )}

                  {onLogout && (
                    <div className="pt-2 border-t border-slate-100 mt-2">
                      <button
                        id="btn-logout-dropdown"
                        onClick={() => {
                          setShowRoleMenu(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center space-x-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Keluar Dari Sistem (Logout)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Direct Logout Button */}
            {onLogout && (
              <button
                id="btn-quick-logout"
                onClick={onLogout}
                className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors hidden sm:flex items-center space-x-1.5"
                title="Keluar / Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-bold hidden lg:inline">Keluar</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
