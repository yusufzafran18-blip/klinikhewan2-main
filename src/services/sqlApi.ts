// ============================================================================
// MySQL database client API
// ============================================================================

export interface SqlDatabaseStatus {
  connected: boolean;
  type: string;
  database: string;
  host: string;
  tablesCount: number;
  message: string;
  error?: string | null;
}

export interface SqlSyncPayload {
  version?: string;
  updatedAt?: string;
  users?: any[];
  dokter?: any[];
  pasien?: any[];
  barang?: any[];
  tindakan?: any[];
  pakan?: any[];
  spesies?: any[];
  pendaftaran?: any[];
  rekamMedis?: any[];
  rawatInap?: any[];
  janjiTemu?: any[];
  vaksinasi?: any[];
  transaksi?: any[];
  pembelian?: any[];
  supplier?: any[];
  feedback?: any[];
  klinik?: any;
  settings?: any;
  rbacConfig?: any;
  waConfig?: any;
  waTemplates?: any[];
  waLogs?: any[];
  mutasiStok?: any[];
}

export async function saveClinicSettingsToSql(clinicProfile: any, appSettings: any): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinicProfile, appSettings }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || result.success === false) throw new Error(result.error || 'Gagal menyimpan pengaturan klinik ke MySQL.');
}

export async function saveBackupToSql(backup: any): Promise<void> {
  const res = await fetch('/api/backups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: `backup-${Date.now()}`,
      version: backup.version || '3.0.0-mysql',
      backup,
    }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || result.success === false) throw new Error(result.error || 'Gagal menyimpan backup ke MySQL.');
}

export async function fetchClinicSettingsFromSql(): Promise<{ clinicProfile: any; appSettings: any } | null> {
  const res = await fetch('/api/settings', { headers: { 'Cache-Control': 'no-cache' } });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success || !result.data) return null;
  return {
    clinicProfile: result.data.clinic_profile_json,
    appSettings: result.data.app_settings_json,
  };
}

export async function createAuthSession(userId: string): Promise<UserSessionResult> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const result = await res.json();
  if (!res.ok || !result.success) throw new Error(result.error || 'Gagal membuat sesi login.');
  return result;
}

export async function restoreAuthSession(): Promise<UserSessionResult> {
  const res = await fetch('/api/auth/session', { headers: { 'Cache-Control': 'no-cache' } });
  const result = await res.json();
  if (!res.ok || !result.success) throw new Error(result.error || 'Gagal memulihkan sesi login.');
  return result;
}

export async function destroyAuthSession(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE' });
}

export interface UserSessionResult {
  success: boolean;
  authenticated: boolean;
  user: any | null;
}

/**
 * Check SQL Database Connection Status
 */
export async function checkSqlStatus(): Promise<SqlDatabaseStatus> {
  try {
    const res = await fetch('/api/db/status', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (error: any) {
    return {
      connected: false,
      type: 'SQL Database',
      database: 'klinik_hewan',
      host: 'localhost',
      tablesCount: 0,
      message: 'Tidak dapat tersambung ke backend API SQL: ' + (error.message || 'Network Error'),
      error: error.message,
    };
  }
}

/**
 * Fetch all clinic records from SQL database
 */
export async function fetchClinicDataFromSql(): Promise<SqlSyncPayload | null> {
  try {
    const res = await fetch('/api/data', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) {
      console.warn('Failed to fetch from SQL API:', res.statusText);
      return null;
    }
    const data = await res.json();
    if (data && data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching data from SQL backend:', error);
    return null;
  }
}

/**
 * Save / Sync entire clinic state to SQL database
 */
export async function saveClinicDataToSql(payload: SqlSyncPayload): Promise<boolean> {
  try {
    const res = await fetch('/api/data/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Failed to sync to SQL backend:', res.statusText);
      return false;
    }
    const result = await res.json();
    return result.success === true;
  } catch (error) {
    console.error('Error saving data to SQL backend:', error);
    return false;
  }
}

/**
 * Test custom MySQL connection parameters (e.g. from Pengaturan View)
 */
export async function testMySQLConnection(config: {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/mysql/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const result = await res.json();
    return result;
  } catch (error: any) {
    return {
      success: false,
      message: 'Gagal menguji koneksi MySQL: ' + error.message,
    };
  }
}

/**
 * Inisialisasi Tabel MySQL di Database
 */
export async function initMySQLTables(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/mysql/init-tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      message: 'Gagal inisialisasi tabel: ' + error.message,
    };
  }
}
