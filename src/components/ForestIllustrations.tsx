import React from 'react';
import { VisualTheme } from '../utils/cmsLogic';

export function HeroForestIllustration() {
  return (
    <div className="relative w-full h-full min-h-[340px] rounded-xl overflow-hidden bg-[#0F291E] border border-[#1E4631] flex flex-col justify-between p-6">
      <svg
        viewBox="0 0 800 450"
        className="absolute inset-0 w-full h-full object-cover"
        aria-label="Ilustrasi Kanopi Hutan Tropis Nusantara"
        role="img"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0B2218" />
            <stop offset="55%" stopColor="#163A29" />
            <stop offset="100%" stopColor="#24573E" />
          </linearGradient>
          <linearGradient id="mistGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.06" />
            <stop offset="50%" stopColor="#ECFDF5" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="sunGlow" cx="75%" cy="22%" r="35%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#163A29" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="800" height="450" fill="url(#skyGrad)" />
        <circle cx="620" cy="110" r="140" fill="url(#sunGlow)" />
        <circle cx="620" cy="110" r="36" fill="#FDE68A" fillOpacity="0.28" />

        {/* Distant mountain ridges */}
        <path
          d="M0,260 Q140,180 280,235 T560,200 T800,240 L800,450 L0,450 Z"
          fill="#1B4332"
          opacity="0.7"
        />
        <path
          d="M0,300 Q200,230 390,275 T720,245 L800,270 L800,450 L0,450 Z"
          fill="#143627"
        />

        {/* Mist ribbons */}
        <rect x="40" y="245" width="720" height="18" rx="9" fill="url(#mistGrad)" />
        <rect x="120" y="290" width="600" height="14" rx="7" fill="url(#mistGrad)" />

        {/* Foreground Dipterocarp forest silhouettes */}
        <g fill="#0A1F16">
          <path d="M90,450 L90,280 L60,290 L95,235 L72,240 L100,195 L128,240 L105,235 L140,290 L110,280 L110,450 Z" />
          <path d="M230,450 L230,310 L195,318 L235,260 L212,265 L242,215 L272,265 L249,260 L288,318 L252,310 L252,450 Z" />
          <path d="M480,450 L480,295 L445,305 L485,245 L462,250 L492,200 L522,250 L499,245 L538,305 L502,295 L502,450 Z" />
          <path d="M670,450 L670,275 L635,285 L675,225 L650,230 L682,175 L714,230 L689,225 L730,285 L692,275 L692,450 Z" />
        </g>

        {/* Winding forest river */}
        <path
          d="M350,315 C380,345 310,380 375,415 C415,435 460,445 510,450 L310,450 C285,420 315,380 325,345 Z"
          fill="#34D399"
          fillOpacity="0.22"
        />
      </svg>

      <div className="relative z-10 flex items-center justify-between text-xs text-emerald-100/80 font-mono-tabular">
        <span>KAWASAN KONSERVASI HUTAN TROPIS INDONESIA</span>
        <span>0°47&apos;LS 113°55&apos;BT</span>
      </div>

      <div className="relative z-10 mt-auto pt-36">
        <div className="bg-[#091912]/85 backdrop-blur-sm border border-emerald-800/60 rounded-lg p-4 text-emerald-50">
          <p className="text-xs text-emerald-300/90 font-medium mb-1">
            Pemantauan Ekosistem & Tata Kelola Digital Terpadu
          </p>
          <p className="text-sm text-emerald-100/90 leading-relaxed">
            Seluruh publikasi lapangan, penomoran Surat Tugas organisasi, dan pelaporan audit kegiatan tersinkronisasi secara real-time.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ArticleThemeIllustration({
  theme,
  title,
  className = 'h-48',
}: {
  theme: VisualTheme;
  title: string;
  className?: string;
}) {
  const configs: Record<
    VisualTheme,
    { bg: string; accent: string; label: string; coord: string }
  > = {
    canopy: {
      bg: 'from-[#0F291E] via-[#1B4332] to-[#2D6A4F]',
      accent: '#6EE7B7',
      label: 'KANOPI & BIODIVERSITAS',
      coord: 'SEKTOR A-01',
    },
    reforestation: {
      bg: 'from-[#143324] via-[#1E4D36] to-[#3B7A57]',
      accent: '#A7F3D0',
      label: 'REBOISASI & PEMBIBITAN',
      coord: 'SEKTOR B-04',
    },
    watershed: {
      bg: 'from-[#0D2B2A] via-[#164E4B] to-[#1F6E68]',
      accent: '#5EEAD4',
      label: 'HIDROLOGI & RESTORASI DAS',
      coord: 'SEKTOR C-09',
    },
    agroforestry: {
      bg: 'from-[#1F2F1D] via-[#2E472B] to-[#4A6B44]',
      accent: '#BEF264',
      label: 'AGROFORESTRI MASYARAKAT',
      coord: 'SEKTOR D-02',
    },
  };

  const cfg = configs[theme] || configs.canopy;

  return (
    <div
      className={`relative w-full ${className} bg-gradient-to-br ${cfg.bg} overflow-hidden flex flex-col justify-between p-4 select-none`}
      role="img"
      aria-label={title}
    >
      <svg
        viewBox="0 0 400 220"
        className="absolute inset-0 w-full h-full object-cover opacity-35"
      >
        <path
          d="M0,150 Q100,95 200,135 T400,115 L400,220 L0,220 Z"
          fill="#071710"
        />
        <circle cx="320" cy="60" r="42" fill={cfg.accent} fillOpacity="0.25" />
        <path
          d="M65,220 L65,135 L45,140 L70,100 L95,140 L75,135 L75,220 Z"
          fill="#05120C"
        />
        <path
          d="M175,220 L175,120 L150,128 L182,82 L214,128 L189,120 L189,220 Z"
          fill="#05120C"
        />
        <path
          d="M285,220 L285,145 L265,150 L290,110 L315,150 L295,145 L295,220 Z"
          fill="#05120C"
        />
      </svg>

      <div className="relative z-10 flex items-center justify-between text-[11px] font-mono-tabular text-emerald-100/80">
        <span>{cfg.label}</span>
        <span>{cfg.coord}</span>
      </div>

      <div className="relative z-10 mt-auto">
        <p className="text-xs text-emerald-50/90 font-medium line-clamp-1">
          Dokumentasi Lapangan Yayasan Gunung Parama Indonesia
        </p>
      </div>
    </div>
  );
}
