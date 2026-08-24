import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { PendaftaranView } from './components/views/PendaftaranView';
import { PasienView } from './components/views/PasienView';
import { RekamMedisView } from './components/views/RekamMedisView';
import { RawatJalanView } from './components/views/RawatJalanView';
import { RawatInapView } from './components/views/RawatInapView';
import { JanjiTemuView } from './components/views/JanjiTemuView';
import { KasirView } from './components/views/KasirView';
import { PenjualanDirectView } from './components/views/PenjualanDirectView';
import { InventoryView } from './components/views/InventoryView';
import { PembelianView } from './components/views/PembelianView';
import { SupplierView } from './components/views/SupplierView';
import { MasterDataView } from './components/views/MasterDataView';
import { LaporanKeuanganView } from './components/views/LaporanKeuanganView';
import { LaporanLabaPenjualanView } from './components/views/LaporanLabaPenjualanView';
import { LaporanTrenPenyakitView } from './components/views/LaporanTrenPenyakitView';
import { FeedbackView } from './components/views/FeedbackView';
import { PengaturanView } from './components/views/PengaturanView';
import { HakAksesView } from './components/views/HakAksesView';
import { WhatsAppIntegrationView } from './components/views/WhatsAppIntegrationView';
import { LoginView } from './components/views/LoginView';
import { AccessDeniedView } from './components/views/AccessDeniedView';
import { getModulePermissions } from './utils/rbac';
import { normalizeClinicProfile } from './utils/clinic';

import { storageService } from './services/storage';
import { createAuthSession, destroyAuthSession, restoreAuthSession } from './services/sqlApi';
import {
  User, Pasien, Pendaftaran, RekamMedis, RawatInap, Transaksi,
  DetailTransaksiItem, Barang, JanjiTemu, Supplier, PembelianSupplier, Dokter, Tindakan,
  PakanHewan, RiwayatVaksinasi, FeedbackPelanggan, DataKlinik, AppSettings,
  MonitoringLog, Spesies, RBACConfig, WhatsAppConfig, WhatsAppTemplate, WhatsAppLog
} from './types';

