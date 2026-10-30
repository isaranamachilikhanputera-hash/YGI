import React, { useState } from 'react';
import {
  SiteConfig,
  CategoryItem,
  ContentArticle,
  CommentItem,
  UserProfile,
  DEFAULT_YGI_LOGO_DATA_URL,
} from '../utils/cmsLogic';
import {
  HeroForestIllustration,
  ArticleThemeIllustration,
} from './ForestIllustrations';
import { Search, MessageSquare, Send, Trash2, ArrowUpRight, ShieldCheck } from 'lucide-react';

interface PublicPortalProps {
  siteConfig: SiteConfig;
  categories: CategoryItem[];
  contents: ContentArticle[];
  comments: CommentItem[];
  currentUser: UserProfile | null;
  onOpenCms: () => void;
  onAddComment: (articleId: string, authorName: string, message: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export function PublicPortal({
  siteConfig,
  categories,
  contents,
  comments,
  currentUser,
  onOpenCms,
  onAddComment,
  onDeleteComment,
}: PublicPortalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [commentAuthor, setCommentAuthor] = useState<string>(
    currentUser?.displayName || ''
  );
  const [commentMessage, setCommentMessage] = useState<string>('');
  const [commentError, setCommentError] = useState<string>('');

  // Only published articles appear on the public portal
  const publishedArticles = contents.filter((item) => item.status === 'published');

  const filteredArticles = publishedArticles.filter((article) => {
    const matchesCategory =
      selectedCategory === 'all' || article.categoryId === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      article.title.toLowerCase().includes(q) ||
      article.summary.toLowerCase().includes(q) ||
      article.authorName.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const activeArticle =
    publishedArticles.find((a) => a.id === activeArticleId) || null;

  const activeArticleComments = comments.filter(
    (c) => c.articleId === activeArticle?.id
  );

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeArticle) return;
    const effectiveAuthor = (currentUser?.displayName || commentAuthor).trim();
    const cleanMsg = commentMessage.trim();

    if (effectiveAuthor.length < 2) {
      setCommentError('Nama komentator wajib diisi (minimal 2 karakter).');
      return;
    }
    if (cleanMsg.length < 2) {
      setCommentError('Isi komentar wajib diisi (minimal 2 karakter).');
      return;
    }

    onAddComment(activeArticle.id, effectiveAuthor, cleanMsg);
    setCommentMessage('');
    setCommentError('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8F6] text-[#0F2417]">
      {/* Strictly enforced 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#0F291E] text-white border-b border-[#1E4631]">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Organization Logo YGI + Wordmark */}
          <a
            href="#beranda"
            className="flex items-center gap-3 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
          >
            <img
              src={siteConfig.logoUrl || DEFAULT_YGI_LOGO_DATA_URL}
              alt={`Logo YGI ${siteConfig.siteName}`}
              data-testid="public-org-logo"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-lg object-contain bg-[#163829] border border-emerald-700/60 p-0.5 shrink-0"
            />
            <div className="flex flex-col">
              <span className="leading-tight">{siteConfig.siteName}</span>
              <span className="text-[10px] font-mono-tabular font-semibold text-emerald-300 tracking-wider">
                YAYASAN GUNUNG PARAMA INDONESIA (YGI)
              </span>
            </div>
          </a>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-emerald-100/85"
          >
            <a
              href="#beranda"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Beranda
            </a>
            <a
              href="#publikasi"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Publikasi
            </a>
            <a
              href="#program"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Program Kerja
            </a>
            <a
              href="#kontak"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Kontak &amp; CP
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              data-testid="open-login-modal-btn"
              onClick={onOpenCms}
              className="px-4 py-2 text-xs font-semibold text-[#0F291E] bg-[#A7F3D0] hover:bg-[#6EE7B7] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {currentUser ? `Dashboard CMS (${currentUser.roleName.toUpperCase()})` : 'Masuk Portal CMS'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section
          id="beranda"
          className="bg-[#133325] text-white border-b border-[#1E4631] py-12 lg:py-16"
        >
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-between py-2">
                <div>
                  <p className="text-xs font-medium text-emerald-300/90 mb-3">
                    {siteConfig.tagline}
                  </p>
                  <h1
                    className="font-display font-bold tracking-tight text-white leading-[1.15] mb-5 max-w-2xl"
                    style={{
                      fontSize: 'clamp(2.1rem, 3.6vw, 3.25rem)',
                      textWrap: 'balance',
                    }}
                  >
                    {siteConfig.heroTitle}
                  </h1>
                  <p className="text-base text-emerald-100/85 leading-relaxed max-w-[65ch] mb-8">
                    {siteConfig.heroDescription}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="#publikasi"
                    className="px-5 py-2.5 text-sm font-semibold bg-[#2D6A4F] hover:bg-[#3B8261] text-white rounded-lg border border-emerald-400/30 transition-colors whitespace-nowrap shrink-0"
                  >
                    Jelajahi Publikasi Lapangan
                  </a>
                  <a
                    href="#kontak"
                    className="px-5 py-2.5 text-sm font-medium text-emerald-100 hover:text-white border border-emerald-700 hover:border-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Hubungi Sekretariat &amp; CP
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5 flex">
                <HeroForestIllustration />
              </div>
            </div>

            {/* Full-width 4-column Institutional Proof Strip below hero split */}
            <div className="mt-10 pt-8 border-t border-emerald-800/70 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-emerald-300/80 mb-1">
                  Kawasan Restorasi Aktif
                </p>
                <p className="text-2xl font-bold font-mono-tabular text-white">
                  14.820 Ha
                </p>
                <p className="text-xs text-emerald-200/70 mt-0.5">
                  Kalimantan, Sumatera &amp; Jawa Barat
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-300/80 mb-1">
                  Bibit Pohon Endemik Ditanam
                </p>
                <p className="text-2xl font-bold font-mono-tabular text-white">
                  284.500 Pohon
                </p>
                <p className="text-xs text-emerald-200/70 mt-0.5">
                  Tingkat tumbuh terverifikasi 91,4%
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-300/80 mb-1">
                  Publikasi &amp; Laporan Terbit
                </p>
                <p className="text-2xl font-bold font-mono-tabular text-white">
                  {publishedArticles.length} Artikel
                </p>
                <p className="text-xs text-emerald-200/70 mt-0.5">
                  Tersinkronisasi database Cloud Firestore
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-300/80 mb-1">
                  Diskusi &amp; Komentar Publik
                </p>
                <p className="text-2xl font-bold font-mono-tabular text-white">
                  {comments.length} Respons
                </p>
                <p className="text-xs text-emerald-200/70 mt-0.5">
                  Interaksi pembaca secara real-time
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Publications & Real-Time Comments Section */}
        <section id="publikasi" className="py-14 max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-[#0F2417] tracking-tight">
                Publikasi &amp; Berita Lapangan Terverifikasi
              </h2>
              <p className="text-sm text-[#3A5243] mt-1.5 max-w-2xl">
                Setiap artikel yang ditulis oleh Kontributor (Level 2) telah melalui peninjauan dan persetujuan Admin/Editor (Level 1) sebelum diterbitkan secara resmi.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#4B6855] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Cari artikel publikasi"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul atau penulis..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#CED9D1] rounded-lg text-[#0F2417] placeholder:text-[#6B8573] focus:outline-none focus:border-[#1B4332]"
              />
            </div>
          </div>

          {/* Interactive Category Filter Bar (Functional Buttons) */}
          <div
            role="tablist"
            aria-label="Filter Kategori Artikel"
            className="flex items-center gap-1.5 p-1.5 bg-[#E6EDE8] rounded-lg overflow-x-auto mb-8 w-fit max-w-full"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#1B4332] text-white shadow-xs'
                  : 'text-[#2B4736] hover:text-[#0F2417]'
              }`}
            >
              Semua Kategori ({publishedArticles.length})
            </button>
            {categories.map((cat) => {
              const count = publishedArticles.filter(
                (a) => a.categoryId === cat.slug || a.categoryId === cat.id
              ).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === cat.slug}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === cat.slug
                      ? 'bg-[#1B4332] text-white shadow-xs'
                      : 'text-[#2B4736] hover:text-[#0F2417]'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <div className="bg-white border border-[#D5E0D8] rounded-xl p-10 text-center">
              <p className="text-base font-semibold text-[#0F2417] mb-1">
                Belum Ada Artikel pada Kategori Ini
              </p>
              <p className="text-sm text-[#4B6855] mb-4">
                Silakan pilih kategori lain atau tambahkan artikel baru melalui ruang kerja CMS.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#1B4332] text-white rounded-lg hover:bg-[#143325] transition-colors cursor-pointer"
              >
                Tampilkan Semua Artikel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => {
                const articleCommentCount = comments.filter(
                  (c) => c.articleId === article.id
                ).length;
                const formattedDate = new Date(article.createdAt).toLocaleDateString(
                  'id-ID',
                  { day: 'numeric', month: 'short', year: 'numeric' }
                );

                return (
                  <article
                    key={article.id}
                    className="bg-white border border-[#D5E0D8] rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#2D6A4F] transition-colors"
                  >
                    <div>
                      {article.mediaType === 'image' && article.mediaUrl ? (
                        <img
                          src={article.mediaUrl}
                          alt={article.mediaCaption || article.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-44 object-cover border-b border-[#E8EFEA]"
                        />
                      ) : article.mediaType === 'video' && article.mediaUrl ? (
                        <video
                          src={article.mediaUrl}
                          controls
                          preload="metadata"
                          className="w-full h-44 object-cover bg-black border-b border-[#E8EFEA]"
                        />
                      ) : (
                        <ArticleThemeIllustration
                          theme={article.visualTheme}
                          title={article.title}
                          className="h-44"
                        />
                      )}

                      <div className="p-6">
                        {/* Zero-Pill Metadata Discipline: Clean unboxed text with middot separators */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#4B6855] mb-2.5">
                          <span className="font-medium text-[#1B4332]">
                            {article.categoryName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formattedDate}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            {article.readTimeMinutes} mnt baca
                          </span>
                        </div>

                        <h3 className="text-lg font-bold font-display text-[#0F2417] leading-snug mb-2.5">
                          {article.title}
                        </h3>

                        <p className="text-sm text-[#3A5243] leading-relaxed line-clamp-3">
                          {article.summary}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-[#E8EFEA] flex items-center justify-between gap-4">
                      <div className="text-xs text-[#4B6855] truncate">
                        Oleh <span className="font-medium text-[#0F2417]">{article.authorName}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveArticleId(article.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:text-[#0F291E] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Baca &amp; Komentar ({articleCommentCount})</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Core Organizational Governance & Capabilities Section */}
        <section
          id="program"
          className="py-14 bg-[#EBF1ED] border-y border-[#D5E0D8]"
        >
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="max-w-2xl mb-10">
              <h2 className="text-2xl md:text-3xl font-bold font-display text-[#0F2417] tracking-tight">
                Arsitektur Tata Kelola Hutan &amp; Kepatuhan Organisasi
              </h2>
              <p className="text-sm text-[#3A5243] mt-2 leading-relaxed">
                Seluruh kegiatan operasional {siteConfig.siteName} dijalankan dengan sistem otorisasi berjenjang, penomoran surat otomatis, dan pelaporan bukti lapangan yang transparan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-[#D5E0D8] rounded-xl p-6">
                <p className="text-xs font-mono-tabular font-semibold text-[#2D6A4F] mb-2">
                  01. Kurasi Konten Berjenjang
                </p>
                <h3 className="text-lg font-bold font-display text-[#0F2417] mb-2">
                  Verifikasi Data Ilmiah &amp; Lapangan
                </h3>
                <p className="text-sm text-[#3A5243] leading-relaxed">
                  Kontributor lapangan (Level 2) mengirimkan laporan dan artikel yang wajib diverifikasi oleh Editor atau Admin (Level 1) sebelum tampil kepada publik.
                </p>
              </div>

              <div className="bg-white border border-[#D5E0D8] rounded-xl p-6">
                <p className="text-xs font-mono-tabular font-semibold text-[#2D6A4F] mb-2">
                  02. E-Surat &amp; Penugasan Otomatis
                </p>
                <h3 className="text-lg font-bold font-display text-[#0F2417] mb-2">
                  Penomoran Berurutan &amp; Notifikasi Atasan
                </h3>
                <p className="text-sm text-[#3A5243] leading-relaxed">
                  Penerbitan Surat Tugas secara otomatis meningkatkan counter nomor surat di database, memberi tahu penerima tugas serta atasan pengawas, dan mencatat log audit.
                </p>
              </div>

              <div className="bg-white border border-[#D5E0D8] rounded-xl p-6">
                <p className="text-xs font-mono-tabular font-semibold text-[#2D6A4F] mb-2">
                  03. Akuntabilitas Laporan Kegiatan
                </p>
                <h3 className="text-lg font-bold font-display text-[#0F2417] mb-2">
                  Lampiran Bukti Foto &amp; Dokumen Pendukung
                </h3>
                <p className="text-sm text-[#3A5243] leading-relaxed">
                  Setiap Surat Tugas yang telah dilaksanakan wajib dilengkapi laporan capaian beserta bukti visual dan dokumen Berita Acara yang terpantau pada dashboard analitik.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Configurable Contact & CP Section */}
        <section id="kontak" className="py-14 max-w-[1280px] mx-auto px-6">
          <div className="bg-[#0F291E] text-white rounded-xl p-8 lg:p-10 border border-[#1E4631]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <p className="text-xs font-mono-tabular text-emerald-300 mb-2">
                  KONTAK RESMI &amp; NARAHUBUNG ORGANISASI (DIKELOLA VIA CMS)
                </p>
                <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-3">
                  Hubungi Sekretariat {siteConfig.siteName}
                </h2>
                <p className="text-sm text-emerald-100/85 leading-relaxed max-w-xl mb-6">
                  Informasi nama website, narahubung (Contact Person), nomor telepon, email, serta alamat kantor di bawah ini terhubung langsung dengan konfigurasi CMS dan dapat diperbarui kapan saja oleh Admin.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-[#163829] border border-emerald-800/70 rounded-lg p-4">
                    <p className="text-xs text-emerald-300/80 mb-1">
                      Contact Person (CP)
                    </p>
                    <p className="font-semibold text-white">
                      {siteConfig.contactPersonName}
                    </p>
                    <p className="text-xs font-mono-tabular text-emerald-200 mt-1">
                      {siteConfig.contactPersonPhone}
                    </p>
                  </div>
                  <div className="bg-[#163829] border border-emerald-800/70 rounded-lg p-4">
                    <p className="text-xs text-emerald-300/80 mb-1">
                      Surat Elektronik &amp; Kantor Pusat
                    </p>
                    <p className="font-semibold text-white font-mono-tabular">
                      {siteConfig.contactPersonEmail}
                    </p>
                    <p className="text-xs text-emerald-200 mt-1">
                      {siteConfig.officeAddress}
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#163829] border border-emerald-800/80 rounded-xl p-6">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Layanan Informasi &amp; Kemitraan Publik</span>
                </div>
                <h3 className="text-lg font-bold font-display text-white mb-2">
                  Jam Operasional Sekretariat &amp; Pengaduan Lapangan
                </h3>
                <p className="text-xs text-emerald-100/80 leading-relaxed mb-4">
                  Masyarakat adat, mitra konservasi, dan akademisi dapat menghubungi narahubung resmi untuk permohonan data publikasi, kolaborasi restorasi DAS, maupun pelaporan kondisi kawasan hutan.
                </p>
                <div className="p-3.5 bg-[#0F291E] border border-emerald-800/70 rounded-lg text-xs text-emerald-200 space-y-1 font-mono-tabular">
                  <p>Senin – Jumat : 08.00 – 17.00 WIB</p>
                  <p>Posko Tanggap : 24 Jam (Patroli Terpadu)</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-[#0B1F17] text-emerald-100/75 border-t border-[#1E4631] py-8">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <img
              src={siteConfig.logoUrl || DEFAULT_YGI_LOGO_DATA_URL}
              alt={`Logo Footer YGI ${siteConfig.siteName}`}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded object-contain bg-[#163829] border border-emerald-800/70 p-0.5 shrink-0"
            />
            <div>
              <span className="font-bold text-white">{siteConfig.siteName} (YGI)</span>
              <span className="mx-2">·</span>
              <span>{siteConfig.footerText}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="#beranda" className="hover:text-white transition-colors">
              Beranda
            </a>
            <a href="#publikasi" className="hover:text-white transition-colors">
              Publikasi
            </a>
            <a href="#program" className="hover:text-white transition-colors">
              Program Kerja
            </a>
            <a href="#kontak" className="hover:text-white transition-colors">
              Kontak &amp; CP
            </a>
          </div>
        </div>
      </footer>

      {/* Article Reader & Real-Time Comment Modal */}
      {activeArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-article-title"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white border border-[#CED9D1] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl my-8">
            <div className="sticky top-0 z-20 bg-[#0F291E] text-white px-6 py-4 flex items-center justify-between border-b border-[#1E4631]">
              <div className="text-xs text-emerald-200">
                <span>{activeArticle.categoryName}</span>
                <span className="mx-2">·</span>
                <span>Oleh {activeArticle.authorName}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveArticleId(null)}
                className="px-3 py-1 text-xs font-semibold bg-[#1E4631] hover:bg-[#2D6A4F] text-white rounded-md transition-colors cursor-pointer"
              >
                Tutup Artikel
              </button>
            </div>

            {activeArticle.mediaType === 'image' && activeArticle.mediaUrl ? (
              <div className="bg-[#0F291E]">
                <img
                  src={activeArticle.mediaUrl}
                  alt={activeArticle.mediaCaption || activeArticle.title}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-80 object-cover"
                />
                {activeArticle.mediaCaption && (
                  <p className="px-6 py-2 text-xs text-emerald-200 bg-[#0B1F17]">
                    Dokumentasi Foto: {activeArticle.mediaCaption}
                  </p>
                )}
              </div>
            ) : activeArticle.mediaType === 'video' && activeArticle.mediaUrl ? (
              <div className="bg-black">
                <video
                  src={activeArticle.mediaUrl}
                  controls
                  preload="metadata"
                  className="w-full max-h-80"
                />
                {activeArticle.mediaCaption && (
                  <p className="px-6 py-2 text-xs text-emerald-200 bg-[#0B1F17]">
                    Dokumentasi Video: {activeArticle.mediaCaption}
                  </p>
                )}
              </div>
            ) : (
              <ArticleThemeIllustration
                theme={activeArticle.visualTheme}
                title={activeArticle.title}
                className="h-56"
              />
            )}

            <div className="p-6 md:p-8">
              <h2
                id="modal-article-title"
                className="text-2xl font-bold font-display text-[#0F2417] mb-4"
              >
                {activeArticle.title}
              </h2>

              <div className="space-y-4 text-sm text-[#243B2C] leading-relaxed whitespace-pre-line pb-8 border-b border-[#E2ECE5]">
                {activeArticle.body}
              </div>

              {/* Real-Time Comments Section */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold font-display text-[#0F2417]">
                    Komentar Pembaca Real-Time ({activeArticleComments.length})
                  </h3>
                  <span className="text-xs text-[#4B6855]">
                    Tersinkronisasi langsung dengan Cloud Firestore
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {activeArticleComments.length === 0 ? (
                    <p className="text-xs text-[#4B6855] bg-[#F6F8F6] p-4 rounded-lg border border-[#E2ECE5]">
                      Belum ada komentar pada artikel ini. Jadilah yang pertama memberikan tanggapan.
                    </p>
                  ) : (
                    activeArticleComments.map((cmt) => (
                      <div
                        key={cmt.id}
                        className="bg-[#F6F8F6] border border-[#DCE6DF] rounded-lg p-4 flex items-start justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-xs text-[#4B6855] mb-1">
                            <span className="font-semibold text-[#0F2417]">
                              {cmt.authorName}
                            </span>
                            <span>·</span>
                            <span>{cmt.authorRole}</span>
                            <span>·</span>
                            <span className="font-mono-tabular">
                              {new Date(cmt.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-[#1E3526]">{cmt.message}</p>
                        </div>

                        {currentUser &&
                          (currentUser.level <= 1 ||
                            currentUser.uid === cmt.authorId) && (
                            <button
                              type="button"
                              onClick={() => onDeleteComment(cmt.id)}
                              aria-label={`Hapus komentar ${cmt.authorName}`}
                              className="text-xs text-red-700 hover:text-red-900 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Form */}
                <form
                  onSubmit={handleCommentSubmit}
                  className="bg-[#F0F5F1] border border-[#CED9D1] rounded-lg p-4 space-y-3"
                >
                  <p className="text-xs font-semibold text-[#1B4332]">
                    Tulis Komentar Baru
                  </p>
                  {commentError && (
                    <p className="text-xs text-red-700 font-medium">{commentError}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="comment-author-input"
                        className="block text-xs text-[#3A5243] mb-1"
                      >
                        Nama Anda
                      </label>
                      <input
                        id="comment-author-input"
                        type="text"
                        value={currentUser ? currentUser.displayName : commentAuthor}
                        disabled={Boolean(currentUser)}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        placeholder="Masukkan nama lengkap..."
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-md text-[#0F2417]"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="comment-message-input"
                      className="block text-xs text-[#3A5243] mb-1"
                    >
                      Pesan Komentar
                    </label>
                    <textarea
                      id="comment-message-input"
                      rows={2}
                      value={commentMessage}
                      onChange={(e) => setCommentMessage(e.target.value)}
                      placeholder="Bagikan tanggapan atau temuan lapangan terkait artikel ini..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-md text-[#0F2417]"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-md transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Komentar Real-Time</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
