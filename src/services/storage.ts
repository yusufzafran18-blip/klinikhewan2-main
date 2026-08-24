/**
 * ============================================================================
 * KLINIK HEWAN - STORAGE SERVICE (MYSQL ONLY - NO LOCAL STORAGE)
 * ============================================================================
 * 
 * Sistem penyimpanan data berbasis MySQL server dengan cache memori sementara.
 * Semua data di-cache di memory dengan TTL (time-to-live) untuk performance.
 * Setiap modifikasi data langsung disimpan ke MySQL database.
 * 
 * Storage Service ini menggunakan:
 * - In-Memory Cache dengan TTL (5 menit default)
 * - MySQL API calls untuk CRUD operations
 * - Event listeners untuk real-time updates
 */

import {
  User, Dokter, Pasien, Barang, Tindakan, Pakan, Pendaftaran, RekamMedis,
  RawatInap, JanjiTemu, RiwayatVaksinasi, Transaksi, PembelianBarang,
  FeedbackOwner, DataKlinik, AppSettings, Supplier, Spesies, RBACConfig, ModulePermissionItem,
  WhatsAppConfig, WhatsAppTemplate, WhatsAppLog
} from '../types';
import {
  saveClinicDataToSql,
  saveClinicSettingsToSql,
  saveBackupToSql,
  fetchClinicSettingsFromSql,
  fetchClinicDataFromSql,
  checkSqlStatus,
  SqlSyncPayload,
} from './sqlApi';
import { normalizeClinicProfile } from '../utils/clinic';

// ============================================================================
// IN-MEMORY CACHE DENGAN TTL
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get<T>(key: string, defaultValue: T): T {
    const entry = this.cache.get(key);
    if (!entry) return defaultValue;

    const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
    if (isExpired) {
      this.cache.delete(key);
      return defaultValue;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const cacheManager = new CacheManager();
let realtimeSource: EventSource | null = null;
let realtimeRefreshInProgress = false;

// ============================================================================
// STORAGE LISTENER & NOTIFICATIONS
// ============================================================================

type StorageListener = () => void;
const storageListeners: Set<StorageListener> = new Set();

function notifyListeners() {
  storageListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Storage listener error:', e);
    }
  });
}

export function triggerSqlSync() {
  // All writes are issued directly by the individual save functions.
}

// ============================================================================
// API HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch data dari MySQL API dengan caching
 */
async function saveToAPI(endpoint: string, data: any, method: 'POST' | 'PUT' = 'POST'): Promise<void> {
  const response = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.error || result.message || `API save failed: ${response.status}`);
  }
}

async function persistCache<T>(cacheKey: string, value: T, payload: SqlSyncPayload): Promise<void> {
  await saveToAPI('/api/data/sync', payload);
  cacheManager.set(cacheKey, value);
  notifyListeners();
}

// ============================================================================
// MAIN STORAGE SERVICE - MYSQL ONLY
// ============================================================================

// ============================================================================
// MAIN STORAGE SERVICE - MYSQL ONLY
// ============================================================================

