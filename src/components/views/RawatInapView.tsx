import React, { useState, useMemo } from 'react';
import {
  RawatInap,
  Pasien,
  Dokter,
  DataKlinik,
  MonitoringLog,
  RekamMedis,
  Transaksi,
  Barang,
  Tindakan,
  ResepItem,
  AlkesUsageItem,
  TindakanMedisItem,
} from '../../types';
import {
  BedDouble,
  Plus,
  Activity,
  MessageSquare,
  X,
  Printer,
  Pill,
  Syringe,
  Stethoscope,
  Trash2,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  PackageCheck,
  Search,
  Package,
  Check,
} from 'lucide-react';
import { generateWaLink, waTemplates } from '../../services/wa';
import { InpatientA4ReceiptModal } from '../common/InpatientA4ReceiptModal';

interface RawatInapViewProps {
  rawatInapList: RawatInap[];
  pasienList: Pasien[];
  dokterList: Dokter[];
  klinik: DataKlinik;
  rekamMedisList?: RekamMedis[];
  transaksiList?: Transaksi[];
  barangList?: Barang[];
  tindakanList?: Tindakan[];
  onSaveRawatInap: (inap: RawatInap) => void | Promise<void>;
  onAddLogMonitoring?: (inapId: string, log: MonitoringLog) => void;
  onUseInventory?: (
    items: { barangId?: string; nama?: string; jumlah: number }[],
    options?: {
      tipeReferensi?: any;
      referensi?: string;
      pasienNama?: string;
      ownerNama?: string;
      keterangan?: string;
    }
  ) => void | Promise<boolean | void>;
  onRevertInventory?: (
    items: { barangId?: string; nama?: string; jumlah: number }[],
    options?: { referensi?: string; keterangan?: string; petugas?: string }
  ) => void | Promise<void>;
  onCheckoutInap: (inapId: string) => void;
  onCancelRawatInap?: (inapId: string, alasan: string, user: string, revertStock?: boolean) => void | Promise<void>;
  onDeleteRawatInap?: (inapId: string) => void | Promise<void>;
  onNavigateToKasir?: () => void;
  activeUserName?: string;
}

