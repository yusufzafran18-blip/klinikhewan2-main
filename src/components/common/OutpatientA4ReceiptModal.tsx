import React, { useState, useMemo } from 'react';
import {
  RekamMedis, Pasien, Dokter, DataKlinik, Transaksi,
  TindakanItem, ResepItem, ObatRacikan, AlkesUsageItem,
  Barang, Tindakan
} from '../../types';
import {
  Printer, X, Stethoscope, Pill, Syringe, Package, DollarSign,
  Plus, Trash2, Edit2, CheckCircle2, MessageSquare, FileText, Calendar, Building2,
  Search, Check, Save, RefreshCw, AlertCircle, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';
import { generateWaLink } from '../../services/wa';
import { normalizeClinicProfile } from '../../utils/clinic';

export interface OutpatientBillItem {
  id: string;
  kategori: 'Jasa & Tindakan' | 'Obat-Obatan' | 'Obat Racikan' | 'Alkes & BMHP' | 'Pakan & Barang';
  namaItem: string;
  spesifikasi?: string; // Dosis, Aturan pakai, Satuan, Keterangan
  jumlah: number;
  satuan: string;
  hargaSatuan: number;
  subtotal: number;
  barangId?: string;
  tindakanId?: string;
  deductStock?: boolean;
  isCustom?: boolean;
}

interface OutpatientA4ReceiptModalProps {
  rekamMedis: RekamMedis;
  pasien?: Pasien;
  dokter?: Dokter;
  klinik: DataKlinik;
  transaksi?: Transaksi;
  barangList?: Barang[];
  tindakanList?: Tindakan[];
  onSaveRekamMedis?: (rm: RekamMedis) => Promise<void> | void;
  onSaveTransaksi?: (trx: Transaksi) => Promise<void> | void;
  onUseInventory?: (items: { barangId?: string; nama?: string; jumlah: number }[], options?: any) => Promise<boolean | void> | boolean | void;
  onRevertInventory?: (items: { barangId?: string; nama?: string; jumlah: number }[], options?: any) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
}

export const OutpatientA4ReceiptModal: React.FC<OutpatientA4ReceiptModalProps> = ({
  rekamMedis,
  pasien,
  dokter,
  klinik,
  transaksi,
  barangList = [],
  tindakanList = [],
  onSaveRekamMedis,
  onSaveTransaksi,
  onUseInventory,
  onRevertInventory,
  onClose,
}) => {
  const normKlinik = normalizeClinicProfile(klinik);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Generate initial itemized billing list from RekamMedis or Transaksi
  const buildInitialItems = (): OutpatientBillItem[] => {
    // If transaksi already contains itemized rows, prioritize them
    if (transaksi && transaksi.items && transaksi.items.length > 0) {
      return transaksi.items.map((it, idx) => {
        let kat: OutpatientBillItem['kategori'] = 'Jasa & Tindakan';
        const itLower = (it.namaItem || '').toLowerCase();
        if (it.jenis === 'Obat') kat = 'Obat-Obatan';
        else if (it.jenis === 'Obat Racikan') kat = 'Obat Racikan';
        else if (it.jenis === 'Barang/Pakan') {
          kat = itLower.includes('infus') || itLower.includes('spuit') || itLower.includes('alkes') || itLower.includes('catheter')
            ? 'Alkes & BMHP'
            : 'Pakan & Barang';
        }

        const matchBarang = barangList.find(
          (b) => (b.id && (it as any).barangId && b.id === (it as any).barangId) ||
                 (itLower && b.namaBarang && b.namaBarang.toLowerCase().trim() === itLower.trim())
        );

        return {
          id: `item-trx-${idx}`,
          kategori: kat,
          namaItem: it.namaItem,
          barangId: (it as any).barangId || matchBarang?.id,
          spesifikasi: '',
          jumlah: it.jumlah || 1,
          satuan: kat === 'Jasa & Tindakan' ? 'Tindakan' : (matchBarang?.satuan || 'Pcs'),
          hargaSatuan: it.hargaSatuan || 0,
          subtotal: it.subtotal || ((it.jumlah || 1) * (it.hargaSatuan || 0)),
          deductStock: kat !== 'Jasa & Tindakan' && Boolean(matchBarang?.id || (it as any).barangId),
        };
      });
    }

    const items: OutpatientBillItem[] = [];

    // 1. Tindakan Medis & Prosedur
    if (rekamMedis.plan?.tindakanList && rekamMedis.plan.tindakanList.length > 0) {
      rekamMedis.plan.tindakanList.forEach((t, i) => {
        const tName = (t.namaTindakan || '').toLowerCase().trim();
        const matchTindakan = tindakanList.find(
          (td) => (td.id && t.tindakanId && td.id === t.tindakanId) || (tName && td.namaTindakan && td.namaTindakan.toLowerCase().trim() === tName)
        );
        items.push({
          id: `item-tindakan-${i}`,
          kategori: 'Jasa & Tindakan',
          tindakanId: t.tindakanId || matchTindakan?.id,
          namaItem: t.namaTindakan,
          spesifikasi: t.keterangan || matchTindakan?.kategori || 'Konsultasi & Penanganan Medis',
          jumlah: 1,
          satuan: 'Tindakan',
          hargaSatuan: t.tarif || matchTindakan?.tarif || 0,
          subtotal: t.tarif || matchTindakan?.tarif || 0,
          deductStock: false,
        });
      });
    } else {
      items.push({
        id: 'item-tindakan-default',
        kategori: 'Jasa & Tindakan',
        namaItem: 'Pemeriksaan Klinis & Konsultasi Dokter Hewan',
        spesifikasi: 'Pemeriksaan fisik umum & penegakan diagnosa',
        jumlah: 1,
        satuan: 'Pemeriksaan',
        hargaSatuan: 50000,
        subtotal: 50000,
        deductStock: false,
      });
    }

    // 2. Resep Obat Non-Racikan
    if (rekamMedis.plan?.resepList && rekamMedis.plan.resepList.length > 0) {
      rekamMedis.plan.resepList.forEach((r, i) => {
        const rName = (r.namaBarang || '').toLowerCase().trim();
        const matchBarang = barangList.find(
          (b) => (b.id && r.barangId && b.id === r.barangId) || (rName && b.namaBarang && b.namaBarang.toLowerCase().trim() === rName)
        );
        items.push({
          id: `item-resep-${i}`,
          kategori: 'Obat-Obatan',
          barangId: r.barangId || matchBarang?.id,
          namaItem: r.namaBarang,
          spesifikasi: `Dosis: ${r.dosis || '-'} (${r.aturanPakai || 'Sesuai Anjuran'})`,
          jumlah: r.jumlah || 1,
          satuan: (r as any).satuan || matchBarang?.satuan || 'Tablet',
          hargaSatuan: r.hargaSatuan || matchBarang?.hargaJual || 0,
          subtotal: r.subtotal || ((r.hargaSatuan || matchBarang?.hargaJual || 0) * (r.jumlah || 1)),
          deductStock: true,
        });
      });
    }

    // 3. Obat Racikan
    if (rekamMedis.plan?.racikanList && rekamMedis.plan.racikanList.length > 0) {
      rekamMedis.plan.racikanList.forEach((rac, i) => {
        const itemNames = (rac.items || []).map((it) => it.namaObat).join(', ');
        items.push({
          id: rac.id || `item-racikan-${i}`,
          kategori: 'Obat Racikan',
          namaItem: `[Racikan] ${rac.namaRacikan}`,
          spesifikasi: `${rac.jumlahBungkus} Bungkus (${rac.aturanPakai || '3x1 bungkus'}) ${itemNames ? `• Komposisi: ${itemNames}` : ''}`,
          jumlah: rac.jumlahBungkus || 1,
          satuan: 'Bungkus',
          hargaSatuan: rac.totalHarga ? Math.round(rac.totalHarga / (rac.jumlahBungkus || 1)) : 0,
          subtotal: rac.totalHarga || 0,
          deductStock: false,
        });
      });
    }

    // 4. Penggunaan Alkes & BMHP
    if (rekamMedis.plan?.penggunaanAlkesList && rekamMedis.plan.penggunaanAlkesList.length > 0) {
      rekamMedis.plan.penggunaanAlkesList.forEach((a, i) => {
        const aName = (a.namaAlkes || '').toLowerCase().trim();
        const matchBarang = barangList.find(
          (b) => (b.id && a.barangId && b.id === a.barangId) || (aName && b.namaBarang && b.namaBarang.toLowerCase().trim() === aName)
        );
        items.push({
          id: a.id || `item-alkes-${i}`,
          kategori: 'Alkes & BMHP',
          barangId: a.barangId || matchBarang?.id,
          namaItem: a.namaAlkes,
          spesifikasi: a.satuan || matchBarang?.satuan || 'BMHP Disposable',
          jumlah: a.jumlah || 1,
          satuan: a.satuan || matchBarang?.satuan || 'Pcs',
          hargaSatuan: a.hargaSatuan || matchBarang?.hargaJual || 0,
          subtotal: a.subtotal || ((a.hargaSatuan || matchBarang?.hargaJual || 0) * (a.jumlah || 1)),
          deductStock: true,
        });
      });
    }

    // 5. Pemakaian Barang / Pakan Diet / Nutrisi
    if (rekamMedis.plan?.pemakaianBarangList && rekamMedis.plan.pemakaianBarangList.length > 0) {
      rekamMedis.plan.pemakaianBarangList.forEach((b, i) => {
        const brgName = (b.namaBarang || '').toLowerCase().trim();
        const matchBarang = barangList.find(
          (brg) => (brg.id && b.barangId && brg.id === b.barangId) || (brgName && brg.namaBarang && brg.namaBarang.toLowerCase().trim() === brgName)
        );
        items.push({
          id: `item-barang-${i}`,
          kategori: 'Pakan & Barang',
          barangId: b.barangId || matchBarang?.id,
          namaItem: b.namaBarang,
          spesifikasi: b.dosis || b.aturanPakai || 'Pakan/Nutrisi Rawat Jalan',
          jumlah: b.jumlah || 1,
          satuan: (b as any).satuan || b.aturanPakai || matchBarang?.satuan || 'Pcs',
          hargaSatuan: b.hargaSatuan || matchBarang?.hargaJual || 0,
          subtotal: b.subtotal || ((b.hargaSatuan || matchBarang?.hargaJual || 0) * (b.jumlah || 1)),
          deductStock: true,
        });
      });
    }

    return items;
  };

  const [billItems, setBillItems] = useState<OutpatientBillItem[]>(buildInitialItems);
  // Snapshot initial items to accurately compute inventory diff upon edit completion
  const [initialItemsSnapshot] = useState<OutpatientBillItem[]>(() => buildInitialItems());
  const [customDiscount, setCustomDiscount] = useState<number>(transaksi?.diskon || 0);

  // New Item State for Edit Mode
  const [newItemKategori, setNewItemKategori] = useState<OutpatientBillItem['kategori']>('Jasa & Tindakan');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [newItemNama, setNewItemNama] = useState('');
  const [newItemSpesifikasi, setNewItemSpesifikasi] = useState('');
  const [newItemJumlah, setNewItemJumlah] = useState(1);
  const [newItemSatuan, setNewItemSatuan] = useState('Tindakan');
  const [newItemHarga, setNewItemHarga] = useState(0);
  const [newItemDeductStock, setNewItemDeductStock] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Filtered master items using WHERE logic for each category
  const filteredMasterItems = useMemo(() => {
    const q = searchKeyword.toLowerCase().trim();
    if (newItemKategori === 'Jasa & Tindakan') {
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
    } else if (newItemKategori === 'Obat Racikan') {
      if (!barangList || barangList.length === 0) return [];
      return barangList
        .filter((b) => {
          const isObat = b.kategori === 'Obat';
          if (!q) return isObat;
          return (
            b.namaBarang.toLowerCase().includes(q) ||
            b.kodeBarang?.toLowerCase().includes(q)
          );
        })
        .slice(0, 15);
    } else if (newItemKategori === 'Alkes & BMHP') {
      if (!barangList || barangList.length === 0) return [];
      return barangList
        .filter((b) => {
          const isAlkes = b.kategori !== 'Obat' && b.kategori !== 'Pakan';
          if (!q) return isAlkes || b.kategori === 'Alkes';
          return (
            b.namaBarang.toLowerCase().includes(q) ||
            b.kodeBarang?.toLowerCase().includes(q) ||
            b.kategori?.toLowerCase().includes(q)
          );
        })
        .slice(0, 15);
    } else {
      // Pakan & Barang
      if (!barangList || barangList.length === 0) return [];
      return barangList
        .filter((b) => {
          const isPakanOrGoods = b.kategori === 'Pakan' || b.kategori === 'Aksesoris' || b.kategori === 'Lainnya';
          if (!q) return isPakanOrGoods;
          return (
            b.namaBarang.toLowerCase().includes(q) ||
            b.kodeBarang?.toLowerCase().includes(q) ||
            b.kategori?.toLowerCase().includes(q)
          );
        })
        .slice(0, 15);
    }
  }, [newItemKategori, searchKeyword, tindakanList, barangList]);

  // Handle category switch in Add Item Form
  const handleCategoryChange = (kat: OutpatientBillItem['kategori']) => {
    setNewItemKategori(kat);
    setSearchKeyword('');
    setSelectedMasterId('');
    setNewItemNama('');
    setNewItemSpesifikasi('');
    setNewItemHarga(0);
    setNewItemJumlah(1);
    if (kat === 'Jasa & Tindakan') {
      setNewItemSatuan('Tindakan');
      setNewItemDeductStock(false);
    } else if (kat === 'Obat-Obatan') {
      setNewItemSatuan('Tablet');
      setNewItemDeductStock(true);
    } else if (kat === 'Obat Racikan') {
      setNewItemSatuan('Bungkus');
      setNewItemDeductStock(false);
    } else {
      setNewItemSatuan('Pcs');
      setNewItemDeductStock(true);
    }
  };

  // Handle Master Item Selection
  const handleSelectMasterItem = (item: any) => {
    if (newItemKategori === 'Jasa & Tindakan') {
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
      setNewItemSpesifikasi(
        b.keterangan || (b.kategori === 'Obat' ? 'Sesuai Resep' : b.kategori || 'Pemakaian Rawat Jalan')
      );
      setNewItemDeductStock(newItemKategori !== 'Obat Racikan');
    }
    setSearchKeyword('');
    setShowSearchDropdown(false);
  };

  // Calculate Subtotals per Category
  const subtotalTindakan = billItems
    .filter((it) => it.kategori === 'Jasa & Tindakan')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const subtotalObat = billItems
    .filter((it) => it.kategori === 'Obat-Obatan' || it.kategori === 'Obat Racikan')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const subtotalAlkes = billItems
    .filter((it) => it.kategori === 'Alkes & BMHP')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const subtotalBarang = billItems
    .filter((it) => it.kategori === 'Pakan & Barang')
    .reduce((sum, it) => sum + it.subtotal, 0);

  const grandSubtotal = billItems.reduce((sum, it) => sum + it.subtotal, 0);
  const finalGrandTotal = Math.max(0, grandSubtotal - customDiscount);

  // Add Item to Bill
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemNama.trim() || newItemJumlah <= 0) return;

    const sub = newItemJumlah * newItemHarga;
    const newItem: OutpatientBillItem = {
      id: `custom-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      kategori: newItemKategori,
      namaItem: newItemNama.trim(),
      spesifikasi: newItemSpesifikasi.trim() || undefined,
      jumlah: Number(newItemJumlah) || 1,
      satuan: newItemSatuan.trim() || 'Pcs',
      hargaSatuan: Number(newItemHarga) || 0,
      subtotal: sub,
      barangId: newItemKategori !== 'Jasa & Tindakan' ? (selectedMasterId || undefined) : undefined,
      tindakanId: newItemKategori === 'Jasa & Tindakan' ? (selectedMasterId || undefined) : undefined,
      deductStock: newItemDeductStock,
      isCustom: true,
    };

    setBillItems([...billItems, newItem]);
    // Reset form fields
    setSelectedMasterId('');
    setNewItemNama('');
    setNewItemSpesifikasi('');
    setNewItemJumlah(1);
    setNewItemHarga(0);
    setSearchKeyword('');
  };

  // Delete Item from Bill
  const handleDeleteItem = (id: string) => {
    setBillItems(billItems.filter((it) => it.id !== id));
  };

  // Update item field directly
  const handleUpdateItemField = (id: string, field: keyof OutpatientBillItem, value: any) => {
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

  // AUTOMATICALLY SAVE EDITS, SYNC REKAM MEDIS, AND APPLY INVENTORY DIFFERENCES
  const handleSaveAndFinishEdit = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      // 1. Calculate stock difference between initial snapshot and current bill items
      if (onUseInventory && onRevertInventory) {
        const initialUsageMap = new Map<string, { barangId?: string; nama: string; qty: number }>();
        initialItemsSnapshot.forEach((it) => {
          if (it.kategori === 'Obat-Obatan' || it.kategori === 'Alkes & BMHP' || it.kategori === 'Pakan & Barang') {
            const key = it.barangId || (it.namaItem || '').toLowerCase().trim();
            const prev = initialUsageMap.get(key) || { barangId: it.barangId, nama: it.namaItem, qty: 0 };
            initialUsageMap.set(key, { ...prev, qty: prev.qty + (it.jumlah || 0) });
          }
        });

        const currentUsageMap = new Map<string, { barangId?: string; nama: string; qty: number }>();
        billItems.forEach((it) => {
          if (it.kategori === 'Obat-Obatan' || it.kategori === 'Alkes & BMHP' || it.kategori === 'Pakan & Barang') {
            const key = it.barangId || (it.namaItem || '').toLowerCase().trim();
            const prev = currentUsageMap.get(key) || { barangId: it.barangId, nama: it.namaItem, qty: 0 };
            currentUsageMap.set(key, { ...prev, qty: prev.qty + (it.jumlah || 0) });
          }
        });

        const itemsToDeduct: { barangId?: string; nama: string; jumlah: number }[] = [];
        const itemsToRevert: { barangId?: string; nama: string; jumlah: number }[] = [];

        // Check for newly added items or increased quantities
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

        // Check for deleted items or decreased quantities (revert stock)
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

        // Apply inventory deduction for additions
        if (itemsToDeduct.length > 0) {
          await onUseInventory(itemsToDeduct, {
            tipeReferensi: 'Rawat Jalan',
            referensi: rekamMedis.noRM,
            pasienNama: pasien?.namaHewan,
            ownerNama: pasien?.namaOwner,
            keterangan: `Penyesuaian nota rawat jalan: penambahan item (${rekamMedis.noRM})`,
          });
        }

        // Apply inventory reversion for deletions
        if (itemsToRevert.length > 0) {
          await onRevertInventory(itemsToRevert, {
            referensi: rekamMedis.noRM,
            keterangan: `Pengembalian stok pembatalan/penghapusan item nota rawat jalan: ${rekamMedis.noRM}`,
          });
        }
      }

      // 2. Reconstruct structured rekamMedis plan sub-arrays
      const updatedTindakanList: TindakanItem[] = [];
      const updatedResepList: ResepItem[] = [];
      const updatedRacikanList: ObatRacikan[] = [];
      const updatedPenggunaanAlkesList: AlkesUsageItem[] = [];
      const updatedPemakaianBarangList: ResepItem[] = [];

      billItems.forEach((it) => {
        if (it.kategori === 'Jasa & Tindakan') {
          updatedTindakanList.push({
            tindakanId: it.tindakanId || it.id,
            namaTindakan: it.namaItem,
            tarif: it.hargaSatuan,
            keterangan: it.spesifikasi || 'Tindakan Rawat Jalan',
          });
        } else if (it.kategori === 'Obat-Obatan') {
          updatedResepList.push({
            barangId: it.barangId || '',
            namaBarang: it.namaItem,
            jumlah: it.jumlah,
            dosis: it.spesifikasi || '-',
            aturanPakai: it.spesifikasi || '-',
            hargaSatuan: it.hargaSatuan,
            subtotal: it.subtotal,
          });
        } else if (it.kategori === 'Obat Racikan') {
          updatedRacikanList.push({
            id: it.id,
            namaRacikan: it.namaItem.replace(/^\[Racikan\]\s*/i, ''),
            jumlahBungkus: it.jumlah,
            aturanPakai: it.spesifikasi || '3x1 bungkus',
            biayaJasaRacik: 0,
            items: [],
            totalHarga: it.subtotal,
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
        } else if (it.kategori === 'Pakan & Barang') {
          updatedPemakaianBarangList.push({
            barangId: it.barangId || '',
            namaBarang: it.namaItem,
            jumlah: it.jumlah,
            dosis: it.spesifikasi || '',
            aturanPakai: it.satuan || 'Pcs',
            hargaSatuan: it.hargaSatuan,
            subtotal: it.subtotal,
          });
        }
      });

      const updatedRM: RekamMedis = {
        ...rekamMedis,
        plan: {
          ...rekamMedis.plan,
          tindakanList: updatedTindakanList,
          resepList: updatedResepList,
          racikanList: updatedRacikanList,
          penggunaanAlkesList: updatedPenggunaanAlkesList,
          pemakaianBarangList: updatedPemakaianBarangList,
        },
        totalBiaya: finalGrandTotal,
      };

      if (onSaveRekamMedis) {
        await onSaveRekamMedis(updatedRM);
      }

      // 3. If there is an associated transaction, update its items & totals as well
      if (transaksi && onSaveTransaksi) {
        const updatedTrxItems = billItems.map((it) => {
          let jenis: 'Tindakan' | 'Obat' | 'Obat Racikan' | 'Barang/Pakan' = 'Tindakan';
          if (it.kategori === 'Obat-Obatan') jenis = 'Obat';
          else if (it.kategori === 'Obat Racikan') jenis = 'Obat Racikan';
          else if (it.kategori === 'Alkes & BMHP' || it.kategori === 'Pakan & Barang') jenis = 'Barang/Pakan';

          return {
            id: it.id,
            barangId: it.barangId,
            namaItem: it.namaItem,
            jenis,
            jumlah: it.jumlah,
            hargaSatuan: it.hargaSatuan,
            subtotal: it.subtotal,
          };
        });

        const updatedTrx: Transaksi = {
          ...transaksi,
          items: updatedTrxItems,
          subtotal: grandSubtotal,
          diskon: customDiscount,
          total: finalGrandTotal,
        };

        await onSaveTransaksi(updatedTrx);
      }

      setIsEditMode(false);
      setSaveSuccessMsg('Rincian nota rawat jalan & penyesuaian stok inventaris berhasil disimpan otomatis!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save outpatient billing edits:', err);
      alert('Gagal menyimpan perubahan rincian rawat jalan: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `Nota_Rawat_Jalan_${rekamMedis.noRM}_${pasien?.namaHewan || 'Pasien'}_${normKlinik.namaKlinik}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  };

  // WhatsApp Sender Handler
  const handleSendWA = () => {
    if (!pasien?.noTelp) {
      window.alert('Nomor WhatsApp pemilik tidak ditemukan pada data pasien.');
      return;
    }

    const itemSummary = billItems
      .map((it, idx) => `${idx + 1}. ${it.namaItem} (${it.jumlah} ${it.satuan}) - Rp ${it.subtotal.toLocaleString('id-ID')}`)
      .join('\n');

    const waText = `*KWITANSI & RINCIAN RAWAT JALAN*\n*${normKlinik.namaKlinik}*\n` +
      `--------------------------------\n` +
      `No. RM: ${rekamMedis.noRM}\n` +
      `No. Invoice: ${transaksi?.noNota || 'INV-' + rekamMedis.noRM}\n` +
      `Tanggal: ${rekamMedis.tanggal}\n` +
      `Pasien: ${pasien?.namaHewan} (${pasien?.jenisHewan || 'Hewan'})\n` +
      `Pemilik: ${pasien?.namaOwner}\n` +
      `Dokter: ${dokter?.nama || 'Dokter Jaga'}\n` +
      `Diagnosa: ${rekamMedis.assessment?.diagnosaUtama || '-'}\n` +
      `--------------------------------\n` +
      `*RINCIAN BIAYA:*\n${itemSummary}\n\n` +
      `*Subtotal:* Rp ${grandSubtotal.toLocaleString('id-ID')}\n` +
      (customDiscount > 0 ? `*Diskon:* -Rp ${customDiscount.toLocaleString('id-ID')}\n` : '') +
      `*TOTAL TAGIHAN:* Rp ${finalGrandTotal.toLocaleString('id-ID')}\n` +
      `*Status:* ${transaksi?.status || rekamMedis.statusPembayaran || 'Belum Lunas'}\n` +
      (rekamMedis.plan?.tanggalKontrolUlang ? `\n*Jadwal Kontrol:* ${rekamMedis.plan.tanggalKontrolUlang}\n` : '') +
      `--------------------------------\n` +
      `Terima kasih telah mempercayakan kesehatan anabul Anda kepada ${normKlinik.namaKlinik}.`;

    window.open(generateWaLink(pasien.noTelp, waText), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-h-[96vh] flex flex-col overflow-hidden print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none ${
          paperSize === 'A4' ? 'max-w-[860px]' : 'max-w-[900px]'
        }`}
      >
        {/* MODAL CONTROL HEADER (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600/30 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <span>Cetak Nota & Rincian Biaya Rawat Jalan</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {paperSize} Mode
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Format Resmi Kwitansi Pasien Poliklinik / Rawat Jalan</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Paper Size Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  paperSize === 'A4' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 (210×297)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  paperSize === 'F4' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                F4 / Folio (215×330)
              </button>
            </div>

            {/* Toggle Edit Mode / Save & Finish Edit */}
            {isEditMode ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAndFinishEdit}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan & Selesai Edit</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Item</span>
              </button>
            )}

            {/* WhatsApp Share */}
            <button
              type="button"
              onClick={handleSendWA}
              title="Kirim Kwitansi via WhatsApp"
              className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-900/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak (PDF)</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Toast Notification */}
        {saveSuccessMsg && (
          <div className="bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-sm animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-100 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* EDIT MODE BAR (Smart WHERE master search & auto stock sync) */}
        {isEditMode && (
          <div className="bg-amber-50/95 border-b border-amber-200 p-4 shrink-0 text-xs print:hidden space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-200 text-amber-900 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-amber-950 text-sm">Mode Edit & Penyesuaian Rincian Rawat Jalan</span>
                  <p className="text-[11px] text-amber-800">
                    Cari item dari master (WHERE filter). Selesai edit akan <strong>otomatis menyimpan data</strong> & <strong>memperbarui stok</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-xs">
                <label className="font-bold text-slate-700 text-xs">Potongan / Diskon (Rp):</label>
                <input
                  type="number"
                  min="0"
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-28 px-2 py-0.5 rounded-lg border border-slate-300 font-bold text-amber-900 text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Category Pills Selector */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-bold text-slate-600 mr-1">Kategori:</span>
              {(['Jasa & Tindakan', 'Obat-Obatan', 'Obat Racikan', 'Alkes & BMHP', 'Pakan & Barang'] as OutpatientBillItem['kategori'][]).map((kat) => (
                <button
                  key={kat}
                  type="button"
                  onClick={() => handleCategoryChange(kat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    newItemKategori === kat
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-amber-100/60'
                  }`}
                >
                  {kat}
                </button>
              ))}
            </div>

            {/* Form Input Item with WHERE Search Dropdown */}
            <form onSubmit={handleAddItem} className="space-y-2 bg-white/90 p-3 rounded-xl border border-amber-200">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 relative">
                {/* Search / Item Name Input */}
                <div className="sm:col-span-5 relative">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Pencarian Master {newItemKategori} (Ketik WHERE Filter)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`🔍 Ketik nama ${newItemKategori.toLowerCase()} / kode...`}
                      value={searchKeyword || newItemNama}
                      onChange={(e) => {
                        setSearchKeyword(e.target.value);
                        setNewItemNama(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      onFocus={() => setShowSearchDropdown(true)}
                      className="w-full pl-8 pr-8 py-1.5 bg-white rounded-lg border border-slate-300 text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {(searchKeyword || newItemNama) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchKeyword('');
                          setNewItemNama('');
                          setSelectedMasterId('');
                          setShowSearchDropdown(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results (WHERE query) */}
                  {showSearchDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSearchDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-52 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                        {filteredMasterItems.length > 0 ? (
                          filteredMasterItems.map((m: any) => {
                            const isTindakan = newItemKategori === 'Jasa & Tindakan';
                            const title = isTindakan ? m.namaTindakan : m.namaBarang;
                            const price = isTindakan ? m.tarif : m.hargaJual;
                            const code = isTindakan ? m.kodeTindakan : m.kodeBarang;
                            const stock = isTindakan ? null : (m.stokCurrent ?? m.stok ?? 0);
                            const category = m.kategori;

                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleSelectMasterItem(m)}
                                className="w-full text-left px-3 py-2 hover:bg-amber-50/80 transition-colors flex items-center justify-between"
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-bold text-slate-800 text-xs truncate">{title}</span>
                                    {code && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono">
                                        {code}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                                    <span>{category || newItemKategori}</span>
                                    {!isTindakan && stock !== null && (
                                      <>
                                        <span>•</span>
                                        <span className={stock > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                          Stok: {stock} {m.satuan}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                  <span className="font-bold text-amber-900 text-xs">
                                    Rp {(price || 0).toLocaleString('id-ID')}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-slate-400 text-[11px]">
                            <p className="font-semibold">Data tidak ditemukan di master {newItemKategori}.</p>
                            <p className="text-[10px] mt-0.5">Anda tetap dapat mengetik nama manual & mengisi harga di samping.</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Spesifikasi / Dosis Input */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Dosis / Aturan / Keterangan
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2x1 tab sesudah makan"
                    value={newItemSpesifikasi}
                    onChange={(e) => setNewItemSpesifikasi(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Qty & Satuan */}
                <div className="sm:col-span-2 flex space-x-1.5">
                  <div className="w-1/2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={newItemJumlah}
                      onChange={(e) => setNewItemJumlah(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-2 py-1.5 bg-white rounded-lg border border-slate-300 text-slate-800 text-center font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Satuan</label>
                    <input
                      type="text"
                      value={newItemSatuan}
                      onChange={(e) => setNewItemSatuan(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Harga & Submit Button */}
                <div className="sm:col-span-2 flex items-end space-x-1.5">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tarif / Harga (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={newItemHarga}
                      onChange={(e) => setNewItemHarga(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2 py-1.5 bg-white rounded-lg border border-slate-300 text-slate-900 font-bold text-right text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs cursor-pointer h-[32px] flex items-center justify-center shrink-0"
                    title="Tambahkan ke Rincian Nota"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Master Link indicator & Stock reduction toggle */}
              <div className="flex flex-wrap items-center justify-between text-[11px] pt-1">
                {selectedMasterId ? (
                  <div className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Terhubung Master: <strong>{newItemNama}</strong></span>
                    <button
                      type="button"
                      onClick={() => setSelectedMasterId('')}
                      className="text-rose-600 hover:underline font-bold ml-1"
                    >
                      (Lepas)
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-500 italic text-[10px]">
                    Item manual (tidak terikat master katalog).
                  </span>
                )}

                {newItemKategori !== 'Jasa & Tindakan' && (
                  <label className="flex items-center space-x-1.5 text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newItemDeductStock}
                      onChange={(e) => setNewItemDeductStock(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-[11px]">Otomatis kurangi stok gudang saat disimpan</span>
                  </label>
                )}
              </div>
            </form>
          </div>
        )}

        {/* PRINTABLE NOTA CONTAINER */}
        <div className="p-6 sm:p-8 overflow-y-auto print:overflow-visible print:p-0 print:m-0 flex-1 bg-white font-sans text-slate-800 text-xs">
          <div
            id="outpatient-a4-printable"
            className={`mx-auto bg-white print:w-full ${
              paperSize === 'A4' ? 'min-h-[297mm] max-w-[210mm]' : 'min-h-[330mm] max-w-[215mm]'
            } flex flex-col justify-between`}
          >
            {/* 1. KOP KLINIK FORMAL */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  {normKlinik.logoUrl ? (
                    <img
                      src={normKlinik.logoUrl}
                      alt={normKlinik.namaKlinik}
                      className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-xs">
                      <Stethoscope className="w-8 h-8 text-emerald-400" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                      {normKlinik.namaKlinik}
                    </h1>
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                      Layanan Kesehatan Hewan, Rawat Jalan & Bedah Terpadu
                    </p>
                    <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                      {normKlinik.alamat}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Telp/WA: <span className="font-semibold text-slate-700">{normKlinik.noTelp || normKlinik.noWhatsApp}</span> | Izin: <span className="font-semibold text-slate-700">{normKlinik.npwp || '503/SIP-KH/2026'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right border-l-2 border-slate-200 pl-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Kwitansi Pembayaran
                  </span>
                  <p className="font-black text-sm sm:text-base text-slate-900 font-mono">
                    {transaksi?.noNota || `INV-${rekamMedis.noRM}`}
                  </p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-[10px] uppercase tracking-wider">
                    {transaksi?.status === 'Lunas' || rekamMedis.statusPembayaran === 'Lunas' ? 'LUNAS' : 'TAGIHAN RAWAT JALAN'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. JUDUL DOKUMEN & METADATA GRID */}
            <div className="mb-4">
              <div className="text-center py-1.5 mb-3 bg-slate-900 text-white rounded-lg">
                <h2 className="font-black text-xs sm:text-sm tracking-wide uppercase">
                  RINCIAN BIAYA PEMERIKSAAN & PENGOBATAN RAWAT JALAN (OUTPATIENT)
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] leading-relaxed">
                {/* Kolom Kiri: Info Pasien & Owner */}
                <div className="space-y-1 border-r border-slate-200 pr-3">
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium">No. Rekam Medis:</span>
                    <span className="font-bold text-slate-900 font-mono">{rekamMedis.noRM}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium">Nama Pasien:</span>
                    <span className="font-bold text-slate-900">{pasien?.namaHewan || 'Pasien Hewan'} ({pasien?.jenisHewan || 'Hewan'} - {pasien?.ras || 'Campuran'})</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium">Nama Pemilik:</span>
                    <span className="font-bold text-slate-800">{pasien?.namaOwner || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium">No. WhatsApp:</span>
                    <span className="font-semibold text-slate-700">{pasien?.noTelp || '-'}</span>
                  </div>
                </div>

                {/* Kolom Kanan: Info Pemeriksaan & Dokter */}
                <div className="space-y-1 pl-1">
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Tanggal Periksa:</span>
                    <span className="font-bold text-slate-900">{rekamMedis.tanggal}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Dokter DPJP:</span>
                    <span className="font-bold text-slate-900">{dokter?.nama || 'Dokter Hewan Pemeriksa'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Diagnosa Utama:</span>
                    <span className="font-bold text-emerald-800">{rekamMedis.assessment?.diagnosaUtama || 'Pemeriksaan Rawat Jalan'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Tanda Vital:</span>
                    <span className="font-semibold text-slate-700">
                      BB: {rekamMedis.objective?.beratBadan || '-'} kg | Suhu: {rekamMedis.objective?.suhu || '-'} °C | CRT: {rekamMedis.objective?.crt || '<2 dtk'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. TABEL ITEM RINCIAN BIAYA (Itemized Table) */}
            <div className="mb-4">
              <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-2 border border-slate-400 text-center w-8">No</th>
                    <th className="p-2 border border-slate-400 w-32">Kategori</th>
                    <th className="p-2 border border-slate-400">Deskripsi Layanan / Obat / BMHP</th>
                    <th className="p-2 border border-slate-400 text-center w-14">Qty</th>
                    <th className="p-2 border border-slate-400 text-center w-16">Satuan</th>
                    <th className="p-2 border border-slate-400 text-right w-24">Harga (Rp)</th>
                    <th className="p-2 border border-slate-400 text-right w-28">Subtotal (Rp)</th>
                    {isEditMode && <th className="p-2 border border-slate-400 text-center w-10 print:hidden">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {billItems.length === 0 ? (
                    <tr>
                      <td colSpan={isEditMode ? 8 : 7} className="p-4 text-center text-slate-400 italic">
                        Tidak ada rincian tagihan tercatat.
                      </td>
                    </tr>
                  ) : (
                    billItems.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-2 border border-slate-200 text-center font-semibold text-slate-600">{idx + 1}</td>
                        <td className="p-2 border border-slate-200 font-semibold text-slate-700">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.kategori === 'Jasa & Tindakan'
                                ? 'bg-indigo-100 text-indigo-800'
                                : item.kategori === 'Obat-Obatan'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.kategori === 'Obat Racikan'
                                ? 'bg-purple-100 text-purple-800'
                                : item.kategori === 'Alkes & BMHP'
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.kategori}
                          </span>
                        </td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-900">
                          <div>{item.namaItem}</div>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={item.spesifikasi || ''}
                              onChange={(e) => handleUpdateItemField(item.id, 'spesifikasi', e.target.value)}
                              placeholder="Keterangan / dosis..."
                              className="w-full text-[10px] text-slate-600 font-normal mt-0.5 px-1.5 py-0.5 border border-slate-200 rounded focus:outline-none"
                            />
                          ) : (
                            item.spesifikasi && (
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                {item.spesifikasi}
                              </div>
                            )
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-bold text-slate-800">
                          {isEditMode ? (
                            <input
                              type="number"
                              min="1"
                              value={item.jumlah}
                              onChange={(e) => handleUpdateItemField(item.id, 'jumlah', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-12 text-center font-bold border border-slate-300 rounded px-1 py-0.5 text-xs"
                            />
                          ) : (
                            item.jumlah
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 text-center text-slate-600">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={item.satuan}
                              onChange={(e) => handleUpdateItemField(item.id, 'satuan', e.target.value)}
                              className="w-14 text-center border border-slate-300 rounded px-1 py-0.5 text-xs"
                            />
                          ) : (
                            item.satuan
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 text-right text-slate-700 font-mono font-medium">
                          {isEditMode ? (
                            <input
                              type="number"
                              min="0"
                              value={item.hargaSatuan}
                              onChange={(e) => handleUpdateItemField(item.id, 'hargaSatuan', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-20 text-right font-mono font-medium border border-slate-300 rounded px-1 py-0.5 text-xs"
                            />
                          ) : (
                            (item.hargaSatuan || 0).toLocaleString('id-ID')
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 text-right font-bold text-slate-900 font-mono">
                          {(item.subtotal || 0).toLocaleString('id-ID')}
                        </td>
                        {isEditMode && (
                          <td className="p-1 border border-slate-200 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                              title="Hapus baris ini (stok akan dikembalikan jika dicatat)"
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

            {/* 4. RINGKASAN SUB-KATEGORI & GRAND TOTAL BOX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Kolom Kiri: Catatan & Anjuran Dokter */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] space-y-1.5">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Anjuran Perawatan & Kontrol:</span>
                </h4>
                {rekamMedis.plan?.pakanAnjuran && (
                  <p><span className="font-semibold text-slate-700">Anjuran Pakan / Diet:</span> {rekamMedis.plan.pakanAnjuran}</p>
                )}
                {rekamMedis.plan?.catatanTambahan && (
                  <p><span className="font-semibold text-slate-700">Catatan Perawatan:</span> {rekamMedis.plan.catatanTambahan}</p>
                )}
                {rekamMedis.plan?.tanggalKontrolUlang ? (
                  <div className="bg-amber-100 text-amber-900 p-1.5 rounded-lg font-bold flex items-center space-x-1 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Jadwal Kontrol Ulang: {rekamMedis.plan.tanggalKontrolUlang}</span>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Kontrol kembali bila gejala berlanjut dalam 3-5 hari.</p>
                )}
              </div>

              {/* Kolom Kanan: Rincian Angka Keuangan */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1 font-medium">
                {subtotalTindakan > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Jasa & Tindakan:</span>
                    <span className="font-mono">Rp {subtotalTindakan.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {subtotalObat > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Farmasi / Obat:</span>
                    <span className="font-mono">Rp {subtotalObat.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {subtotalAlkes > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Alkes & BMHP:</span>
                    <span className="font-mono">Rp {subtotalAlkes.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {subtotalBarang > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Pakan & Nutrisi:</span>
                    <span className="font-mono">Rp {subtotalBarang.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="border-t border-slate-300 pt-1 flex justify-between font-bold text-slate-800">
                  <span>Subtotal:</span>
                  <span className="font-mono">Rp {grandSubtotal.toLocaleString('id-ID')}</span>
                </div>

                {customDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Diskon / Potongan:</span>
                    <span className="font-mono">- Rp {customDiscount.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">GRAND TOTAL:</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    Rp {finalGrandTotal.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 pt-0.5 flex justify-between">
                  <span>Metode: <strong className="text-slate-700">{transaksi?.metodePembayaran || 'Tunai / QRIS'}</strong></span>
                  <span>Status: <strong className="text-emerald-700">{transaksi?.status || rekamMedis.statusPembayaran || 'Lunas'}</strong></span>
                </div>
              </div>
            </div>

            {/* 5. TANDA TANGAN & PENGESAHAN (Signatures) */}
            <div className="pt-2 border-t border-slate-300 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-700">
              <div>
                <p className="text-slate-500">Pemilik Pasien,</p>
                <div className="h-14 flex items-end justify-center">
                  <span className="font-bold text-slate-900 border-b border-slate-400 pb-0.5 px-4">
                    {pasien?.namaOwner || 'Owner / Klien'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-slate-500">Kasir / Bagian Administrasi,</p>
                <div className="h-14 flex items-end justify-center">
                  <span className="font-bold text-slate-900 border-b border-slate-400 pb-0.5 px-4">
                    {transaksi?.kasirId ? 'Petugas Kasir' : 'Kasir Poliklinik'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-slate-500">Tanggal: {rekamMedis.tanggal}</p>
                <p className="text-slate-500">Dokter Hewan Pemeriksa,</p>
                <div className="h-14 flex items-end justify-center">
                  <span className="font-bold text-slate-900 border-b border-slate-400 pb-0.5 px-2">
                    {dokter?.nama || normKlinik.namaPenanggungJawab || 'drh. Penanggung Jawab'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">SIP: {dokter?.sip || '503/SIP-KH/2026'}</p>
              </div>
            </div>

            {/* 6. FOOTER WATERMARK */}
            <div className="mt-3 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400">
              Dokumen ini diterbitkan secara resmi oleh SIM-Klinik Hewan {normKlinik.namaKlinik}. Terima kasih atas kunjungan Anda.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