interface StorageServiceInterface {
  checkSeedVersion(): void;
  applySqlData(data: SqlSyncPayload): void;
  subscribe(listener: () => void): () => void;
  syncToSqlNow(): Promise<void>;
  initStorage(): Promise<void>;
  startRealtimeSync(): void;
  clearCache(): void;
  invalidateCache(key: string): void;
  getUsers(): User[];
  getUserList(): User[];
  saveUsers(users: User[]): Promise<void>;
  saveUserList(users: User[]): Promise<void>;
  getDokter(): Dokter[];
  getDokterList(): Dokter[];
  saveDokter(dokter: Dokter[]): Promise<void>;
  saveDokterList(dokter: Dokter[]): Promise<void>;
  getPasien(): Pasien[];
  getPasienList(): Pasien[];
  savePasien(pasien: Pasien[]): Promise<void>;
  savePasienList(pasien: Pasien[]): Promise<void>;
  getBarang(): Barang[];
  getBarangList(): Barang[];
  saveBarang(barang: Barang[]): Promise<void>;
  saveBarangList(barang: Barang[]): Promise<void>;
  getTindakan(): Tindakan[];
  getTindakanList(): Tindakan[];
  saveTindakan(tindakan: Tindakan[]): Promise<void>;
  saveTindakanList(tindakan: Tindakan[]): Promise<void>;
  getPakan(): Pakan[];
  getPakanList(): Pakan[];
  savePakan(pakan: Pakan[]): Promise<void>;
  savePakanList(pakan: Pakan[]): Promise<void>;
  getSpesies(): Spesies[];
  getSpesiesList(): Spesies[];
  saveSpesies(spesies: Spesies[]): Promise<void>;
  saveSpesiesList(spesies: Spesies[]): Promise<void>;
  getPendaftaran(): Pendaftaran[];
  getPendaftaranList(): Pendaftaran[];
  savePendaftaran(pendaftaran: Pendaftaran[]): Promise<void>;
  savePendaftaranList(pendaftaran: Pendaftaran[]): Promise<void>;
  getRekamMedis(): RekamMedis[];
  getRekamMedisList(): RekamMedis[];
  saveRekamMedis(rm: RekamMedis[]): Promise<void>;
  saveRekamMedisList(rm: RekamMedis[]): Promise<void>;
  getRawatInap(): RawatInap[];
  getRawatInapList(): RawatInap[];
  saveRawatInap(inap: RawatInap[]): Promise<void>;
  saveRawatInapList(inap: RawatInap[]): Promise<void>;
  getJanjiTemu(): JanjiTemu[];
  getJanjiTemuList(): JanjiTemu[];
  saveJanjiTemu(jt: JanjiTemu[]): Promise<void>;
  saveJanjiTemuList(jt: JanjiTemu[]): Promise<void>;
  getVaksinasi(): RiwayatVaksinasi[];
  getVaksinasiList(): RiwayatVaksinasi[];
  saveVaksinasi(vks: RiwayatVaksinasi[]): Promise<void>;
  saveVaksinasiList(vks: RiwayatVaksinasi[]): Promise<void>;
  getTransaksi(): Transaksi[];
  getTransaksiList(): Transaksi[];
  saveTransaksi(trx: Transaksi[]): Promise<void>;
  saveTransaksiList(trx: Transaksi[]): Promise<void>;
  getPembelian(): PembelianBarang[];
  getPembelianList(): PembelianBarang[];
  savePembelian(pmb: PembelianBarang[]): Promise<void>;
  savePembelianList(pmb: PembelianBarang[]): Promise<void>;
  getSupplier(): Supplier[];
  getSupplierList(): Supplier[];
  saveSupplier(s: Supplier[]): Promise<void>;
  saveSupplierList(s: Supplier[]): Promise<void>;
  getFeedback(): FeedbackOwner[];
  getFeedbackList(): FeedbackOwner[];
  saveFeedback(fb: FeedbackOwner[]): Promise<void>;
  saveFeedbackList(fb: FeedbackOwner[]): Promise<void>;
  getKlinik(): DataKlinik;
  getKlinikData(): DataKlinik;
  saveKlinik(klinik: DataKlinik): Promise<void>;
  saveKlinikData(klinik: DataKlinik): Promise<void>;
  getSettings(): AppSettings;
  getAppSettings(): AppSettings;
  saveSettings(settings: AppSettings): Promise<void>;
  saveAppSettings(settings: AppSettings): Promise<void>;
  getActiveUser(): User | null;
  setActiveUser(user: User | null): void;
  logout(): void;
  getRBACConfig(): RBACConfig;
  saveRBACConfig(config: RBACConfig): Promise<void>;
  getWhatsAppConfig(): WhatsAppConfig;
  saveWhatsAppConfig(config: WhatsAppConfig): Promise<void>;
  getWhatsAppTemplates(): WhatsAppTemplate[];
  saveWhatsAppTemplates(templates: WhatsAppTemplate[]): Promise<void>;
  getWhatsAppLogs(): WhatsAppLog[];
  saveWhatsAppLogs(logs: WhatsAppLog[]): Promise<void>;
  addWhatsAppLog(logData: Omit<WhatsAppLog, 'id'>): WhatsAppLog[];
  exportFullBackupJSON(): string;
  importFullBackupJSON(jsonString: string): boolean;
  resetDatabaseKeepUsers?(): Promise<void>;
}

