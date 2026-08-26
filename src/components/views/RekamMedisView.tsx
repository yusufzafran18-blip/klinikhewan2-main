import React, { useState, useEffect } from 'react';
import {
  RekamMedis, Pasien, Dokter, Barang, Tindakan, Pendaftaran,
  ObatRacikan, ResepItem, TindakanItem, DataKlinik, AlkesUsageItem, Transaksi
} from '../../types';
import {
  Stethoscope, Plus, Trash2, Printer, Search, FileText,
  Upload, CheckCircle, ArrowLeft, Pill, HeartPulse, Camera, Syringe, Package, X, DollarSign, Edit3
} from 'lucide-react';
import { printRekamMedisPDF } from '../../services/pdf';
import { OutpatientA4ReceiptModal } from '../common/OutpatientA4ReceiptModal';

interface RekamMedisViewProps {
  rekamMedisList: RekamMedis[];
  pasienList: Pasien[];
  dokterList: Dokter[];
  barangList: Barang[];
  tindakanList: Tindakan[];
  pendaftaranList: Pendaftaran[];
  klinik: DataKlinik;
  transaksiList?: Transaksi[];
  activePendaftaran?: Pendaftaran | null;
  onSaveRekamMedis: (rm: RekamMedis) => void | Promise<void>;
  onClearActivePendaftaran: () => void;
  onUseInventory?: (items: { barangId?: string; nama?: string; jumlah: number }[], options?: any) => Promise<boolean | void> | boolean | void;
  onRevertInventory?: (items: { barangId?: string; nama?: string; jumlah: number }[], options?: any) => Promise<boolean | void> | boolean | void;
  onSaveTransaksi?: (trx: Transaksi) => void | Promise<void>;
}

