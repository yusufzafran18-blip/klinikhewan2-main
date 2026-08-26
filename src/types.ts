export type UserRole = 'super_admin' | 'admin' | 'staf' | 'dokter';
export type Role = UserRole;

export interface RolePermissionActions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export interface ModulePermissionItem {
  id: string;
  namaModule: string;
  kategori: 'Pelayanan Medis' | 'Kasir & Inventaris' | 'Manajemen & Laporan' | 'Sistem & Keamanan';
  deskripsi: string;
  allowedRoles: UserRole[];
  roleActions?: Partial<Record<UserRole, RolePermissionActions>>;
}

export interface RBACConfig {
  modules: ModulePermissionItem[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface User {
  id: string;
  username: string;
  nama: string;
  email: string;
  role: UserRole;
  noHp?: string;
  aktif: boolean;
  statusAktif?: boolean;
  avatarUrl?: string;
  password?: string;
}

export interface Dokter {
  id: string;
  sip: string;
  nama: string;
  spesialisasi: string;
  noHp: string;
  email: string;
  jadwal: string;
  aktif: boolean;
  statusAktif?: boolean;
  fotoUrl?: string;
}

export interface Spesies {
  id: string;
  kodeSpesies?: string;
  namaSpesies: string;
  keterangan?: string;
}

export type JenisHewan = string;
export type JenisKelaminHewan = 'Jantan' | 'Betina' | 'Jantan Kastrasi' | 'Betina Steril';

export interface Pasien {
  id: string;
  kodePasien: string; // e.g. PAS-2026-001
  namaHewan: string;
  jenisHewan: JenisHewan;
  ras: string;
  jenisKelamin: JenisKelaminHewan;
  tanggalLahir: string;
  umurFormat?: string; // e.g. 2 Tahun 3 Bulan
  warna: string;
  noMicrochip?: string;
  
  // Data Pemilik (Owner)
  namaOwner: string;
  noHpOwner: string;
  alamatOwner: string;
  emailOwner?: string;
  
  fotoUrl?: string;
  catatanKhusus?: string; // e.g. Alergi obat penicillin
  createdAt: string;
}

export type KategoriBarang = 'Obat' | 'Alkes' | 'Pakan' | 'Aksesoris' | 'Lainnya';

export interface Barang {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  kategori: KategoriBarang;
  satuan: 'Tablet' | 'Botol' | 'Ampul' | 'Sachet' | 'Kg' | 'Pcs' | 'Box';
  hargaBeli: number;
  hargaJual: number;
  stokCurrent: number;
  stokMinimum: number;
  expiredDate?: string;
  tanggalKadaluarsa?: string;
  lokasiRak?: string;
  keterangan?: string;
}

export interface Tindakan {
  id: string;
  kodeTindakan: string;
  namaTindakan: string;
  kategori: 'Pemeriksaan' | 'Vaksinasi' | 'Bedah/Operasi' | 'Grooming' | 'Rawat Inap' | 'Lab/Radiologi' | 'Tindakan Medis' | 'Laboratorium';
  tarif: number;
  komisiDokter: number; // nominal or %
  jasaDokter?: number;
  keterangan?: string;
}

export interface Pakan {
  id: string;
  kodePakan: string;
  namaPakan: string;
  merk: string;
  kategoriUsia: 'Kitten/Puppy' | 'Adult' | 'Senior' | 'Veterinary Diet';
  dosisPerKgBb: string; // e.g. 30g / kg BB / hari
  hargaJual: number;
  stok: number;
  satuan: string;
}

export type PakanHewan = Pakan;

export type JenisLayananPendaftaran = 'Rawat Jalan' | 'Rawat Inap';

export interface Pendaftaran {
  id: string;
  noAntrian: string; // RJ-001 / RI-001 / A-001
  pasienId: string;
  dokterId: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string;
  keluhanUtama: string;
  layananDipilih?: string;
  jenisLayanan: JenisLayananPendaftaran; // 'Rawat Jalan' atau 'Rawat Inap'
  rawatInapDetail?: {
    noKandang?: string;
    tarifPerHari?: number;
    diagnosaAwal?: string;
  };
  rawatInapId?: string;
  status: 'Antri' | 'Diperiksa' | 'Selesai' | 'Batal';
  petugasId: string;
}

export interface ObatRacikanItem {
  barangId: string;
  namaObat: string;
  dosisDetail: string; // e.g., 1/2 tablet
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
}

export interface ObatRacikan {
  id: string;
  namaRacikan: string; // e.g., Pulveres Batuk Kucing
  jumlahBungkus: number;
  aturanPakai: string; // e.g., 3x1 bungkus sesudah makan
  biayaJasaRacik: number;
  items: ObatRacikanItem[];
  totalHarga: number;
}

export interface ResepItem {
  barangId: string;
  namaBarang: string;
  jumlah: number;
  dosis: string; // e.g. 2x1 tablet
  aturanPakai: string; // e.g. Sesudah makan
  hargaSatuan: number;
  subtotal: number;
}

export interface TindakanItem {
  tindakanId: string;
  namaTindakan: string;
  tarif: number;
  keterangan?: string;
}

export interface RekamMedis {
  id: string;
  noRM: string; // RM-2026-0001
  pendaftaranId?: string;
  pasienId: string;
  dokterId: string;
  tanggal: string;
  
  // SOAP
  subjective: {
    keluhan: string;
    anamnesa: string;
    makanMinum: 'Normal' | 'Menurun' | 'Muntah' | 'Diare' | 'Tidak Makan';
    durasiSakit: string;
  };
  
  objective: {
    beratBadan: number; // kg
    suhu: number; // °C
    frekuensiNapas?: number; // x/menit
    detakJantung?: number; // bpm
    crt: '< 2 Detik' | '> 2 Detik';
    dehidrasi: 'Normal' | 'Mulai Dehidrasi (5%)' | 'Sedang (8%)' | 'Berat (>10%)';
    pemeriksaanFisik: string;
  };
  
  assessment: {
    diagnosaUtama: string;
    diagnosaBanding?: string;
  };
  
  plan: {
    tindakanList: TindakanItem[];
    resepList: ResepItem[];
    racikanList: ObatRacikan[];
    penggunaanAlkesList?: AlkesUsageItem[];
    pemakaianBarangList?: ResepItem[];
    pakanAnjuran?: string;
    catatanTambahan?: string;
    statusLanjutan: 'Rawat Jalan' | 'Rawat Inap' | 'Rujukan' | 'Meninggal';
    tanggalKontrolUlang?: string;
  };
  
  lampiranDokumen?: {
    nama: string;
    url: string;
    tipe: 'Foto' | 'X-Ray' | 'Hasil Lab' | 'Dokumen';
  }[];
  
  totalBiaya: number;
  statusPembayaran: 'Belum Lunas' | 'Lunas' | 'Dibatalkan';
  alasanPembatalan?: string;
  dibatalkanOleh?: string;
}

export interface MonitoringLog {
  id: string;
  tanggalWaktu: string;
  shift: 'Pagi' | 'Siang' | 'Malam';
  suhu: number;
  nafsuMakan: 'Lahap' | 'Sedikit' | 'Suap' | 'Muntah' | 'NGT';
  babBak: 'Normal' | 'Diare' | 'Feses Berdarah' | 'Tidak BAB' | 'Anuria/Susah BAK';
  kondisiUmum: string;
  obatDiinjeksi: string;
  catatanPetugas: string;
  petugasName: string;
}

export interface AlkesUsageItem {
  id: string;
  barangId?: string;
  namaAlkes: string;
  jumlah: number;
  satuan?: string;
  hargaSatuan?: number;
  subtotal?: number;
}

export interface TindakanMedisItem {
  id: string;
  namaTindakan: string;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
}

export interface RawatInap {
  id: string;
  pendaftaranId?: string;
  pasienId: string;
  noKandang: string; // e.g. Kandang Kucing 02
  tanggalMasuk: string;
  tanggalKeluarTarget?: string;
  tanggalKeluarAktif?: string;
  dokterPenanggungJawabId: string;
  diagnosaInap: string;
  tarifPerHari: number;
  status: 'Aktif' | 'Selesai / Pulang' | 'Rujukan' | 'Meninggal' | 'Dibatalkan';
  alasanPembatalan?: string;
  dibatalkanOleh?: string;
  monitoringLogs: MonitoringLog[];
  // Ringkasan (backwards compatible)
  pemberianObat?: string; // ringkasan pemberian obat / catatan obat yang diberikan selama inap
  penggunaanAlkes?: string; // catatan alkes (ringkasan)
  pelaksanaanPerawatan?: string; // uraian pelaksanaan perawatan oleh petugas

  // Terstruktur: daftar objek untuk integrasi dengan nota/penjualan & pengurangan stok
  pemberianObatList?: ResepItem[];
  penggunaanAlkesList?: AlkesUsageItem[];
  pemakaianBarangList?: ResepItem[]; // pemakaian barang/pakan/bmhp lainnya
  tindakanMedisList?: TindakanMedisItem[];

  biayaTambahan?: number; // biaya tambahan yang harus dikenakan selain tarif per hari
  totalBiaya?: number; // total akumulasi biaya rawat inap
  statusPembayaran?: 'Belum Lunas' | 'Lunas' | 'Dibatalkan';
  catatanKhusus?: string;
  catatan?: string;
}

export interface JanjiTemu {
  id: string;
  pasienId: string;
  dokterId: string;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:mm
  layanan: string;
  catatan: string;
  status: 'Menunggu Konfirmasi' | 'Disetujui' | 'Selesai' | 'Batal';
  noHpPengingat: string;
}

export interface RiwayatVaksinasi {
  id: string;
  pasienId: string;
  namaVaksin: string; // e.g., Rabies, Felocell 4, DHPP
  tanggalVaksin: string;
  tanggalVaksinUlang: string;
  dokterId: string;
  batchNo: string;
  keterangan?: string;
}

export interface DetailTransaksiItem {
  id: string;
  barangId?: string;
  jenis: 'Tindakan' | 'Obat' | 'Obat Racikan' | 'Barang/Pakan' | 'Rawat Inap' | 'Produk Retail' | 'Alkes' | 'Barang';
  namaItem: string;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
}

export interface Transaksi {
  id: string;
  noNota: string; // INV-20260730-001
  tanggal: string;
  pendaftaranId?: string;
  rekamMedisId?: string;
  rawatInapId?: string;
  pasienId?: string;
  namaPelanggan: string;
  typeTransaksi: 'Rekam Medis' | 'Penjualan Direct (PetShop)' | 'Rawat Inap';
  
  items: DetailTransaksiItem[];
  subtotal: number;
  diskon: number;
  pajak: number;
  grandTotal: number;
  
  metodePembayaran: 'Tunai' | 'Transfer QRIS' | 'Debit/Kredit' | 'E-Wallet';
  jumlahBayar: number;
  kembalian: number;
  
  status: 'Lunas' | 'Belum Lunas' | 'Dibatalkan';
  kasirId: string;
  alasanBatal?: string;
  dibatalkanOleh?: string;
}

export interface Supplier {
  id: string;
  kodeSupplier?: string;
  namaSupplier: string;
  kontak: string;
  noHp: string;
  alamat: string;
}

export interface PembelianBarang {
  id: string;
  nomorPO?: string;
  noFaktur: string;
  tanggal: string;
  namaSupplier: string;
  items: {
    barangId: string;
    namaBarang: string;
    jumlah: number;
    hargaBeli: number;
    subtotal: number;
    expiredDate?: string;
  }[];
  grandTotal: number;
  status: 'Selesai' | 'Draft' | 'Dibatalkan';
  catatan?: string;
  alasanPembatalan?: string;
  dibatalkanOleh?: string;
}

export type PembelianSupplier = PembelianBarang;

export interface FeedbackOwner {
  id: string;
  pasienId: string;
  namaOwner: string;
  namaPelanggan?: string;
  rating: number; // 1 - 5
  komentar: string;
  saranPetugas?: string;
  tanggal: string;
  balasanKlinik?: string;
}

export type FeedbackPelanggan = FeedbackOwner;

export interface DataKlinik {
  namaKlinik: string;
  alamat: string;
  noTelp: string;
  noWhatsApp: string;
  email: string;
  website: string;
  logoUrl: string;
  headerNota: string;
  footerNota: string;
  npwp?: string;
  namaPenanggungJawab: string;
}

export interface AppSettings {
  printerThermalWidth: '58mm' | '80mm';
  autoPrintReceipt: boolean;
  alertStokMinimumDefault: number;
  pPNPersen: number;
  waApiKey?: string;
  autoSendWaReminder: boolean;
  themeMode: 'light' | 'dark';
}

export interface WhatsAppConfig {
  provider: 'fonnte' | 'woowa' | 'wablas' | 'whacenter' | 'custom_api';
  apiKey: string;
  senderPhone: string;
  statusDevice: 'terhubung' | 'terputus' | 'menghubungkan';
  active: boolean;
  autoReminders: {
    janjiTemu: boolean;
    kontrolUlang: boolean;
    vaksinasi: boolean;
    notaPembayaran: boolean;
    pengingatPakan: boolean;
  };
}

export interface WhatsAppTemplate {
  id: string;
  kategori: 'janji_temu' | 'kontrol_ulang' | 'vaksinasi' | 'nota_pembayaran' | 'pengingat_pakan' | 'promosi';
  judul: string;
  pesan: string;
  variablePlaceholder: string[];
}

export interface WhatsAppLog {
  id: string;
  tanggal: string;
  noHp: string;
  namaPenerima: string;
  pesan: string;
  status: 'terkirim' | 'gagal' | 'pending';
  kategori: string;
  errorMessage?: string;
}

export type JenisMutasiStok = 'Masuk' | 'Keluar' | 'Penyesuaian';

export type TipeReferensiMutasi = 
  | 'Rawat Jalan' 
  | 'Rawat Inap' 
  | 'Penjualan Direct (PetShop)' 
  | 'Pembelian' 
  | 'Penyesuaian Manual' 
  | 'Inisialisasi'
  | 'Pembatalan / Revert';

export interface MutasiStok {
  id: string;
  barangId: string;
  kodeBarang?: string;
  namaBarang?: string;
  kategori?: string;
  satuan?: string;
  tanggal: string; // YYYY-MM-DD
  waktu?: string; // HH:mm
  jenis: JenisMutasiStok;
  jumlah: number;
  saldoSebelum?: number;
  saldoSetelah: number;
  keterangan: string;
  referensi?: string; // No Nota, No RM, No PO, dll.
  tipeReferensi?: TipeReferensiMutasi;
  pasienNama?: string;
  ownerNama?: string;
  petugas?: string;
}

export type KartuStokItem = MutasiStok;
export type StockMutation = MutasiStok;

