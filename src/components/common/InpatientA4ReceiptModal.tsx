import React, { useState, useMemo } from 'react';
import { RawatInap, Pasien, Dokter, DataKlinik, RekamMedis, Transaksi, Barang, Tindakan, ResepItem, AlkesUsageItem, TindakanMedisItem } from '../../types';
import {
  Printer, X, BedDouble, Stethoscope, Syringe, Package, DollarSign,
  Plus, Trash2, Edit2, CheckCircle2, MessageSquare, FileText, Building2,
  Search, Save, RefreshCw, AlertCircle, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';
import { generateWaLink } from '../../services/wa';
import { normalizeClinicProfile } from '../../utils/clinic';

export interface InpatientBillItem {
  id: string;
  kategori: 'Jasa & Perawatan' | 'Obat-Obatan' | 'Alkes & BMHP';
  namaItem: string;
  spesifikasi?: string; // e.g. Dosis, Merk, atau Keterangan
  jumlah: number;
  satuan: string; // Hari, Vial, Ampul, Pcs, Botol, Kali, Pkt, Tindakan
  hargaSatuan: number;
  subtotal: number;
  barangId?: string;
  deductStock?: boolean;
  isCustom?: boolean;
}

interface InpatientA4ReceiptModalProps {
  rawatInap: RawatInap;
  pasien?: Pasien;
  dokter?: Dokter;
  klinik: DataKlinik;
  rekamMedisList?: RekamMedis[];
  transaksi?: Transaksi;
  barangList?: Barang[];
  tindakanList?: Tindakan[];
  onSaveRawatInap?: (inap: RawatInap) => Promise<void> | void;
  onUseInventory?: (items: { barangId?: string; nama?: string; jumlah: number }[], options?: any) => Promise<boolean | void> | boolean | void;
  onRevertInventory?: (items: { barangId?: string; nama?: string; jumlah: number }[], options?: any) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
}

export const InpatientA4ReceiptModal: React.FC<InpatientA4ReceiptModalProps> = ({
  rawatInap,
  pasien,
  dokter,
  klinik,
  rekamMedisList = [],
  transaksi,
  barangList = [],
  tindakanList = [],
  onSaveRawatInap,
  onUseInventory,
  onRevertInventory,
  onClose,
}) => {
  klinik = normalizeClinicProfile(klinik);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Close modal on ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Calculate length of stay (days)
  const calculateDays = () => {
    if (!rawatInap.tanggalMasuk) return 1;
    const tglMasuk = new Date(rawatInap.tanggalMasuk);
    const tglKeluar = rawatInap.tanggalKeluarAktif ? new Date(rawatInap.tanggalKeluarAktif) : new Date();
    const diffMs = tglKeluar.getTime() - tglMasuk.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  };

  const totalHariInap = calculateDays();

  // Find related RM if any
  const relatedRM = rekamMedisList.find(
    (rm) => rm.pasienId === rawatInap.pasienId && rm.plan?.statusLanjutan === 'Rawat Inap'
  );

  // Generate initial itemized billing list from real rawatInap & transaction data
  const buildInitialItems = (): InpatientBillItem[] => {
    if (transaksi && transaksi.items && transaksi.items.length > 0) {
      return transaksi.items.map((it, idx) => {
        let kat: 'Jasa & Perawatan' | 'Obat-Obatan' | 'Alkes & BMHP' = 'Jasa & Perawatan';
        if (it.jenis === 'Obat' || it.jenis === 'Obat Racikan') kat = 'Obat-Obatan';
        else if (it.jenis === 'Barang/Pakan' || (it.jenis as any) === 'Alkes') kat = 'Alkes & BMHP';

        const itName = (it.namaItem || '').toLowerCase().trim();
        const matchBarang = barangList.find((b) => (b.namaBarang && b.namaBarang.toLowerCase().trim() === itName));

        return {
          id: 'item-trx-' + idx,
          kategori: kat,
          namaItem: it.namaItem,
          barangId: (it as any).barangId || matchBarang?.id,
          jumlah: it.jumlah,
          satuan: kat === 'Jasa & Perawatan' ? 'Hari/Kali' : 'Pcs',
          hargaSatuan: it.hargaSatuan,
          subtotal: it.subtotal,
          deductStock: Boolean((it as any).barangId || matchBarang?.id),
        };
      });
    }

    const items: InpatientBillItem[] = [];

    // 1. Jasa & Perawatan Inap (Sewa Kandang & Jasa DPJP jika ada)
    items.push({
      id: 'item-inap-kandang',
      kategori: 'Jasa & Perawatan',
      namaItem: `Sewa Kandang & Monitoring Harian (${rawatInap.noKandang || 'Kandang Inap'})`,
      spesifikasi: `Tarif Inap Rp ${(rawatInap.tarifPerHari || 100000).toLocaleString('id-ID')}/hari (${totalHariInap} Hari Perawatan)`,
      jumlah: totalHariInap,
      satuan: 'Hari',
      hargaSatuan: rawatInap.tarifPerHari || 100000,
      subtotal: totalHariInap * (rawatInap.tarifPerHari || 100000),
    });

    // Tindakan Medis yang dicatat di Rawat Inap
    if (rawatInap.tindakanMedisList && rawatInap.tindakanMedisList.length > 0) {
      rawatInap.tindakanMedisList.forEach((t, idx) => {
        items.push({
          id: t.id || `item-inap-tindakan-${idx}`,
          kategori: 'Jasa & Perawatan',
          namaItem: t.namaTindakan,
          spesifikasi: 'Tindakan medis rawat inap',
          jumlah: t.jumlah || 1,
          satuan: 'Tindakan',
          hargaSatuan: t.hargaSatuan || 0,
          subtotal: t.subtotal ?? ((t.jumlah || 1) * (t.hargaSatuan || 0)),
        });
      });
    } else if (relatedRM?.plan?.tindakanList && relatedRM.plan.tindakanList.length > 0) {
      relatedRM.plan.tindakanList.forEach((t, i) => {
        items.push({
          id: `item-rm-tindakan-${i}`,
          kategori: 'Jasa & Perawatan',
          namaItem: t.namaTindakan,
          spesifikasi: 'Tindakan Medis Rekam Medis',
          jumlah: 1,
          satuan: 'Tindakan',
          hargaSatuan: t.tarif || 0,
          subtotal: t.tarif || 0,
        });
      });
    }

    // Biaya Tambahan Rawat Inap jika ada
    if (rawatInap.biayaTambahan && rawatInap.biayaTambahan > 0) {
      items.push({
        id: 'item-inap-biaya-tambahan',
        kategori: 'Jasa & Perawatan',
        namaItem: 'Biaya Tambahan Rawat Inap',
        spesifikasi: rawatInap.catatan || 'Biaya perawatan tambahan',
        jumlah: 1,
        satuan: 'Paket',
        hargaSatuan: rawatInap.biayaTambahan,
        subtotal: rawatInap.biayaTambahan,
      });
    }

    // 2. Pemberian Obat-Obatan Rawat Inap
    if (rawatInap.pemberianObatList && rawatInap.pemberianObatList.length > 0) {
      rawatInap.pemberianObatList.forEach((o, idx) => {
        const oName = (o.namaBarang || '').toLowerCase().trim();
        const matchBarang = barangList.find((b) => (b.id && o.barangId && b.id === o.barangId) || (oName && b.namaBarang && b.namaBarang.toLowerCase().trim() === oName));
        items.push({
          id: (o as any).id || `item-inap-obat-${idx}`,
          kategori: 'Obat-Obatan',
          namaItem: o.namaBarang,
          barangId: o.barangId || matchBarang?.id,
          spesifikasi: o.dosis ? `Dosis / Aturan: ${o.dosis}` : undefined,
          jumlah: o.jumlah || 1,
          satuan: (o as any).satuan || matchBarang?.satuan || 'Pcs',
          hargaSatuan: o.hargaSatuan || matchBarang?.hargaJual || 0,
          subtotal: o.subtotal ?? ((o.jumlah || 1) * (o.hargaSatuan || 0)),
          deductStock: true,
        });
      });
    } else if (relatedRM?.plan?.resepList && relatedRM.plan.resepList.length > 0) {
      relatedRM.plan.resepList.forEach((r, i) => {
        const rName = (r.namaBarang || '').toLowerCase().trim();
        const matchBarang = barangList.find((b) => (b.id && r.barangId && b.id === r.barangId) || (rName && b.namaBarang && b.namaBarang.toLowerCase().trim() === rName));
        items.push({
          id: `item-rm-obat-${i}`,
          kategori: 'Obat-Obatan',
          namaItem: r.namaBarang,
          barangId: r.barangId || matchBarang?.id,
          spesifikasi: `Dosis: ${r.dosis} (${r.aturanPakai || 'Sesuai indikasi'})`,
          jumlah: r.jumlah || 1,
          satuan: (r as any).satuan || matchBarang?.satuan || 'Pcs',
          hargaSatuan: r.hargaSatuan || matchBarang?.hargaJual || 0,
          subtotal: r.subtotal ?? ((r.jumlah || 1) * (r.hargaSatuan || 0)),
          deductStock: true,
        });
      });
    }

    // 3. Pemakaian Alkes & BMHP Rawat Inap
    if (rawatInap.penggunaanAlkesList && rawatInap.penggunaanAlkesList.length > 0) {
      rawatInap.penggunaanAlkesList.forEach((a, idx) => {
        const aName = (a.namaAlkes || '').toLowerCase().trim();
        const matchBarang = barangList.find((b) => (b.id && a.barangId && b.id === a.barangId) || (aName && b.namaBarang && b.namaBarang.toLowerCase().trim() === aName));
        items.push({
          id: a.id || `item-inap-alkes-${idx}`,
          kategori: 'Alkes & BMHP',
          namaItem: a.namaAlkes,
          barangId: a.barangId || matchBarang?.id,
          spesifikasi: a.satuan ? `Satuan: ${a.satuan}` : 'Pemakaian BMHP Inap',
          jumlah: a.jumlah || 1,
          satuan: a.satuan || matchBarang?.satuan || 'Pcs',
          hargaSatuan: a.hargaSatuan || matchBarang?.hargaJual || 0,
          subtotal: a.subtotal ?? ((a.jumlah || 1) * (a.hargaSatuan || 0)),
          deductStock: true,
        });
      });
    }

    // Pemakaian Barang / Pakan Rawat Inap
    if (rawatInap.pemakaianBarangList && rawatInap.pemakaianBarangList.length > 0) {
      rawatInap.pemakaianBarangList.forEach((b, idx) => {
        const brgName = (b.namaBarang || '').toLowerCase().trim();
        const matchBarang = barangList.find((brg) => (brg.id && b.barangId && brg.id === b.barangId) || (brgName && brg.namaBarang && brg.namaBarang.toLowerCase().trim() === brgName));
        items.push({
          id: (b as any).id || `item-inap-barang-${idx}`,
          kategori: 'Alkes & BMHP',
          namaItem: b.namaBarang,
          barangId: b.barangId || matchBarang?.id,
          spesifikasi: b.dosis || b.aturanPakai || 'Pakan/Barang Inap',
          jumlah: b.jumlah || 1,
          satuan: (b as any).satuan || b.aturanPakai || matchBarang?.satuan || 'Pcs',
          hargaSatuan: b.hargaSatuan || matchBarang?.hargaJual || 0,
          subtotal: b.subtotal ?? ((b.jumlah || 1) * (b.hargaSatuan || 0)),
          deductStock: true,
        });
      });
    }

    return items;
  };

  const [billItems, setBillItems] = useState<InpatientBillItem[]>(buildInitialItems());
  // Keep track of the initial inventory state to accurately compute stock deltas
  const [initialItemsSnapshot] = useState<InpatientBillItem[]>(() => buildInitialItems());
  const [diskonNominal, setDiskonNominal] = useState<number>(transaksi?.diskon || 0);

  // New item form state
  const [newItemKategori, setNewItemKategori] = useState<'Jasa & Perawatan' | 'Obat-Obatan' | 'Alkes & BMHP'>('Jasa & Perawatan');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [newItemNama, setNewItemNama] = useState('');
  const [newItemSpesifikasi, setNewItemSpesifikasi] = useState('');
  const [newItemJumlah, setNewItemJumlah] = useState(1);
  const [newItemSatuan, setNewItemSatuan] = useState('Pcs');
  const [newItemHarga, setNewItemHarga] = useState(0);
  const [newItemDeductStock, setNewItemDeductStock] = useState(true);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Filtered master data based on selected category & WHERE search keyword
  const filteredMasterItems = useMemo(() => {
    const q = searchKeyword.toLowerCase().trim();
    if (newItemKategori === 'Jasa & Perawatan') {
      if (!tindakanList || tindakanList.length === 0) return [];
      return tindakanList
        .filter((t) => {
          if (!q) return true;
          return (
            t.namaTindakan.toLowerCase().includes(q) ||
            t.kodeTindakan?.toLowerCase().includes(q) ||
            t.kategori?.toLowerCase().includes(q)
          );
        })
        .slice(0, 15);
    } else if (newItemKategori === 'Obat-Obatan') {
      if (!barangList || barangList.length === 0) return [];
      return barangList
        .filter((b) => {
          const isObat = b.kategori === 'Obat';
          if (!q) return isObat;
          return (
            (b.namaBarang.toLowerCase().includes(q) ||
             b.kodeBarang?.toLowerCase().includes(q) ||
             b.kategori?.toLowerCase().includes(q))
          );
        })
        .slice(0, 15);
    } else {
      // Alkes & BMHP
      if (!barangList || barangList.length === 0) return [];
      return barangList
        .filter((b) => {
          const isNonObat = b.kategori !== 'Obat';
          if (!q) return isNonObat;
          return (
            (b.namaBarang.toLowerCase().includes(q) ||
             b.kodeBarang?.toLowerCase().includes(q) ||
             b.kategori?.toLowerCase().includes(q))
          );
        })
        .slice(0, 15);
    }
  }, [newItemKategori, searchKeyword, tindakanList, barangList]);

  // Handle category change in Add Item form
  const handleCategoryChange = (kat: 'Jasa & Perawatan' | 'Obat-Obatan' | 'Alkes & BMHP') => {
    setNewItemKategori(kat);
    setSearchKeyword('');
    setSelectedMasterId('');
    setNewItemNama('');
    setNewItemSpesifikasi('');
    setNewItemHarga(0);
    setNewItemJumlah(1);
    setNewItemSatuan(kat === 'Jasa & Perawatan' ? 'Tindakan' : 'Pcs');
    setNewItemDeductStock(kat !== 'Jasa & Perawatan');
  };

  // Handle master item selection (WHERE search result)
  const handleSelectMasterItem = (item: any) => {
    if (newItemKategori === 'Jasa & Perawatan') {
      const t = item as Tindakan;
      setSelectedMasterId(t.id);
      setNewItemNama(t.namaTindakan);
      setNewItemHarga(t.tarif || 0);
      setNewItemSatuan('Tindakan');
      setNewItemSpesifikasi(t.kategori || 'Tindakan Medis');
      setNewItemDeductStock(false);
    } else {
      const b = item as Barang;
      setSelectedMasterId(b.id);
      setNewItemNama(b.namaBarang);
      setNewItemHarga(b.hargaJual || 0);
      setNewItemSatuan(b.satuan || 'Pcs');
      setNewItemSpesifikasi(b.keterangan || (b.kategori === 'Obat' ? 'Obat Inap' : 'Alkes Inap'));
      setNewItemDeductStock(true);
    }
    setSearchKeyword('');
    setShowSearchDropdown(false);
  };

  // Add Item to table
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemNama.trim()) return;

    const sub = newItemJumlah * newItemHarga;
    const newItem: InpatientBillItem = {
      id: 'item-custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      kategori: newItemKategori,
      namaItem: newItemNama.trim(),
      spesifikasi: newItemSpesifikasi.trim() || undefined,
      jumlah: Number(newItemJumlah) || 1,
      satuan: newItemSatuan.trim() || 'Pcs',
      hargaSatuan: Number(newItemHarga) || 0,
      subtotal: sub,
      barangId: selectedMasterId || undefined,
      deductStock: newItemDeductStock,
      isCustom: true,
    };

    setBillItems([...billItems, newItem]);
    // Reset form
    setSelectedMasterId('');
    setNewItemNama('');
    setNewItemSpesifikasi('');
    setNewItemJumlah(1);
    setNewItemHarga(0);
    setSearchKeyword('');
  };

  // Delete Item from table
  const handleDeleteItem = (id: string) => {
    setBillItems(billItems.filter((it) => it.id !== id));
  };

  // Update item field directly
  const handleUpdateItemField = (id: string, field: keyof InpatientBillItem, value: any) => {
    setBillItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === 'jumlah' || field === 'hargaSatuan') {
          const qty = field === 'jumlah' ? Number(value) : it.jumlah;
          const prc = field === 'hargaSatuan' ? Number(value) : it.hargaSatuan;
          updated.subtotal = (qty || 0) * (prc || 0);
        }
        return updated;
      })
    );
  };

  // Subtotals
  const subtotalJasa = billItems
    .filter((it) => it.kategori === 'Jasa & Perawatan')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const subtotalObat = billItems
    .filter((it) => it.kategori === 'Obat-Obatan')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const subtotalBMHP = billItems
    .filter((it) => it.kategori === 'Alkes & BMHP')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const totalKotor = subtotalJasa + subtotalObat + subtotalBMHP;
  const grandTotal = Math.max(0, totalKotor - diskonNominal);

  // SAVE CHANGES AUTOMATICALLY & ADJUST INVENTORY (ADD/REMOVE DELTA)
  const handleSaveAndFinishEdit = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      // 1. Calculate stock difference between initial snapshot and current bill items
      if (onUseInventory && onRevertInventory) {
        // Build map of initial goods usage
        const initialUsageMap = new Map<string, { barangId?: string; nama: string; qty: number }>();
        initialItemsSnapshot.forEach((it) => {
          if (it.kategori === 'Obat-Obatan' || it.kategori === 'Alkes & BMHP') {
            const key = it.barangId || (it.namaItem || '').toLowerCase().trim();
            const prev = initialUsageMap.get(key) || { barangId: it.barangId, nama: it.namaItem, qty: 0 };
            initialUsageMap.set(key, { ...prev, qty: prev.qty + (it.jumlah || 0) });
          }
        });

        // Build map of current goods usage
        const currentUsageMap = new Map<string, { barangId?: string; nama: string; qty: number }>();
        billItems.forEach((it) => {
          if (it.kategori === 'Obat-Obatan' || it.kategori === 'Alkes & BMHP') {
            const key = it.barangId || (it.namaItem || '').toLowerCase().trim();
            const prev = currentUsageMap.get(key) || { barangId: it.barangId, nama: it.namaItem, qty: 0 };
            currentUsageMap.set(key, { ...prev, qty: prev.qty + (it.jumlah || 0) });
          }
        });

        const itemsToDeduct: { barangId?: string; nama: string; jumlah: number }[] = [];
        const itemsToRevert: { barangId?: string; nama: string; jumlah: number }[] = [];

        // Check for additions or increases
        currentUsageMap.forEach((curr, key) => {
          const init = initialUsageMap.get(key);
          const initQty = init ? init.qty : 0;
          const diff = curr.qty - initQty;
          if (diff > 0) {
            itemsToDeduct.push({
              barangId: curr.barangId,
              nama: curr.nama,
              jumlah: diff,
            });
          }
        });

        // Check for deletions or decreases
        initialUsageMap.forEach((init, key) => {
          const curr = currentUsageMap.get(key);
          const currQty = curr ? curr.qty : 0;
          const diff = init.qty - currQty;
          if (diff > 0) {
            itemsToRevert.push({
              barangId: init.barangId,
              nama: init.nama,
              jumlah: diff,
            });
          }
        });

        // Apply inventory updates
        if (itemsToDeduct.length > 0) {
          await onUseInventory(itemsToDeduct, {
            tipeReferensi: 'Rawat Inap',
            referensi: rawatInap.noKandang,
            pasienNama: pasien?.namaHewan,
            ownerNama: pasien?.namaOwner,
            keterangan: `Penyesuaian nota rawat inap: penambahan item obat/alkes`,
          });
        }

        if (itemsToRevert.length > 0) {
          await onRevertInventory(itemsToRevert, {
            referensi: rawatInap.noKandang,
            keterangan: `Pengembalian stok pembatalan/penghapusan item nota rawat inap: ${rawatInap.noKandang}`,
          });
        }
      }

      // 2. Reconstruct rawatInap structured sub-arrays
      const updatedTindakanMedisList: TindakanMedisItem[] = [];
      const updatedPemberianObatList: ResepItem[] = [];
      const updatedPenggunaanAlkesList: AlkesUsageItem[] = [];
      let updatedTarifPerHari = rawatInap.tarifPerHari || 100000;
      let updatedBiayaTambahan = 0;

      billItems.forEach((it) => {
        if (it.kategori === 'Jasa & Perawatan') {
          const lowerName = (it.namaItem || '').toLowerCase();
          if (it.id === 'item-inap-kandang' || lowerName.includes('sewa kandang')) {
            updatedTarifPerHari = it.hargaSatuan;
          } else if (it.id === 'item-inap-biaya-tambahan' || lowerName.includes('biaya tambahan')) {
            updatedBiayaTambahan += it.subtotal;
          } else {
            updatedTindakanMedisList.push({
              id: it.id,
              namaTindakan: it.namaItem,
              jumlah: it.jumlah,
              hargaSatuan: it.hargaSatuan,
              subtotal: it.subtotal,
            });
          }
        } else if (it.kategori === 'Obat-Obatan') {
          updatedPemberianObatList.push({
            barangId: it.barangId || '',
            namaBarang: it.namaItem,
            jumlah: it.jumlah,
            dosis: it.spesifikasi || '-',
            aturanPakai: it.spesifikasi || '-',
            hargaSatuan: it.hargaSatuan,
            subtotal: it.subtotal,
          });
        } else if (it.kategori === 'Alkes & BMHP') {
          updatedPenggunaanAlkesList.push({
            id: it.id,
            barangId: it.barangId || '',
            namaAlkes: it.namaItem,
            jumlah: it.jumlah,
            satuan: it.satuan || 'Pcs',
            hargaSatuan: it.hargaSatuan,
            subtotal: it.subtotal,
          });
        }
      });

      const updatedRawatInap: RawatInap = {
        ...rawatInap,
        tarifPerHari: updatedTarifPerHari,
        biayaTambahan: updatedBiayaTambahan > 0 ? updatedBiayaTambahan : undefined,
        tindakanMedisList: updatedTindakanMedisList,
        pemberianObatList: updatedPemberianObatList,
        penggunaanAlkesList: updatedPenggunaanAlkesList,
        totalBiaya: grandTotal,
      };

      if (onSaveRawatInap) {
        await onSaveRawatInap(updatedRawatInap);
      }

      setIsEditMode(false);
      setSaveSuccessMsg('Rincian nota rawat inap & mutasi stok inventaris berhasil disimpan otomatis!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save inpatient billing edits:', err);
      alert('Gagal menyimpan perubahan rincian rawat inap: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `Nota_Rawat_Inap_${pasien?.namaHewan || 'Pasien'}_${klinik.namaKlinik}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  };

  const handleSendWA = () => {
    if (pasien?.noHpOwner) {
      const summaryText = `*NOTA RINCIAN RAWAT INAP*
*${klinik.namaKlinik}*
---------------------------------------
No. Nota: INV-INAP-${rawatInap.id.slice(-6).toUpperCase()}
Pasien: ${pasien.namaHewan} (${pasien.jenisHewan})
Owner: ${pasien.namaOwner}
Kandang: ${rawatInap.noKandang}
Lama Inap: ${totalHariInap} Hari
Status: ${rawatInap.status}

*Ringkasan Rincian Biaya:*
1. Jasa & Perawatan: Rp ${subtotalJasa.toLocaleString('id-ID')}
2. Obat-Obatan: Rp ${subtotalObat.toLocaleString('id-ID')}
3. Alkes & BMHP: Rp ${subtotalBMHP.toLocaleString('id-ID')}
---------------------------------------
Subtotal: Rp ${totalKotor.toLocaleString('id-ID')}
Diskon: Rp ${diskonNominal.toLocaleString('id-ID')}
*GRAND TOTAL: Rp ${grandTotal.toLocaleString('id-ID')}*

Terima kasih atas kepercayaannya. Semoga ${pasien.namaHewan} lekas pulih!`;

      window.open(generateWaLink(pasien.noHpOwner, summaryText), '_blank');
    }
  };

  const noNotaInap = transaksi?.noNota || `INV-INAP/${new Date().getFullYear()}/${rawatInap.id.slice(-5).toUpperCase()}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Action Control Bar (Sticky at Top - Always Visible, Hidden on Print) */}
        <div className="sticky top-0 z-30 shrink-0 bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-base text-white flex items-center space-x-2">
                <span>Nota Rincian Biaya Rawat Inap</span>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Ukuran {paperSize}
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Format resmi cetak invoice A4 / F4 untuk pemilik pasien
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Paper Selector Toggle */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-2.5 sm:px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                  paperSize === 'A4' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={`px-2.5 sm:px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                  paperSize === 'F4' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                F4 / Folio
              </button>
            </div>

            {/* Edit mode toggle & Save Button */}
            {isEditMode ? (
              <button
                type="button"
                onClick={handleSaveAndFinishEdit}
                disabled={isSaving}
                className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/30"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden sm:inline">Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Edit</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                className="px-3 sm:px-3.5 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Mode Edit</span>
              </button>
            )}

            {/* WA Button */}
            {pasien?.noHpOwner && (
              <button
                type="button"
                onClick={handleSendWA}
                className="px-3 sm:px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-sm transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kirim WA</span>
              </button>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl flex items-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak ({paperSize})</span>
            </button>

            {/* Close Button (Prominent & Clear) */}
            <button
              type="button"
              onClick={onClose}
              title="Tutup Nota (Esc)"
              className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-700 hover:border-rose-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Container (Edit forms + Printable A4 Canvas) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Success toast notification */}
          {saveSuccessMsg && (
            <div className="no-print bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center space-x-2 text-emerald-800 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

        {/* Form Add Custom Item with WHERE Search & Auto-Pricing (Only when Edit Mode is ACTIVE, hidden on print) */}
        {isEditMode && (
          <div className="no-print bg-amber-50/95 border-b border-amber-200 p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-900 font-extrabold">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Tambah Item Rincian Baru ke Nota Rawat Inap (Data Master Otomatis):</span>
              </div>
              <span className="text-[11px] text-amber-700 font-medium">
                Pilih dari data master untuk pengisian harga & pemotongan stok otomatis
              </span>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                
                {/* 1. Kategori */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Kategori Layanan *</label>
                  <select
                    value={newItemKategori}
                    onChange={(e) => handleCategoryChange(e.target.value as any)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-bold text-slate-800"
                  >
                    <option value="Jasa & Perawatan">1. Jasa & Perawatan</option>
                    <option value="Obat-Obatan">2. Obat-Obatan (Injeksi/Oral)</option>
                    <option value="Alkes & BMHP">3. Alkes, BMHP & Pakan</option>
                  </select>
                </div>

                {/* 2. Search Autocomplete WHERE Filter */}
                <div className="sm:col-span-5 relative">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5 flex justify-between">
                    <span>Pencarian Master {newItemKategori} (WHERE Search):</span>
                    {selectedMasterId && (
                      <span className="text-emerald-700 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Master Terhubung</span>
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Cari nama ${newItemKategori === 'Jasa & Perawatan' ? 'tindakan medis...' : 'obat/alkes...'}`}
                      value={searchKeyword || newItemNama}
                      onFocus={() => setShowSearchDropdown(true)}
                      onChange={(e) => {
                        setSearchKeyword(e.target.value);
                        setNewItemNama(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      className="w-full pl-8 pr-7 p-2 bg-white border border-amber-300 rounded-lg font-medium text-slate-900"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    {(searchKeyword || newItemNama) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchKeyword('');
                          setNewItemNama('');
                          setSelectedMasterId('');
                          setShowSearchDropdown(false);
                        }}
                        className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown WHERE search results */}
                  {showSearchDropdown && filteredMasterItems.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                        Hasil Pencarian Master ({filteredMasterItems.length} item ditemukan)
                      </div>
                      {filteredMasterItems.map((item: any) => {
                        const isTindakan = newItemKategori === 'Jasa & Perawatan';
                        const title = isTindakan ? item.namaTindakan : item.namaBarang;
                        const price = isTindakan ? item.tarif : item.hargaJual;
                        const stock = isTindakan ? null : item.stokCurrent ?? item.stok ?? 0;
                        const katBadge = item.kategori;

                        return (
                          <div
                            key={item.id}
                            onMouseDown={() => handleSelectMasterItem(item)}
                            className="p-2 hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{title}</p>
                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                                <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-700 font-semibold">{katBadge}</span>
                                {!isTindakan && (
                                  <span className={`font-semibold ${Number(stock) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    Stok: {stock} {item.satuan}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="font-black text-indigo-700 text-xs bg-indigo-50 px-2 py-0.5 rounded-md">
                              Rp {Number(price || 0).toLocaleString('id-ID')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Jumlah & Satuan */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Jumlah & Satuan</label>
                  <div className="flex space-x-1">
                    <input
                      type="number"
                      min="1"
                      value={newItemJumlah}
                      onChange={(e) => setNewItemJumlah(Number(e.target.value))}
                      className="w-16 p-2 bg-white border border-amber-300 rounded-lg text-center font-bold"
                    />
                    <input
                      type="text"
                      value={newItemSatuan}
                      onChange={(e) => setNewItemSatuan(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg text-center"
                      placeholder="Pcs/Ampul"
                    />
                  </div>
                </div>

                {/* 4. Harga Satuan (Auto Filled) */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Harga Satuan (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newItemHarga}
                    onChange={(e) => setNewItemHarga(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-bold text-indigo-700"
                  />
                </div>
              </div>

              {/* Second row: spesifikasi & buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    placeholder="Keterangan / Dosis / Aturan Pakai (Opsional)"
                    value={newItemSpesifikasi}
                    onChange={(e) => setNewItemSpesifikasi(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                  />
                </div>

                {newItemKategori !== 'Jasa & Perawatan' && (
                  <div className="sm:col-span-3 flex items-center space-x-1.5">
                    <input
                      id="cbDeductStock"
                      type="checkbox"
                      checked={newItemDeductStock}
                      onChange={(e) => setNewItemDeductStock(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <label htmlFor="cbDeductStock" className="text-[11px] font-semibold text-slate-700 cursor-pointer">
                      Kurangi stok inventaris otomatis
                    </label>
                  </div>
                )}

                <div className={`${newItemKategori === 'Jasa & Perawatan' ? 'sm:col-span-6' : 'sm:col-span-3'} flex justify-end`}>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah ke Nota</span>
                  </button>
                </div>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-amber-200">
              <div className="flex items-center space-x-3">
                <label className="font-bold text-slate-700">Diskon Potongan Nota (Rp):</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={diskonNominal}
                  onChange={(e) => setDiskonNominal(Number(e.target.value))}
                  className="p-1.5 bg-white border border-slate-300 rounded-lg font-extrabold text-rose-600 w-36"
                />
              </div>

              <div className="text-[11px] text-slate-500 italic">
                * Item yang dihapus dari tabel di bawah akan otomatis mengembalikan stok ke gudang saat disimpan.
              </div>
            </div>
          </div>
        )}

        {/* Printable Area Page Container */}
        <div className="bg-slate-200/80 p-4 sm:p-8 overflow-x-auto flex justify-center">
          <div
            id="inpatient-a4-printable"
            className={`bg-white text-slate-900 shadow-xl border border-slate-300 p-8 sm:p-10 mx-auto font-sans text-xs ${
              paperSize === 'A4' ? 'w-[210mm] min-h-[297mm]' : 'w-[215mm] min-h-[330mm]'
            }`}
            style={{ boxSizing: 'border-box' }}
          >
            {/* KOP / HEADER IDENTITAS KLINIK */}
            <div className="border-b-2 border-indigo-900 pb-4 mb-5 flex justify-between items-start">
              <div className="flex items-start space-x-4">
                {klinik.logoUrl ? (
                  <img
                    src={klinik.logoUrl}
                    alt={klinik.namaKlinik}
                    className="w-20 h-20 object-contain rounded-xl border border-slate-200 p-1"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-900 text-white flex flex-col items-center justify-center shadow-md">
                    <Building2 className="w-8 h-8 text-indigo-300" />
                    <span className="text-[8px] font-black tracking-widest mt-0.5">KLINIK</span>
                  </div>
                )}

                <div className="space-y-1">
                  <h1 className="text-xl font-black text-indigo-950 tracking-tight uppercase">
                    {klinik.namaKlinik}
                  </h1>
                  <p className="text-slate-600 text-xs leading-relaxed max-w-md">
                    {klinik.alamat}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Telp / WhatsApp: <span className="font-semibold text-slate-800">{klinik.noTelepon}</span>
                    {klinik.email && <span> • Email: {klinik.email}</span>}
                  </p>
                  {klinik.izinOperasional && (
                    <p className="text-[10px] text-slate-400">
                      Izin Operasional: <span className="font-medium">{klinik.izinOperasional}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Title & Metadata Badge */}
              <div className="text-right space-y-1.5">
                <div className="inline-block bg-indigo-900 text-white px-3 py-1 rounded-md text-[11px] font-black tracking-wider uppercase shadow-xs">
                  INVOICE RAWAT INAP
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  <p className="font-bold text-slate-900">{noNotaInap}</p>
                  <p className="text-[10px] text-slate-500">
                    Tgl Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* INFORMASI PASIEN & RAWAT INAP (2 Columns) */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-[11px]">
              
              {/* Kolom Kiri: Data Pasien & Owner */}
              <div className="space-y-1.5 pr-2 border-r border-slate-200">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Nama Hewan:</span>
                  <span className="col-span-2 font-black text-indigo-950 text-xs">{pasien?.namaHewan || 'Pasien Inap'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Spesies / Ras:</span>
                  <span className="col-span-2 font-medium text-slate-800">
                    {pasien?.jenisHewan || 'Hewan'} {pasien?.ras ? `(${pasien.ras})` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Jenis Kelamin / Usia:</span>
                  <span className="col-span-2 text-slate-700">
                    {pasien?.jenisKelamin || '-'} • {pasien?.umur || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Nama Pemilik:</span>
                  <span className="col-span-2 font-bold text-slate-900">{pasien?.namaOwner || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">No. HP / WA:</span>
                  <span className="col-span-2 font-mono text-slate-700">{pasien?.noHpOwner || '-'}</span>
                </div>
              </div>

              {/* Kolom Kanan: Detail Periode & DPJP Rawat Inap */}
              <div className="space-y-1.5 pl-2">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">No. Kandang:</span>
                  <span className="col-span-2 font-black text-indigo-900">{rawatInap.noKandang || 'Kandang Inap'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Dokter DPJP:</span>
                  <span className="col-span-2 font-semibold text-slate-800">{dokter?.nama || klinik.namaPenanggungJawab || 'Dokter Jaga'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Diagnosa Inap:</span>
                  <span className="col-span-2 font-bold text-slate-800">{rawatInap.diagnosaInap}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Tanggal Masuk:</span>
                  <span className="col-span-2 text-slate-700 font-mono">{rawatInap.tanggalMasuk}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Tanggal Keluar:</span>
                  <span className="col-span-2 text-slate-700 font-mono">
                    {rawatInap.tanggalKeluarAktif || `${new Date().toISOString().slice(0, 10)} (Aktif)`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Lama Perawatan:</span>
                  <span className="col-span-2 font-black text-indigo-900">{totalHariInap} Hari Rawat Inap</span>
                </div>
              </div>

            </div>

            {/* TABEL DETAIL BIAYA RINCI (ITEMIZED BREAKDOWN) */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="font-extrabold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  <span>RINCIAN DETAIL KOMPONEN BIAYA RAWAT INAP</span>
                </h3>
                <span className="text-[10px] text-slate-500 italic">Disusun berdasarkan kategori pelayanan medis</span>
              </div>

              {/* 1. KATEGORI JASA & PERAWATAN */}
              <div className="space-y-1">
                <div className="bg-indigo-950 text-white px-3 py-1 font-bold text-[10px] uppercase tracking-wider rounded-t-md flex justify-between items-center">
                  <span>I. BIAYA JASA MEDIS, SEWA KANDANG & PERAWATAN</span>
                  <span>SUBTOTAL JASA: Rp {subtotalJasa.toLocaleString('id-ID')}</span>
                </div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] border-b border-slate-300">
                      <th className="p-2 w-8 text-center">No</th>
                      <th className="p-2">Uraian Jasa / Prosedur Medis</th>
                      <th className="p-2">Spesifikasi / Catatan</th>
                      <th className="p-2 text-center w-16">Vol</th>
                      <th className="p-2 text-center w-20">Satuan</th>
                      <th className="p-2 text-right w-28">Tarif Satuan</th>
                      <th className="p-2 text-right w-32">Subtotal (Rp)</th>
                      {isEditMode && <th className="p-2 no-print text-center w-12">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {billItems.filter((it) => it.kategori === 'Jasa & Perawatan').length === 0 ? (
                      <tr><td colSpan={isEditMode ? 8 : 7} className="p-2 text-center text-slate-400 italic">Tidak ada item jasa.</td></tr>
                    ) : (
                      billItems
                        .filter((it) => it.kategori === 'Jasa & Perawatan')
                        .map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-800">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={item.namaItem}
                                  onChange={(e) => handleUpdateItemField(item.id, 'namaItem', e.target.value)}
                                  className="w-full p-1 bg-white border border-slate-300 rounded text-[11px] font-bold"
                                />
                              ) : (
                                item.namaItem
                              )}
                            </td>
                            <td className="p-2 text-slate-500 italic text-[10px]">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={item.spesifikasi || ''}
                                  onChange={(e) => handleUpdateItemField(item.id, 'spesifikasi', e.target.value)}
                                  className="w-full p-1 bg-white border border-slate-300 rounded text-[10px]"
                                  placeholder="Catatan..."
                                />
                              ) : (
                                item.spesifikasi || '-'
                              )}
                            </td>
                            <td className="p-2 text-center font-bold text-slate-700">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={item.jumlah}
                                  onChange={(e) => handleUpdateItemField(item.id, 'jumlah', Number(e.target.value))}
                                  className="w-14 p-1 bg-white border border-slate-300 rounded text-center text-[11px] font-bold"
                                />
                              ) : (
                                item.jumlah
                              )}
                            </td>
                            <td className="p-2 text-center text-slate-500">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={item.satuan}
                                  onChange={(e) => handleUpdateItemField(item.id, 'satuan', e.target.value)}
                                  className="w-16 p-1 bg-white border border-slate-300 rounded text-center text-[10px]"
                                />
                              ) : (
                                item.satuan
                              )}
                            </td>
                            <td className="p-2 text-right text-slate-700">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={item.hargaSatuan}
                                  onChange={(e) => handleUpdateItemField(item.id, 'hargaSatuan', Number(e.target.value))}
                                  className="w-24 p-1 bg-white border border-slate-300 rounded text-right text-[11px] font-bold"
                                />
                              ) : (
                                `Rp ${item.hargaSatuan.toLocaleString('id-ID')}`
                              )}
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900">
                              Rp {item.subtotal.toLocaleString('id-ID')}
                            </td>
                            {isEditMode && (
                              <td className="p-2 no-print text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                                  title="Hapus Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 2. KATEGORI PEMBERIAN OBAT-OBATAN */}
              <div className="space-y-1">
                <div className="bg-indigo-900 text-white px-3 py-1 font-bold text-[10px] uppercase tracking-wider rounded-t-md flex justify-between items-center">
                  <span>II. RINCIAN PEMBERIAN OBAT-OBATAN (INJEKSI & ORAL)</span>
                  <span>SUBTOTAL OBAT: Rp {subtotalObat.toLocaleString('id-ID')}</span>
                </div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] border-b border-slate-300">
                      <th className="p-2 w-8 text-center">No</th>
                      <th className="p-2">Nama Obat / Resep</th>
                      <th className="p-2">Dosis & Aturan Pakai</th>
                      <th className="p-2 text-center w-16">Vol</th>
                      <th className="p-2 text-center w-20">Satuan</th>
                      <th className="p-2 text-right w-28">Harga Satuan</th>
                      <th className="p-2 text-right w-32">Subtotal (Rp)</th>
                      {isEditMode && <th className="p-2 no-print text-center w-12">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {billItems.filter((it) => it.kategori === 'Obat-Obatan').length === 0 ? (
                      <tr><td colSpan={isEditMode ? 8 : 7} className="p-2 text-center text-slate-400 italic">Tidak ada rincian obat.</td></tr>
                    ) : (
                      billItems
                        .filter((it) => it.kategori === 'Obat-Obatan')
                        .map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-800">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={item.namaItem}
                                  onChange={(e) => handleUpdateItemField(item.id, 'namaItem', e.target.value)}
                                  className="w-full p-1 bg-white border border-slate-300 rounded text-[11px] font-bold"
                                />
                              ) : (
                                item.namaItem
                              )}
                            </td>
                            <td className="p-2 text-slate-600 text-[10px]">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={item.spesifikasi || ''}
                                  onChange={(e) => handleUpdateItemField(item.id, 'spesifikasi', e.target.value)}
                                  className="w-full p-1 bg-white border border-slate-300 rounded text-[10px]"
                                  placeholder="Dosis & Aturan..."
                                />
                              ) : (
                                item.spesifikasi || '-'
                              )}
                            </td>
                            <td className="p-2 text-center font-bold text-slate-700">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={item.jumlah}
                                  onChange={(e) => handleUpdateItemField(item.id, 'jumlah', Number(e.target.value))}
                                  className="w-14 p-1 bg-white border border-slate-300 rounded text-center text-[11px] font-bold"
                                />
                              ) : (
                                item.jumlah
                              )}
                            </td>
                            <td className="p-2 text-center text-slate-500">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={item.satuan}
                                  onChange={(e) => handleUpdateItemField(item.id, 'satuan', e.target.value)}
                                  className="w-16 p-1 bg-white border border-slate-300 rounded text-center text-[10px]"
                                />
                              ) : (
                                item.satuan
                              )}
                            </td>
                            <td className="p-2 text-right text-slate-700">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="500"
                                  value={item.hargaSatuan}
                                  onChange={(e) => handleUpdateItemField(item.id, 'hargaSatuan', Number(e.target.value))}
                                  className="w-24 p-1 bg-white border border-slate-300 rounded text-right text-[11px] font-bold"
                                />
                              ) : (
                                `Rp ${item.hargaSatuan.toLocaleString('id-ID')}`
                              )}
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900">
                              Rp {item.subtotal.toLocaleString('id-ID')}
                            </td>
                            {isEditMode && (
                              <td className="p-2 no-print text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                                  title="Hapus Obat & Kembalikan Stok"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 3. KATEGORI ALKES & BMHP */}
              <div className="space-y-1">
                <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[10px] uppercase tracking-wider rounded-t-md flex justify-between items-center">
                  <span>III. ALAT KESEHATAN (ALKES), BMHP, & PAKAN DIET</span>
                  <span>SUBTOTAL ALKES: Rp {subtotalBMHP.toLocaleString('id-ID')}</span>
                </div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] border-b border-slate-300">
                      <th className="p-2 w-8 text-center">No</th>
                      <th className="p-2">Nama Barang / BMHP / Pakan</th>
                      <th className="p-2">Keterangan</th>
                      <th className="p-2 text-center w-16">Vol</th>
                      <th className="p-2 text-center w-20">Satuan</th>
                      <th className="p-2 text-right w-28">Harga Satuan</th>
                      <th className="p-2 text-right w-32">Subtotal (Rp)</th>
                      {isEditMode && <th className="p-2 no-print text-center w-12">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {billItems.filter((it) => it.kategori === 'Alkes & BMHP').length === 0 ? (
                      <tr><td colSpan={isEditMode ? 8 : 7} className="p-2 text-center text-slate-400 italic">Tidak ada rincian alkes/BMHP.</td></tr>
                    ) : (
                      billItems
                        .filter((it) => it.kategori === 'Alkes & BMHP')
                        .map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-800">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={item.namaItem}
                                  onChange={(e) => handleUpdateItemField(item.id, 'namaItem', e.target.value)}
                                  className="w-full p-1 bg-white border border-slate-300 rounded text-[11px] font-bold"
                                />
                              ) : (
                                item.namaItem
                              )}
                            </td>
                            <td className="p-2 text-slate-500 italic text-[10px]">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={item.spesifikasi || ''}
                                  onChange={(e) => handleUpdateItemField(item.id, 'spesifikasi', e.target.value)}
                                  className="w-full p-1 bg-white border border-slate-300 rounded text-[10px]"
                                  placeholder="Keterangan..."
                                />
                              ) : (
                                item.spesifikasi || '-'
                              )}
                            </td>
                            <td className="p-2 text-center font-bold text-slate-700">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={item.jumlah}
                                  onChange={(e) => handleUpdateItemField(item.id, 'jumlah', Number(e.target.value))}
                                  className="w-14 p-1 bg-white border border-slate-300 rounded text-center text-[11px] font-bold"
                                />
                              ) : (
                                item.jumlah
                              )}
                            </td>
                            <td className="p-2 text-center text-slate-500">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={item.satuan}
                                  onChange={(e) => handleUpdateItemField(item.id, 'satuan', e.target.value)}
                                  className="w-16 p-1 bg-white border border-slate-300 rounded text-center text-[10px]"
                                />
                              ) : (
                                item.satuan
                              )}
                            </td>
                            <td className="p-2 text-right text-slate-700">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="500"
                                  value={item.hargaSatuan}
                                  onChange={(e) => handleUpdateItemField(item.id, 'hargaSatuan', Number(e.target.value))}
                                  className="w-24 p-1 bg-white border border-slate-300 rounded text-right text-[11px] font-bold"
                                />
                              ) : (
                                `Rp ${item.hargaSatuan.toLocaleString('id-ID')}`
                              )}
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900">
                              Rp {item.subtotal.toLocaleString('id-ID')}
                            </td>
                            {isEditMode && (
                              <td className="p-2 no-print text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                                  title="Hapus Alkes & Kembalikan Stok"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* RINGKASAN PEMBAYARAN TOTAL & STAMP (2 Column Grid) */}
            <div className="grid grid-cols-2 gap-6 items-start border-t-2 border-indigo-900 pt-4 mb-6">
              
              {/* Left Column: Catatan & Status Stempel */}
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] space-y-1">
                  <p className="font-bold text-slate-800 uppercase tracking-wider">CATATAN & INSTRUKSI PERAWATAN:</p>
                  <p className="text-slate-600 leading-snug">
                    {klinik.footerNota || 'Harap perhatikan jadwal pemberian obat minum di rumah jika sudah dipulangkan. Hubungi klinik jika terjadi penurunan kondisi.'}
                  </p>
                </div>

                {/* Stempel Payment Badge */}
                <div className="flex items-center space-x-3 pt-1">
                  <div className="border-2 border-emerald-600 text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-lg text-center rotate-[-2deg] font-black tracking-widest text-sm shadow-xs uppercase">
                    ✓ LUNAS / PAID
                  </div>
                  <div className="text-[10px] text-slate-500">
                    <p className="font-semibold text-slate-800">Pembayaran Terverifikasi</p>
                    <p>Metode: {transaksi?.metodePembayaran || 'Kasir Klinik'}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Calculations */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Biaya Jasa & Kamar:</span>
                  <span className="font-semibold text-slate-800">Rp {subtotalJasa.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Pemberian Obat:</span>
                  <span className="font-semibold text-slate-800">Rp {subtotalObat.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Alkes & BMHP:</span>
                  <span className="font-semibold text-slate-800">Rp {subtotalBMHP.toLocaleString('id-ID')}</span>
                </div>

                {diskonNominal > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1">
                    <span>Diskon Potongan Harga:</span>
                    <span>- Rp {diskonNominal.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="border-t-2 border-slate-800 pt-2 flex justify-between items-center text-indigo-950">
                  <div>
                    <span className="block font-extrabold text-sm uppercase">TOTAL BIAYA INAP:</span>
                    <span className="text-[10px] text-slate-500 font-normal">Sudah termasuk pajak & pelayanan</span>
                  </div>
                  <span className="text-lg font-black text-indigo-900 bg-indigo-100 px-3 py-1 rounded-lg">
                    Rp {grandTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

            </div>

            {/* KOLOM TANDA TANGAN (SIGNATURE BLOCK) */}
            <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-slate-200 text-[11px] font-medium">
              <div>
                <p className="text-slate-500 mb-12">Pemilik Pasien / Penanggung Jawab,</p>
                <div className="border-b border-slate-400 w-48 mx-auto font-bold text-slate-900 pb-0.5">
                  {pasien?.namaOwner || '( Pemilik Pasien )'}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Tanda Tangan & Nama Terang</p>
              </div>

              <div>
                <p className="text-slate-500 mb-12">
                  {klinik.namaKlinik}, <br />
                  Staf Kasir / Keuangan Medis,
                </p>
                <div className="border-b border-slate-400 w-48 mx-auto font-bold text-slate-900 pb-0.5">
                  ( {dokter?.nama || klinik.namaPenanggungJawab || 'Kasir / Petugas Jaga'} )
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Stempel Klinik & Tanda Tangan</p>
              </div>
            </div>

          </div>
        </div>

        </div>

      </div>

      {/* Print Specific Embedded Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #inpatient-a4-printable {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: none !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: ${paperSize === 'A4' ? 'A4 portrait' : '215mm 330mm portrait'};
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
};