export const RekamMedisView: React.FC<RekamMedisViewProps> = ({
  rekamMedisList = [],
  pasienList = [],
  dokterList = [],
  barangList = [],
  tindakanList = [],
  pendaftaranList = [],
  klinik,
  transaksiList = [],
  activePendaftaran,
  onSaveRekamMedis,
  onClearActivePendaftaran,
  onUseInventory,
  onRevertInventory,
  onSaveTransaksi,
}) => {
  const [showFormModal, setShowFormModal] = useState(!!activePendaftaran);
  const [editingRM, setEditingRM] = useState<RekamMedis | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [printingA4RM, setPrintingA4RM] = useState<RekamMedis | null>(null);

  // Form SOAP State
  const [selectedPasienId, setSelectedPasienId] = useState(activePendaftaran?.pasienId || pasienList[0]?.id || '');
  const [selectedDokterId, setSelectedDokterId] = useState(activePendaftaran?.dokterId || dokterList[0]?.id || '');

  // Subjective
  const [keluhan, setKeluhan] = useState(activePendaftaran?.keluhanUtama || '');
  const [anamnesa, setAnamnesa] = useState('');
  const [makanMinum, setMakanMinum] = useState<'Normal' | 'Menurun' | 'Muntah' | 'Diare' | 'Tidak Makan'>('Normal');
  const [durasiSakit, setDurasiSakit] = useState('1 Hari');

  // Objective
  const [beratBadan, setBeratBadan] = useState<number>(3.5);
  const [suhu, setSuhu] = useState<number>(38.5);
  const [frekuensiNapas, setFrekuensiNapas] = useState<number>(24);
  const [detakJantung, setDetakJantung] = useState<number>(120);
  const [crt, setCrt] = useState<'< 2 Detik' | '> 2 Detik'>('< 2 Detik');
  const [dehidrasi, setDehidrasi] = useState<'Normal' | 'Mulai Dehidrasi (5%)' | 'Sedang (8%)' | 'Berat (>10%)'>('Normal');
  const [pemeriksaanFisik, setPemeriksaanFisik] = useState('Kondisi umum compos mentis, mukosa merah muda, auskultasi paru bersih.');

  // Assessment
  const [diagnosaUtama, setDiagnosaUtama] = useState('');
  const [diagnosaBanding, setDiagnosaBanding] = useState('');

  // Plan
  const [selectedTindakanItems, setSelectedTindakanItems] = useState<TindakanItem[]>([]);
  const [selectedResepItems, setSelectedResepItems] = useState<ResepItem[]>([]);
  const [selectedAlkesItems, setSelectedAlkesItems] = useState<AlkesUsageItem[]>([]);
  const [selectedBarangItems, setSelectedBarangItems] = useState<ResepItem[]>([]);
  
  // Custom Tindakan State
  const [showCustomTindakanInput, setShowCustomTindakanInput] = useState(false);
  const [customTindakanNama, setCustomTindakanNama] = useState('');
  const [customTindakanTarif, setCustomTindakanTarif] = useState(50000);

  // Racikan State
  const [racikanList, setRacikanList] = useState<ObatRacikan[]>([]);
  const [showRacikanBuilder, setShowRacikanBuilder] = useState(false);
  const [namaRacikan, setNamaRacikan] = useState('Puyer Anti Batuk');
  const [jumlahBungkus, setJumlahBungkus] = useState(5);
  const [aturanPakaiRacikan, setAturanPakaiRacikan] = useState('2x1 bungkus sesudah makan');

  const [pakanAnjuran, setPakanAnjuran] = useState('');
  const [statusLanjutan, setStatusLanjutan] = useState<'Rawat Jalan' | 'Rawat Inap' | 'Rujukan' | 'Meninggal'>('Rawat Jalan');
  const [tanggalKontrolUlang, setTanggalKontrolUlang] = useState('');

  // Upload Foto
  const [lampiranList, setLampiranList] = useState<{ nama: string; url: string; tipe: 'Foto' | 'X-Ray' | 'Hasil Lab' | 'Dokumen' }[]>([]);

  // Sync state whenever activePendaftaran changes
  useEffect(() => {
    if (activePendaftaran) {
      setSelectedPasienId(activePendaftaran.pasienId || pasienList[0]?.id || '');
      setSelectedDokterId(activePendaftaran.dokterId || dokterList[0]?.id || '');
      setKeluhan(activePendaftaran.keluhanUtama || '');
      setShowFormModal(true);

      // Auto-match or populate Jasa Pelayanan / Pemeriksaan Dokter
      const chosenService = activePendaftaran.layananDipilih || '';
      const matchedTindakan = tindakanList.find(
        (t) =>
          (chosenService && t.namaTindakan.toLowerCase().includes(chosenService.toLowerCase())) ||
          (chosenService && chosenService.toLowerCase().includes(t.namaTindakan.toLowerCase()))
      ) || tindakanList.find(
        (t) => t.kategori === 'Pemeriksaan' || t.namaTindakan.toLowerCase().includes('pemeriksaan') || t.namaTindakan.toLowerCase().includes('konsultasi')
      ) || tindakanList[0];

      if (matchedTindakan) {
        setSelectedTindakanItems([
          {
            tindakanId: matchedTindakan.id,
            namaTindakan: matchedTindakan.namaTindakan,
            tarif: Number(matchedTindakan.tarif || 50000),
            keterangan: 'Jasa Pemeriksaan & Konsultasi Dokter',
          },
        ]);
      } else {
        setSelectedTindakanItems([
          {
            tindakanId: 'tdk-default',
            namaTindakan: 'Pemeriksaan & Konsultasi Dokter',
            tarif: 50000,
            keterangan: 'Pemeriksaan klinis umum dokter hewan',
          },
        ]);
      }
    }
  }, [activePendaftaran, tindakanList]);

  // Open modal with default Pemeriksaan & Konsultasi if empty
  const handleOpenNewSOAP = () => {
    setEditingRM(null);
    setSelectedPasienId(activePendaftaran?.pasienId || pasienList[0]?.id || '');
    setSelectedDokterId(activePendaftaran?.dokterId || dokterList[0]?.id || '');
    setKeluhan(activePendaftaran?.keluhanUtama || '');
    setAnamnesa('');
    setMakanMinum('Normal');
    setDurasiSakit('1 Hari');
    setBeratBadan(3.5);
    setSuhu(38.5);
    setFrekuensiNapas(24);
    setDetakJantung(120);
    setCrt('< 2 Detik');
    setDehidrasi('Normal');
    setPemeriksaanFisik('Kondisi umum compos mentis, mukosa merah muda, auskultasi paru bersih.');
    setDiagnosaUtama('');
    setDiagnosaBanding('');
    setSelectedResepItems([]);
    setRacikanList([]);
    setSelectedAlkesItems([]);
    setSelectedBarangItems([]);
    setPakanAnjuran('');
    setStatusLanjutan('Rawat Jalan');
    setTanggalKontrolUlang('');
    setLampiranList([]);

    const defaultT = tindakanList.find(
      (t) => t.kategori === 'Pemeriksaan' || t.namaTindakan.toLowerCase().includes('pemeriksaan') || t.namaTindakan.toLowerCase().includes('konsultasi')
    ) || tindakanList[0];

    if (defaultT) {
      setSelectedTindakanItems([
        {
          tindakanId: defaultT.id,
          namaTindakan: defaultT.namaTindakan,
          tarif: Number(defaultT.tarif || 50000),
          keterangan: 'Jasa Pemeriksaan & Konsultasi Dokter',
        },
      ]);
    } else {
      setSelectedTindakanItems([
        {
          tindakanId: 'tdk-default',
          namaTindakan: 'Pemeriksaan & Konsultasi Dokter',
          tarif: 50000,
          keterangan: 'Pemeriksaan klinis umum dokter hewan',
        },
      ]);
    }
    setShowFormModal(true);
  };

  // Edit existing SOAP examination
  const handleEditSOAP = (rm: RekamMedis) => {
    setEditingRM(rm);
    setSelectedPasienId(rm.pasienId || pasienList[0]?.id || '');
    setSelectedDokterId(rm.dokterId || dokterList[0]?.id || '');
    setKeluhan(rm.subjective?.keluhan || '');
    setAnamnesa(rm.subjective?.anamnesa || '');
    setMakanMinum(rm.subjective?.makanMinum || 'Normal');
    setDurasiSakit(rm.subjective?.durasiSakit || '1 Hari');
    setBeratBadan(Number(rm.objective?.beratBadan ?? 3.5));
    setSuhu(Number(rm.objective?.suhu ?? 38.5));
    setFrekuensiNapas(Number(rm.objective?.frekuensiNapas ?? 24));
    setDetakJantung(Number(rm.objective?.detakJantung ?? 120));
    setCrt(rm.objective?.crt || '< 2 Detik');
    setDehidrasi(rm.objective?.dehidrasi || 'Normal');
    setPemeriksaanFisik(rm.objective?.pemeriksaanFisik || '');
    setDiagnosaUtama(rm.assessment?.diagnosaUtama || (rm as any).diagnosa || '');
    setDiagnosaBanding(rm.assessment?.diagnosaBanding || '');

    // Set Actions / Tindakan list with guaranteed format
    if (Array.isArray(rm.plan?.tindakanList) && rm.plan.tindakanList.length > 0) {
      setSelectedTindakanItems(rm.plan.tindakanList.map((t) => ({
        ...t,
        tarif: Number(t.tarif ?? 0),
      })));
    } else {
      setSelectedTindakanItems([
        {
          tindakanId: 'tdk-1',
          namaTindakan: 'Pemeriksaan & Konsultasi Dokter',
          tarif: 50000,
          keterangan: 'Jasa Pemeriksaan & Konsultasi Dokter',
        },
      ]);
    }

    setSelectedResepItems(Array.isArray(rm.plan?.resepList) ? rm.plan.resepList : []);
    setRacikanList(Array.isArray(rm.plan?.racikanList) ? rm.plan.racikanList : []);
    setSelectedAlkesItems(Array.isArray(rm.plan?.penggunaanAlkesList) ? rm.plan.penggunaanAlkesList : []);
    setSelectedBarangItems(Array.isArray(rm.plan?.pemakaianBarangList) ? rm.plan.pemakaianBarangList : []);
    setPakanAnjuran(rm.plan?.pakanAnjuran || '');
    setStatusLanjutan(rm.plan?.statusLanjutan || 'Rawat Jalan');
    setTanggalKontrolUlang(rm.plan?.tanggalKontrolUlang || '');
    setLampiranList(rm.lampiranDokumen || []);
    setShowFormModal(true);
  };

  // Add Item Helpers
  const handleAddTindakan = (tindakanId: string) => {
    const t = tindakanList.find((item) => item.id === tindakanId);
    if (!t) return;
    if (selectedTindakanItems.some((item) => item.tindakanId === tindakanId)) return;
    setSelectedTindakanItems([
      ...selectedTindakanItems,
      { tindakanId: t.id, namaTindakan: t.namaTindakan, tarif: Number(t.tarif || 0) }
    ]);
  };

  const handleUpdateTarifTindakan = (index: number, newTarif: number) => {
    const updated = [...selectedTindakanItems];
    updated[index].tarif = Number(newTarif) || 0;
    setSelectedTindakanItems(updated);
  };

  const handleAddCustomTindakan = () => {
    if (!customTindakanNama.trim()) return;
    setSelectedTindakanItems([
      ...selectedTindakanItems,
      {
        tindakanId: 'tdk-custom-' + Date.now(),
        namaTindakan: customTindakanNama.trim(),
        tarif: Number(customTindakanTarif) || 0,
        keterangan: 'Jasa / Tindakan Medis Dokter',
      },
    ]);
    setCustomTindakanNama('');
    setCustomTindakanTarif(50000);
    setShowCustomTindakanInput(false);
  };

  const handleRemoveTindakan = (index: number) => {
    setSelectedTindakanItems(selectedTindakanItems.filter((_, i) => i !== index));
  };

  const handleAddResepObat = (barangId: string) => {
    const b = barangList.find((item) => item.id === barangId);
    if (!b) return;
    setSelectedResepItems([
      ...selectedResepItems,
      {
        barangId: b.id,
        namaBarang: b.namaBarang,
        jumlah: 1,
        dosis: '2x1 tablet',
        aturanPakai: 'Sesudah makan',
        hargaSatuan: Number(b.hargaJual || 0),
        subtotal: Number(b.hargaJual || 0),
      }
    ]);
  };

  const handleUpdateResepQty = (index: number, qty: number) => {
    const updated = [...selectedResepItems];
    updated[index].jumlah = qty;
    updated[index].subtotal = qty * updated[index].hargaSatuan;
    setSelectedResepItems(updated);
  };

  const handleRemoveResep = (index: number) => {
    setSelectedResepItems(selectedResepItems.filter((_, i) => i !== index));
  };

  // Alkes Handlers
  const handleAddAlkes = (barangId: string) => {
    const b = barangList.find((item) => item.id === barangId);
    if (!b) return;
    setSelectedAlkesItems([
      ...selectedAlkesItems,
      {
        id: 'alkes-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        barangId: b.id,
        namaAlkes: b.namaBarang,
        jumlah: 1,
        satuan: b.satuan || 'Pcs',
        hargaSatuan: Number(b.hargaJual || 0),
        subtotal: Number(b.hargaJual || 0),
      }
    ]);
  };

  const handleUpdateAlkesQty = (index: number, qty: number) => {
    const updated = [...selectedAlkesItems];
    updated[index].jumlah = qty;
    updated[index].subtotal = qty * (updated[index].hargaSatuan || 0);
    setSelectedAlkesItems(updated);
  };

  const handleRemoveAlkes = (index: number) => {
    setSelectedAlkesItems(selectedAlkesItems.filter((_, i) => i !== index));
  };

  // Barang / Pakan Handlers
  const handleAddBarang = (barangId: string) => {
    const b = barangList.find((item) => item.id === barangId);
    if (!b) return;
    setSelectedBarangItems([
      ...selectedBarangItems,
      {
        barangId: b.id,
        namaBarang: b.namaBarang,
        jumlah: 1,
        dosis: '1x sehari',
        aturanPakai: b.satuan || 'Pcs',
        hargaSatuan: Number(b.hargaJual || 0),
        subtotal: Number(b.hargaJual || 0),
      }
    ]);
  };

  const handleUpdateBarangQty = (index: number, qty: number) => {
    const updated = [...selectedBarangItems];
    updated[index].jumlah = qty;
    updated[index].subtotal = qty * (updated[index].hargaSatuan || 0);
    setSelectedBarangItems(updated);
  };

  const handleRemoveBarang = (index: number) => {
    setSelectedBarangItems(selectedBarangItems.filter((_, i) => i !== index));
  };

  const handleAddSampleRacikan = () => {
    const newRacikan: ObatRacikan = {
      id: 'rac-' + Date.now(),
      namaRacikan,
      jumlahBungkus,
      aturanPakai: aturanPakaiRacikan,
      biayaJasaRacik: 10000,
      items: [
        { barangId: 'brg-10', namaObat: 'Doxycycline 100mg Tab', dosisDetail: '1/4 tab', jumlah: 2, hargaSatuan: 5000, subtotal: 10000 }
      ],
      totalHarga: 20000,
    };
    setRacikanList([...racikanList, newRacikan]);
    setShowRacikanBuilder(false);
  };

  // Calculated Totals
  const totalTindakan = selectedTindakanItems.reduce((acc, i) => acc + (Number(i.tarif) || 0), 0);
  const totalResep = selectedResepItems.reduce((acc, i) => acc + (Number(i.subtotal) || 0), 0);
  const totalRacikan = racikanList.reduce((acc, i) => acc + (Number(i.totalHarga) || 0), 0);
  const totalAlkes = selectedAlkesItems.reduce((acc, i) => acc + (Number(i.subtotal) || ((Number(i.hargaSatuan) || 0) * (Number(i.jumlah) || 1))), 0);
  const totalBarang = selectedBarangItems.reduce((acc, i) => acc + (Number(i.subtotal) || ((Number(i.hargaSatuan) || 0) * (Number(i.jumlah) || 1))), 0);
  const calculatedGrandTotal = totalTindakan + totalResep + totalRacikan + totalAlkes + totalBarang;

  const handleSaveSOAP = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = rekamMedisList.length + 1;
    const id = editingRM ? editingRM.id : ('rm-' + Date.now());
    const noRM = editingRM?.noRM || `RM-2026-${String(count).padStart(4, '0')}`;

    const newRM: RekamMedis = {
      ...editingRM,
      id,
      noRM,
      pendaftaranId: editingRM?.pendaftaranId || activePendaftaran?.id,
      pasienId: selectedPasienId,
      dokterId: selectedDokterId,
      tanggal: editingRM?.tanggal || new Date().toISOString().split('T')[0],
      subjective: {
        keluhan,
        anamnesa,
        makanMinum,
        durasiSakit,
      },
      objective: {
        beratBadan,
        suhu,
        frekuensiNapas,
        detakJantung,
        crt,
        dehidrasi,
        pemeriksaanFisik,
      },
      assessment: {
        diagnosaUtama,
        diagnosaBanding,
      },
      plan: {
        tindakanList: selectedTindakanItems,
        resepList: selectedResepItems,
        racikanList,
        penggunaanAlkesList: selectedAlkesItems,
        pemakaianBarangList: selectedBarangItems,
        pakanAnjuran,
        statusLanjutan,
        tanggalKontrolUlang,
      },
      lampiranDokumen: lampiranList,
      totalBiaya: calculatedGrandTotal,
      statusPembayaran: editingRM?.statusPembayaran || 'Belum Lunas',
    };

    await onSaveRekamMedis(newRM);
    setShowFormModal(false);
    setEditingRM(null);
    onClearActivePendaftaran();
  };

  const filteredRM = rekamMedisList.filter((rm) => {
    const pasien = pasienList.find((p) => p.id === rm.pasienId);
    const text = `${rm.noRM} ${pasien?.namaHewan} ${pasien?.namaOwner} ${rm.assessment.diagnosaUtama}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Stethoscope className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Pemeriksaan Rekam Medis (SOAP)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Diagnosis klinis, resep obat racikan/non-racikan, tindakan medis & lampiran foto</p>
        </div>

        <button
          onClick={handleOpenNewSOAP}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Input Rekam Medis Baru</span>
        </button>
      </div>

      {/* Active Examination Prompt Banner */}
      {activePendaftaran && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between text-xs text-indigo-900 animate-bounce">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Sedang Memeriksa Antrian #{activePendaftaran.noAntrian}</p>
              <p className="text-indigo-700">Lanjutkan pengisian form SOAP medis untuk pendaftaran ini.</p>
            </div>
          </div>
          <button
            onClick={() => setShowFormModal(true)}
            className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-xs hover:bg-indigo-700"
          >
            Buka Form SOAP
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Cari No. RM, nama hewan, nama owner, atau diagnosa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Rekam Medis List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">No. RM & Tanggal</th>
                <th className="p-4">Pasien & Owner</th>
                <th className="p-4">Dokter Pemeriksa</th>
                <th className="p-4">Diagnosa Utama (SOAP)</th>
                <th className="p-4">Total Biaya</th>
                <th className="p-4">Status Lanjutan</th>
                <th className="p-4 text-right">Cetak PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRM.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada riwayat rekam medis.
                  </td>
                </tr>
              ) : (
                filteredRM.map((rm) => {
                  const pasien = pasienList.find((p) => p.id === rm.pasienId);
                  const dokter = dokterList.find((d) => d.id === rm.dokterId);

                  return (
                    <tr key={rm.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <span className="font-extrabold text-indigo-700 block">{rm.noRM}</span>
                        <span className="text-[10px] text-slate-400">{rm.tanggal}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{pasien?.namaHewan}</p>
                        <p className="text-[10px] text-slate-400">{pasien?.jenisHewan} • Owner: {pasien?.namaOwner}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{dokter?.nama}</p>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="font-bold text-slate-800 truncate">{rm.assessment.diagnosaUtama}</p>
                        <p className="text-[10px] text-slate-400 truncate">Suhu: {rm.objective.suhu}°C | BB: {rm.objective.beratBadan}kg</p>
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">
                        Rp {(rm.totalBiaya || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          rm.plan.statusLanjutan === 'Rawat Inap' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {rm.plan.statusLanjutan}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditSOAP(rm)}
                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-bold rounded-lg text-xs flex items-center space-x-1"
                            title="Edit Pemeriksaan SOAP Rekam Medis"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPrintingA4RM(rm)}
                            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold rounded-lg text-xs flex items-center space-x-1"
                            title="Cetak Nota A4/F4 Rincian Biaya Rawat Jalan"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Nota A4/F4</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (pasien && dokter) {
                                printRekamMedisPDF(rm, pasien, dokter, klinik);
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center space-x-1"
                            title="Cetak Lembar Medis SOAP"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
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

      {/* Modal Form SOAP Rekam Medis */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Fixed Modal Header */}
            <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-2xl ${editingRM ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRM ? `Edit Formulir Rekam Medis (SOAP) #${editingRM.noRM}` : 'Formulir Rekam Medis Dokter (SOAP)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingRM ? 'Perbarui data anamnesa, hasil fisik, diagnosa, jasa pelayanan & resep obat' : 'Pemeriksaan fisik, diagnosa, tindakan, resep obat & obat racikan'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowFormModal(false);
                  setEditingRM(null);
                  onClearActivePendaftaran();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup Form SOAP"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSOAP} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-5 overflow-y-auto space-y-6 flex-1">
                
                {/* Header Info Dokter & Pasien */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pasien Hewan</label>
                  <select
                    value={selectedPasienId}
                    onChange={(e) => setSelectedPasienId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  >
                    {pasienList.map((p) => (
                      <option key={p.id} value={p.id}>{p.kodePasien} - {p.namaHewan} ({p.jenisHewan}) - Owner: {p.namaOwner}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dokter Hewan Pemeriksa</label>
                  <select
                    value={selectedDokterId}
                    onChange={(e) => setSelectedDokterId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  >
                    {dokterList.map((d) => (
                      <option key={d.id} value={d.id}>{d.nama} ({d.sip})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* S: SUBJECTIVE */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center mr-2 text-[10px]">S</span>
                  Subjective (Anamnesa & Keluhan Owner)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Keluhan Utama & Anamnesa</label>
                    <input
                      type="text"
                      required
                      value={keluhan}
                      onChange={(e) => setKeluhan(e.target.value)}
                      placeholder="Muntah, lemas, nafsu makan turun..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nafsu Makan / Minum</label>
                    <select
                      value={makanMinum}
                      onChange={(e) => setMakanMinum(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Menurun">Menurun</option>
                      <option value="Muntah">Muntah</option>
                      <option value="Diare">Diare</option>
                      <option value="Tidak Makan">Tidak Makan sama sekali</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* O: OBJECTIVE */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center mr-2 text-[10px]">O</span>
                  Objective (Hasil Pemeriksaan Fisik & Tanda Vital)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Berat Badan (Kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={beratBadan}
                      onChange={(e) => setBeratBadan(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Suhu Tubuh (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={suhu}
                      onChange={(e) => setSuhu(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CRT</label>
                    <select value={crt} onChange={(e) => setCrt(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300">
                      <option value="< 2 Detik">&lt; 2 Detik (Normal)</option>
                      <option value="> 2 Detik">&gt; 2 Detik (Lambat)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dehidrasi</label>
                    <select value={dehidrasi} onChange={(e) => setDehidrasi(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300">
                      <option value="Normal">Normal</option>
                      <option value="Mulai Dehidrasi (5%)">Mulai Dehidrasi (5%)</option>
                      <option value="Sedang (8%)">Sedang (8%)</option>
                      <option value="Berat (>10%)">Berat (&gt;10%)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 text-xs mb-1">Temuan Pemeriksaan Fisik Detail</label>
                  <textarea
                    rows={2}
                    value={pemeriksaanFisik}
                    onChange={(e) => setPemeriksaanFisik(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  ></textarea>
                </div>
              </div>

              {/* A: ASSESSMENT */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center mr-2 text-[10px]">A</span>
                  Assessment (Diagnosa Dokter)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Diagnosa Utama (Primary Diagnosis)</label>
                    <input
                      type="text"
                      required
                      value={diagnosaUtama}
                      onChange={(e) => setDiagnosaUtama(e.target.value)}
                      placeholder="Contoh: Gastritis Akut / Panleukopenia"
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Diagnosa Banding (Differential)</label>
                    <input
                      type="text"
                      value={diagnosaBanding}
                      onChange={(e) => setDiagnosaBanding(e.target.value)}
                      placeholder="Contoh: Obsttruksi Benda Asing"
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* P: PLAN (Tindakan & Resep Obat + Racikan) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center mr-2 text-[10px]">P</span>
                  Plan (Tindakan, Resep Obat, & Obat Racikan)
                </h4>

                {/* Jasa Pelayanan & Tindakan Medis */}
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
                        <Stethoscope className="w-4 h-4 text-indigo-600" />
                        <span>Jasa Pelayanan & Tindakan Medis Dokter</span>
                      </span>
                      <p className="text-[11px] text-indigo-700">Biaya konsultasi, pemeriksaan klinis, atau prosedur medis dokter hewan.</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleAddTindakan(e.target.value);
                          e.target.value = '';
                        }}
                        className="text-xs p-1.5 rounded-xl border border-indigo-300 bg-white font-medium text-slate-800 shadow-2xs"
                      >
                        <option value="">+ Pilih Dari Master Tarif</option>
                        {tindakanList.map((t) => (
                          <option key={t.id} value={t.id}>{t.namaTindakan} (Rp {(Number(t.tarif) || 0).toLocaleString('id-ID')})</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowCustomTindakanInput(!showCustomTindakanInput)}
                        className="px-2.5 py-1.5 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        {showCustomTindakanInput ? 'Batal' : '+ Jasa Kustom'}
                      </button>
                    </div>
                  </div>

                  {/* Inline Custom Tindakan Creator */}
                  {showCustomTindakanInput && (
                    <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-2 animate-in fade-in">
                      <p className="text-[11px] font-bold text-indigo-900">Tambah Jasa / Tindakan Medis Khusus:</p>
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nama Jasa / Tindakan (misal: Jahit Luka Kecil, Kateterisasi...)"
                          value={customTindakanNama}
                          onChange={(e) => setCustomTindakanNama(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-500"
                        />
                        <div className="flex items-center space-x-1 shrink-0 w-full sm:w-auto">
                          <span className="text-xs text-slate-500 font-bold">Rp</span>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="Biaya"
                            value={customTindakanTarif}
                            onChange={(e) => setCustomTindakanTarif(Number(e.target.value))}
                            className="w-28 text-xs p-2 rounded-lg border border-slate-300 font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomTindakan}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Tambah
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tindakan Items List */}
                  <div className="space-y-2 pt-1">
                    {selectedTindakanItems.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                        <span>Belum ada jasa pelayanan dokter yang ditambahkan.</span>
                        <button
                          type="button"
                          onClick={() => {
                            const defaultT = tindakanList[0];
                            if (defaultT) {
                              handleAddTindakan(defaultT.id);
                            } else {
                              setSelectedTindakanItems([
                                { tindakanId: 'tdk-pemeriksaan', namaTindakan: 'Pemeriksaan & Konsultasi Dokter', tarif: 50000 }
                              ]);
                            }
                          }}
                          className="font-bold underline text-amber-900 cursor-pointer"
                        >
                          + Tambah Jasa Konsultasi (Rp 50.000)
                        </button>
                      </div>
                    ) : (
                      selectedTindakanItems.map((item, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs gap-2 text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                            <span className="font-bold text-slate-800">{item.namaTindakan}</span>
                            {item.keterangan && (
                              <span className="text-[10px] text-slate-400">({item.keterangan})</span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 self-end sm:self-auto">
                            <span className="text-slate-500 text-[11px] font-semibold">Tarif Jasa: Rp</span>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={item.tarif}
                              onChange={(e) => handleUpdateTarifTindakan(idx, Number(e.target.value))}
                              className="w-28 p-1.5 rounded-lg border border-slate-300 font-mono font-bold text-right text-indigo-700 focus:outline-hidden focus:border-indigo-500"
                              title="Edit tarif jasa ini jika ada penyesuaian"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveTindakan(idx)}
                              className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Hapus tindakan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Subtotal Jasa Banner */}
                  {selectedTindakanItems.length > 0 && (
                    <div className="flex justify-between items-center pt-1 text-xs border-t border-indigo-200/60 font-semibold text-indigo-900">
                      <span>Subtotal Jasa Pelayanan & Tindakan:</span>
                      <span className="font-mono font-extrabold text-indigo-700 text-sm">
                        Rp {totalTindakan.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pilih Resep Obat */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Resep Obat Non-Racikan</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleAddResepObat(e.target.value);
                        e.target.value = '';
                      }}
                      className="text-xs p-1.5 rounded-lg border border-slate-300"
                    >
                      <option value="">+ Tambah Obat</option>
                      {barangList.filter((b) => b.kategori === 'Obat').map((b) => (
                        <option key={b.id} value={b.id}>{b.namaBarang} (Stok: {b.stokCurrent})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-1">
                    {selectedResepItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-800">{item.namaBarang}</span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            value={item.jumlah}
                            onChange={(e) => handleUpdateResepQty(idx, parseInt(e.target.value) || 1)}
                            className="w-14 p-1 rounded border border-slate-300 text-center font-bold"
                          />
                          <input
                            type="text"
                            value={item.dosis}
                            onChange={(e) => {
                              const updated = [...selectedResepItems];
                              updated[idx].dosis = e.target.value;
                              setSelectedResepItems(updated);
                            }}
                            className="w-28 p-1 rounded border border-slate-300 text-[11px]"
                            placeholder="Aturan Pakai"
                          />
                          <span className="font-bold text-indigo-700">Rp {(item.subtotal || 0).toLocaleString('id-ID')}</span>
                          <button type="button" onClick={() => handleRemoveResep(idx)} className="text-rose-600 hover:text-rose-800">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modul Obat Racikan */}
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 flex items-center">
                      <Pill className="w-4 h-4 mr-1 text-purple-600" /> Modul Obat Racikan (Puyer / Kapsul)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSampleRacikan}
                      className="px-2.5 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                    >
                      + Tambah Racikan (Rp 20.000)
                    </button>
                  </div>

                  <div className="space-y-1">
                    {racikanList.map((rac, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-purple-200 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-purple-900">{rac.namaRacikan} ({rac.jumlahBungkus} Bungkus)</p>
                          <p className="text-[10px] text-slate-500">{rac.aturanPakai}</p>
                        </div>
                        <span className="font-extrabold text-purple-800">Rp {(rac.totalHarga || 0).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Penggunaan Alkes & BMHP */}
                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-900 flex items-center">
                      <Syringe className="w-4 h-4 mr-1 text-cyan-700" /> Penggunaan Alkes & BMHP (Disposable)
                    </span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleAddAlkes(e.target.value);
                        e.target.value = '';
                      }}
                      className="text-xs p-1.5 rounded-lg border border-cyan-300 bg-white text-slate-800"
                    >
                      <option value="">+ Tambah Alkes / BMHP</option>
                      {barangList.filter((b) => b.kategori === 'Alkes' || b.kategori === 'Lainnya').map((b) => (
                        <option key={b.id} value={b.id}>{b.namaBarang} (Stok: {b.stokCurrent} {b.satuan || 'Pcs'}) - Rp {(b.hargaJual || 0).toLocaleString('id-ID')}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-1">
                    {selectedAlkesItems.length === 0 ? (
                      <p className="text-[11px] text-cyan-700 italic">Belum ada pemakaian alkes/BMHP ditambahkan.</p>
                    ) : (
                      selectedAlkesItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-cyan-200 text-xs">
                          <span className="font-bold text-slate-800">{item.namaAlkes}</span>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="1"
                              value={item.jumlah}
                              onChange={(e) => handleUpdateAlkesQty(idx, parseInt(e.target.value) || 1)}
                              className="w-14 p-1 rounded border border-slate-300 text-center font-bold"
                            />
                            <span className="text-[11px] text-slate-500 font-medium">{item.satuan || 'Pcs'}</span>
                            <span className="font-bold text-cyan-800 font-mono">Rp {(item.subtotal || 0).toLocaleString('id-ID')}</span>
                            <button type="button" onClick={() => handleRemoveAlkes(idx)} className="text-rose-600 hover:text-rose-800 cursor-pointer">×</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pemakaian Barang / Pakan Diet / Nutrisi */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center">
                      <Package className="w-4 h-4 mr-1 text-amber-700" /> Pemakaian Pakan Diet & Barang Medis
                    </span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleAddBarang(e.target.value);
                        e.target.value = '';
                      }}
                      className="text-xs p-1.5 rounded-lg border border-amber-300 bg-white text-slate-800"
                    >
                      <option value="">+ Tambah Pakan / Barang</option>
                      {barangList.filter((b) => b.kategori === 'Pakan' || b.kategori === 'Aksesoris' || b.kategori === 'Lainnya').map((b) => (
                        <option key={b.id} value={b.id}>{b.namaBarang} (Stok: {b.stokCurrent}) - Rp {(b.hargaJual || 0).toLocaleString('id-ID')}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-1">
                    {selectedBarangItems.length === 0 ? (
                      <p className="text-[11px] text-amber-700 italic">Belum ada pemakaian pakan/barang medis ditambahkan.</p>
                    ) : (
                      selectedBarangItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-200 text-xs">
                          <span className="font-bold text-slate-800">{item.namaBarang}</span>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="1"
                              value={item.jumlah}
                              onChange={(e) => handleUpdateBarangQty(idx, parseInt(e.target.value) || 1)}
                              className="w-14 p-1 rounded border border-slate-300 text-center font-bold"
                            />
                            <input
                              type="text"
                              value={item.dosis}
                              onChange={(e) => {
                                const updated = [...selectedBarangItems];
                                updated[idx].dosis = e.target.value;
                                setSelectedBarangItems(updated);
                              }}
                              className="w-24 p-1 rounded border border-slate-300 text-[11px]"
                              placeholder="Aturan/Porsi"
                            />
                            <span className="font-bold text-amber-800 font-mono">Rp {(item.subtotal || 0).toLocaleString('id-ID')}</span>
                            <button type="button" onClick={() => handleRemoveBarang(idx)} className="text-rose-600 hover:text-rose-800 cursor-pointer">×</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Status Lanjutan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Tindakan Lanjutan</label>
                    <select
                      value={statusLanjutan}
                      onChange={(e) => setStatusLanjutan(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    >
                      <option value="Rawat Jalan">Rawat Jalan</option>
                      <option value="Rawat Inap">Rawat Inap Kandang</option>
                      <option value="Rujukan">Rujukan RS</option>
                      <option value="Meninggal">Pasien Meninggal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Anjuran Pakan / Nutrisi</label>
                    <input
                      type="text"
                      value={pakanAnjuran}
                      onChange={(e) => setPakanAnjuran(e.target.value)}
                      placeholder="Royal Canin Recovery Wet 1/2 kaleng..."
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>

                {/* Ringkasan Biaya Live Plan */}
                <div className="bg-indigo-900 text-white p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-700/60 text-xs">
                    <span className="font-bold text-indigo-200">Rincian Estimasi Biaya Rawat Jalan:</span>
                    <span className="text-[10px] text-indigo-300">Tersimpan ke Billing Kasir & Nota A4/F4</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] pt-1">
                    <div className="bg-indigo-800/60 p-2 rounded-lg">
                      <p className="text-slate-300 text-[10px]">Tindakan</p>
                      <p className="font-bold font-mono">Rp {totalTindakan.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-indigo-800/60 p-2 rounded-lg">
                      <p className="text-slate-300 text-[10px]">Resep Obat</p>
                      <p className="font-bold font-mono">Rp {totalResep.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-indigo-800/60 p-2 rounded-lg">
                      <p className="text-slate-300 text-[10px]">Obat Racikan</p>
                      <p className="font-bold font-mono">Rp {totalRacikan.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-indigo-800/60 p-2 rounded-lg">
                      <p className="text-slate-300 text-[10px]">Alkes & BMHP</p>
                      <p className="font-bold font-mono">Rp {totalAlkes.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-indigo-800/60 p-2 rounded-lg col-span-2 sm:col-span-1">
                      <p className="text-slate-300 text-[10px]">Pakan / Nutrisi</p>
                      <p className="font-bold font-mono">Rp {totalBarang.toLocaleString('id-ID')}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-indigo-200">TOTAL ESTIMASI BIAYA RAWAT JALAN:</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      Rp {calculatedGrandTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

              </div>

              </div>

              {/* Fixed Bottom Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/95 flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-600 hidden sm:flex items-center space-x-2">
                  <span>Total Estimasi Biaya:</span>
                  <span className="font-extrabold text-indigo-700 font-mono text-sm">
                    Rp {calculatedGrandTotal.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFormModal(false);
                      onClearActivePendaftaran();
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Simpan Rekam Medis (SOAP)</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Outpatient A4 Receipt Modal */}
      {printingA4RM && (
        <OutpatientA4ReceiptModal
          rekamMedis={printingA4RM}
          pasien={pasienList.find((p) => p.id === printingA4RM.pasienId)}
          dokter={dokterList.find((d) => d.id === printingA4RM.dokterId)}
          klinik={klinik}
          transaksi={transaksiList.find((t) => t.rekamMedisId === printingA4RM.id)}
          barangList={barangList}
          tindakanList={tindakanList}
          onSaveRekamMedis={onSaveRekamMedis}
          onSaveTransaksi={onSaveTransaksi}
          onUseInventory={onUseInventory}
          onRevertInventory={onRevertInventory}
          onClose={() => setPrintingA4RM(null)}
        />
      )}

    </div>
  );
};
