import React, { useState } from 'react';
import { UserRole, RBACConfig } from '../../types';
import { getModulePermissions } from '../../utils/rbac';
import {
  LayoutDashboard, ClipboardList, Users, Stethoscope, BedDouble,
  CalendarDays, ShoppingBag, CreditCard, ShoppingCart, Database,
  FileSpreadsheet, MessageSquare, Settings, FileText, Search, X, ChevronRight,
  BriefcaseMedical, TrendingUp, Activity, ShieldCheck, LogOut
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'pendaftaran'
  | 'pasien'
  | 'rekam_medis'
  | 'rawat_jalan'
  | 'rawat_inap'
  | 'janji_temu'
  | 'kasir'
  | 'penjualan'
  | 'penjualan_direct'
  | 'inventory'
  | 'pembelian'
  | 'supplier'
  | 'master'
  | 'master_data'
  | 'laporan'
  | 'laporan_laba'
  | 'laporan_tren_penyakit'
  | 'pengaturan'
  | 'hak_akses'
  | 'whatsapp';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  rbacConfig?: RBACConfig;
  queueCount?: number;
  inpatientCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  rbacConfig,
  queueCount = 0,
  inpatientCount = 0,
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const menuGroups = [
    {
      groupName: 'Layanan Medis & Pasien',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Overview',
          icon: LayoutDashboard,
          roles: ['super_admin', 'admin', 'staf', 'dokter'],
        },
        {
          id: 'pendaftaran',
          label: 'Pendaftaran & Antrian',
          icon: ClipboardList,
          badge: queueCount > 0 ? queueCount : null,
          badgeColor: 'bg-indigo-500 text-white',
          roles: ['super_admin', 'admin', 'staf', 'dokter'],
        },
        {
          id: 'pasien',
          label: 'Data Pasien & Owner',
          icon: Users,
          roles: ['super_admin', 'admin', 'staf', 'dokter'],
        },
        {
          id: 'rekam_medis',
          label: 'Rekam Medis (SOAP)',
          icon: Stethoscope,
          roles: ['super_admin', 'admin', 'staf', 'dokter'],
        },
        {
          id: 'rawat_jalan',
          label: 'Layanan Rawat Jalan',
          icon: BriefcaseMedical,
          roles: ['super_admin', 'admin', 'staf', 'dokter'],
        },
        {
          id: 'rawat_inap',
          label: 'Rawat Inap & Monitoring',
          icon: BedDouble,
          badge: inpatientCount > 0 ? inpatientCount : null,
          badgeColor: 'bg-amber-500 text-white',
          roles: ['super_admin', 'admin', 'staf', 'dokter'],
        },
        {
          id: 'janji_temu',
          label: 'Janji Temu (Appointment)',
          icon: CalendarDays,
          roles: ['super_admin', 'admin', 'staf', 'dokter'],
        },
      ],
    },
    {
      groupName: 'Kasir & Inventaris PetShop',
      items: [
        {
          id: 'kasir',
          label: 'Kasir Pembayaran Nota',
          icon: CreditCard,
          roles: ['super_admin', 'admin', 'staf'],
        },
        {
          id: 'penjualan',
          label: 'Kasir PetShop Direct',
          icon: ShoppingBag,
          roles: ['super_admin', 'admin', 'staf'],
        },
        {
          id: 'inventory',
          label: 'Stok Obat & Barang',
          icon: Database,
          roles: ['super_admin', 'admin', 'staf', 'dokter'],
        },
        {
          id: 'pembelian',
          label: 'Pembelian Stok Barang',
          icon: ShoppingCart,
          roles: ['super_admin', 'admin', 'staf'],
        },
        {
          id: 'supplier',
          label: 'Master Supplier',
          icon: Users,
          roles: ['super_admin', 'admin', 'staf'],
        },
      ],
    },
    {
      groupName: 'Manajemen & Laporan',
      items: [
        {
          id: 'master',
          label: 'Master Data & Dokter',
          icon: FileText,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'laporan',
          label: 'Laporan Keuangan',
          icon: FileSpreadsheet,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'laporan_laba',
          label: 'Laporan Laba Penjualan',
          icon: TrendingUp,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'laporan_tren_penyakit',
          label: 'Laporan Tren Penyakit',
          icon: Activity,
          roles: ['super_admin', 'admin', 'dokter'],
        },
        {
          id: 'hak_akses',
          label: 'Hak Akses & Role (RBAC)',
          icon: ShieldCheck,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'whatsapp',
          label: 'Integrasi WhatsApp',
          icon: MessageSquare,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'pengaturan',
          label: 'Pengaturan & Backup',
          icon: Settings,
          roles: ['super_admin', 'admin'],
        },
      ],
    },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId as ActiveTab);
    if (onCloseMobile) onCloseMobile();
  };

  const isTabActive = (itemTabId: string) => {
    if (itemTabId === 'penjualan' && (activeTab === 'penjualan' || activeTab === 'penjualan_direct')) return true;
    if (itemTabId === 'master' && (activeTab === 'master' || activeTab === 'master_data')) return true;
    return activeTab === itemTabId;
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-extrabold text-slate-200 tracking-wider uppercase">NAVIGASI UTAMA</span>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Filter input */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Cari menu (cth: Kasir, SOAP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/90 text-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs placeholder:text-slate-500 border border-slate-700/60 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Menu Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 custom-scrollbar">
        {menuGroups.map((group) => {
          const filteredItems = group.items.filter((item) => {
            const perms = getModulePermissions(item.id, userRole, rbacConfig);
            const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase());
            return perms.canView && matchesSearch;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={group.groupName} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {group.groupName}
              </p>

              {filteredItems.map((item) => {
                const Icon = item.icon;
                const active = isTabActive(item.id);
                return (
                  <button
                    key={item.id}
                    id={`sidebar-tab-${item.id}`}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      active
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 font-bold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                          active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {item.badge ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      ) : active ? (
                        <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-500 space-y-2">
        <div className="flex items-center justify-between">
          <span>VetCare v2.4 PRO</span>
          <span className="capitalize font-semibold text-slate-400">{userRole.replace('_', ' ')}</span>
        </div>
        {onLogout && (
          <button
            id="btn-sidebar-logout"
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-800/50 border border-slate-700/60 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center space-x-2"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Keluar (Logout)</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        id="app-sidebar"
        className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:block min-h-[calc(100vh-4rem)] border-r border-slate-800"
      >
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Sidebar */}
          <aside className="relative w-72 max-w-[80vw] bg-slate-900 text-slate-300 flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};