export function App() {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isServerAvailable, setIsServerAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auth Handlers
  const handleLogin = async (user: User) => {
    try {
      await createAuthSession(user.id);
      setActiveUser(user);
    } catch (error: any) {
      window.alert(error.message || 'Gagal membuat sesi login.');
    }
  };

  const handleLogout = async () => {
    await destroyAuthSession();
    setActiveUser(null);
    storageService.logout();
  };

  // Data Collections
  const [pasienList, setPasienList] = useState<Pasien[]>([]);
  const [pendaftaranList, setPendaftaranList] = useState<Pendaftaran[]>([]);
  const [rekamMedisList, setRekamMedisList] = useState<RekamMedis[]>([]);
  const [rawatInapList, setRawatInapList] = useState<RawatInap[]>([]);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [janjiTemuList, setJanjiTemuList] = useState<JanjiTemu[]>([]);
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [pembelianList, setPembelianList] = useState<PembelianSupplier[]>([]);
  const [dokterList, setDokterList] = useState<Dokter[]>([]);
  const [tindakanList, setTindakanList] = useState<Tindakan[]>([]);
  const [pakanList, setPakanList] = useState<PakanHewan[]>([]);
  const [spesiesList, setSpesiesList] = useState<Spesies[]>([]);
  const [vaksinasiList, setVaksinasiList] = useState<RiwayatVaksinasi[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackPelanggan[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [rbacConfig, setRbacConfig] = useState<RBACConfig>({ modules: [] });
  const [klinik, setKlinik] = useState<DataKlinik>(normalizeClinicProfile(storageService.getKlinikData()));
  const [settings, setSettings] = useState<AppSettings>(storageService.getAppSettings());
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>(() => storageService.getWhatsAppConfig());
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplate[]>([]);
  const [waLogs, setWaLogs] = useState<WhatsAppLog[]>([]);

  // Navigation badge counts
  const queueCount = pendaftaranList.filter((p) => p.status === 'Antri' || p.status === 'Diperiksa').length;
  const inpatientCount = rawatInapList.filter((i) => i.status === 'Dirawat').length;

  // Inter-tab flow state (e.g. start examining patient from queue)
  const [activePendaftaranForSOAP, setActivePendaftaranForSOAP] = useState<Pendaftaran | null>(null);

  // Load All Data on Mount or Reload
  const loadAllData = () => {
    setPasienList(storageService.getPasienList());
    setPendaftaranList(storageService.getPendaftaranList());
    setRekamMedisList(storageService.getRekamMedisList());
    setRawatInapList(storageService.getRawatInapList());
    setTransaksiList(storageService.getTransaksiList());
    setBarangList(storageService.getBarangList());
    setJanjiTemuList(storageService.getJanjiTemuList());
    setSupplierList(storageService.getSupplierList());
    setPembelianList(storageService.getPembelianList());
    setDokterList(storageService.getDokterList());
    setTindakanList(storageService.getTindakanList());
    setPakanList(storageService.getPakanList());
    setSpesiesList(storageService.getSpesiesList());
    setVaksinasiList(storageService.getVaksinasiList());
    setFeedbackList(storageService.getFeedbackList());
    setUserList(storageService.getUserList());
    setRbacConfig(storageService.getRBACConfig());
    setKlinik(normalizeClinicProfile(storageService.getKlinikData()));
    setSettings(storageService.getAppSettings());
    setWaConfig(storageService.getWhatsAppConfig());
    setWaTemplates(storageService.getWhatsAppTemplates());
    setWaLogs(storageService.getWhatsAppLogs());
  };

  useEffect(() => {
    let monitorTimer: number | undefined;
    let recoveryInProgress = false;
    let connectionUp = false;

    const checkServer = async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch('/api/db/status', {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const status = await response.json();
        if (!status.connected) throw new Error(status.message || 'MySQL tidak terhubung');

        if (!connectionUp && !recoveryInProgress) {
          recoveryInProgress = true;
          try {
            await storageService.initStorage();
            const session = await restoreAuthSession();
            if (session.authenticated && session.user) setActiveUser(session.user);
            loadAllData();
          } finally {
            recoveryInProgress = false;
          }
        }
        connectionUp = true;
        setStorageError(null);
        setIsServerAvailable(true);
      } catch (error) {
        connectionUp = false;
        setIsServerAvailable(false);
        setActiveUser(null);
        setStorageError('Server aplikasi atau database MySQL terputus.');
      } finally {
        window.clearTimeout(timeout);
      }
    };

    storageService.initStorage().then(async () => {
      loadAllData();
      try {
        const session = await restoreAuthSession();
        if (session.authenticated && session.user) {
          setActiveUser(session.user);
        }
      } catch (error) {
        setStorageError('Server autentikasi tidak tersedia.');
        throw error;
      }
      connectionUp = true;
      setIsServerAvailable(true);
      setIsStorageReady(true);
    }).catch((error: Error) => {
      setStorageError(error.message);
      setIsServerAvailable(false);
    });

    const unsubscribe = storageService.subscribe(() => {
      loadAllData();
    });

    monitorTimer = window.setInterval(checkServer, 5000);
    checkServer();

    return () => {
      unsubscribe();
      if (monitorTimer) window.clearInterval(monitorTimer);
    };
  }, []);

  if (!isStorageReady || !isServerAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-center">
        <div className="max-w-md rounded-2xl border border-rose-900 bg-slate-900 p-8 text-white shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 text-2xl">!</div>
          <h1 className="text-xl font-bold">Aplikasi Tidak Aktif</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {storageError || 'Menghubungkan ke server aplikasi dan database MySQL...'}
          </p>
          <p className="mt-4 text-xs text-slate-400">Aplikasi akan aktif kembali setelah server dan database tersedia.</p>
        </div>
      </div>
    );
  }

  // Role Switching Handler
  const handleRoleChange = (role: any) => {
    if (!activeUser) return;
    const updated = { ...activeUser, role };
    setActiveUser(updated);
    createAuthSession(updated.id).catch((error: Error) => {
      window.alert(error.message);
    });
  };

  // Handlers for Pendaftaran
  const handleSavePendaftaran = (pdf: Pendaftaran) => {
    const updated = [pdf, ...pendaftaranList];
    setPendaftaranList(updated);
    storageService.savePendaftaranList(updated);
  };

  const handleUpdatePendaftaranStatus = (id: string, status: 'Antri' | 'Diperiksa' | 'Selesai' | 'Batal') => {
    const updated = pendaftaranList.map((p) => p.id === id ? { ...p, status } : p);
    setPendaftaranList(updated);
    storageService.savePendaftaranList(updated);
  };

  const handleStartExamine = (pendaftaran: Pendaftaran) => {
    setActivePendaftaranForSOAP(pendaftaran);
    setActiveTab('rekam_medis');
  };

  // Handlers for Pasien
  const handleSavePasien = (pasien: Pasien) => {
    const exists = pasienList.some((p) => p.id === pasien.id);
    const updated = exists
      ? pasienList.map((p) => p.id === pasien.id ? pasien : p)
      : [pasien, ...pasienList];
    setPasienList(updated);
    storageService.savePasienList(updated);
  };

  const handleDeletePasien = (id: string) => {
    const updated = pasienList.filter((p) => p.id !== id);
    setPasienList(updated);
    storageService.savePasienList(updated);
  };

  // Handlers for Rekam Medis
  const handleSaveRekamMedis = async (rm: RekamMedis) => {
    const updatedRM = [rm, ...rekamMedisList];
    try {
      await storageService.saveRekamMedisList(updatedRM);
      setRekamMedisList(updatedRM);
    } catch (error: any) {
      window.alert(`Gagal menyimpan rekam medis ke MySQL: ${error.message}`);
      return;
    }

    // If originated from pendaftaran queue, mark pendaftaran as Selesai
    if (rm.pendaftaranId) {
      handleUpdatePendaftaranStatus(rm.pendaftaranId, 'Selesai');
    }

    // If plan specifies Rawat Inap, auto create RawatInap record
    if (rm.plan.statusLanjutan === 'Rawat Inap') {
      const newInap: RawatInap = {
        id: 'inap-' + Date.now(),
        pasienId: rm.pasienId,
        noKandang: 'Kandang Kucing A-01',
        tanggalMasuk: new Date().toISOString().replace('T', ' ').slice(0, 16),
        dokterPenanggungJawabId: rm.dokterId,
        diagnosaInap: rm.assessment.diagnosaUtama,
        tarifPerHari: 100000,
        status: 'Aktif',
        monitoringLogs: [],
      };
      const updatedInap = [newInap, ...rawatInapList];
      setRawatInapList(updatedInap);
      await storageService.saveRawatInapList(updatedInap);
    }
  };

  // Handlers for Rawat Inap
  const handleSaveRawatInap = async (inap: RawatInap) => {
    const existingIndex = rawatInapList.findIndex((item) => item.id === inap.id);
    const updated = existingIndex >= 0
      ? rawatInapList.map((item) => item.id === inap.id ? inap : item)
      : [inap, ...rawatInapList];
    try {
      await storageService.saveRawatInapList(updated);
      setRawatInapList(updated);
    } catch (error: any) {
      window.alert(`Gagal menyimpan rawat inap ke MySQL: ${error.message}`);
    }
  };

  const handleDeleteRawatInap = async (inapId: string) => {
    const updated = rawatInapList.filter((r) => r.id !== inapId);
    setRawatInapList(updated);
    await storageService.saveRawatInapList(updated);
  };

  const handleUseInventory = async (items: { barangId?: string; nama?: string; jumlah: number }[]) => {
    if (!items || items.length === 0) return;

    const insufficient = [] as string[];
    const updatedBarang = [...barangList];

    items.forEach((item) => {
      if (!item || item.jumlah <= 0) return;

      const matchIndex = updatedBarang.findIndex((barang) => {
        if (item.barangId) return barang.id === item.barangId;
        if (item.nama) {
          const target = item.nama.toLowerCase();
          return barang.namaBarang.toLowerCase().includes(target) && (
            item.barangId || barang.kategori === 'Obat' || barang.kategori === 'Alkes'
          );
        }
        return false;
      });

      if (matchIndex < 0) {
        insufficient.push(item.nama || 'Barang tidak terdaftar');
        return;
      }

      const current = updatedBarang[matchIndex].stokCurrent || 0;
      if (current < item.jumlah) {
        insufficient.push(`${updatedBarang[matchIndex].namaBarang} (stok ${current}, diminta ${item.jumlah})`);
      }
    });

    if (insufficient.length > 0) {
      window.alert(`Stok tidak cukup untuk: ${insufficient.join(', ')}.`);
      return;
    }

    items.forEach((item) => {
      if (!item || item.jumlah <= 0) return;

      const matchIndex = updatedBarang.findIndex((barang) => {
        if (item.barangId) return barang.id === item.barangId;
        if (item.nama) {
          const target = item.nama.toLowerCase();
          return barang.namaBarang.toLowerCase().includes(target) && (
            item.barangId || barang.kategori === 'Obat' || barang.kategori === 'Alkes'
          );
        }
        return false;
      });

      if (matchIndex >= 0) {
        updatedBarang[matchIndex] = {
          ...updatedBarang[matchIndex],
          stokCurrent: Math.max(0, (updatedBarang[matchIndex].stokCurrent || 0) - item.jumlah),
        };
      }
    });

    setBarangList(updatedBarang);
    await storageService.saveBarangList(updatedBarang);
  };

  const handleAddLogMonitoring = (inapId: string, log: MonitoringLog) => {
    const updated = rawatInapList.map((inap) => {
      if (inap.id === inapId) {
        return {
          ...inap,
          monitoringLogs: [...inap.monitoringLogs, log]
        };
      }
      return inap;
    });
    setRawatInapList(updated);
    storageService.saveRawatInapList(updated);
  };

  const handleCheckoutInap = async (inapId: string) => {
    const target = rawatInapList.find((inap) => inap.id === inapId);
    if (!target) return;

    const keluarAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updated = rawatInapList.map((inap) => inap.id === inapId ? { ...inap, status: 'Selesai / Pulang' as const, tanggalKeluarAktif: keluarAt } : inap);
    setRawatInapList(updated);
    await storageService.saveRawatInapList(updated);

    const alreadyExists = transaksiList.some((trx) => trx.rawatInapId === inapId);
    if (alreadyExists) return;

    const pasien = pasienList.find((p) => p.id === target.pasienId);
    const tanggalMasuk = new Date(target.tanggalMasuk);
    const tanggalKeluar = new Date(keluarAt);
    const durationDays = Math.max(1, Math.ceil((tanggalKeluar.getTime() - tanggalMasuk.getTime()) / (1000 * 60 * 60 * 24)));

    const items: DetailTransaksiItem[] = [
      {
        id: `inap-harian-${target.id}`,
        jenis: 'Rawat Inap',
        namaItem: `Sewa Kandang & Monitoring (${target.noKandang})`,
        jumlah: durationDays,
        hargaSatuan: target.tarifPerHari || 0,
        subtotal: (target.tarifPerHari || 0) * durationDays,
      },
      ...(target.pemberianObatList || []).map((item, idx) => ({
        id: `inap-obat-${target.id}-${idx}`,
        jenis: 'Obat' as const,
        namaItem: `${item.namaBarang} (${item.dosis || 'Terapi'})`,
        jumlah: item.jumlah,
        hargaSatuan: item.hargaSatuan || 0,
        subtotal: item.subtotal || ((item.hargaSatuan || 0) * item.jumlah),
      })),
      ...(target.penggunaanAlkesList || []).map((item, idx) => ({
        id: `inap-alkes-${target.id}-${idx}`,
        jenis: 'Barang/Pakan' as const,
        namaItem: `${item.namaAlkes} (${item.satuan || 'Pcs'})`,
        jumlah: item.jumlah,
        hargaSatuan: item.hargaSatuan || 0,
        subtotal: item.subtotal || ((item.hargaSatuan || 0) * item.jumlah),
      })),
      ...(target.tindakanMedisList || []).map((item, idx) => ({
        id: `inap-tindakan-${target.id}-${idx}`,
        jenis: 'Tindakan' as const,
        namaItem: `${item.namaTindakan} (${item.jumlah}x)`,
        jumlah: item.jumlah,
        hargaSatuan: item.hargaSatuan || 0,
        subtotal: item.subtotal || ((item.hargaSatuan || 0) * item.jumlah),
      })),
      ...(target.biayaTambahan && target.biayaTambahan > 0 ? [{
        id: `inap-biaya-${target.id}`,
        jenis: 'Rawat Inap' as const,
        namaItem: 'Biaya Tambahan Rawat Inap',
        jumlah: 1,
        hargaSatuan: target.biayaTambahan,
        subtotal: target.biayaTambahan,
      }] : []),
    ];

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const noNota = `INV-INAP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(transaksiList.length + 1).padStart(3, '0')}`;

    const newTrx: Transaksi = {
      id: `trx-inap-${Date.now()}`,
      noNota,
      tanggal: keluarAt,
      rawatInapId: inapId,
      pasienId: target.pasienId,
      namaPelanggan: `${pasien?.namaOwner || 'Owner'} (${pasien?.namaHewan || 'Hewan'})`,
      typeTransaksi: 'Rawat Inap',
      items,
      subtotal,
      diskon: 0,
      pajak: 0,
      grandTotal: subtotal,
      metodePembayaran: 'Transfer QRIS',
      jumlahBayar: subtotal,
      kembalian: 0,
      status: 'Lunas',
      kasirId: activeUser?.id || 'system',
    };

    const nextTrx = [newTrx, ...transaksiList];
    setTransaksiList(nextTrx);
    await storageService.saveTransaksiList(nextTrx);
  };

  // Handlers for Janji Temu
  const handleSaveJanjiTemu = async (jt: JanjiTemu) => {
    const updated = [jt, ...janjiTemuList];
    try {
      await storageService.saveJanjiTemuList(updated);
      setJanjiTemuList(updated);
    } catch (error: any) {
      window.alert(`Gagal menyimpan janji temu ke MySQL: ${error.message}`);
      throw error;
    }
  };

  const handleUpdateJanjiTemuStatus = (id: string, status: any) => {
    const updated = janjiTemuList.map((jt) => jt.id === id ? { ...jt, status } : jt);
    setJanjiTemuList(updated);
    storageService.saveJanjiTemuList(updated);
  };

  // Handlers for Transaksi Kasir POS
  const handleSaveTransaksi = async (trx: Transaksi) => {
    const updatedTrx = [trx, ...transaksiList];
    try {
      await storageService.saveTransaksiList(updatedTrx);
      setTransaksiList(updatedTrx);
    } catch (error: any) {
      window.alert(`Gagal menyimpan transaksi ke MySQL: ${error.message}`);
      return;
    }

    // If payment for RM, update RM status to Lunas
    if (trx.rekamMedisId) {
      const updatedRM = rekamMedisList.map((rm) => rm.id === trx.rekamMedisId ? { ...rm, statusPembayaran: 'Lunas' as const } : rm);
      setRekamMedisList(updatedRM);
      await storageService.saveRekamMedisList(updatedRM);
    }

    // Deduct inventory stock for items sold
    let currentBarang = [...barangList];
    trx.items.forEach((item) => {
      const bIdx = currentBarang.findIndex((b) => b.namaBarang.includes(item.namaItem) || b.id === item.id);
      if (bIdx !== -1) {
        currentBarang[bIdx] = {
          ...currentBarang[bIdx],
          stokCurrent: Math.max(0, currentBarang[bIdx].stokCurrent - item.jumlah),
        };
      }
    });
    setBarangList(currentBarang);
    await storageService.saveBarangList(currentBarang);
  };

  const handleVoidTransaksi = (id: string, alasan: string, user: string) => {
    const updated = transaksiList.map((t) => t.id === id ? {
      ...t,
      status: 'Dibatalkan' as const,
      alasanPembatalan: alasan,
      dibatalkanOleh: user,
    } : t);
    setTransaksiList(updated);
    storageService.saveTransaksiList(updated);
  };

  // Cancellation handlers
  const handleCancelRawatInap = async (inapId: string, alasan: string, user: string, revertStock: boolean = true) => {
    const target = rawatInapList.find((r) => r.id === inapId);
    if (!target) return;

    // Restore inventory for obat & alkes used during inap only if requested
    if (revertStock && ((target.pemberianObatList && target.pemberianObatList.length > 0) || (target.penggunaanAlkesList && target.penggunaanAlkesList.length > 0))) {
      const updatedBarang = [...barangList];
      (target.pemberianObatList || []).forEach((it) => {
        const idx = updatedBarang.findIndex((b) => b.id === it.barangId || b.namaBarang === it.namaBarang);
        if (idx >= 0) {
          updatedBarang[idx] = { ...updatedBarang[idx], stokCurrent: (updatedBarang[idx].stokCurrent || 0) + (it.jumlah || 0) };
        }
      });
      (target.penggunaanAlkesList || []).forEach((it) => {
        const idx = updatedBarang.findIndex((b) => b.id === it.id || b.namaBarang === it.namaAlkes);
        if (idx >= 0) {
          updatedBarang[idx] = { ...updatedBarang[idx], stokCurrent: (updatedBarang[idx].stokCurrent || 0) + (it.jumlah || 0) };
        }
      });
      setBarangList(updatedBarang);
      await storageService.saveBarangList(updatedBarang);
    }

    const updatedInap = rawatInapList.map((r) => r.id === inapId ? { ...r, status: 'Dibatalkan' as const, alasanPembatalan: alasan, dibatalkanOleh: user } : r);
    setRawatInapList(updatedInap);
    await storageService.saveRawatInapList(updatedInap);
  };

  const handleCancelRekamMedis = async (rmId: string, alasan: string, user: string) => {
    const exists = rekamMedisList.some((rm) => rm.id === rmId);
    if (!exists) return;
    const updated = rekamMedisList.map((rm) => rm.id === rmId ? { ...rm, alasanPembatalan: alasan, dibatalkanOleh: user, statusPembayaran: 'Dibatalkan' as const } : rm);
    setRekamMedisList(updated);
    await storageService.saveRekamMedisList(updated);
  };

  // Delete handler for Rawat Jalan (permanent removal)
  const handleDeleteRekamMedis = async (rmId: string) => {
    const exists = rekamMedisList.some((rm) => rm.id === rmId);
    if (!exists) return;
    const updated = rekamMedisList.filter((rm) => rm.id !== rmId);
    setRekamMedisList(updated);
    await storageService.saveRekamMedisList(updated);
  };

  const handleCancelPembelian = async (poId: string, alasan: string, user: string, revertStock: boolean = true) => {
    const target = pembelianList.find((p) => p.id === poId);
    if (!target) return;

    // If the purchase already added stock, revert it only when requested
    if (revertStock && target.status === 'Selesai') {
      const updatedBarang = [...barangList];
      (target.items || []).forEach((it) => {
        const idx = updatedBarang.findIndex((b) => b.id === it.barangId || b.namaBarang === it.namaBarang);
        if (idx >= 0) {
          updatedBarang[idx] = { ...updatedBarang[idx], stokCurrent: Math.max(0, (updatedBarang[idx].stokCurrent || 0) - (it.jumlah || 0)) };
        }
      });
      setBarangList(updatedBarang);
      await storageService.saveBarangList(updatedBarang);
    }

    const updatedPo = pembelianList.map((p) => p.id === poId ? { ...p, status: 'Dibatalkan' as const, alasanPembatalan: alasan, dibatalkanOleh: user } : p);
    setPembelianList(updatedPo);
    await storageService.savePembelianList(updatedPo);
  };

  // Handlers for Barang & Inventory
  const handleSaveBarang = async (b: Barang) => {
    const exists = barangList.some((item) => item.id === b.id);
    const updated = exists
      ? barangList.map((item) => item.id === b.id ? b : item)
      : [b, ...barangList];
    try {
      await storageService.saveBarangList(updated);
      setBarangList(updated);
    } catch (error: any) {
      window.alert(`Gagal menyimpan barang ke MySQL: ${error.message}`);
    }
  };

  const handleDeleteBarang = (id: string) => {
    const updated = barangList.filter((b) => b.id !== id);
    setBarangList(updated);
    storageService.saveBarangList(updated);
  };

  // Handlers for Master Data & RBAC
  const handleSaveUser = async (u: User) => {
    const exists = userList.some((item) => item.id === u.id);
    const updated = exists
      ? userList.map((item) => item.id === u.id ? u : item)
      : [u, ...userList];
    try {
      await storageService.saveUserList(updated);
      setUserList(updated);
    } catch (error: any) {
      window.alert(`Gagal menyimpan user ke MySQL: ${error.message}`);
    }
  };

  const handleDeleteUser = (id: string) => {
    const updated = userList.filter((u) => u.id !== id);
    setUserList(updated);
    storageService.saveUserList(updated);
  };

  const handleSaveRBACConfig = (config: RBACConfig) => {
    setRbacConfig(config);
    storageService.saveRBACConfig(config);
  };

  const handleSaveWaConfig = (config: WhatsAppConfig) => {
    setWaConfig(config);
    storageService.saveWhatsAppConfig(config);
  };

  const handleSaveWaTemplates = (templates: WhatsAppTemplate[]) => {
    setWaTemplates(templates);
    storageService.saveWhatsAppTemplates(templates);
  };

  const handleAddWaLog = (logData: Omit<WhatsAppLog, 'id'>) => {
    const updated = storageService.addWhatsAppLog(logData);
    setWaLogs(updated);
  };

  const handleSaveDokter = async (d: Dokter) => {
    const exists = dokterList.some((item) => item.id === d.id);
    const updated = exists
      ? dokterList.map((item) => item.id === d.id ? d : item)
      : [d, ...dokterList];
    try {
      await storageService.saveDokterList(updated);
      setDokterList(updated);
    } catch (error: any) {
      window.alert(`Gagal menyimpan dokter ke MySQL: ${error.message}`);
    }
  };

  const handleDeleteDokter = (id: string) => {
    const updated = dokterList.filter((d) => d.id !== id);
    setDokterList(updated);
    storageService.saveDokterList(updated);
  };

  const handleSaveTindakan = async (t: Tindakan) => {
    const exists = tindakanList.some((item) => item.id === t.id);
    const updated = exists
      ? tindakanList.map((item) => item.id === t.id ? t : item)
      : [t, ...tindakanList];
    try {
      await storageService.saveTindakanList(updated);
      setTindakanList(updated);
    } catch (error: any) {
      window.alert(`Gagal menyimpan tindakan ke MySQL: ${error.message}`);
    }
  };

  const handleDeleteTindakan = (id: string) => {
    const updated = tindakanList.filter((t) => t.id !== id);
    setTindakanList(updated);
    storageService.saveTindakanList(updated);
  };

  const handleSavePakan = (p: PakanHewan) => {
    const updated = [p, ...pakanList];
    setPakanList(updated);
    storageService.savePakanList(updated);
  };

  const handleSaveSpesies = async (s: Spesies) => {
    const exists = spesiesList.some((item) => item.id === s.id);
    const updated = exists
      ? spesiesList.map((item) => item.id === s.id ? s : item)
      : [...spesiesList, s];
    try {
      await storageService.saveSpesiesList(updated);
      setSpesiesList(updated);
    } catch (error: any) {
      window.alert(`Gagal menyimpan spesies ke MySQL: ${error.message}`);
    }
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
    const updated = supplierList.some((item) => item.id === supplier.id)
      ? supplierList.map((item) => item.id === supplier.id ? supplier : item)
      : [supplier, ...supplierList];
    await storageService.saveSupplierList(updated);
    setSupplierList(updated);
  };

  const handleDeleteSupplier = async (id: string) => {
    const updated = supplierList.filter((supplier) => supplier.id !== id);
    await storageService.saveSupplierList(updated);
    setSupplierList(updated);
  };

  const handleDeleteSpesies = (id: string) => {
    const updated = spesiesList.filter((s) => s.id !== id);
    setSpesiesList(updated);
    storageService.saveSpesiesList(updated);
  };

  // Settings & Klinik
  const handleSaveKlinik = async (k: DataKlinik) => {
    setKlinik(normalizeClinicProfile(k));
    await storageService.saveKlinikData(k);
  };

  const handleSaveSettings = async (s: AppSettings) => {
    setSettings(s);
    await storageService.saveAppSettings(s);
  };

  if (!activeUser) {
    return (
      <LoginView
        userList={userList}
        klinik={klinik}
        onLogin={handleLogin}
        onUpdateUserList={(updated) => setUserList(updated)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white pb-16 md:pb-0">
      
      {/* Top Navbar */}
      <Navbar
        activeUser={activeUser}
        userList={userList}
        klinik={klinik}
        barangList={barangList}
        onRoleChange={handleRoleChange}
        onLogout={handleLogout}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
      />

      {/* Main Container Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={activeUser.role}
          rbacConfig={rbacConfig}
          queueCount={queueCount}
          inpatientCount={inpatientCount}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          onLogout={handleLogout}
        />

        {/* Content View Router with RBAC Guard */}
        <main className="flex-1 min-w-0">
          {(() => {
            const currentTabPerms = getModulePermissions(activeTab, activeUser.role, rbacConfig);

            if (!currentTabPerms.canView) {
              return (
                <AccessDeniedView
                  activeUser={activeUser}
                  tabId={activeTab}
                  onGoToDashboard={() => setActiveTab('dashboard')}
                />
              );
            }

            return (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    pasienList={pasienList}
                    transaksiList={transaksiList}
                    rawatInapList={rawatInapList}
                    pendaftaranList={pendaftaranList}
                    barangList={barangList}
                    janjiTemuList={janjiTemuList}
                    onNavigateTab={setActiveTab}
                  />
                )}

                {activeTab === 'pendaftaran' && (
                  <PendaftaranView
                    pendaftaranList={pendaftaranList}
                    pasienList={pasienList}
                    dokterList={dokterList}
                    activeUser={activeUser}
                    onSavePendaftaran={handleSavePendaftaran}
                    onUpdateStatus={handleUpdatePendaftaranStatus}
                    onStartExamine={handleStartExamine}
                  />
                )}

                {activeTab === 'pasien' && (
                  <PasienView
                    pasienList={pasienList}
                    rekamMedisList={rekamMedisList}
                    dokterList={dokterList}
                    vaksinasiList={vaksinasiList}
                    spesiesList={spesiesList}
                    klinik={klinik}
                    permissions={currentTabPerms}
                    onSavePasien={handleSavePasien}
                    onDeletePasien={handleDeletePasien}
                  />
                )}

                {activeTab === 'rekam_medis' && (
                  <RekamMedisView
                    rekamMedisList={rekamMedisList}
                    pasienList={pasienList}
                    dokterList={dokterList}
                    barangList={barangList}
                    tindakanList={tindakanList}
                    pendaftaranList={pendaftaranList}
                    klinik={klinik}
                    activePendaftaran={activePendaftaranForSOAP}
                    onSaveRekamMedis={handleSaveRekamMedis}
                    onClearActivePendaftaran={() => setActivePendaftaranForSOAP(null)}
                  />
                )}

                {activeTab === 'rawat_jalan' && (
                  <RawatJalanView
                    rekamMedisList={rekamMedisList}
                    pasienList={pasienList}
                    dokterList={dokterList}
                    barangList={barangList}
                    tindakanList={tindakanList}
                    pendaftaranList={pendaftaranList}
                    klinik={klinik}
                    transaksiList={transaksiList}
                    onNavigateToSOAP={(pendaftaran) => {
                      if (pendaftaran) setActivePendaftaranForSOAP(pendaftaran);
                      setActiveTab('rekam_medis');
                    }}
                    onNavigateToKasir={(rmId) => {
                      setActiveTab('kasir');
                    }}
                    onSaveRekamMedis={handleSaveRekamMedis}
                  onCancelRekamMedis={handleCancelRekamMedis}
                  onDeleteRekamMedis={handleDeleteRekamMedis}
                  activeUserName={activeUser?.nama}
                  />
                )}

                {activeTab === 'rawat_inap' && (
                  <RawatInapView
                    rawatInapList={rawatInapList}
                    pasienList={pasienList}
                    dokterList={dokterList}
                    klinik={klinik}
                    rekamMedisList={rekamMedisList}
                    transaksiList={transaksiList}
                    barangList={barangList}
                    tindakanList={tindakanList}
                    onSaveRawatInap={handleSaveRawatInap}
                    onAddLogMonitoring={handleAddLogMonitoring}
                    onUseInventory={handleUseInventory}
                    onCheckoutInap={handleCheckoutInap}
                  onCancelRawatInap={handleCancelRawatInap}
                  onDeleteRawatInap={handleDeleteRawatInap}
                  activeUserName={activeUser?.nama}
                  />
                )}

                {activeTab === 'janji_temu' && (
                  <JanjiTemuView
                    janjiTemuList={janjiTemuList}
                    pasienList={pasienList}
                    dokterList={dokterList}
                    klinik={klinik}
                    onSaveJanjiTemu={handleSaveJanjiTemu}
                    onUpdateStatus={handleUpdateJanjiTemuStatus}
                  />
                )}

                {activeTab === 'kasir' && (
                  <KasirView
                    transaksiList={transaksiList}
                    rekamMedisList={rekamMedisList}
                    rawatInapList={rawatInapList}
                    pasienList={pasienList}
                    klinik={klinik}
                    settings={settings}
                    activeUser={activeUser}
                    onSaveTransaksi={handleSaveTransaksi}
                    onVoidTransaksi={handleVoidTransaksi}
                  />
                )}

                {(activeTab === 'penjualan' || activeTab === 'penjualan_direct') && (
                  <PenjualanDirectView
                    barangList={barangList}
                    klinik={klinik}
                    settings={settings}
                    activeUser={activeUser}
                    onSaveTransaksi={handleSaveTransaksi}
                  />
                )}

                {activeTab === 'inventory' && (
                  <InventoryView
                    barangList={barangList}
                    permissions={currentTabPerms}
                    onSaveBarang={handleSaveBarang}
                    onDeleteBarang={handleDeleteBarang}
                  />
                )}

                {activeTab === 'pembelian' && (
                  <PembelianView
                    pembelianList={pembelianList}
                    supplierList={supplierList}
                    barangList={barangList}
                    onSavePembelian={async (po) => {
                      const updated = [po, ...pembelianList];
                      const shouldAddStock = po.status === 'Selesai';
                      const updatedBarang = shouldAddStock
                        ? barangList.map((barang) => {
                          const received = po.items
                            .filter((item) => item.barangId === barang.id)
                            .reduce((total, item) => total + item.jumlah, 0);
                          return received > 0
                            ? { ...barang, stokCurrent: barang.stokCurrent + received }
                            : barang;
                        })
                        : barangList;
                      await storageService.savePembelianList(updated);
                      if (shouldAddStock) await storageService.saveBarangList(updatedBarang);
                      setPembelianList(updated);
                      if (shouldAddStock) setBarangList(updatedBarang);
                    }}
                  onCancelPembelian={handleCancelPembelian}
                  activeUserName={activeUser?.nama}
                  />
                )}

                {activeTab === 'supplier' && (
                  <SupplierView
                    supplierList={supplierList}
                    onSaveSupplier={handleSaveSupplier}
                    onDeleteSupplier={handleDeleteSupplier}
                  />
                )}

                {(activeTab === 'master' || activeTab === 'master_data') && (
                  <MasterDataView
                    userList={userList}
                    dokterList={dokterList}
                    tindakanList={tindakanList}
                    pakanList={pakanList}
                    spesiesList={spesiesList}
                    activeUser={activeUser}
                    onSaveUser={handleSaveUser}
                    onSaveDokter={handleSaveDokter}
                    onDeleteDokter={handleDeleteDokter}
                    onSaveTindakan={handleSaveTindakan}
                    onDeleteTindakan={handleDeleteTindakan}
                    onSavePakan={handleSavePakan}
                    onSaveSpesies={handleSaveSpesies}
                    onDeleteSpesies={handleDeleteSpesies}
                  />
                )}

                {activeTab === 'laporan' && (
                  <LaporanKeuanganView
                    transaksiList={transaksiList}
                    onNavigateToLaba={() => setActiveTab('laporan_laba')}
                  />
                )}

                {activeTab === 'laporan_laba' && (
                  <LaporanLabaPenjualanView
                    transaksiList={transaksiList}
                    barangList={barangList}
                    pakanList={pakanList}
                  />
                )}

                {activeTab === 'laporan_tren_penyakit' && (
                  <LaporanTrenPenyakitView
                    rekamMedisList={rekamMedisList}
                    pasienList={pasienList}
                    dokterList={dokterList}
                  />
                )}

                {activeTab === 'hak_akses' && (
                  <HakAksesView
                    userList={userList}
                    activeUser={activeUser}
                    rbacConfig={rbacConfig}
                    onSaveRBACConfig={handleSaveRBACConfig}
                    onSaveUser={handleSaveUser}
                    onDeleteUser={handleDeleteUser}
                    onSwitchUserContext={(u) => {
                      setActiveUser(u);
                      createAuthSession(u.id).catch((error: Error) => window.alert(error.message));
                    }}
                  />
                )}

                {activeTab === 'whatsapp' && (
                  <WhatsAppIntegrationView
                    pasienList={pasienList}
                    dokterList={dokterList}
                    janjiTemuList={janjiTemuList}
                    klinik={klinik}
                    waConfig={waConfig}
                    onSaveWaConfig={handleSaveWaConfig}
                    waTemplates={waTemplates}
                    onSaveWaTemplates={handleSaveWaTemplates}
                    waLogs={waLogs}
                    onAddWaLog={handleAddWaLog}
                  />
                )}

                {activeTab === 'pengaturan' && (
                  <PengaturanView
                    klinik={klinik}
                    settings={settings}
                    onSaveKlinik={handleSaveKlinik}
                    onSaveSettings={handleSaveSettings}
                    onReloadAllData={loadAllData}
                  />
                )}
              </>
            );
          })()}
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'dashboard' ? 'text-indigo-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-base">📊</span>
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('pendaftaran')}
          className={`relative flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'pendaftaran' ? 'text-indigo-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-base">📋</span>
          <span>Antrian</span>
          {queueCount > 0 && (
            <span className="absolute -top-1 right-1 bg-indigo-500 text-white text-[9px] font-bold px-1.5 rounded-full">
              {queueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rekam_medis')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'rekam_medis' ? 'text-indigo-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-base">🩺</span>
          <span>SOAP</span>
        </button>

        <button
          onClick={() => setActiveTab('kasir')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'kasir' ? 'text-indigo-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-base">💳</span>
          <span>Kasir</span>
        </button>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
            isMobileOpen ? 'text-indigo-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-base">☰</span>
          <span>Menu</span>
        </button>
      </div>

    </div>
  );
}

export default App;
