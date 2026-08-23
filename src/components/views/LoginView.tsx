import React, { useState } from 'react';
import { User, DataKlinik } from '../../types';
import {
  Stethoscope, Lock, User as UserIcon, LogIn, ShieldCheck,
  AlertCircle, Eye, EyeOff, Building2, KeyRound, CheckCircle2,
  X, Search, ArrowRight, ShieldAlert, Key
} from 'lucide-react';
import { storageService } from '../../services/storage';

interface LoginViewProps {
  userList: User[];
  klinik: DataKlinik;
  onLogin: (user: User) => void;
  onUpdateUserList?: (users: User[]) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  userList,
  klinik,
  onLogin,
  onUpdateUserList
}) => {
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset Password Modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1); // 1: Search Account, 2: Verification & New Password, 3: Success
  const [resetSearch, setResetSearch] = useState('');
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [verifyContact, setVerifyContact] = useState(''); // Email or No HP verification
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const foundUser = userList.find(
      (u) => u.username.toLowerCase() === selectedUsername.trim().toLowerCase() || (u.email && u.email.toLowerCase() === selectedUsername.trim().toLowerCase())
    );

    if (!foundUser) {
      setErrorMsg('Username atau Email tidak ditemukan dalam sistem.');
      return;
    }

    if (!foundUser.aktif) {
      setErrorMsg('Akun ini sedang dinonaktifkan oleh administrator.');
      return;
    }

    // Verify Password
    const correctPassword = foundUser.password || 'admin123';
    if (password !== correctPassword) {
      setErrorMsg('Kata sandi (password) yang Anda masukkan salah.');
      return;
    }

    onLogin(foundUser);
  };

  // Step 1 Reset: Find user account
  const handleFindUser = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    const targetSearch = resetSearch.trim().toLowerCase();
    if (!targetSearch) {
      setResetError('Masukkan Username, Email, atau No. HP terdaftar.');
      return;
    }

    const matchedUser = userList.find(
      (u) =>
        u.username.toLowerCase() === targetSearch ||
        (u.email && u.email.toLowerCase() === targetSearch) ||
        (u.noHp && u.noHp.toLowerCase() === targetSearch)
    );

    if (!matchedUser) {
      setResetError('Akun pengguna tidak ditemukan. Pastikan data yang dimasukkan benar.');
      return;
    }

    setResetUser(matchedUser);
    setResetStep(2);
    setVerifyContact('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Step 2 Reset: Verify & Save new password
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!resetUser) return;

    // Optional verification match: confirm email or phone number
    const targetVerify = verifyContact.trim().toLowerCase();
    const expectedEmail = (resetUser.email || '').toLowerCase();
    const expectedPhone = (resetUser.noHp || '').toLowerCase();

    if (expectedEmail || expectedPhone) {
      if (targetVerify !== expectedEmail && targetVerify !== expectedPhone) {
        setResetError('Verifikasi gagal. No. HP atau Email verifikasi tidak cocok dengan data akun.');
        return;
      }
    }

    if (newPassword.length < 4) {
      setResetError('Password baru minimal harus 4 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    // Update user password in storage
    const updatedUser: User = {
      ...resetUser,
      password: newPassword
    };

    const updatedUserList = userList.map((u) => (u.id === resetUser.id ? updatedUser : u));

    // Save to storage
    storageService.saveUserList(updatedUserList);
    if (onUpdateUserList) {
      onUpdateUserList(updatedUserList);
    }

    setResetSuccess(`Password untuk user @${resetUser.username} berhasil diperbarui!`);
    setResetStep(3);

    // Pre-fill login form with new credentials
    setSelectedUsername(resetUser.username);
    setPassword(newPassword);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetStep(1);
    setResetSearch('');
    setResetUser(null);
    setVerifyContact('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full filter blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 my-auto">
        
        {/* Main Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Header / Brand */}
            <div className="flex items-center space-x-3 mb-6">
              {klinik.logoUrl ? (
                <img
                  src={klinik.logoUrl}
                  alt={klinik.namaKlinik}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-md shadow-indigo-100 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                  <Stethoscope className="w-7 h-7" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-extrabold text-slate-800 leading-tight">{klinik.namaKlinik}</h1>
                <p className="text-xs font-semibold text-indigo-600 flex items-center mt-0.5">
                  <Building2 className="w-3 h-3 mr-1" /> VetCare Pro Management System
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Selamat Datang 👋</h2>
              <p className="text-xs text-slate-500 mt-1">
                Silakan masuk dengan kredensial akun Anda untuk mengakses sistem rekam medis dan operasional.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-xs text-rose-700 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {resetSuccess && !showResetModal && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-xs text-emerald-800 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username / Email
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={selectedUsername}
                    onChange={(e) => setSelectedUsername(e.target.value)}
                    placeholder="Masukkan username/email..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Kata Sandi (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(true);
                      setResetStep(1);
                      setResetError('');
                      setResetSuccess('');
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Sesi */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="font-medium text-slate-600">Ingat Sesi Saya</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Aplikasi</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>© 2026 {klinik.namaKlinik}</span>
            <span className="flex items-center text-emerald-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Sesi Aman SSL
            </span>
          </div>
        </div>

      </div>

      {/* MODAL RESET / LUPA PASSWORD */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Reset Password Akun</h3>
                  <p className="text-[11px] text-slate-500">Pulihkan kata sandi login pengguna</p>
                </div>
              </div>
              <button onClick={closeResetModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {/* STEP 1: Search Account */}
            {resetStep === 1 && (
              <form onSubmit={handleFindUser} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Masukkan <strong>Username</strong>, <strong>Email</strong>, atau <strong>No. HP</strong> terdaftar untuk mencari data akun Anda.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cari Akun Pengguna</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: superadmin atau 0812345..."
                      value={resetSearch}
                      onChange={(e) => setResetSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Cari Akun</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Verify & Enter New Password */}
            {resetStep === 2 && resetUser && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                {/* Identified User Info Box */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-200/80 text-indigo-800 uppercase">
                      {resetUser.role}
                    </span>
                    <p className="font-extrabold text-slate-900 text-xs mt-1">{resetUser.nama}</p>
                    <p className="text-[11px] text-slate-500 font-mono">@{resetUser.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    Ubah Akun
                  </button>
                </div>

                {/* Optional Verification */}
                {(resetUser.noHp || resetUser.email) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Verifikasi Kontak (Email / No. HP) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={`Ketik Email (${resetUser.email || '-'}) atau No. HP (${resetUser.noHp || '-'})`}
                      value={verifyContact}
                      onChange={(e) => setVerifyContact(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Verifikasi bahwa Anda adalah pemilik resmi akun ini.
                    </p>
                  </div>
                )}

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru *</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={4}
                      placeholder="Masukkan password baru (min 4 karakter)..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Password Baru *</label>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    placeholder="Ulangi password baru..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Password Baru</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success Screen */}
            {resetStep === 3 && (
              <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">Password Berhasil Diperbarui!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Password akun telah diperbarui. Kredensial baru telah diisi ke formulir login.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Lanjut ke Login Sekarang
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