export const RawatInapView: React.FC<RawatInapViewProps> = ({
  rawatInapList = [],
  pasienList = [],
  dokterList = [],
  klinik,
  rekamMedisList = [],
  transaksiList = [],
  barangList = [],
  tindakanList = [],
  onSaveRawatInap,
  onAddLogMonitoring,
  onUseInventory,
  onRevertInventory,
  onCheckoutInap,
  onCancelRawatInap,
  onDeleteRawatInap,
  activeUserName,
}) => {
  // Main state modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInapForLog, setSelectedInapForLog] = useState<RawatInap | null>(null);
  const [printingInap, setPrintingInap] = useState<RawatInap | null>(null);

  // Dedicated Add Item Modals
  const [inapForAddObat, setInapForAddObat] = useState<RawatInap | null>(null);
  const [inapForAddAlkes, setInapForAddAlkes] = useState<RawatInap | null>(null);
  const [inapForAddTindakan, setInapForAddTindakan] = useState<RawatInap | null>(null);

  // Active section tab per card (inapId -> 'monitoring' | 'obat' | 'alkes' | 'tindakan')
  const [activeCardTab, setActiveCardTab] = useState<Record<string, 'monitoring' | 'obat' | 'alkes' | 'tindakan'>>({});

  // Cancellation & Deletion Modal state
  const [showCancelModalForInap, setShowCancelModalForInap] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelRevertStock, setCancelRevertStock] = useState<boolean>(true);
  const [showDeleteModalForInap, setShowDeleteModalForInap] = useState<string | null>(null);

  // Form Add Inap State
  const [selectedPasienId, setSelectedPasienId] = useState(pasienList[0]?.id || '');
  const [noKandang, setNoKandang] = useState('Kandang Kucing A-01');
  const [dokterId, setDokterId] = useState(dokterList[0]?.id || '');
  const [diagnosaInap, setDiagnosaInap] = useState('Gastritis & Dehidrasi Akut');
  const [tarifPerHari, setTarifPerHari] = useState(100000);
  const [biayaTambahan, setBiayaTambahan] = useState(0);
  const [catatanAwal, setCatatanAwal] = useState('');

  // Form Log Monitoring State
  const [logShift, setLogShift] = useState<'Pagi' | 'Siang' | 'Malam'>('Pagi');
  const [logSuhu, setLogSuhu] = useState<number>(38.5);
  const [logMakan, setLogMakan] = useState<'Lahap' | 'Sedikit' | 'Suap' | 'Muntah' | 'NGT'>('Sedikit');
  const [logBab, setLogBab] = useState<'Normal' | 'Diare' | 'Feses Berdarah' | 'Tidak BAB' | 'Anuria/Susah BAK'>('Normal');
  const [logKondisi, setLogKondisi] = useState('');
  const [logInjeksi, setLogInjeksi] = useState('');
  const [logPetugas, setLogPetugas] = useState('');

  // Form Tambah Obat State
  const [obatSearch, setObatSearch] = useState('');
  const [showObatDropdown, setShowObatDropdown] = useState(false);
  const [selectedObatBarangId, setSelectedObatBarangId] = useState('');
  const [customNamaObat, setCustomNamaObat] = useState('');
  const [obatJumlah, setObatJumlah] = useState<number>(1);
  const [obatSatuan, setObatSatuan] = useState('Tablet');
  const [obatDosis, setObatDosis] = useState('');
  const [obatHarga, setObatHarga] = useState<number>(0);
  const [obatDeductStock, setObatDeductStock] = useState<boolean>(true);

  // Form Tambah Alkes State
  const [alkesSearch, setAlkesSearch] = useState('');
  const [showAlkesDropdown, setShowAlkesDropdown] = useState(false);
  const [selectedAlkesBarangId, setSelectedAlkesBarangId] = useState('');
  const [customNamaAlkes, setCustomNamaAlkes] = useState('');
  const [alkesJumlah, setAlkesJumlah] = useState<number>(1);
  const [alkesSatuan, setAlkesSatuan] = useState('Pcs');
  const [alkesHarga, setAlkesHarga] = useState<number>(0);
  const [alkesDeductStock, setAlkesDeductStock] = useState<boolean>(true);

  // Form Tambah Tindakan State
  const [tindakanSearch, setTindakanSearch] = useState('');
  const [showTindakanDropdown, setShowTindakanDropdown] = useState(false);
  const [selectedTindakanMasterId, setSelectedTindakanMasterId] = useState('');
  const [customNamaTindakan, setCustomNamaTindakan] = useState('');
  const [tindakanJumlah, setTindakanJumlah] = useState<number>(1);
  const [tindakanTarif, setTindakanTarif] = useState<number>(0);

  // Filtered Master Obat with WHERE condition (nama, kode, kategori)
  const filteredMasterObatList = useMemo(() => {
    const q = obatSearch.toLowerCase().trim();
    if (!barangList || barangList.length === 0) return [];
    return barangList
      .filter((b) => {
        const isObat = b.kategori === 'Obat';
        if (!q) return isObat;
        return (
          (isObat || b.namaBarang.toLowerCase().includes('injeksi') || b.namaBarang.toLowerCase().includes('syrup') || b.namaBarang.toLowerCase().includes('drop')) &&
          (b.namaBarang.toLowerCase().includes(q) ||
           (b.kodeBarang && b.kodeBarang.toLowerCase().includes(q)) ||
           (b.kategori && b.kategori.toLowerCase().includes(q)))
        );
      })
      .slice(0, 20);
  }, [barangList, obatSearch]);

  // Filtered Master Alkes / BMHP / Pakan with WHERE condition
  const filteredMasterAlkesList = useMemo(() => {
    const q = alkesSearch.toLowerCase().trim();
    if (!barangList || barangList.length === 0) return [];
    return barangList
      .filter((b) => {
        const isAlkesOrOther = b.kategori !== 'Obat';
        if (!q) return isAlkesOrOther;
        return (
          b.namaBarang.toLowerCase().includes(q) ||
          (b.kodeBarang && b.kodeBarang.toLowerCase().includes(q)) ||
          (b.kategori && b.kategori.toLowerCase().includes(q))
        );
      })
      .slice(0, 20);
  }, [barangList, alkesSearch]);

  // Filtered Master Tindakan with WHERE condition
  const filteredMasterTindakanList = useMemo(() => {
    const q = tindakanSearch.toLowerCase().trim();
    if (!tindakanList || tindakanList.length === 0) return [];
    return tindakanList
      .filter((t) => {
        if (!q) return true;
        return (
          t.namaTindakan.toLowerCase().includes(q) ||
          (t.kodeTindakan && t.kodeTindakan.toLowerCase().includes(q)) ||
          (t.kategori && t.kategori.toLowerCase().includes(q))
        );
      })
      .slice(0, 20);
  }, [tindakanList, tindakanSearch]);

  // Notification / feedback banner
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Helper: auto determine current shift
  const getCurrentShift = (): 'Pagi' | 'Siang' | 'Malam' => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 'Pagi';
    if (hour >= 14 && hour < 21) return 'Siang';
    return 'Malam';
  };

  // Open Log Modal handler
  const handleOpenLogModal = (inap: RawatInap) => {
    setSelectedInapForLog(inap);
    setLogShift(getCurrentShift());
    setLogSuhu(38.5);
    setLogMakan('Sedikit');
    setLogBab('Normal');
    setLogInjeksi('');
    setLogKondisi('');
    setLogPetugas(activeUserName || 'Petugas Rawat Inap');
  };

  // Save Log handler
  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInapForLog) return;

    const newLog: MonitoringLog = {
      id: `mon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tanggalWaktu: new Date().toISOString().replace('T', ' ').slice(0, 16),
      shift: logShift,
      suhu: Number(logSuhu) || 38.5,
      nafsuMakan: logMakan,
      babBak: logBab,
      kondisiUmum: logKondisi.trim() || 'Kondisi terpantau stabil',
      obatDiinjeksi: logInjeksi.trim() || '-',
      catatanPetugas: logKondisi.trim() || 'Monitoring rutin shift selesai',
      petugasName: logPetugas.trim() || activeUserName || 'Petugas Rawat Inap',
    };

    const currentInap = rawatInapList.find((i) => i.id === selectedInapForLog.id) || selectedInapForLog;
    const updatedInap: RawatInap = {
      ...currentInap,
      monitoringLogs: [...(currentInap.monitoringLogs || []), newLog],
    };

    if (onAddLogMonitoring) {
      onAddLogMonitoring(selectedInapForLog.id, newLog);
    }
    await onSaveRawatInap(updatedInap);
    setSelectedInapForLog(null);
    showToast(`Log monitoring shift ${logShift} berhasil dicatat & disimpan.`);
  };

  // Delete Log handler
  const handleDeleteLog = async (inap: RawatInap, logId: string) => {
    if (!window.confirm('Hapus catatan log monitoring ini?')) return;
    const currentInap = rawatInapList.find((i) => i.id === inap.id) || inap;
    const updatedInap: RawatInap = {
      ...currentInap,
      monitoringLogs: (currentInap.monitoringLogs || []).filter((l) => l.id !== logId),
    };
    await onSaveRawatInap(updatedInap);
    showToast('Catatan monitoring berhasil dihapus.');
  };

  // Open Add Obat Modal
  const handleOpenAddObatModal = (inap: RawatInap) => {
    setInapForAddObat(inap);
    setObatSearch('');
    setShowObatDropdown(false);
    setSelectedObatBarangId('');
    setCustomNamaObat('');
    setObatJumlah(1);
    setObatSatuan('Tablet');
    setObatDosis('2x sehari sesudah makan');
    setObatHarga(0);
    setObatDeductStock(true);
  };

  // Save Add Obat handler
  const handleSaveAddObat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inapForAddObat) return;

    let finalNama = customNamaObat.trim();
    let finalHarga = obatHarga;
    let selectedBarang: Barang | undefined;

    if (selectedObatBarangId) {
      selectedBarang = (barangList || []).find((b) => b.id === selectedObatBarangId);
      if (selectedBarang) {
        finalNama = selectedBarang.namaBarang;
        if (finalHarga === 0) finalHarga = selectedBarang.hargaJual || 0;
      }
    }

    if (!finalNama) {
      alert('Nama obat atau pilihan obat wajib diisi!');
      return;
    }

    const newItem: ResepItem = {
      barangId: selectedObatBarangId || undefined,
      namaBarang: finalNama,
      jumlah: Number(obatJumlah) || 1,
      dosis: obatDosis.trim() || 'Sesuai indikasi',
      aturanPakai: obatDosis.trim() || 'Sesuai indikasi',
      hargaSatuan: Number(finalHarga) || 0,
      subtotal: (Number(finalHarga) || 0) * (Number(obatJumlah) || 1),
    };
    (newItem as any).satuan = obatSatuan;

    const currentInap = rawatInapList.find((i) => i.id === inapForAddObat.id) || inapForAddObat;
    const updatedInap: RawatInap = {
      ...currentInap,
      pemberianObatList: [...(currentInap.pemberianObatList || []), newItem],
    };

    await onSaveRawatInap(updatedInap);

    // Deduct stock if selected from master & checked
    if (obatDeductStock && selectedBarang && onUseInventory) {
      const pasien = pasienList.find((p) => p.id === currentInap.pasienId);
      await onUseInventory(
        [{ barangId: selectedBarang.id, nama: selectedBarang.namaBarang, jumlah: Number(obatJumlah) || 1 }],
        {
          tipeReferensi: 'Rawat Inap',
          referensi: currentInap.noKandang,
          pasienNama: pasien?.namaHewan,
          ownerNama: pasien?.namaOwner,
          keterangan: `Pemberian Obat Rawat Inap: ${finalNama} (${obatDosis})`,
        }
      );
    }

    setInapForAddObat(null);
    showToast(`Obat "${finalNama}" berhasil ditambahkan ke rawat inap.`);
  };

  // Remove Obat Item handler
  const handleRemoveObat = async (inap: RawatInap, index: number) => {
    if (!window.confirm('Hapus pemberian obat ini dari rawat inap?')) return;
    const currentInap = rawatInapList.find((i) => i.id === inap.id) || inap;
    const itemToRemove = (currentInap.pemberianObatList || [])[index];
    const updatedList = (currentInap.pemberianObatList || []).filter((_, idx) => idx !== index);
    const updatedInap: RawatInap = { ...currentInap, pemberianObatList: updatedList };
    await onSaveRawatInap(updatedInap);

    if (itemToRemove && itemToRemove.barangId && onRevertInventory) {
      await onRevertInventory([{ barangId: itemToRemove.barangId, nama: itemToRemove.namaBarang, jumlah: itemToRemove.jumlah }], {
        referensi: currentInap.noKandang,
        keterangan: `Pengembalian stok pembatalan obat rawat inap: ${itemToRemove.namaBarang}`,
      });
    }

    showToast('Pemberian obat berhasil dihapus.');
  };

  // Open Add Alkes Modal
  const handleOpenAddAlkesModal = (inap: RawatInap) => {
    setInapForAddAlkes(inap);
    setAlkesSearch('');
    setShowAlkesDropdown(false);
    setSelectedAlkesBarangId('');
    setCustomNamaAlkes('');
    setAlkesJumlah(1);
    setAlkesSatuan('Pcs');
    setAlkesHarga(0);
    setAlkesDeductStock(true);
  };

  // Save Add Alkes handler
  const handleSaveAddAlkes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inapForAddAlkes) return;

    let finalNama = customNamaAlkes.trim();
    let finalHarga = alkesHarga;
    let selectedBarang: Barang | undefined;

    if (selectedAlkesBarangId) {
      selectedBarang = (barangList || []).find((b) => b.id === selectedAlkesBarangId);
      if (selectedBarang) {
        finalNama = selectedBarang.namaBarang;
        if (finalHarga === 0) finalHarga = selectedBarang.hargaJual || 0;
      }
    }

    if (!finalNama) {
      alert('Nama alkes / barang pemakaian wajib diisi!');
      return;
    }

    const newItem: AlkesUsageItem = {
      id: `alkes-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      namaAlkes: finalNama,
      jumlah: Number(alkesJumlah) || 1,
      satuan: alkesSatuan || 'Pcs',
      hargaSatuan: Number(finalHarga) || 0,
      subtotal: (Number(finalHarga) || 0) * (Number(alkesJumlah) || 1),
    };

    const currentInap = rawatInapList.find((i) => i.id === inapForAddAlkes.id) || inapForAddAlkes;
    const updatedInap: RawatInap = {
      ...currentInap,
      penggunaanAlkesList: [...(currentInap.penggunaanAlkesList || []), newItem],
    };

    await onSaveRawatInap(updatedInap);

    if (alkesDeductStock && selectedBarang && onUseInventory) {
      const pasien = pasienList.find((p) => p.id === currentInap.pasienId);
      await onUseInventory(
        [{ barangId: selectedBarang.id, nama: selectedBarang.namaBarang, jumlah: Number(alkesJumlah) || 1 }],
        {
          tipeReferensi: 'Rawat Inap',
          referensi: currentInap.noKandang,
          pasienNama: pasien?.namaHewan,
          ownerNama: pasien?.namaOwner,
          keterangan: `Pemakaian Alkes / BMHP Rawat Inap: ${finalNama}`,
        }
      );
    }

    setInapForAddAlkes(null);
    showToast(`Pemakaian alkes "${finalNama}" berhasil ditambahkan.`);
  };

  // Remove Alkes Item handler
  const handleRemoveAlkes = async (inap: RawatInap, index: number) => {
    if (!window.confirm('Hapus pemakaian alkes ini dari rawat inap?')) return;
    const currentInap = rawatInapList.find((i) => i.id === inap.id) || inap;
    const itemToRemove = (currentInap.penggunaanAlkesList || [])[index];
    const updatedList = (currentInap.penggunaanAlkesList || []).filter((_, idx) => idx !== index);
    const updatedInap: RawatInap = { ...currentInap, penggunaanAlkesList: updatedList };
    await onSaveRawatInap(updatedInap);

    if (itemToRemove && onRevertInventory) {
      const matchBarang = (barangList || []).find((b) => b.namaBarang.toLowerCase() === itemToRemove.namaAlkes.toLowerCase());
      if (matchBarang) {
        await onRevertInventory([{ barangId: matchBarang.id, nama: matchBarang.namaBarang, jumlah: itemToRemove.jumlah }], {
          referensi: currentInap.noKandang,
          keterangan: `Pengembalian stok alkes rawat inap: ${itemToRemove.namaAlkes}`,
        });
      }
    }

    showToast('Pemakaian alkes berhasil dihapus.');
  };

  // Open Add Tindakan Modal
  const handleOpenAddTindakanModal = (inap: RawatInap) => {
    setInapForAddTindakan(inap);
    setTindakanSearch('');
    setShowTindakanDropdown(false);
    setSelectedTindakanMasterId('');
    setCustomNamaTindakan('');
    setTindakanJumlah(1);
    setTindakanTarif(0);
  };

  // Save Add Tindakan handler
  const handleSaveAddTindakan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inapForAddTindakan) return;

    let finalNama = customNamaTindakan.trim();
    let finalTarif = tindakanTarif;

    if (selectedTindakanMasterId) {
      const selectedT = (tindakanList || []).find((t) => t.id === selectedTindakanMasterId);
      if (selectedT) {
        finalNama = selectedT.namaTindakan;
        if (finalTarif === 0) finalTarif = selectedT.tarif || 0;
      }
    }

    if (!finalNama) {
      alert('Nama tindakan medis wajib diisi!');
      return;
    }

    const newItem: TindakanMedisItem = {
      id: `tind-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      namaTindakan: finalNama,
      jumlah: Number(tindakanJumlah) || 1,
      hargaSatuan: Number(finalTarif) || 0,
      subtotal: (Number(finalTarif) || 0) * (Number(tindakanJumlah) || 1),
    };

    const currentInap = rawatInapList.find((i) => i.id === inapForAddTindakan.id) || inapForAddTindakan;
    const updatedInap: RawatInap = {
      ...currentInap,
      tindakanMedisList: [...(currentInap.tindakanMedisList || []), newItem],
    };

    await onSaveRawatInap(updatedInap);
    setInapForAddTindakan(null);
    showToast(`Tindakan medis "${finalNama}" berhasil dicatat.`);
  };

  // Remove Tindakan Item handler
  const handleRemoveTindakan = async (inap: RawatInap, index: number) => {
    if (!window.confirm('Hapus tindakan medis ini dari rawat inap?')) return;
    const currentInap = rawatInapList.find((i) => i.id === inap.id) || inap;
    const updatedList = (currentInap.tindakanMedisList || []).filter((_, idx) => idx !== index);
    const updatedInap: RawatInap = { ...currentInap, tindakanMedisList: updatedList };
    await onSaveRawatInap(updatedInap);
    showToast('Tindakan medis berhasil dihapus.');
  };

  // Create New Rawat Inap handler
  const handleSaveInap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPasienId) {
      alert('Silakan pilih pasien terlebih dahulu!');
      return;
    }

    const newInap: RawatInap = {
      id: `inap-${Date.now()}`,
      pasienId: selectedPasienId,
      noKandang: noKandang.trim() || 'Kandang Rawat Inap',
      tanggalMasuk: new Date().toISOString().replace('T', ' ').slice(0, 16),
      dokterPenanggungJawabId: dokterId || dokterList[0]?.id || '',
      diagnosaInap: diagnosaInap.trim() || 'Observasi Rawat Inap',
      tarifPerHari: Number(tarifPerHari) || 100000,
      biayaTambahan: Number(biayaTambahan) || 0,
      catatan: catatanAwal.trim() || undefined,
      status: 'Aktif',
      monitoringLogs: [],
      pemberianObatList: [],
      penggunaanAlkesList: [],
      tindakanMedisList: [],
    };

    await onSaveRawatInap(newInap);
    setShowAddModal(false);
    showToast(`Pasien berhasil masuk ke kandang ${newInap.noKandang}.`);
  };

  // Cancellation modal handlers
  const openCancelModal = (inapId: string) => {
    setShowCancelModalForInap(inapId);
    setCancelReason('');
    setCancelRevertStock(true);
  };

  const confirmCancelInap = async () => {
    if (!showCancelModalForInap) return;
    if (typeof onCancelRawatInap === 'function') {
      await onCancelRawatInap(showCancelModalForInap, cancelReason || 'Dibatalkan oleh staf', activeUserName || 'Staf', cancelRevertStock);
    }
    setShowCancelModalForInap(null);
    showToast('Status rawat inap berhasil dibatalkan.');
  };

  // Delete modal handlers
  const openDeleteModal = (inapId: string) => {
    setShowDeleteModalForInap(inapId);
  };

  const confirmDeleteInap = async () => {
    if (!showDeleteModalForInap) return;
    if (typeof onDeleteRawatInap === 'function') {
      await onDeleteRawatInap(showDeleteModalForInap);
    }
    setShowDeleteModalForInap(null);
    showToast('Data rawat inap berhasil dihapus permanen.');
  };

  // WA Update handler
  const handleSendWaUpdate = (inap: RawatInap) => {
    const pasien = pasienList.find((p) => p.id === inap.pasienId);
    if (!pasien) return;

    const lastLog = inap.monitoringLogs && inap.monitoringLogs.length > 0 ? inap.monitoringLogs[inap.monitoringLogs.length - 1] : undefined;
    const kondisi = lastLog ? lastLog.kondisiUmum : inap.diagnosaInap;
    const suhu = lastLog ? lastLog.suhu : 38.5;

    const waText = waTemplates.inpatientUpdate(pasien, inap, kondisi, suhu, klinik);
    window.open(generateWaLink(pasien.noHpOwner, waText), '_blank');
  };

  // Helper to compute total estimated bill
  const computeEstimatedTotal = (inap: RawatInap) => {
    const now = new Date();
    const masuk = new Date(inap.tanggalMasuk);
    const diffHours = Math.max(1, (now.getTime() - masuk.getTime()) / (1000 * 60 * 60));
    const days = Math.max(1, Math.ceil(diffHours / 24));

    const daily = (inap.tarifPerHari || 100000) * days;
    const obatTotal = (inap.pemberianObatList || []).reduce((s, it) => s + (it.subtotal || (it.hargaSatuan || 0) * (it.jumlah || 0)), 0);
    const alkesTotal = (inap.penggunaanAlkesList || []).reduce((s, it) => s + (it.subtotal || (it.hargaSatuan || 0) * (it.jumlah || 0)), 0);
    const tindakanTotal = (inap.tindakanMedisList || []).reduce((s, it) => s + (it.subtotal || (it.hargaSatuan || 0) * (it.jumlah || 0)), 0);
    const extra = inap.biayaTambahan || 0;
    return { days, daily, obatTotal, alkesTotal, tindakanTotal, extra, grandTotal: daily + obatTotal + alkesTotal + tindakanTotal + extra };
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 text-xs font-bold ${
          feedbackMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <BedDouble className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Rawat Inap & Monitoring Kandang</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sistem pemantauan vital sign per shift, pemberian injeksi obat, pemakaian alkes/BMHP, tindakan medis, & cetak nota rincian A4/F4.
          </p>
        </div>
      </div>

      {/* Grid Kandang Aktif */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {rawatInapList.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl text-center border border-slate-200 shadow-xs">
            <BedDouble className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">Belum Ada Pasien Rawat Inap</h4>
            <p className="text-xs text-slate-400 mt-1">Pasien rawat inap akan otomatis muncul di sini setelah didaftarkan melalui menu Pendaftaran & Antrian (Layanan Rawat Inap).</p>
          </div>
        ) : (
          rawatInapList.map((inap) => {
            const pasien = pasienList.find((p) => p.id === inap.pasienId);
            const dokter = dokterList.find((d) => d.id === inap.dokterPenanggungJawabId);
            const bill = computeEstimatedTotal(inap);
            const activeTab = activeCardTab[inap.id] || 'monitoring';

            return (
              <div key={inap.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between overflow-hidden">
                {/* Header Card */}
                <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wider">
                          {inap.noKandang || 'Kandang Inap'}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            inap.status === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse'
                              : inap.status === 'Selesai / Pulang'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {inap.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-800 mt-2">
                        {pasien?.namaHewan || 'Pasien'} <span className="text-sm font-semibold text-slate-500">({pasien?.jenisHewan || 'Hewan'})</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Owner: <span className="font-bold text-slate-700">{pasien?.namaOwner || '-'}</span> ({pasien?.noHpOwner || '-'})
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 font-medium">Estimasi Biaya ({bill.days} Hari)</p>
                      <p className="text-base font-black text-indigo-700">Rp {bill.grandTotal.toLocaleString('id-ID')}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Tgl Masuk: {inap.tanggalMasuk}</p>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Diagnosa Inap</span>
                      <span className="font-bold text-slate-800 truncate block" title={inap.diagnosaInap}>
                        {inap.diagnosaInap || '-'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Dokter DPJP</span>
                      <span className="font-bold text-indigo-700 truncate block">{dokter?.nama || 'Dokter Jaga'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Tarif Sewa Kandang</span>
                      <span className="font-bold text-slate-900 block">Rp {(inap.tarifPerHari || 100000).toLocaleString('id-ID')}/Hari</span>
                    </div>
                  </div>
                </div>

                {/* Sub-navigation Tabs per Card */}
                <div className="flex border-b border-slate-100 bg-slate-50/60 px-4 pt-2 text-xs font-bold">
                  <button
                    onClick={() => setActiveCardTab({ ...activeCardTab, [inap.id]: 'monitoring' })}
                    className={`pb-2 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'monitoring' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Monitoring Shift ({(inap.monitoringLogs || []).length})</span>
                  </button>

                  <button
                    onClick={() => setActiveCardTab({ ...activeCardTab, [inap.id]: 'obat' })}
                    className={`pb-2 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'obat' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Pill className="w-3.5 h-3.5" />
                    <span>Obat & Terapi ({(inap.pemberianObatList || []).length})</span>
                  </button>

                  <button
                    onClick={() => setActiveCardTab({ ...activeCardTab, [inap.id]: 'alkes' })}
                    className={`pb-2 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'alkes' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Syringe className="w-3.5 h-3.5" />
                    <span>Alkes & BMHP ({(inap.penggunaanAlkesList || []).length})</span>
                  </button>

                  <button
                    onClick={() => setActiveCardTab({ ...activeCardTab, [inap.id]: 'tindakan' })}
                    className={`pb-2 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'tindakan' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Tindakan Medis ({(inap.tindakanMedisList || []).length})</span>
                  </button>
                </div>

                {/* Content Panel based on Tab */}
                <div className="p-5 flex-1 min-h-[220px] max-h-[280px] overflow-y-auto">
                  {/* 1. Monitoring Shift Tab */}
                  {activeTab === 'monitoring' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Riwayat Log Monitoring Vital Sign</span>
                        <button
                          onClick={() => handleOpenLogModal(inap)}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all border border-indigo-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Input Log Shift</span>
                        </button>
                      </div>

                      {(inap.monitoringLogs || []).length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                          Belum ada catatan monitoring shift. Klik "Input Log Shift" untuk mencatat suhu & vital sign pasien.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inap.monitoringLogs.map((log) => (
                            <div key={log.id} className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs space-y-1.5 hover:bg-white transition-all shadow-2xs">
                              <div className="flex items-center justify-between font-bold">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                    log.shift === 'Pagi' ? 'bg-amber-100 text-amber-800' : log.shift === 'Siang' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    Shift {log.shift}
                                  </span>
                                  <span className="text-slate-600 text-[11px]">{log.tanggalWaktu}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="text-rose-600 font-extrabold text-xs">Suhu: {log.suhu}°C</span>
                                  <button
                                    onClick={() => handleDeleteLog(inap, log.id)}
                                    className="text-slate-300 hover:text-rose-600 p-0.5"
                                    title="Hapus log ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                                <div><span className="font-semibold text-slate-800">Makan:</span> {log.nafsuMakan} | <span className="font-semibold text-slate-800">BAB/BAK:</span> {log.babBak || 'Normal'}</div>
                                <div><span className="font-semibold text-slate-800">Injeksi:</span> {log.obatDiinjeksi || '-'}</div>
                              </div>
                              {log.kondisiUmum && (
                                <p className="text-slate-500 italic text-[11px] bg-white/70 p-1.5 rounded-lg border border-slate-100">
                                  "{log.kondisiUmum}" — <span className="font-semibold text-slate-700">{log.petugasName || 'Petugas'}</span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Obat & Terapi Tab */}
                  {activeTab === 'obat' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Pemberian Obat-Obatan & Terapi</span>
                        <button
                          onClick={() => handleOpenAddObatModal(inap)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all border border-emerald-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambahkan Obat</span>
                        </button>
                      </div>

                      {(inap.pemberianObatList || []).length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                          Belum ada catatan pemberian obat untuk rawat inap ini.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inap.pemberianObatList.map((o, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs flex items-center justify-between hover:bg-white transition-all shadow-2xs">
                              <div>
                                <div className="font-bold text-slate-800 flex items-center space-x-2">
                                  <span>{o.namaBarang}</span>
                                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                    {o.jumlah} {(o as any).satuan || 'Pcs'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Dosis / Aturan: <span className="font-semibold text-slate-700">{o.dosis || '-'}</span> | @ Rp {(o.hargaSatuan || 0).toLocaleString('id-ID')}
                                </p>
                              </div>

                              <div className="flex items-center space-x-3 text-right">
                                <span className="font-extrabold text-slate-800 text-xs">
                                  Rp {(o.subtotal || (o.hargaSatuan || 0) * (o.jumlah || 1)).toLocaleString('id-ID')}
                                </span>
                                <button
                                  onClick={() => handleRemoveObat(inap, idx)}
                                  className="text-slate-300 hover:text-rose-600 p-1"
                                  title="Hapus item obat ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Alkes & BMHP Tab */}
                  {activeTab === 'alkes' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Pemakaian Alkes & BMHP Rawat Inap</span>
                        <button
                          onClick={() => handleOpenAddAlkesModal(inap)}
                          className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all border border-amber-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambahkan Alkes</span>
                        </button>
                      </div>

                      {(inap.penggunaanAlkesList || []).length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                          Belum ada pemakaian alkes/BMHP yang dicatat (infus, spuit, kanul, dll).
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inap.penggunaanAlkesList.map((a, idx) => (
                            <div key={a.id || idx} className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs flex items-center justify-between hover:bg-white transition-all shadow-2xs">
                              <div>
                                <div className="font-bold text-slate-800 flex items-center space-x-2">
                                  <span>{a.namaAlkes}</span>
                                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                    {a.jumlah} {a.satuan || 'Pcs'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Harga Satuan: Rp {(a.hargaSatuan || 0).toLocaleString('id-ID')}
                                </p>
                              </div>

                              <div className="flex items-center space-x-3 text-right">
                                <span className="font-extrabold text-slate-800 text-xs">
                                  Rp {(a.subtotal || (a.hargaSatuan || 0) * (a.jumlah || 1)).toLocaleString('id-ID')}
                                </span>
                                <button
                                  onClick={() => handleRemoveAlkes(inap, idx)}
                                  className="text-slate-300 hover:text-rose-600 p-1"
                                  title="Hapus pemakaian alkes ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Tindakan Medis Tab */}
                  {activeTab === 'tindakan' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Tindakan Medis Selama Inap</span>
                        <button
                          onClick={() => handleOpenAddTindakanModal(inap)}
                          className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all border border-purple-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambahkan Tindakan</span>
                        </button>
                      </div>

                      {(inap.tindakanMedisList || []).length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                          Belum ada tindakan medis khusus yang dicatat untuk rawat inap ini.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inap.tindakanMedisList.map((t, idx) => (
                            <div key={t.id || idx} className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs flex items-center justify-between hover:bg-white transition-all shadow-2xs">
                              <div>
                                <div className="font-bold text-slate-800 flex items-center space-x-2">
                                  <span>{t.namaTindakan}</span>
                                  <span className="text-[11px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                    {t.jumlah || 1}x Tindakan
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Tarif Satuan: Rp {(t.hargaSatuan || 0).toLocaleString('id-ID')}
                                </p>
                              </div>

                              <div className="flex items-center space-x-3 text-right">
                                <span className="font-extrabold text-slate-800 text-xs">
                                  Rp {(t.subtotal || (t.hargaSatuan || 0) * (t.jumlah || 1)).toLocaleString('id-ID')}
                                </span>
                                <button
                                  onClick={() => handleRemoveTindakan(inap, idx)}
                                  className="text-slate-300 hover:text-rose-600 p-1"
                                  title="Hapus tindakan ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSendWaUpdate(inap)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs"
                      title="Kirim perkembangan terkini pasien ke WA Owner"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WA Update</span>
                    </button>

                    <button
                      onClick={() => setPrintingInap(inap)}
                      className="px-3 py-2 bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs"
                      title="Cetak Nota Rincian Inap Format A4 / F4 Lengkap"
                    >
                      <Printer className="w-4 h-4 text-indigo-600" />
                      <span>Cetak Nota (A4/F4)</span>
                    </button>
                  </div>

                  {inap.status === 'Aktif' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onCheckoutInap(inap.id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm shadow-indigo-200 flex items-center space-x-1.5"
                        title="Selesaikan rawat inap dan arahkan ke kasir"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Selesai / Pulang</span>
                      </button>

                      {typeof onCancelRawatInap === 'function' && (
                        <button
                          onClick={() => openCancelModal(inap.id)}
                          className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold text-xs transition-all"
                        >
                          Batalkan
                        </button>
                      )}

                      {typeof onDeleteRawatInap === 'function' && (
                        <button
                          onClick={() => openDeleteModal(inap.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Hapus data rawat inap"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: INPUT LOG MONITORING SHIFT */}
      {/* ========================================================================= */}
      {selectedInapForLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Input Log Monitoring Pasien Inap</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kandang: <span className="font-bold text-indigo-700">{selectedInapForLog.noKandang}</span> — {pasienList.find((p) => p.id === selectedInapForLog.pasienId)?.namaHewan}
                </p>
              </div>
              <button onClick={() => setSelectedInapForLog(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shift Petugas</label>
                  <select value={logShift} onChange={(e) => setLogShift(e.target.value as any)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold">
                    <option value="Pagi">Shift Pagi (06:00 - 14:00)</option>
                    <option value="Siang">Shift Siang (14:00 - 21:00)</option>
                    <option value="Malam">Shift Malam (21:00 - 06:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Suhu Tubuh (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={logSuhu}
                    onChange={(e) => setLogSuhu(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-black text-rose-600 bg-rose-50/30"
                    placeholder="38.5"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nafsu Makan</label>
                  <select value={logMakan} onChange={(e) => setLogMakan(e.target.value as any)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white">
                    <option value="Lahap">Lahap / Normal</option>
                    <option value="Sedikit">Makan Sedikit</option>
                    <option value="Suap">Harus Disuap</option>
                    <option value="Muntah">Muntah</option>
                    <option value="NGT">NGT / Selang Makan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">BAB / BAK</label>
                  <select value={logBab} onChange={(e) => setLogBab(e.target.value as any)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white">
                    <option value="Normal">Normal</option>
                    <option value="Diare">Diare / Feses Cair</option>
                    <option value="Feses Berdarah">Feses Berdarah / Melena</option>
                    <option value="Tidak BAB">Tidak BAB</option>
                    <option value="Anuria/Susah BAK">Anuria / Susah BAK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Obat Diinjeksi / Diberikan</label>
                <input
                  type="text"
                  value={logInjeksi}
                  onChange={(e) => setLogInjeksi(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  placeholder="Contoh: Injeksi Ondansetron 0.5ml IV, Cefotaxime 1ml"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Kondisi Umum & Evaluasi</label>
                <textarea
                  rows={3}
                  value={logKondisi}
                  onChange={(e) => setLogKondisi(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  placeholder="Contoh: Pasien mulai aktif, respon baik, dehidrasi berkurang..."
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Petugas / Paramedis</label>
                <input
                  type="text"
                  value={logPetugas}
                  onChange={(e) => setLogPetugas(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  placeholder="Nama petugas shift"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setSelectedInapForLog(null)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all">
                  Simpan Log Monitoring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH PEMBERIAN OBAT RAWAT INAP */}
      {/* ========================================================================= */}
      {inapForAddObat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-white">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Pill className="w-5 h-5 text-emerald-600" />
                  <span>Tambahkan Obat & Terapi Inap</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Kandang: {inapForAddObat.noKandang}</p>
              </div>
              <button onClick={() => setInapForAddObat(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddObat} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="relative">
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih dari Master Obat / Inventaris (Ketik Nama / Kode WHERE)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={obatSearch}
                    onChange={(e) => {
                      setObatSearch(e.target.value);
                      setShowObatDropdown(true);
                    }}
                    onFocus={() => setShowObatDropdown(true)}
                    placeholder="🔍 Ketik nama obat / kode untuk filter..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {obatSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setObatSearch('');
                        setShowObatDropdown(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown WHERE Results */}
                {showObatDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowObatDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                      {filteredMasterObatList.length > 0 ? (
                        filteredMasterObatList.map((b) => {
                          const stockCount = b.stokCurrent ?? (b as any).stok ?? 0;
                          const isSelected = selectedObatBarangId === b.id;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setSelectedObatBarangId(b.id);
                                setCustomNamaObat(b.namaBarang);
                                setObatHarga(b.hargaJual || 0);
                                setObatSatuan(b.satuan || 'Tablet');
                                setObatSearch(b.namaBarang);
                                setObatDeductStock(true);
                                setShowObatDropdown(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/70 transition-colors flex items-center justify-between ${
                                isSelected ? 'bg-emerald-50/90 text-emerald-950 font-bold' : ''
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-800 truncate">{b.namaBarang}</span>
                                  {b.kodeBarang && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                      {b.kodeBarang}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                                  <span>{b.kategori || 'Obat'}</span>
                                  <span>•</span>
                                  <span className={stockCount > 0 ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
                                    Stok: {stockCount} {b.satuan}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right whitespace-nowrap">
                                <span className="font-bold text-emerald-700">
                                  Rp {(b.hargaJual || 0).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-slate-400">
                          <p className="font-semibold">Obat tidak ditemukan di master.</p>
                          <p className="text-[11px] mt-0.5">Anda tetap dapat mengetik nama obat secara manual pada kolom di bawah.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {selectedObatBarangId && (
                  <div className="mt-1.5 flex items-center justify-between px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800">
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Terhubung Master: <strong>{customNamaObat}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedObatBarangId('');
                        setObatSearch('');
                      }}
                      className="text-emerald-700 hover:text-rose-600 font-bold"
                    >
                      Lepas Master
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Obat / Terapi (Bisa Diketik Manual)</label>
                <input
                  type="text"
                  value={customNamaObat}
                  onChange={(e) => setCustomNamaObat(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800"
                  placeholder="Contoh: Injeksi Ondansetron 2mg/ml, Amoxicillin Drop"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={obatJumlah}
                    onChange={(e) => setObatJumlah(parseFloat(e.target.value) || 1)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Satuan</label>
                  <select value={obatSatuan} onChange={(e) => setObatSatuan(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white">
                    <option value="Tablet">Tablet</option>
                    <option value="Ampul">Ampul</option>
                    <option value="Vial">Vial</option>
                    <option value="Botol">Botol</option>
                    <option value="Kapsul">Kapsul</option>
                    <option value="Strip">Strip</option>
                    <option value="Pcs">Pcs</option>
                    <option value="ml">ml</option>
                    <option value="Dosis">Dosis</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dosis & Aturan Pemakaian</label>
                <input
                  type="text"
                  value={obatDosis}
                  onChange={(e) => setObatDosis(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  placeholder="Contoh: 2x sehari 1 tablet sesudah makan / Injeksi IV per 12 jam"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={obatHarga}
                    onChange={(e) => setObatHarga(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtotal Billing</label>
                  <div className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 font-black text-slate-800 text-sm">
                    Rp {((Number(obatHarga) || 0) * (Number(obatJumlah) || 1)).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {selectedObatBarangId && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    id="deductObatStock"
                    type="checkbox"
                    checked={obatDeductStock}
                    onChange={(e) => setObatDeductStock(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <label htmlFor="deductObatStock" className="text-xs text-slate-700 font-semibold cursor-pointer">
                    Kurangi stok inventaris otomatis saat disimpan
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setInapForAddObat(null)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200 transition-all">
                  Simpan & Tambahkan Obat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TAMBAH PEMAKAIAN ALKES & BMHP */}
      {/* ========================================================================= */}
      {inapForAddAlkes && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-white">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Syringe className="w-5 h-5 text-amber-600" />
                  <span>Tambahkan Pemakaian Alkes & BMHP</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Kandang: {inapForAddAlkes.noKandang}</p>
              </div>
              <button onClick={() => setInapForAddAlkes(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddAlkes} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="relative">
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih dari Master Alkes / BMHP / Pakan (Ketik Nama / Kode WHERE)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={alkesSearch}
                    onChange={(e) => {
                      setAlkesSearch(e.target.value);
                      setShowAlkesDropdown(true);
                    }}
                    onFocus={() => setShowAlkesDropdown(true)}
                    placeholder="🔍 Ketik nama alkes / BMHP / pakan untuk filter..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {alkesSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setAlkesSearch('');
                        setShowAlkesDropdown(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown WHERE Results */}
                {showAlkesDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowAlkesDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                      {filteredMasterAlkesList.length > 0 ? (
                        filteredMasterAlkesList.map((b) => {
                          const stockCount = b.stokCurrent ?? (b as any).stok ?? 0;
                          const isSelected = selectedAlkesBarangId === b.id;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setSelectedAlkesBarangId(b.id);
                                setCustomNamaAlkes(b.namaBarang);
                                setAlkesHarga(b.hargaJual || 0);
                                setAlkesSatuan(b.satuan || 'Pcs');
                                setAlkesSearch(b.namaBarang);
                                setAlkesDeductStock(true);
                                setShowAlkesDropdown(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 hover:bg-amber-50/70 transition-colors flex items-center justify-between ${
                                isSelected ? 'bg-amber-50/90 text-amber-950 font-bold' : ''
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-800 truncate">{b.namaBarang}</span>
                                  {b.kodeBarang && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                      {b.kodeBarang}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                                  <span>{b.kategori || 'Alkes & BMHP'}</span>
                                  <span>•</span>
                                  <span className={stockCount > 0 ? 'text-amber-700 font-semibold' : 'text-rose-500 font-semibold'}>
                                    Stok: {stockCount} {b.satuan}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right whitespace-nowrap">
                                <span className="font-bold text-amber-700">
                                  Rp {(b.hargaJual || 0).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-slate-400">
                          <p className="font-semibold">Alkes / BMHP tidak ditemukan di master.</p>
                          <p className="text-[11px] mt-0.5">Anda tetap dapat mengetik nama alkes manual pada kolom di bawah.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {selectedAlkesBarangId && (
                  <div className="mt-1.5 flex items-center justify-between px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-amber-600" />
                      <span>Terhubung Master: <strong>{customNamaAlkes}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAlkesBarangId('');
                        setAlkesSearch('');
                      }}
                      className="text-amber-700 hover:text-rose-600 font-bold"
                    >
                      Lepas Master
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Alkes / BMHP (Bisa Diketik Manual)</label>
                <input
                  type="text"
                  value={customNamaAlkes}
                  onChange={(e) => setCustomNamaAlkes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800"
                  placeholder="Contoh: Infus Set Micro Terumo, Catheter 24G, Spuit 3ml"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah Pemakaian</label>
                  <input
                    type="number"
                    min="1"
                    value={alkesJumlah}
                    onChange={(e) => setAlkesJumlah(parseFloat(e.target.value) || 1)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Satuan</label>
                  <select value={alkesSatuan} onChange={(e) => setAlkesSatuan(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white">
                    <option value="Pcs">Pcs</option>
                    <option value="Set">Set</option>
                    <option value="Botol">Botol</option>
                    <option value="Spuit">Spuit</option>
                    <option value="Paket">Paket</option>
                    <option value="Roll">Roll</option>
                    <option value="Strip">Strip</option>
                    <option value="Kaleng">Kaleng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={alkesHarga}
                    onChange={(e) => setAlkesHarga(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtotal Billing</label>
                  <div className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 font-black text-slate-800 text-sm">
                    Rp {((Number(alkesHarga) || 0) * (Number(alkesJumlah) || 1)).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {selectedAlkesBarangId && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    id="deductAlkesStock"
                    type="checkbox"
                    checked={alkesDeductStock}
                    onChange={(e) => setAlkesDeductStock(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <label htmlFor="deductAlkesStock" className="text-xs text-slate-700 font-semibold cursor-pointer">
                    Kurangi stok inventaris otomatis saat disimpan
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setInapForAddAlkes(null)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-200 transition-all">
                  Simpan & Tambahkan Alkes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TAMBAH TINDAKAN MEDIS RAWAT INAP */}
      {/* ========================================================================= */}
      {inapForAddTindakan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-white">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Stethoscope className="w-5 h-5 text-purple-600" />
                  <span>Tambahkan Tindakan Medis Inap</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Kandang: {inapForAddTindakan.noKandang}</p>
              </div>
              <button onClick={() => setInapForAddTindakan(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddTindakan} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="relative">
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih dari Master Tindakan (Ketik Nama / Kategori WHERE)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={tindakanSearch}
                    onChange={(e) => {
                      setTindakanSearch(e.target.value);
                      setShowTindakanDropdown(true);
                    }}
                    onFocus={() => setShowTindakanDropdown(true)}
                    placeholder="🔍 Ketik nama tindakan / kategori untuk filter..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {tindakanSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setTindakanSearch('');
                        setShowTindakanDropdown(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown WHERE Results */}
                {showTindakanDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowTindakanDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                      {filteredMasterTindakanList.length > 0 ? (
                        filteredMasterTindakanList.map((t) => {
                          const isSelected = selectedTindakanMasterId === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedTindakanMasterId(t.id);
                                setCustomNamaTindakan(t.namaTindakan);
                                setTindakanTarif(t.tarif || 0);
                                setTindakanSearch(t.namaTindakan);
                                setShowTindakanDropdown(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 hover:bg-purple-50/70 transition-colors flex items-center justify-between ${
                                isSelected ? 'bg-purple-50/90 text-purple-950 font-bold' : ''
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-800 truncate">{t.namaTindakan}</span>
                                  {t.kodeTindakan && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                      {t.kodeTindakan}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                                  <span className="bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-medium">{t.kategori || 'Tindakan Medis'}</span>
                                </div>
                              </div>
                              <div className="text-right whitespace-nowrap">
                                <span className="font-bold text-purple-700">
                                  Rp {(t.tarif || 0).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-slate-400">
                          <p className="font-semibold">Tindakan tidak ditemukan di master.</p>
                          <p className="text-[11px] mt-0.5">Anda tetap dapat mengetik tindakan manual pada kolom di bawah.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {selectedTindakanMasterId && (
                  <div className="mt-1.5 flex items-center justify-between px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-lg text-[11px] text-purple-800">
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-purple-600" />
                      <span>Terhubung Master: <strong>{customNamaTindakan}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTindakanMasterId('');
                        setTindakanSearch('');
                      }}
                      className="text-purple-700 hover:text-rose-600 font-bold"
                    >
                      Lepas Master
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Tindakan (Bisa Diketik Manual)</label>
                <input
                  type="text"
                  value={customNamaTindakan}
                  onChange={(e) => setCustomNamaTindakan(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800"
                  placeholder="Contoh: Pemasangan Infus Catheter, Nebulisasi, Pembersihan Luka"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frekuensi / Jumlah Kali</label>
                  <input
                    type="number"
                    min="1"
                    value={tindakanJumlah}
                    onChange={(e) => setTindakanJumlah(parseFloat(e.target.value) || 1)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tarif Tindakan Satuan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={tindakanTarif}
                    onChange={(e) => setTindakanTarif(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtotal Billing</label>
                <div className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 font-black text-slate-800 text-sm">
                  Rp {((Number(tindakanTarif) || 0) * (Number(tindakanJumlah) || 1)).toLocaleString('id-ID')}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setInapForAddTindakan(null)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-200 transition-all">
                  Simpan & Catat Tindakan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: MASUK RAWAT INAP BARU */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
              <div className="flex items-center space-x-2">
                <BedDouble className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">Masuk Rawat Inap Kandang Baru</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInap} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Pasien</label>
                <select
                  value={selectedPasienId}
                  onChange={(e) => setSelectedPasienId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  required
                >
                  <option value="">-- Pilih Pasien --</option>
                  {pasienList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.namaHewan} ({p.jenisHewan}) - Owner: {p.namaOwner} ({p.kodePasien || p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor / Label Kandang</label>
                <input
                  type="text"
                  value={noKandang}
                  onChange={(e) => setNoKandang(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  placeholder="Contoh: Kandang Kucing A-01"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dokter Penanggung Jawab (DPJP)</label>
                <select
                  value={dokterId}
                  onChange={(e) => setDokterId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                >
                  {dokterList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama} ({d.spesialisasi || 'Dokter Hewan'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Diagnosa Masuk Rawat Inap</label>
                <input
                  type="text"
                  value={diagnosaInap}
                  onChange={(e) => setDiagnosaInap(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  placeholder="Contoh: Gastritis Akut & Dehidrasi Sedang"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tarif Inap Per Hari (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={tarifPerHari}
                    onChange={(e) => setTarifPerHari(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biaya Tambahan Awal (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={biayaTambahan}
                    onChange={(e) => setBiayaTambahan(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Khusus / Perawatan</label>
                <textarea
                  rows={2}
                  value={catatanAwal}
                  onChange={(e) => setCatatanAwal(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  placeholder="Catatan tambahan seperti riwayat alergi atau perlakuan khusus..."
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-xl transition-all">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl shadow-md shadow-indigo-200 transition-all">
                  Simpan & Masuk Inap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: BATALKAN RAWAT INAP */}
      {/* ========================================================================= */}
      {showCancelModalForInap && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 text-xs">
            <h4 className="font-extrabold text-slate-900 text-base mb-1">Batalkan Rawat Inap</h4>
            <p className="text-slate-500 mb-3">Masukkan alasan pembatalan status rawat inap ini.</p>
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alasan Pembatalan</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                  placeholder="Contoh: Owner meminta pulang paksa / rujukan..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="revertStockInap"
                  type="checkbox"
                  checked={cancelRevertStock}
                  onChange={(e) => setCancelRevertStock(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600"
                />
                <label htmlFor="revertStockInap" className="font-semibold text-slate-700 cursor-pointer">
                  Kembalikan stok obat / alkes yang tercatat pada rawat inap
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button onClick={() => setShowCancelModalForInap(null)} className="px-4 py-2 bg-slate-100 font-bold rounded-xl text-slate-700">
                Tutup
              </button>
              <button onClick={confirmCancelInap} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs">
                Konfirmasi Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: HAPUS PERMANEN RAWAT INAP */}
      {/* ========================================================================= */}
      {showDeleteModalForInap && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 text-xs">
            <h4 className="font-extrabold text-slate-900 text-base mb-1">Hapus Data Rawat Inap</h4>
            <p className="text-slate-500 mb-4">Anda akan menghapus data rawat inap ini secara permanen. Tindakan ini tidak dapat dibatalkan.</p>

            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowDeleteModalForInap(null)} className="px-4 py-2 bg-slate-100 font-bold rounded-xl text-slate-700">
                Batal
              </button>
              <button onClick={confirmDeleteInap} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xs">
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: CETAK NOTA A4 / F4 RINCIAN LENGKAP */}
      {/* ========================================================================= */}
      {printingInap && (
        <InpatientA4ReceiptModal
          rawatInap={printingInap}
          pasien={pasienList.find((p) => p.id === printingInap.pasienId)}
          dokter={dokterList.find((d) => d.id === printingInap.dokterPenanggungJawabId)}
          klinik={klinik}
          rekamMedisList={rekamMedisList}
          transaksi={transaksiList.find((t) => t.rawatInapId === printingInap.id)}
          barangList={barangList}
          tindakanList={tindakanList}
          onSaveRawatInap={async (updated) => {
            await onSaveRawatInap(updated);
            setPrintingInap(updated);
          }}
          onUseInventory={onUseInventory}
          onRevertInventory={onRevertInventory}
          onClose={() => setPrintingInap(null)}
        />
      )}
    </div>
  );
};