export const storageService: StorageServiceInterface = {
  // ========== INITIALIZATION ==========

  checkSeedVersion() {
    // Version check removed - using server-side version management
  },

  applySqlData(data: SqlSyncPayload) {
    // Apply data from SQL to cache
    if (data.users) cacheManager.set('users', data.users);
    if (data.dokter) cacheManager.set('dokter', data.dokter);
    if (data.pasien) cacheManager.set('pasien', data.pasien);
    if (data.barang) cacheManager.set('barang', data.barang);
    if (data.tindakan) cacheManager.set('tindakan', data.tindakan);
    if (data.pakan) cacheManager.set('pakan', data.pakan);
    if (data.spesies) cacheManager.set('spesies', data.spesies);
    if (data.pendaftaran) cacheManager.set('pendaftaran', data.pendaftaran);
    if (data.rekamMedis) cacheManager.set('rekam_medis', data.rekamMedis);
    if (data.rawatInap) cacheManager.set('rawat_inap', data.rawatInap);
    if (data.janjiTemu) cacheManager.set('janji_temu', data.janjiTemu);
    if (data.vaksinasi) cacheManager.set('vaksinasi', data.vaksinasi);
    if (data.transaksi) cacheManager.set('transaksi', data.transaksi);
    if (data.pembelian) cacheManager.set('pembelian', data.pembelian);
    if (data.supplier) cacheManager.set('supplier', data.supplier);
    if (data.feedback) cacheManager.set('feedback', data.feedback);
    if (data.klinik) cacheManager.set('klinik', normalizeClinicProfile(data.klinik));
    if (data.settings) cacheManager.set('settings', data.settings);
    if (data.rbacConfig) cacheManager.set('rbac_config', data.rbacConfig);
    if (data.waConfig) cacheManager.set('wa_config', data.waConfig);
    if (data.waTemplates) cacheManager.set('wa_templates', data.waTemplates);
    if (data.waLogs) cacheManager.set('wa_logs', data.waLogs);
    notifyListeners();
  },

  subscribe(listener: () => void): () => void {
    storageListeners.add(listener);
    return () => {
      storageListeners.delete(listener);
    };
  },

  async syncToSqlNow(): Promise<void> {
    await saveClinicDataToSql({
      version: '3.0.0-mysql',
      updatedAt: new Date().toISOString(),
      users: this.getUsers(),
      dokter: this.getDokter(),
      pasien: this.getPasien(),
      barang: this.getBarang(),
      tindakan: this.getTindakan(),
      pakan: this.getPakan(),
      spesies: this.getSpesies(),
      pendaftaran: this.getPendaftaran(),
      rekamMedis: this.getRekamMedis(),
      rawatInap: this.getRawatInap(),
      janjiTemu: this.getJanjiTemu(),
      vaksinasi: this.getVaksinasi(),
      transaksi: this.getTransaksi(),
      pembelian: this.getPembelian(),
      supplier: this.getSupplier(),
      feedback: this.getFeedback(),
      klinik: this.getKlinik(),
      settings: this.getSettings(),
      rbacConfig: this.getRBACConfig(),
      waConfig: this.getWhatsAppConfig(),
      waTemplates: this.getWhatsAppTemplates(),
      waLogs: this.getWhatsAppLogs(),
    });
  },

  async initStorage(): Promise<void> {
    console.log('Initializing storage from MySQL...');
    try {
      const sqlData = await fetchClinicDataFromSql();
      if (!sqlData) throw new Error('MySQL API tidak tersedia.');

      this.applySqlData(sqlData);
      const dedicatedSettings = await fetchClinicSettingsFromSql();
      if (dedicatedSettings) {
        cacheManager.set('klinik', normalizeClinicProfile(dedicatedSettings.clinicProfile));
        cacheManager.set('settings', dedicatedSettings.appSettings);
      }
      this.startRealtimeSync();
      console.log('Data loaded from MySQL');
    } catch (error) {
      throw error;
    }
    notifyListeners();
  },

  startRealtimeSync(): void {
    if (realtimeSource) return;

    realtimeSource = new EventSource('/api/events');
    realtimeSource.addEventListener('data-updated', async () => {
      if (realtimeRefreshInProgress) return;
      realtimeRefreshInProgress = true;
      try {
        const latestData = await fetchClinicDataFromSql();
        if (latestData) {
          this.applySqlData(latestData);
        }
      } catch (error) {
        console.error('Gagal memperbarui data realtime dari MySQL:', error);
      } finally {
        realtimeRefreshInProgress = false;
      }
    });
    realtimeSource.onerror = () => {
      console.warn('Koneksi realtime MySQL terputus, mencoba menyambung kembali...');
    };
  },

  // ========== CACHE MANAGEMENT ==========

  clearCache() {
    cacheManager.clear();
  },

  invalidateCache(key: string) {
    cacheManager.invalidate(key);
  },

  // ========== USERS ==========

  getUsers(): User[] {
    return cacheManager.get<User[]>('users', []);
  },

  getUserList(): User[] {
    return this.getUsers();
  },

  async saveUsers(users: User[]): Promise<void> {
    await persistCache('users', users, { users });
  },

  async saveUserList(users: User[]): Promise<void> {
    await this.saveUsers(users);
  },

  // ========== DOKTER ==========

  getDokter(): Dokter[] {
    return cacheManager.get<Dokter[]>('dokter', []);
  },

  getDokterList(): Dokter[] {
    return this.getDokter();
  },

  async saveDokter(dokter: Dokter[]): Promise<void> {
    await persistCache('dokter', dokter, { dokter });
  },

  async saveDokterList(dokter: Dokter[]): Promise<void> {
    await this.saveDokter(dokter);
  },

  // ========== PASIEN ==========

  getPasien(): Pasien[] {
    return cacheManager.get<Pasien[]>('pasien', []);
  },

  getPasienList(): Pasien[] {
    return this.getPasien();
  },

  async savePasien(pasien: Pasien[]): Promise<void> {
    await persistCache('pasien', pasien, { pasien });
  },

  async savePasienList(pasien: Pasien[]): Promise<void> {
    await this.savePasien(pasien);
  },

  // ========== BARANG ==========

  getBarang(): Barang[] {
    return cacheManager.get<Barang[]>('barang', []);
  },

  getBarangList(): Barang[] {
    return this.getBarang();
  },

  async saveBarang(barang: Barang[]): Promise<void> {
    await persistCache('barang', barang, { barang });
  },

  async saveBarangList(barang: Barang[]): Promise<void> {
    await this.saveBarang(barang);
  },

  // ========== TINDAKAN ==========

  getTindakan(): Tindakan[] {
    return cacheManager.get<Tindakan[]>('tindakan', []);
  },

  getTindakanList(): Tindakan[] {
    return this.getTindakan();
  },

  async saveTindakan(tindakan: Tindakan[]): Promise<void> {
    await persistCache('tindakan', tindakan, { tindakan });
  },

  async saveTindakanList(tindakan: Tindakan[]): Promise<void> {
    await this.saveTindakan(tindakan);
  },

  // ========== PAKAN ==========

  getPakan(): Pakan[] {
    return cacheManager.get<Pakan[]>('pakan', []);
  },

  getPakanList(): Pakan[] {
    return this.getPakan();
  },

  async savePakan(pakan: Pakan[]): Promise<void> {
    await persistCache('pakan', pakan, { pakan });
  },

  async savePakanList(pakan: Pakan[]): Promise<void> {
    await this.savePakan(pakan);
  },

  // ========== SPESIES ==========

  getSpesies(): Spesies[] {
    return cacheManager.get<Spesies[]>('spesies', []);
  },

  getSpesiesList(): Spesies[] {
    return this.getSpesies();
  },

  async saveSpesies(spesies: Spesies[]): Promise<void> {
    await persistCache('spesies', spesies, { spesies });
  },

  async saveSpesiesList(spesies: Spesies[]): Promise<void> {
    await this.saveSpesies(spesies);
  },

  // ========== PENDAFTARAN ==========

  getPendaftaran(): Pendaftaran[] {
    return cacheManager.get<Pendaftaran[]>('pendaftaran', []);
  },

  getPendaftaranList(): Pendaftaran[] {
    return this.getPendaftaran();
  },

  async savePendaftaran(pendaftaran: Pendaftaran[]): Promise<void> {
    await persistCache('pendaftaran', pendaftaran, { pendaftaran });
  },

  async savePendaftaranList(pendaftaran: Pendaftaran[]): Promise<void> {
    await this.savePendaftaran(pendaftaran);
  },

  // ========== REKAM MEDIS ==========

  getRekamMedis(): RekamMedis[] {
    return cacheManager.get<RekamMedis[]>('rekam_medis', []);
  },

  getRekamMedisList(): RekamMedis[] {
    return this.getRekamMedis();
  },

  async saveRekamMedis(rm: RekamMedis[]): Promise<void> {
    await persistCache('rekam_medis', rm, { rekamMedis: rm });
  },

  async saveRekamMedisList(rm: RekamMedis[]): Promise<void> {
    await this.saveRekamMedis(rm);
  },

  // ========== RAWAT INAP ==========

  getRawatInap(): RawatInap[] {
    return cacheManager.get<RawatInap[]>('rawat_inap', []);
  },

  getRawatInapList(): RawatInap[] {
    return this.getRawatInap();
  },

  async saveRawatInap(inap: RawatInap[]): Promise<void> {
    await persistCache('rawat_inap', inap, { rawatInap: inap });
  },

  async saveRawatInapList(inap: RawatInap[]): Promise<void> {
    await this.saveRawatInap(inap);
  },

  // ========== JANJI TEMU ==========

  getJanjiTemu(): JanjiTemu[] {
    return cacheManager.get<JanjiTemu[]>('janji_temu', []);
  },

  getJanjiTemuList(): JanjiTemu[] {
    return this.getJanjiTemu();
  },

  async saveJanjiTemu(jt: JanjiTemu[]): Promise<void> {
    await persistCache('janji_temu', jt, { janjiTemu: jt });
  },

  async saveJanjiTemuList(jt: JanjiTemu[]): Promise<void> {
    await this.saveJanjiTemu(jt);
  },

  // ========== VAKSINASI ==========

  getVaksinasi(): RiwayatVaksinasi[] {
    return cacheManager.get<RiwayatVaksinasi[]>('vaksinasi', []);
  },

  getVaksinasiList(): RiwayatVaksinasi[] {
    return this.getVaksinasi();
  },

  async saveVaksinasi(vks: RiwayatVaksinasi[]): Promise<void> {
    await persistCache('vaksinasi', vks, { vaksinasi: vks });
  },

  async saveVaksinasiList(vks: RiwayatVaksinasi[]): Promise<void> {
    await this.saveVaksinasi(vks);
  },

  // ========== TRANSAKSI ==========

  getTransaksi(): Transaksi[] {
    return cacheManager.get<Transaksi[]>('transaksi', []);
  },

  getTransaksiList(): Transaksi[] {
    return this.getTransaksi();
  },

  async saveTransaksi(trx: Transaksi[]): Promise<void> {
    await persistCache('transaksi', trx, { transaksi: trx });
  },

  async saveTransaksiList(trx: Transaksi[]): Promise<void> {
    await this.saveTransaksi(trx);
  },

  // ========== PEMBELIAN ==========

  getPembelian(): PembelianBarang[] {
    return cacheManager.get<PembelianBarang[]>('pembelian', []);
  },

  getPembelianList(): PembelianBarang[] {
    return this.getPembelian();
  },

  async savePembelian(pmb: PembelianBarang[]): Promise<void> {
    await persistCache('pembelian', pmb, { pembelian: pmb });
  },

  async savePembelianList(pmb: PembelianBarang[]): Promise<void> {
    await this.savePembelian(pmb);
  },

  // ========== SUPPLIER ==========

  getSupplier(): Supplier[] {
    return cacheManager.get<Supplier[]>('supplier', []);
  },

  getSupplierList(): Supplier[] {
    return this.getSupplier();
  },

  async saveSupplier(s: Supplier[]): Promise<void> {
    await persistCache('supplier', s, { supplier: s });
  },

  async saveSupplierList(s: Supplier[]): Promise<void> {
    await this.saveSupplier(s);
  },

  // ========== FEEDBACK ==========

  getFeedback(): FeedbackOwner[] {
    return cacheManager.get<FeedbackOwner[]>('feedback', []);
  },

  getFeedbackList(): FeedbackOwner[] {
    return this.getFeedback();
  },

  async saveFeedback(fb: FeedbackOwner[]): Promise<void> {
    await persistCache('feedback', fb, { feedback: fb });
  },

  async saveFeedbackList(fb: FeedbackOwner[]): Promise<void> {
    await this.saveFeedback(fb);
  },

  // ========== KLINIK INFO ==========

  getKlinik(): DataKlinik {
    return cacheManager.get<DataKlinik>('klinik', {
      namaKlinik: '', alamat: '', noTelp: '', noWhatsApp: '', email: '', website: '',
      logoUrl: '', headerNota: '', footerNota: '', namaPenanggungJawab: '',
    });
  },

  getKlinikData(): DataKlinik {
    return this.getKlinik();
  },

  async saveKlinik(klinik: DataKlinik): Promise<void> {
    const normalizedKlinik = normalizeClinicProfile(klinik);
    await saveClinicSettingsToSql(normalizedKlinik, this.getSettings());
    cacheManager.set('klinik', normalizedKlinik);
    notifyListeners();
  },

  async saveKlinikData(klinik: DataKlinik): Promise<void> {
    await this.saveKlinik(klinik);
  },

  // ========== SETTINGS ==========

  getSettings(): AppSettings {
    return cacheManager.get<AppSettings>('settings', {
      printerThermalWidth: '80mm', autoPrintReceipt: false,
      alertStokMinimumDefault: 0, pPNPersen: 0, autoSendWaReminder: false, themeMode: 'light',
    });
  },

  getAppSettings(): AppSettings {
    return this.getSettings();
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await saveClinicSettingsToSql(this.getKlinik(), settings);
    cacheManager.set('settings', settings);
    notifyListeners();
  },

  async saveAppSettings(settings: AppSettings): Promise<void> {
    await this.saveSettings(settings);
  },

  // ========== ACTIVE USER / AUTH ==========

  getActiveUser(): User | null {
    return cacheManager.get<User | null>('active_user', null);
  },

  setActiveUser(user: User | null): void {
    if (user === null) {
      cacheManager.invalidate('active_user');
    } else {
      cacheManager.set('active_user', user);
    }
    notifyListeners();
  },

  logout(): void {
    this.setActiveUser(null);
  },

  // ========== RBAC CONFIG ==========

  getRBACConfig(): RBACConfig {
    return cacheManager.get<RBACConfig>('rbac_config', { modules: [] });
  },

  async saveRBACConfig(config: RBACConfig): Promise<void> {
    await persistCache('rbac_config', config, { rbacConfig: config });
  },

  // ========== WHATSAPP CONFIG ==========

  getWhatsAppConfig(): WhatsAppConfig {
    return cacheManager.get<WhatsAppConfig>('wa_config', {
      provider: 'fonnte', apiKey: '', senderPhone: '', statusDevice: 'terputus', active: false,
      autoReminders: { janjiTemu: false, kontrolUlang: false, vaksinasi: false, notaPembayaran: false, pengingatPakan: false },
    });
  },

  async saveWhatsAppConfig(config: WhatsAppConfig): Promise<void> {
    await persistCache('wa_config', config, { waConfig: config });
  },

  getWhatsAppTemplates(): WhatsAppTemplate[] {
    return cacheManager.get<WhatsAppTemplate[]>('wa_templates', []);
  },

  async saveWhatsAppTemplates(templates: WhatsAppTemplate[]): Promise<void> {
    await persistCache('wa_templates', templates, { waTemplates: templates });
  },

  getWhatsAppLogs(): WhatsAppLog[] {
    return cacheManager.get<WhatsAppLog[]>('wa_logs', []);
  },

  async saveWhatsAppLogs(logs: WhatsAppLog[]): Promise<void> {
    await persistCache('wa_logs', logs, { waLogs: logs });
  },

  addWhatsAppLog(logData: Omit<WhatsAppLog, 'id'>): WhatsAppLog[] {
    const logs = this.getWhatsAppLogs();
    const newLog: WhatsAppLog = {
      ...logData,
      id: `walog-${Date.now()}`,
    };
    const updated = [newLog, ...logs].slice(0, 1000); // Keep last 1000 logs
    this.saveWhatsAppLogs(updated);
    return updated;
  },

  // ========== BACKUP & EXPORT ==========

  exportFullBackupJSON(): string {
    const data = {
      version: '3.0.0-mysql',
      exportedAt: new Date().toISOString(),
      exportedFrom: 'MySQL Server',
      users: this.getUsers(),
      dokter: this.getDokter(),
      pasien: this.getPasien(),
      barang: this.getBarang(),
      tindakan: this.getTindakan(),
      pakan: this.getPakan(),
      spesies: this.getSpesies(),
      pendaftaran: this.getPendaftaran(),
      rekamMedis: this.getRekamMedis(),
      rawatInap: this.getRawatInap(),
      janjiTemu: this.getJanjiTemu(),
      vaksinasi: this.getVaksinasi(),
      transaksi: this.getTransaksi(),
      pembelian: this.getPembelian(),
      supplier: this.getSupplier(),
      feedback: this.getFeedback(),
      klinik: this.getKlinik(),
      settings: this.getSettings(),
    };
    return JSON.stringify(data, null, 2);
  },

  importFullBackupJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.users) this.saveUsers(data.users);
      if (data.dokter) this.saveDokter(data.dokter);
      if (data.pasien) this.savePasien(data.pasien);
      if (data.barang) this.saveBarang(data.barang);
      if (data.tindakan) this.saveTindakan(data.tindakan);
      if (data.pakan) this.savePakan(data.pakan);
      if (data.spesies) this.saveSpesies(data.spesies);
      if (data.pendaftaran) this.savePendaftaran(data.pendaftaran);
      if (data.rekamMedis) this.saveRekamMedis(data.rekamMedis);
      if (data.rawatInap) this.saveRawatInap(data.rawatInap);
      if (data.janjiTemu) this.saveJanjiTemu(data.janjiTemu);
      if (data.vaksinasi) this.saveVaksinasi(data.vaksinasi);
      if (data.transaksi) this.saveTransaksi(data.transaksi);
      if (data.pembelian) this.savePembelian(data.pembelian);
      if (data.supplier) this.saveSupplier(data.supplier);
      if (data.feedback) this.saveFeedback(data.feedback);
      if (data.klinik) this.saveKlinik(data.klinik);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (error) {
      console.error('Error importing backup:', error);
      return false;
    }
  },
};

