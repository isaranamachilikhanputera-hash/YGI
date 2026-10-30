import React, { useState } from 'react';
import { UserProfile, authenticateEmailPassword } from '../utils/cmsLogic';
import { SUPERADMIN_ACCESS_KEY } from '../data/seedData';
import { ShieldCheck, Lock, Mail, X } from 'lucide-react';

interface CmsLoginModalProps {
  users: UserProfile[];
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  onGoogleOAuthLogin: () => Promise<void>;
}

export function CmsLoginModal({
  users,
  onClose,
  onLoginSuccess,
  onGoogleOAuthLogin,
}: CmsLoginModalProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);

  const handleEmailPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const result = authenticateEmailPassword(
      users,
      email,
      password,
      SUPERADMIN_ACCESS_KEY
    );
    if (!result.ok || !result.user) {
      setErrorMsg(result.error || 'Gagal masuk. Periksa kembali email dan password Anda.');
      return;
    }
    onLoginSuccess(result.user);
  };

  const handleGoogleClick = async () => {
    setErrorMsg('');
    setOauthLoading(true);
    try {
      await onGoogleOAuthLogin();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal melakukan autentikasi Google OAuth.'
      );
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cms-login-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-[#CED9D1] rounded-xl max-w-md w-full overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-[#0F291E] text-white px-6 py-5 flex items-center justify-between border-b border-[#1E4631]">
          <div>
            <p className="text-xs font-mono-tabular text-emerald-300">
              PORTAL OTORISASI CMS (RBAC)
            </p>
            <h2
              id="cms-login-title"
              className="text-lg font-bold font-display text-white mt-0.5"
            >
              Login Sistem Manajemen Konten
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog login"
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-[#1E4631] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium"
            >
              {errorMsg}
            </div>
          )}

          {/* Unified Email & Password Login Form */}
          <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="cms-login-email"
                className="block text-xs font-semibold text-[#0F2417] mb-1.5"
              >
                Alamat Email Terdaftar
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#4B6855] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="cms-login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email yang terdaftar di list akses..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-[#CED9D1] rounded-lg text-[#0F2417] focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="cms-login-password"
                className="block text-xs font-semibold text-[#0F2417] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#4B6855] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="cms-login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-[#CED9D1] rounded-lg text-[#0F2417] focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg transition-colors cursor-pointer"
            >
              Masuk dengan Email &amp; Password
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#D5E0D8] w-full" />
            <span className="bg-white px-3 text-[11px] text-[#4B6855] whitespace-nowrap">
              ATAU AKUN GOOGLE TERDAFTAR
            </span>
            <div className="border-t border-[#D5E0D8] w-full" />
          </div>

          {/* Google OAuth Button (Restricted to Access List) */}
          <button
            type="button"
            disabled={oauthLoading}
            onClick={handleGoogleClick}
            className="w-full py-2.5 px-4 text-xs font-semibold bg-[#F0F5F1] hover:bg-[#E2ECE5] text-[#0F2417] border border-[#CED9D1] rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#1B4332]" />
            <span>
              {oauthLoading
                ? 'Memverifikasi Google pada List Akses...'
                : 'Masuk dengan Google (Terdaftar di List Akses)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
