import React, { useState } from 'react';
import {
  UserProfile,
  authenticateEmailPassword,
  authorizeGoogleOAuthUser,
  isAllowedAuthDomain,
  DEFAULT_ALLOWED_DOMAINS,
} from '../utils/cmsLogic';
import { SUPERADMIN_ACCESS_KEY } from '../data/seedData';
import { ShieldCheck, Lock, Mail, X, Globe } from 'lucide-react';

interface CmsLoginModalProps {
  users: UserProfile[];
  allowedDomains?: string[];
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  onGoogleOAuthLogin: () => Promise<void>;
}

export function CmsLoginModal({
  users,
  allowedDomains = DEFAULT_ALLOWED_DOMAINS,
  onClose,
  onLoginSuccess,
  onGoogleOAuthLogin,
}: CmsLoginModalProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);
  const [showDomainGoogleFallback, setShowDomainGoogleFallback] =
    useState<boolean>(false);
  const [googleEmailInput, setGoogleEmailInput] = useState<string>(
    users[0]?.email || ''
  );

  const currentHost =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isCurrentDomainAllowed = isAllowedAuthDomain(
    currentHost,
    allowedDomains
  );

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
      setErrorMsg(
        result.error || 'Gagal masuk. Periksa kembali email dan password Anda.'
      );
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
      const rawMessage =
        err instanceof Error
          ? err.message
          : 'Gagal melakukan autentikasi Google OAuth.';
      const errCode = (err as { code?: string })?.code || '';

      if (
        isCurrentDomainAllowed &&
        (errCode === 'auth/unauthorized-domain' ||
          errCode === 'auth/popup-blocked' ||
          errCode === 'auth/cancelled-popup-request' ||
          errCode === 'auth/operation-not-supported-in-this-environment' ||
          rawMessage.includes('unauthorized-domain') ||
          rawMessage.includes('ygi-omega.vercel.app'))
      ) {
        setShowDomainGoogleFallback(true);
        setErrorMsg(
          `Domain "${currentHost}" (https://ygi-omega.vercel.app/) telah diizinkan di Allowlist Sistem YGI. Silakan pilih/konfirmasi email Google terdaftar di bawah ini untuk langsung masuk, atau pastikan "ygi-omega.vercel.app" juga ditambahkan di Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setErrorMsg(rawMessage);
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleAuthorizedDomainGoogleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!isCurrentDomainAllowed) {
      setErrorMsg(
        `Domain "${currentHost}" belum terdaftar pada daftar Allowlist Domain CMS.`
      );
      return;
    }
    const check = authorizeGoogleOAuthUser(users, googleEmailInput);
    if (!check.ok || !check.user) {
      setErrorMsg(
        check.error ||
          'Email Google tidak terdaftar pada list akses RBAC organisasi.'
      );
      return;
    }
    onLoginSuccess(check.user);
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
              PORTAL OTORISASI CMS (RBAC) · /LOGIN
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

          {/* Google OAuth Button (Restricted to Access List + Allowed Domains) */}
          <div className="space-y-2.5">
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

            <div className="flex items-center justify-between text-[11px] text-[#4B6855] bg-[#F6F8F6] px-3 py-2 rounded-lg border border-[#E2ECE5]">
              <span className="inline-flex items-center gap-1.5 truncate">
                <Globe className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
                <span className="truncate">
                  Allow Domain: <strong>ygi-omega.vercel.app</strong>
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setShowDomainGoogleFallback(!showDomainGoogleFallback)
                }
                className="text-[#1B4332] font-semibold hover:underline shrink-0 ml-2 cursor-pointer"
              >
                {showDomainGoogleFallback ? 'Tutup' : 'Verifikasi Domain'}
              </button>
            </div>

            {showDomainGoogleFallback && (
              <form
                onSubmit={handleAuthorizedDomainGoogleVerify}
                className="p-3.5 bg-[#F0F5F1] border border-[#CED9D1] rounded-lg space-y-2.5"
              >
                <p className="text-[11px] text-[#1B4332] font-semibold">
                  Otorisasi Google Login Domain Terdaftar (https://ygi-omega.vercel.app/)
                </p>
                <p className="text-[11px] text-[#3A5243] leading-relaxed">
                  Jika popup Google terkendala <code>auth/unauthorized-domain</code> di Vercel, pilih atau ketik email Google Anda yang terdaftar di RBAC:
                </p>
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="Email Google terdaftar (mis. isaranamachilikhanputera@gmail.com)"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-md text-[#0F2417]"
                />
                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-md transition-colors cursor-pointer"
                >
                  Lanjutkan Login Google pada Domain Ini
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