export default storageService;

// ============================================================================
// DEFAULT RBAC MODULES CONFIGURATION
// ============================================================================

export const DEFAULT_RBAC_MODULES: ModulePermissionItem[] = [
  {
    id: 'dashboard',
    namaModule: 'Dashboard Utama & Statistik',
    kategori: 'Pelayanan Medis',
    deskripsi: 'Melihat ringkasan indikator performa, antrean aktif, rawat inap, dan grafik harian',
    allowedRoles: ['super_admin', 'admin', 'staf', 'dokter'],
    roleActions: {
      super_admin: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      admin: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      dokter: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
      staf: { canView: true, canCreate: true, canEdit: false, canDelete: false, canExport: false },
    }
  },
  {
    id: 'pendaftaran',
    namaModule: 'Pendaftaran & Registrasi Pasien',
    kategori: 'Pelayanan Medis',
    deskripsi: 'Mendaftarkan pasien baru, membuat nomor antrean, dan mencetak tiket antrean',
    allowedRoles: ['super_admin', 'admin', 'staf'],
    roleActions: {
      super_admin: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      admin: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      dokter: { canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      staf: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
    }
  },
  {
    id: 'pasien',
    namaModule: 'Data Rekam Pasien & Client (Owner)',
    kategori: 'Pelayanan Medis',
    deskripsi: 'Kelola data identitas hewan, pemilik, riwayat medis, dan dokumen cetak kartu pasien',
    allowedRoles: ['super_admin', 'admin', 'staf', 'dokter'],
    roleActions: {
      super_admin: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      admin: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      dokter: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
      staf: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
    }
  },
  {
    id: 'rekam_medis',
    namaModule: 'Pemeriksaan Medis (SOAP) & Resep',
    kategori: 'Pelayanan Medis',
    deskripsi: 'Pemeriksaan fisik (Subjektif, Objektif, Asesmen, Plan), resep obat, tindakan medis, & rujukan',
    allowedRoles: ['super_admin', 'admin', 'dokter'],
    roleActions: {
      super_admin: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      admin: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      dokter: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
      staf: { canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    }
  },
  {
    id: 'master',
    namaModule: 'Master Data & Jadwal Dokter',
    kategori: 'Manajemen & Laporan',
    deskripsi: 'Kelola data dokter, SIP, tarif jasa medis, spesies hewan, & pengguna sistem',
    allowedRoles: ['super_admin', 'admin'],
    roleActions: {
      super_admin: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      admin: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      dokter: { canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      staf: { canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    }
  },
];

// ============================================================================
// BACKUP & RESTORE HELPER FUNCTIONS
// ============================================================================

/**
 * Export database to JSON file download
 */
export const backupToJSON = async () => {
  const jsonStr = storageService.exportFullBackupJSON();
  const backupData = JSON.parse(jsonStr);
  await saveBackupToSql(backupData);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `VetCare_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Import database from JSON file upload
 */
export const restoreFromJSON = async (file: File, onSuccess: () => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result as string;
    if (text) {
      const ok = storageService.importFullBackupJSON(text);
      if (ok) {
        saveBackupToSql(JSON.parse(text)).then(onSuccess).catch((error) => {
          alert(`Restore tersimpan lokal sementara tetapi gagal dicatat ke MySQL: ${error.message}`);
        });
      } else {
        alert('Format file JSON tidak valid!');
      }
    }
  };
  reader.readAsText(file);
};

// Add additional utility methods to storageService
storageService.resetDatabaseKeepUsers = async function(): Promise<void> {
  // Only clear operational data. Users/passwords, doctors, all master data,
  // suppliers, clinic profile, settings, RBAC and WhatsApp configuration stay intact.
  // Use a resilient approach: update the in-memory cache synchronously so the UI
  // immediately reflects an empty database, and attempt SQL persistence but don't
  // fail the whole operation if the API is unavailable.
  try {
    // Clear cache entries directly (avoid failing if API is down)
    cacheManager.set('pendaftaran', []);
    cacheManager.set('rekam_medis', []);
    cacheManager.set('rawat_inap', []);
    cacheManager.set('janji_temu', []);
    cacheManager.set('vaksinasi', []);
    cacheManager.set('transaksi', []);
    cacheManager.set('pembelian', []);
    cacheManager.set('feedback', []);
    cacheManager.set('pasien', []);
    cacheManager.set('wa_logs', []);

    // Notify listeners so UI updates immediately
    notifyListeners();
  } catch (cacheErr) {
    console.error('Error clearing in-memory cache during reset:', cacheErr);
  }

  // Try to persist to backend; failures are logged but do not throw to caller
  const persistCalls = [
    this.savePendaftaran([]).catch((e: any) => { console.warn('Persist pendaftaran failed:', e.message || e); }),
    this.saveRekamMedis([]).catch((e: any) => { console.warn('Persist rekamMedis failed:', e.message || e); }),
    this.saveRawatInap([]).catch((e: any) => { console.warn('Persist rawatInap failed:', e.message || e); }),
    this.saveJanjiTemu([]).catch((e: any) => { console.warn('Persist janjiTemu failed:', e.message || e); }),
    this.saveVaksinasi([]).catch((e: any) => { console.warn('Persist vaksinasi failed:', e.message || e); }),
    this.saveTransaksi([]).catch((e: any) => { console.warn('Persist transaksi failed:', e.message || e); }),
    this.savePembelian([]).catch((e: any) => { console.warn('Persist pembelian failed:', e.message || e); }),
    this.saveFeedback([]).catch((e: any) => { console.warn('Persist feedback failed:', e.message || e); }),
    this.savePasien([]).catch((e: any) => { console.warn('Persist pasien failed:', e.message || e); }),
    this.saveWhatsAppLogs([]).catch((e: any) => { console.warn('Persist wa_logs failed:', e.message || e); }),
  ];

  await Promise.all(persistCalls);
};
