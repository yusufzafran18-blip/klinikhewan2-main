import React, { useState } from 'react';
import {
  WhatsAppConfig,
  WhatsAppTemplate,
  WhatsAppLog,
  Pasien,
  Dokter,
  JanjiTemu,
  DataKlinik
} from '../../types';
import {
  MessageSquare,
  Smartphone,
  Key,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Search,
  Filter,
  Check,
  Zap,
  QrCode,
  Sliders,
  FileText,
  Users,
  Bell,
  Sparkles,
  Download,
  AlertCircle
} from 'lucide-react';

interface WhatsAppIntegrationViewProps {
  pasienList: Pasien[];
  dokterList: Dokter[];
  janjiTemuList: JanjiTemu[];
  klinik: DataKlinik;
  waConfig: WhatsAppConfig;
  onSaveWaConfig: (config: WhatsAppConfig) => void;
  waTemplates: WhatsAppTemplate[];
  onSaveWaTemplates: (templates: WhatsAppTemplate[]) => void;
  waLogs: WhatsAppLog[];
  onAddWaLog: (log: Omit<WhatsAppLog, 'id'>) => void;
}

export const WhatsAppIntegrationView: React.FC<WhatsAppIntegrationViewProps> = ({
  pasienList,
  dokterList,
  janjiTemuList,
  klinik,
  waConfig,
  onSaveWaConfig,
  waTemplates,
  onSaveWaTemplates,
  waLogs,
  onAddWaLog
}) => {
  const [activeTab, setActiveTab] = useState<'gateway' | 'template' | 'send' | 'logs'>('gateway');

  // Config State
  const [configForm, setConfigForm] = useState<WhatsAppConfig>(waConfig);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<Omit<WhatsAppTemplate, 'id'>>({
    kategori: 'janji_temu',
    judul: '',
    pesan: '',
    variablePlaceholder: ['{nama_owner}', '{nama_pasien}', '{nama_klinik}']
  });

  // Direct Message State
  const [selectedPasienId, setSelectedPasienId] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Broadcast Target State
  const [broadcastTarget, setBroadcastTarget] = useState<'semua' | 'kucing' | 'anjing' | 'belum_vaksin'>('semua');

  // Logs Filter State
  const [searchLog, setSearchLog] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('semua');

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Format phone to 62...
  const formatPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWaConfig(configForm);
    showNotification('Konfigurasi API WhatsApp berhasil disimpan!');
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    setTimeout(() => {
      setIsTestingConnection(false);
      setConfigForm(prev => ({ ...prev, statusDevice: 'terhubung' }));
      onSaveWaConfig({ ...configForm, statusDevice: 'terhubung' });
      showNotification('Koneksi WhatsApp Gateway Berhasil Terhubung!');
    }, 1200);
  };

  // Handle Template Add / Edit
  const handleOpenTemplateModal = (tmpl?: WhatsAppTemplate) => {
    if (tmpl) {
      setEditingTemplate(tmpl);
      setTemplateForm({
        kategori: tmpl.kategori,
        judul: tmpl.judul,
        pesan: tmpl.pesan,
        variablePlaceholder: tmpl.variablePlaceholder
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        kategori: 'janji_temu',
        judul: '',
        pesan: '',
        variablePlaceholder: ['{nama_owner}', '{nama_pasien}', '{nama_klinik}']
      });
    }
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.judul || !templateForm.pesan) return;

    if (editingTemplate) {
      const updated = waTemplates.map(t =>
        t.id === editingTemplate.id ? { ...t, ...templateForm } : t
      );
      onSaveWaTemplates(updated);
      showNotification('Template pesan WhatsApp berhasil diperbarui!');
    } else {
      const newTmpl: WhatsAppTemplate = {
        id: `tmpl-${Date.now()}`,
        ...templateForm
      };
      onSaveWaTemplates([...waTemplates, newTmpl]);
      showNotification('Template pesan WhatsApp baru berhasil dibuat!');
    }
    setIsTemplateModalOpen(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus template pesan ini?')) {
      const updated = waTemplates.filter(t => t.id !== id);
      onSaveWaTemplates(updated);
      showNotification('Template berhasil dihapus.');
    }
  };

  const insertVariableToTemplate = (varName: string) => {
    setTemplateForm(prev => ({
      ...prev,
      pesan: prev.pesan + ' ' + varName
    }));
  };

  // Selection of Patient in Direct Send
  const handleSelectPasienForMessage = (pasienId: string) => {
    setSelectedPasienId(pasienId);
    const p = pasienList.find(item => item.id === pasienId);
    if (p) {
      setCustomPhone(p.noHpOwner || p.noHp || '');
      setRecipientName(`${p.namaOwner} (${p.namaPasien})`);
      applyTemplateToMessage(selectedTemplateId, p);
    }
  };

  const applyTemplateToMessage = (templateId: string, targetPasien?: Pasien) => {
    setSelectedTemplateId(templateId);
    const tmpl = waTemplates.find(t => t.id === templateId);
    if (!tmpl) return;

    let text = tmpl.pesan;
    const p = targetPasien || pasienList.find(item => item.id === selectedPasienId);

    text = text.replace(/\{nama_owner\}/g, p?.namaOwner || recipientName || 'Pelanggan');
    text = text.replace(/\{nama_pasien\}/g, p?.namaPasien || 'Anabul');
    text = text.replace(/\{nama_klinik\}/g, klinik.namaKlinik || 'VetCare Clinic');
    text = text.replace(/\{nama_dokter\}/g, dokterList[0]?.nama || 'Dokter Jaga');
    text = text.replace(/\{tanggal\}/g, new Date().toLocaleDateString('id-ID'));
    text = text.replace(/\{jam\}/g, '10:00 WIB');
    text = text.replace(/\{total_bayar\}/g, '150.000');
    text = text.replace(/\{no_nota\}/g, 'NOTA-20260803-001');
    text = text.replace(/\{metode_bayar\}/g, 'QRIS / Cash');

    setCustomMessage(text);
  };

  const handleSendApiMessage = () => {
    if (!customPhone || !customMessage) {
      alert('Mohon lengkapi nomor WhatsApp dan isi pesan!');
      return;
    }
    setIsSendingMsg(true);

    setTimeout(() => {
      setIsSendingMsg(false);
      const cleanPhone = formatPhoneNumber(customPhone);
      onAddWaLog({
        tanggal: new Date().toISOString().replace('T', ' ').slice(0, 16),
        noHp: cleanPhone,
        namaPenerima: recipientName || 'Pemilik Hewan',
        pesan: customMessage,
        status: 'terkirim',
        kategori: waTemplates.find(t => t.id === selectedTemplateId)?.judul || 'Pesan Langsung'
      });
      showNotification(`Pesan WhatsApp berhasil dikirim ke ${cleanPhone}!`);
      setCustomMessage('');
    }, 1000);
  };

  const handleOpenWaWeb = () => {
    if (!customPhone) return;
    const cleanPhone = formatPhoneNumber(customPhone);
    const encoded = encodeURIComponent(customMessage);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');

    onAddWaLog({
      tanggal: new Date().toISOString().replace('T', ' ').slice(0, 16),
      noHp: cleanPhone,
      namaPenerima: recipientName || 'Pemilik Hewan',
      pesan: customMessage,
      status: 'terkirim',
      kategori: 'WhatsApp Web Direct'
    });
  };

  // Filtered Logs
  const filteredLogs = waLogs.filter(log => {
    const matchesSearch =
      log.namaPenerima.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.noHp.includes(searchLog) ||
      log.pesan.toLowerCase().includes(searchLog.toLowerCase());
    const matchesStatus = filterStatus === 'semua' || log.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-10">
          <MessageSquare className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Integrasi WhatsApp Gateway</h1>
            </div>
            <p className="text-emerald-100 text-sm max-w-2xl">
              Kirim pengingat otomatis janji temu, kontrol medis, vaksinasi, serta struk pembayaran digital langsung ke nomor WhatsApp pemilik hewan.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
            <div className="text-right">
              <p className="text-xs text-emerald-100">Status Gateway Device</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`w-2.5 h-2.5 rounded-full ${configForm.statusDevice === 'terhubung' ? 'bg-emerald-300 animate-pulse' : 'bg-rose-400'}`} />
                <span className="font-semibold text-sm capitalize">{configForm.statusDevice}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('send')}
              className="ml-2 px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Pesan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Pesan Terkirim</p>
            <p className="text-xl font-bold text-slate-800">{waLogs.length} Pesan</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Auto Reminders</p>
            <p className="text-xl font-bold text-slate-800">
              {Object.values(configForm.autoReminders).filter(Boolean).length} / 5 Fitur
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Template Siap Pakai</p>
            <p className="text-xl font-bold text-slate-800">{waTemplates.length} Template</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Provider API</p>
            <p className="text-xl font-bold text-slate-800 uppercase">{configForm.provider}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('gateway')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'gateway'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Pengaturan API & Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('template')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'template'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Template Pesan ({waTemplates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('send')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'send'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Kirim Pesan & Broadcast</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Log Pengiriman ({waLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: PENGATURAN API GATEWAY */}
      {activeTab === 'gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                  <Key className="w-5 h-5 text-emerald-600" />
                  <span>Konfigurasi Provider WhatsApp API</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">Pilih penyedia layanan WhatsApp Gateway atau gunakan Custom REST API.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Provider WhatsApp API</label>
                  <select
                    value={configForm.provider}
                    onChange={(e) => setConfigForm({ ...configForm, provider: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="fonnte">Fonnte.com (Rekomendasi Indonesia)</option>
                    <option value="woowa">WooWa API</option>
                    <option value="wablas">Wablas.com</option>
                    <option value="whacenter">WhaCenter API</option>
                    <option value="custom_api">Custom REST API Webhook</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Pengirim (Sender / Bot)</label>
                  <input
                    type="text"
                    value={configForm.senderPhone}
                    onChange={(e) => setConfigForm({ ...configForm, senderPhone: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">API Key / Token Rahasia</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={configForm.apiKey}
                    onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                    placeholder="Masukkan token API WhatsApp Gateway Anda..."
                    className="w-full pl-3.5 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded-lg font-medium transition-colors"
                  >
                    {showApiKey ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <span>Otomatisasi Pengingat WhatsApp (Auto-Reminders)</span>
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Auto WA Janji Temu / Konsultasi</p>
                      <p className="text-xs text-slate-500">Kirim pengingat otomatis H-1 jadwal janji temu pasien</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configForm.autoReminders.janjiTemu}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        autoReminders: { ...configForm.autoReminders, janjiTemu: e.target.checked }
                      })}
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Auto WA Kontrol Ulang Medis</p>
                      <p className="text-xs text-slate-500">Kirim reminder H-1 tanggal kontrol hewan yang telah ditentukan dokter</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configForm.autoReminders.kontrolUlang}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        autoReminders: { ...configForm.autoReminders, kontrolUlang: e.target.checked }
                      })}
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Auto WA Jadwal Vaksinasi Ulang</p>
                      <p className="text-xs text-slate-500">Kirim reminder jatuh tempo vaksinasi tahunan pasien</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configForm.autoReminders.vaksinasi}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        autoReminders: { ...configForm.autoReminders, vaksinasi: e.target.checked }
                      })}
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Auto WA Kirim Struk & Nota Digital</p>
                      <p className="text-xs text-slate-500">Kirim rincian nota rincian obat saat transaksi kasir berhasil dibuat</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configForm.autoReminders.notaPembayaran}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        autoReminders: { ...configForm.autoReminders, notaPembayaran: e.target.checked }
                      })}
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Auto WA Pengingat Pakan & Re-Stock</p>
                      <p className="text-xs text-slate-500">Kirim promosi & pengingat persediaan pakan hewan per bulannya</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configForm.autoReminders.pengingatPakan}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        autoReminders: { ...configForm.autoReminders, pengingatPakan: e.target.checked }
                      })}
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isTestingConnection ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{isTestingConnection ? 'Mengecek Koneksi...' : 'Tes Koneksi Gateway'}</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md transition-colors flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Status Card / QR Code */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <QrCode className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Status Sesi Device WhatsApp</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Pindai QR code dari aplikasi WhatsApp di HP Anda untuk menghubungkan nomor bot pengirim.
              </p>

              {configForm.statusDevice === 'terhubung' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-sm">Terhubung ke WhatsApp Web</span>
                  </div>
                  <p className="text-xs text-emerald-700">Nomor: {configForm.senderPhone || '081234567890'}</p>
                  <p className="text-[11px] text-emerald-600">Daya Baterai HP: 94% • Sinyal Kuat</p>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center">
                  <div className="w-40 h-40 bg-white p-2 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center">
                    <p className="text-xs text-slate-400 text-center font-mono">[Simulasi QR Code WhatsApp]</p>
                  </div>
                  <button
                    onClick={handleTestConnection}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 shadow"
                  >
                    Hubungkan Ulang (Scan QR)
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-800 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Petunjuk Format Variabel Template</span>
              </div>
              <p className="text-xs text-indigo-900 leading-relaxed">
                Anda dapat menyisipkan kata kunci otomatis berikut di template pesan:
              </p>
              <ul className="text-xs text-indigo-800 space-y-1 list-disc pl-4 font-mono">
                <li><strong className="text-indigo-950">&#123;nama_owner&#125;</strong> : Nama Pemilik Hewan</li>
                <li><strong className="text-indigo-950">&#123;nama_pasien&#125;</strong> : Nama Hewan (Anabul)</li>
                <li><strong className="text-indigo-950">&#123;nama_klinik&#125;</strong> : Nama Klinik Hewan</li>
                <li><strong className="text-indigo-950">&#123;nama_dokter&#125;</strong> : Nama Dokter Jaga</li>
                <li><strong className="text-indigo-950">&#123;tanggal&#125;</strong> : Tanggal Jadwal/Kontrol</li>
                <li><strong className="text-indigo-950">&#123;total_bayar&#125;</strong> : Nominal Tagihan Kasir</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATE PESAN WA */}
      {activeTab === 'template' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Daftar Template Pesan Otomatis</h2>
              <p className="text-xs text-slate-500">Sesuaikan kata-kata pesan WhatsApp sesuai dengan standar pelayanan klinik Anda.</p>
            </div>
            <button
              onClick={() => handleOpenTemplateModal()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Template Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {waTemplates.map((tmpl) => (
              <div key={tmpl.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                      {tmpl.kategori.replace('_', ' ')}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenTemplateModal(tmpl)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Template"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Hapus Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base mt-2">{tmpl.judul}</h3>
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans max-h-48 overflow-y-auto">
                    {tmpl.pesan}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Variabel: {tmpl.variablePlaceholder.length} Tag</span>
                  <button
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      applyTemplateToMessage(tmpl.id);
                      setActiveTab('send');
                    }}
                    className="text-emerald-600 font-bold hover:underline flex items-center space-x-1"
                  >
                    <span>Gunakan Template</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: KIRIM PESAN & BROADCAST */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Kirim Pesan */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <Send className="w-5 h-5 text-emerald-600" />
                <span>Kirim Pesan WhatsApp Langsung</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">Kirim pesan personalisasi ke nomor HP pelanggan atau pilih dari data pasien.</p>
            </div>

            {/* Pasien Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Pasien / Pemilik Hewan (Opsional)</label>
              <select
                value={selectedPasienId}
                onChange={(e) => handleSelectPasienForMessage(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih dari database pasien --</option>
                {pasienList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.namaOwner} ({p.namaPasien} - {p.spesies}) - {p.noHpOwner || p.noHp}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp Tujuan</label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gunakan Template Pesan</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => applyTemplateToMessage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Tanpa Template (Pesan Bebas) --</option>
                  {waTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.judul}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Isi Pesan WhatsApp</label>
              <textarea
                rows={6}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Tulis pesan WhatsApp di sini..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleOpenWaWeb}
                disabled={!customPhone || !customMessage}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-xl border border-emerald-200 transition-colors flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4 text-emerald-600" />
                <span>Buka di WA Web / App (`wa.me`)</span>
              </button>

              <button
                type="button"
                onClick={handleSendApiMessage}
                disabled={isSendingMsg || !customPhone || !customMessage}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isSendingMsg ? 'animate-bounce' : ''}`} />
                <span>{isSendingMsg ? 'Mengirim via Gateway...' : 'Kirim via API Gateway'}</span>
              </button>
            </div>
          </div>

          {/* Right Live Smartphone Chat Simulator */}
          <div className="lg:col-span-5 bg-slate-900 rounded-3xl p-4 shadow-xl border-4 border-slate-800 text-white flex flex-col justify-between min-h-[500px]">
            {/* Phone Top Bar */}
            <div className="bg-emerald-800 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-white text-emerald-800 font-bold flex items-center justify-center text-xs">
                  {klinik.namaKlinik.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">{klinik.namaKlinik}</p>
                  <p className="text-[10px] text-emerald-200">Official Clinic Account • Online</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded text-emerald-100 font-mono">API Gateway</span>
            </div>

            {/* Chat Bubble Area */}
            <div className="my-4 flex-1 bg-[#0b141a] rounded-2xl p-4 border border-slate-800 overflow-y-auto space-y-3 custom-scrollbar min-h-[320px]">
              <div className="text-center my-2">
                <span className="bg-[#182229] text-[10px] text-slate-400 px-3 py-1 rounded-full border border-slate-700">
                  HARI INI
                </span>
              </div>

              {customMessage ? (
                <div className="max-w-[85%] ml-auto bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed shadow-sm space-y-2 font-sans whitespace-pre-line">
                  <p>{customMessage}</p>
                  <div className="flex items-center justify-end space-x-1 text-[9px] text-emerald-200 pt-1">
                    <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs py-12 italic">
                  Pratinjau tampilan chat WhatsApp akan muncul di sini saat Anda mengetik pesan...
                </div>
              )}
            </div>

            {/* Phone Bottom Footer */}
            <div className="bg-[#1f2c34] p-2.5 rounded-xl text-center text-slate-400 text-[11px] border border-slate-800">
              Pratinjau Real-time Pesan WhatsApp Pelanggan
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LOG PENGIRIMAN PESAN */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Riwayat Log Pengiriman WhatsApp</h2>
              <p className="text-xs text-slate-500">Catatan pesan yang dikirimkan oleh sistem otomatis maupun manual.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  placeholder="Cari nama, HP, atau pesan..."
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-60"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="semua">Semua Status</option>
                <option value="terkirim">Terkirim</option>
                <option value="gagal">Gagal</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Waktu Send</th>
                  <th className="p-3.5">Penerima & No HP</th>
                  <th className="p-3.5">Kategori Pesan</th>
                  <th className="p-3.5">Ringkasan Pesan</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 text-slate-600 whitespace-nowrap font-mono">{log.tanggal}</td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-800">{log.namaPenerima}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{log.noHp}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                          {log.kategori}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 max-w-xs truncate" title={log.pesan}>
                        {log.pesan}
                      </td>
                      <td className="p-3.5">
                        {log.status === 'terkirim' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Terkirim</span>
                          </span>
                        )}
                        {log.status === 'gagal' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-[11px] font-semibold border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Gagal</span>
                          </span>
                        )}
                        {log.status === 'pending' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[11px] font-semibold border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setCustomPhone(log.noHp);
                            setRecipientName(log.namaPenerima);
                            setCustomMessage(log.pesan);
                            setActiveTab('send');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          Kirim Ulang
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400">
                      Tidak ada data log pengiriman pesan yang sesuai dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">
                {editingTemplate ? 'Edit Template Pesan WA' : 'Buat Template Pesan Baru'}
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Template</label>
                <input
                  type="text"
                  required
                  value={templateForm.judul}
                  onChange={(e) => setTemplateForm({ ...templateForm, judul: e.target.value })}
                  placeholder="Contoh: Pengingat Kontrol Ulang Kucing"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Service</label>
                <select
                  value={templateForm.kategori}
                  onChange={(e) => setTemplateForm({ ...templateForm, kategori: e.target.value as any })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="janji_temu">Janji Temu / Appointment</option>
                  <option value="kontrol_ulang">Kontrol Ulang Medis</option>
                  <option value="vaksinasi">Pengingat Vaksinasi</option>
                  <option value="nota_pembayaran">Nota / Struk Pembayaran</option>
                  <option value="pengingat_pakan">Pengingat Pakan & Obat</option>
                  <option value="promosi">Promosi & Diskon</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Isi Pesan Template</label>
                <textarea
                  required
                  rows={5}
                  value={templateForm.pesan}
                  onChange={(e) => setTemplateForm({ ...templateForm, pesan: e.target.value })}
                  placeholder="Tulis format teks template pesan..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Tag Insert Buttons */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1.5">Sisipkan Variabel Otomatis:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['{nama_owner}', '{nama_pasien}', '{nama_klinik}', '{nama_dokter}', '{tanggal}', '{total_bayar}'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertVariableToTemplate(tag)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-mono border border-emerald-200 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow"
                >
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
