import React, { useState } from 'react';
import {
  SiteConfig,
  UserProfile,
  UserLevel,
  RoleName,
  CategoryItem,
  ContentArticle,
  ContentMediaType,
  VisualTheme,
  LetterTemplate,
  LetterCategory,
  OrganizationLetter,
  TaskReport,
  NotificationItem,
  ActivityLog,
  formatLetterNumber,
  renderLetterTemplate,
  resolveContentInitialStatus,
  computeMonthlyLetterAnalytics,
  computeTaskPerformanceMetrics,
  getDefaultPermissionsForLevel,
  slugifyCategory,
  canSuperadminEditUserName,
  canSuperadminManageUserStatus,
  canSuperadminDeleteUser,
  canSuperadminManageUserPassword,
  getEffectiveUserPassword,
  getVisibleCmsTabsForLevel,
  validateAndFormatUserName,
  validateAndFormatDepartment,
  validateAndFormatUserPassword,
  DEFAULT_YGI_LOGO_DATA_URL,
  canViewAuditLogs,
  resolveTaskReportInitialStatus,
  canApproveTaskReport,
  formatLetterPdfFilename,
  buildLetterPdfBytes,
  WorkProgramItem,
  canManageWorkPrograms,
  validateAndFormatWorkProgram,
  DEFAULT_ALLOWED_DOMAINS,
  DriveRepositoryFile,
} from '../utils/cmsLogic';
import { CmsRepositoryTab } from './CmsRepositoryTab';
import { ArticleThemeIllustration } from './ForestIllustrations';
import {
  BarChart3,
  FileText,
  Layers,
  MailCheck,
  ClipboardCheck,
  Users,
  Settings,
  Bell,
  LogOut,
  Globe,
  Plus,
  CheckCircle2,
  XCircle,
  Upload,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  Shield,
  Pencil,
  Power,
  Image as ImageIcon,
  Video,
  Printer,
  Download,
  FolderOpen,
} from 'lucide-react';

export type CmsTab =
  | 'dashboard'
  | 'contents'
  | 'programs'
  | 'repository'
  | 'letters'
  | 'reports'
  | 'users'
  | 'settings'
  | 'notifications';

interface CmsWorkspaceProps {
  currentUser: UserProfile;
  users: UserProfile[];
  siteConfig: SiteConfig;
  categories: CategoryItem[];
  contents: ContentArticle[];
  workPrograms: WorkProgramItem[];
  repositoryFiles: DriveRepositoryFile[];
  templates: LetterTemplate[];
  letterSequence: number;
  letters: OrganizationLetter[];
  reports: TaskReport[];
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  onSwitchUserRole: (user: UserProfile) => void;
  onBackToPublic: () => void;
  onLogout: () => void;
  onCreateCategory: (name: string, description: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onCreateContent: (data: {
    title: string;
    summary: string;
    body: string;
    categoryId: string;
    visualTheme: VisualTheme;
    mediaType: ContentMediaType;
    mediaUrl: string;
    mediaCaption: string;
    readTimeMinutes: number;
  }) => void;
  onUpdateContentStatus: (
    contentId: string,
    status: 'published' | 'rejected'
  ) => void;
  onDeleteContent: (contentId: string) => void;
  onCreateWorkProgram: (data: {
    code: string;
    title: string;
    description: string;
  }) => void;
  onUpdateWorkProgram: (
    id: string,
    data: { code: string; title: string; description: string }
  ) => void;
  onDeleteWorkProgram: (id: string) => void;
  onUploadRepositoryFile: (newFile: DriveRepositoryFile) => void;
  onSyncDriveFiles: (syncedFiles: DriveRepositoryFile[]) => void;
  onDeleteRepositoryFile: (fileId: string) => void;
  onSaveTemplate: (data: {
    name: string;
    category: LetterCategory;
    codePrefix: string;
    bodyTemplate: string;
  }) => void;
  onCreateLetter: (data: {
    templateId: string;
    category: LetterCategory;
    codePrefix: string;
    subject: string;
    assigneeId: string;
    supervisorId: string;
    location: string;
    taskDescription: string;
  }) => void;
  onUpdateLetterStatus: (
    letterId: string,
    status: 'approved' | 'rejected'
  ) => void;
  onSubmitTaskReport: (data: {
    letterId: string;
    taskTitle: string;
    summaryResult: string;
    completionRate: number;
    photoEvidenceName: string;
    photoEvidenceData: string;
    supportingDocName: string;
    supportingDocSummary: string;
  }) => void;
  onVerifyTaskReport: (
    reportId: string,
    status: 'verified' | 'revision_needed'
  ) => void;
  onUpdateUserRoleAndPermissions: (
    uid: string,
    level: UserLevel,
    roleName: RoleName,
    isVerified: boolean,
    permissions: UserProfile['permissions']
  ) => void;
  onAddNewUser: (data: {
    displayName: string;
    email: string;
    phone: string;
    department: string;
    level: UserLevel;
    roleName: RoleName;
  }) => void;
  onUpdateUserName: (uid: string, newDisplayName: string) => void;
  onUpdateUserDepartment: (uid: string, newDepartment: string) => void;
  onUpdateUserPassword: (uid: string, newPassword: string) => void;
  onToggleUserActive: (uid: string) => void;
  onDeleteUser: (uid: string) => void;
  onUpdateSiteConfig: (newConfig: Omit<SiteConfig, 'updatedBy' | 'updatedAt'>) => void;
  onMarkNotificationRead: (notificationId: string) => void;
}

export function CmsWorkspace({
  currentUser,
  users,
  siteConfig,
  categories,
  contents,
  workPrograms,
  repositoryFiles,
  templates,
  letterSequence,
  letters,
  reports,
  notifications,
  activityLogs,
  onBackToPublic,
  onLogout,
  onCreateCategory,
  onDeleteCategory,
  onCreateContent,
  onUpdateContentStatus,
  onDeleteContent,
  onCreateWorkProgram,
  onUpdateWorkProgram,
  onDeleteWorkProgram,
  onUploadRepositoryFile,
  onSyncDriveFiles,
  onDeleteRepositoryFile,
  onSaveTemplate,
  onCreateLetter,
  onUpdateLetterStatus,
  onSubmitTaskReport,
  onVerifyTaskReport,
  onUpdateUserRoleAndPermissions,
  onAddNewUser,
  onUpdateUserName,
  onUpdateUserDepartment,
  onUpdateUserPassword,
  onToggleUserActive,
  onDeleteUser,
  onUpdateSiteConfig,
  onMarkNotificationRead,
}: CmsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<CmsTab>('dashboard');
  const [statusBanner, setStatusBanner] = useState<string>('');

  // Content & Category state
  const [articleTitle, setArticleTitle] = useState('');
  const [articleSummary, setArticleSummary] = useState('');
  const [articleBody, setArticleBody] = useState('');
  const [articleCategory, setArticleCategory] = useState(
    categories[0]?.slug || 'konservasi-hutan'
  );
  const [articleTheme, setArticleTheme] = useState<VisualTheme>('canopy');
  const [articleReadTime, setArticleReadTime] = useState(5);
  const [articleMediaType, setArticleMediaType] =
    useState<ContentMediaType>('none');
  const [articleMediaUrl, setArticleMediaUrl] = useState<string>('');
  const [articleMediaCaption, setArticleMediaCaption] = useState<string>('');

  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Letter Generator state
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates[0]?.id || 'tpl_surat_tugas'
  );
  const [letterCategory, setLetterCategory] =
    useState<LetterCategory>('Surat Tugas');
  const [letterPrefix, setLetterPrefix] = useState('ST');
  const [letterSubject, setLetterSubject] = useState('');
  const [letterAssigneeId, setLetterAssigneeId] = useState(
    users.find((u) => u.level === 2)?.uid || users[0]?.uid || ''
  );
  const [letterSupervisorId, setLetterSupervisorId] = useState(
    users.find((u) => u.level === 1)?.uid || users[0]?.uid || ''
  );
  const [letterLocation, setLetterLocation] = useState(
    'Kawasan Hutan Lindung Blok Kapuas Hulu'
  );
  const [letterTaskDesc, setLetterTaskDesc] = useState('');
  const [previewLetter, setPreviewLetter] = useState<OrganizationLetter | null>(
    null
  );

  // Template Upload / Customization state
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState<LetterCategory>('Surat Tugas');
  const [tplPrefix, setTplPrefix] = useState('ST');
  const [tplBody, setTplBody] = useState(
    templates[0]?.bodyTemplate ||
      'SURAT ORGANISASI\nNomor: {{NOMOR_SURAT}}\nTanggal: {{TANGGAL}}\nPerihal: {{PERIHAL}}\nPenerima: {{PENERIMA_TUGAS}}\nAtasan: {{ATASAN_TERKAIT}}\nLokasi: {{LOKASI}}\n\n{{DESKRIPSI_TUGAS}}'
  );

  // Task Report state (Berdasarkan Surat Tugas)
  const suratTugasList = letters.filter((l) => l.category === 'Surat Tugas');
  const [reportLetterId, setReportLetterId] = useState(
    suratTugasList[0]?.id || ''
  );

  React.useEffect(() => {
    if (suratTugasList.length > 0) {
      setReportLetterId(suratTugasList[0].id);
    }
  }, [suratTugasList.length]);
  const [reportTitle, setReportTitle] = useState('');
  const [reportSummary, setReportSummary] = useState('');
  const [reportRate, setReportRate] = useState(100);
  const [reportPhotoName, setReportPhotoName] = useState(
    'dokumentasi_lapangan_terverifikasi.jpg'
  );
  const [reportPhotoData, setReportPhotoData] = useState('svg:reforestation');
  const [reportDocName, setReportDocName] = useState(
    'Berita_Acara_Hasil_Kegiatan_ST.pdf'
  );
  const [reportDocSummary, setReportDocSummary] = useState(
    'Dokumen Berita Acara Lapangan & Rekapitulasi Koordinat Petak Ukur'
  );

  // User Management state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('+62 812-');
  const [newUserDept, setNewUserDept] = useState('Unit Konservasi Wilayah');
  const [newUserLevel, setNewUserLevel] = useState<UserLevel>(2);
  const [newUserRole, setNewUserRole] = useState<RoleName>('contributor');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserNameValue, setEditingUserNameValue] = useState<string>('');
  const [editingDeptUserId, setEditingDeptUserId] = useState<string | null>(null);
  const [editingDeptValue, setEditingDeptValue] = useState<string>('');
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [editingPasswordValue, setEditingPasswordValue] = useState<string>('');
  const [hiddenPasswordUids, setHiddenPasswordUids] = useState<Record<string, boolean>>({});

  // Work Program Management state (Level 0 & Level 1)
  const [newProgCode, setNewProgCode] = useState(
    `0${workPrograms.length + 1}. Program Strategis`
  );
  const [newProgTitle, setNewProgTitle] = useState('');
  const [newProgDesc, setNewProgDesc] = useState('');
  const [editingProgId, setEditingProgId] = useState<string | null>(null);
  const [editProgCode, setEditProgCode] = useState('');
  const [editProgTitle, setEditProgTitle] = useState('');
  const [editProgDesc, setEditProgDesc] = useState('');

  // Website Configuration state
  const [cfgForm, setCfgForm] = useState({
    siteName: siteConfig.siteName,
    tagline: siteConfig.tagline,
    logoUrl: siteConfig.logoUrl || DEFAULT_YGI_LOGO_DATA_URL,
    heroTitle: siteConfig.heroTitle,
    heroDescription: siteConfig.heroDescription,
    programSectionTitle:
      siteConfig.programSectionTitle ||
      'Arsitektur Tata Kelola Hutan & Kepatuhan Organisasi',
    programSectionSubtitle:
      siteConfig.programSectionSubtitle ||
      `Seluruh kegiatan operasional ${siteConfig.siteName} dijalankan dengan sistem otorisasi berjenjang, penomoran surat otomatis, dan pelaporan bukti lapangan yang transparan.`,
    allowedDomainsText: (
      siteConfig.allowedDomains || DEFAULT_ALLOWED_DOMAINS
    ).join(', '),
    contactPersonName: siteConfig.contactPersonName,
    contactPersonPhone: siteConfig.contactPersonPhone,
    contactPersonEmail: siteConfig.contactPersonEmail,
    officeAddress: siteConfig.officeAddress,
    footerText: siteConfig.footerText,
  });

  React.useEffect(() => {
    setCfgForm({
      siteName: siteConfig.siteName,
      tagline: siteConfig.tagline,
      logoUrl: siteConfig.logoUrl || DEFAULT_YGI_LOGO_DATA_URL,
      heroTitle: siteConfig.heroTitle,
      heroDescription: siteConfig.heroDescription,
      programSectionTitle:
        siteConfig.programSectionTitle ||
        'Arsitektur Tata Kelola Hutan & Kepatuhan Organisasi',
      programSectionSubtitle:
        siteConfig.programSectionSubtitle ||
        `Seluruh kegiatan operasional ${siteConfig.siteName} dijalankan dengan sistem otorisasi berjenjang, penomoran surat otomatis, dan pelaporan bukti lapangan yang transparan.`,
      allowedDomainsText: (
        siteConfig.allowedDomains || DEFAULT_ALLOWED_DOMAINS
      ).join(', '),
      contactPersonName: siteConfig.contactPersonName,
      contactPersonPhone: siteConfig.contactPersonPhone,
      contactPersonEmail: siteConfig.contactPersonEmail,
      officeAddress: siteConfig.officeAddress,
      footerText: siteConfig.footerText,
    });
  }, [siteConfig]);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? '' : prev));
    }, 5000);
  };

  // Analytics Computations
  const monthlyStats = computeMonthlyLetterAnalytics(letters, 2026);
  const maxMonthlyCount = Math.max(
    4,
    ...monthlyStats.map((m) => m.totalCount)
  );
  const taskPerf = computeTaskPerformanceMetrics(letters, reports);
  const pendingContents = contents.filter(
    (c) => c.status === 'pending_approval'
  );
  const pendingLetters = letters.filter((l) => l.status === 'pending_approval');
  const pendingReports = reports.filter(
    (r) => r.verificationStatus === 'submitted'
  );

  const unreadNotificationsCount = notifications.filter(
    (n) =>
      !n.isRead &&
      (currentUser.level <= 1 || n.recipientId === currentUser.uid)
  ).length;

  const nextPreviewNumber = formatLetterNumber(
    letterSequence + 1,
    letterPrefix,
    10,
    2026
  );

  // Handlers
  const handleArticleMediaFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setArticleMediaType(isVideo ? 'video' : 'image');
    if (!articleMediaCaption) {
      setArticleMediaCaption(file.name);
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setArticleMediaUrl(reader.result);
        showToast(
          `File ${isVideo ? 'video' : 'gambar'} "${file.name}" berhasil dilampirkan pada konten.`
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleContentFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (articleTitle.trim().length < 5 || articleBody.trim().length < 20) {
      showToast('Judul (min 5 karakter) dan isi artikel (min 20 karakter) wajib diisi.');
      return;
    }
    if (articleMediaType !== 'none' && !articleMediaUrl.trim()) {
      showToast(
        `Unggah file atau masukkan URL ${
          articleMediaType === 'video' ? 'video' : 'gambar'
        } terlebih dahulu.`
      );
      return;
    }
    onCreateContent({
      title: articleTitle.trim(),
      summary:
        articleSummary.trim() ||
        articleBody.trim().slice(0, 160) + '...',
      body: articleBody.trim(),
      categoryId: articleCategory,
      visualTheme: articleTheme,
      mediaType: articleMediaType,
      mediaUrl: articleMediaType === 'none' ? '' : articleMediaUrl.trim(),
      mediaCaption:
        articleMediaType === 'none' ? '' : articleMediaCaption.trim(),
      readTimeMinutes: Number(articleReadTime) || 5,
    });
    const expectedStatus = resolveContentInitialStatus(currentUser.level);
    setArticleTitle('');
    setArticleSummary('');
    setArticleBody('');
    setArticleMediaType('none');
    setArticleMediaUrl('');
    setArticleMediaCaption('');
    if (expectedStatus === 'pending_approval') {
      showToast(
        'Artikel berhasil dibuat oleh User Level 2 dan masuk ke Antrean Menunggu Persetujuan Admin (Level 1/0).'
      );
    } else {
      showToast('Artikel berhasil diterbitkan secara resmi ke Portal Publik.');
    }
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim().length < 2) return;
    onCreateCategory(
      newCatName.trim(),
      newCatDesc.trim() || `Kategori publikasi ${newCatName.trim()}`
    );
    setNewCatName('');
    setNewCatDesc('');
    showToast(`Kategori "${newCatName.trim()}" berhasil ditambahkan.`);
  };

  const handleTemplateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      if (text.trim().length > 10) {
        setTplBody(text);
        if (!tplName) {
          setTplName(file.name.replace(/\.[^.]+$/, ''));
        }
        showToast(`File template "${file.name}" berhasil dimuat ke editor.`);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (tplName.trim().length < 3 || tplBody.trim().length < 20) {
      showToast('Nama template dan isi template wajib diisi.');
      return;
    }
    onSaveTemplate({
      name: tplName.trim(),
      category: tplCategory,
      codePrefix: tplPrefix.trim().toUpperCase() || 'ST',
      bodyTemplate: tplBody,
    });
    setTplName('');
    showToast('Template surat organisasi berhasil disimpan ke database.');
  };

  const handleCreateLetterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (letterSubject.trim().length < 5) {
      showToast('Perihal surat wajib diisi (minimal 5 karakter).');
      return;
    }
    onCreateLetter({
      templateId: selectedTemplateId,
      category: letterCategory,
      codePrefix: letterPrefix,
      subject: letterSubject.trim(),
      assigneeId: letterAssigneeId,
      supervisorId: letterSupervisorId,
      location: letterLocation.trim() || 'Kantor Pusat Yayasan Gunung Parama Indonesia',
      taskDescription:
        letterTaskDesc.trim() ||
        `Melaksanakan penugasan organisasi terkait ${letterSubject.trim()} sesuai SOP Konservasi.`,
    });
    setLetterSubject('');
    setLetterTaskDesc('');
    if (letterCategory === 'Surat Tugas') {
      showToast(
        `Surat Tugas ${nextPreviewNumber} diterbitkan! Notifikasi khusus otomatis dikirim ke Atasan Terkait & Penerima Tugas serta dicatat pada Audit Log.`
      );
    } else {
      showToast(
        `Surat Organisasi ${nextPreviewNumber} berhasil dibuat dan counter database diperbarui.`
      );
    }
  };

  const handlePhotoUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReportPhotoName(file.name);
    if (file.size <= 120000) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setReportPhotoData(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setReportPhotoData('svg:canopy');
    }
  };

  const handleDocUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReportDocName(file.name);
    setReportDocSummary(
      `Berkas lampiran pendukung terunggah: ${file.name} (${Math.round(
        file.size / 1024
      )} KB) — Terverifikasi Sistem`
    );
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportLetterId) {
      showToast('Pilih Surat Tugas yang akan dilaporkan.');
      return;
    }
    if (reportTitle.trim().length < 5 || reportSummary.trim().length < 15) {
      showToast('Judul kegiatan dan ringkasan hasil pelaksanaan wajib diisi.');
      return;
    }
    onSubmitTaskReport({
      letterId: reportLetterId,
      taskTitle: reportTitle.trim(),
      summaryResult: reportSummary.trim(),
      completionRate: Number(reportRate),
      photoEvidenceName: reportPhotoName.trim() || 'bukti_foto_kegiatan.jpg',
      photoEvidenceData: reportPhotoData,
      supportingDocName: reportDocName.trim() || 'dokumen_pendukung.pdf',
      supportingDocSummary: reportDocSummary.trim(),
    });
    setReportTitle('');
    setReportSummary('');
    const initStatus = resolveTaskReportInitialStatus(currentUser.level);
    if (initStatus === 'submitted') {
      showToast(
        'Laporan Surat Tugas dari Anggota Level 2 berhasil diunggah dan masuk ke Antrean Approval Level 1 & Level 0!'
      );
    } else {
      showToast(
        'Laporan Hasil Kegiatan beserta bukti foto & dokumen pendukung berhasil disimpan dan disetujui!'
      );
    }
  };

  const handleDownloadLetterPdf = (letItem: OrganizationLetter) => {
    const pdfBytes = buildLetterPdfBytes(letItem, siteConfig);
    const filename = formatLetterPdfFilename(letItem.letterNumber);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`Dokumen PDF "${filename}" berhasil diunduh!`);
  };

  const handlePrintLetter = (letItem: OrganizationLetter) => {
    setPreviewLetter(letItem);
    try {
      const existingFrame = document.getElementById('ygi-print-letter-frame');
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'ygi-print-letter-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`<!doctype html>
<html>
  <head>
    <title>Cetak Surat ${letItem.letterNumber}</title>
    <style>
      body { font-family: 'Courier New', monospace; padding: 32px; color: #0F2417; }
      .header { text-align: center; border-bottom: 2px solid #0F291E; padding-bottom: 12px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 18px; }
      .header p { margin: 4px 0 0; font-size: 12px; color: #3A5243; }
      pre { white-space: pre-wrap; font-size: 12px; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${siteConfig.siteName.toUpperCase()} (YGI)</h1>
      <p>${siteConfig.officeAddress} · Telp: ${siteConfig.contactPersonPhone}</p>
    </div>
    <pre>${letItem.renderedBody}</pre>
  </body>
</html>`);
        doc.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }
    } catch {
      // Fallback if print dialog is blocked in headless environment
    }
    showToast(
      `Siap mencetak dokumen Surat Organisasi ${letItem.letterNumber} (Dialog Print).`
    );
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const rawDataUrl = reader.result;

      // For raster images (PNG/JPEG/WebP), proportionally resize inside an offscreen canvas
      // preserving 100% of the full image aspect ratio (0, 0, targetW, targetH) without cropping
      // so the bottom of the logo is never cut off and Firestore document size stays optimal.
      if (file.type.startsWith('image/') && !file.type.includes('svg')) {
        const img = new Image();
        img.onload = () => {
          try {
            const maxW = 720;
            const maxH = 360;
            let targetW = img.naturalWidth || img.width || 300;
            let targetH = img.naturalHeight || img.height || 300;
            if (targetW > maxW || targetH > maxH) {
              const ratio = Math.min(maxW / targetW, maxH / targetH);
              targetW = Math.max(1, Math.round(targetW * ratio));
              targetH = Math.max(1, Math.round(targetH * ratio));
            }
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, targetW, targetH);
              ctx.drawImage(img, 0, 0, targetW, targetH);
              const optimizedDataUrl = canvas.toDataURL('image/png');
              setCfgForm((prev) => ({
                ...prev,
                logoUrl: optimizedDataUrl,
              }));
              showToast(
                `File logo "${file.name}" (${targetW}x${targetH}px utuh tanpa terpotong) berhasil dimuat. Klik "Simpan Konfigurasi Website Sekarang" untuk menampilkan di halaman utama.`
              );
              return;
            }
          } catch {
            // Fallback to rawDataUrl
          }
          setCfgForm((prev) => ({
            ...prev,
            logoUrl: rawDataUrl,
          }));
          showToast(
            `File logo "${file.name}" berhasil dimuat. Klik "Simpan Konfigurasi Website Sekarang" untuk menampilkan di halaman utama.`
          );
        };
        img.onerror = () => {
          setCfgForm((prev) => ({
            ...prev,
            logoUrl: rawDataUrl,
          }));
        };
        img.src = rawDataUrl;
      } else {
        setCfgForm((prev) => ({
          ...prev,
          logoUrl: rawDataUrl,
        }));
        showToast(
          `File logo "${file.name}" berhasil dimuat. Klik "Simpan Konfigurasi Website Sekarang" untuk menampilkan di halaman utama.`
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddWorkProgramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageWorkPrograms(currentUser.level)) return;
    const check = validateAndFormatWorkProgram(
      newProgCode,
      newProgTitle,
      newProgDesc
    );
    if (!check.valid) {
      showToast(check.error || 'Data Program Kerja belum lengkap.');
      return;
    }
    onCreateWorkProgram({
      code: check.cleanedCode,
      title: check.cleanedTitle,
      description: check.cleanedDescription,
    });
    const nextIdx = workPrograms.length + 2;
    setNewProgCode(`0${nextIdx}. Program Strategis`);
    setNewProgTitle('');
    setNewProgDesc('');
    showToast(
      `Program Kerja "${check.cleanedTitle}" berhasil ditambahkan ke halaman utama!`
    );
  };

  const handleSaveEditWorkProgram = (id: string) => {
    if (!canManageWorkPrograms(currentUser.level)) return;
    const check = validateAndFormatWorkProgram(
      editProgCode,
      editProgTitle,
      editProgDesc
    );
    if (!check.valid) {
      showToast(check.error || 'Data Program Kerja tidak valid.');
      return;
    }
    onUpdateWorkProgram(id, {
      code: check.cleanedCode,
      title: check.cleanedTitle,
      description: check.cleanedDescription,
    });
    setEditingProgId(null);
    showToast(
      `Program Kerja "${check.cleanedTitle}" berhasil diperbarui secara real-time di Homepage!`
    );
  };

  const handleSaveProgramSectionHeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageWorkPrograms(currentUser.level)) return;
    const parsedDomains = cfgForm.allowedDomainsText
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
    onUpdateSiteConfig({
      siteName: cfgForm.siteName,
      tagline: cfgForm.tagline,
      logoUrl: cfgForm.logoUrl,
      heroTitle: cfgForm.heroTitle,
      heroDescription: cfgForm.heroDescription,
      programSectionTitle: cfgForm.programSectionTitle,
      programSectionSubtitle: cfgForm.programSectionSubtitle,
      allowedDomains:
        parsedDomains.length > 0 ? parsedDomains : DEFAULT_ALLOWED_DOMAINS,
      contactPersonName: cfgForm.contactPersonName,
      contactPersonPhone: cfgForm.contactPersonPhone,
      contactPersonEmail: cfgForm.contactPersonEmail,
      officeAddress: cfgForm.officeAddress,
      footerText: cfgForm.footerText,
    });
    showToast(
      'Judul & subjudul bagian Program Kerja di Homepage berhasil diperbarui!'
    );
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim().length < 2 || newUserEmail.trim().length < 5) {
      showToast('Nama lengkap dan email pengguna wajib diisi.');
      return;
    }
    onAddNewUser({
      displayName: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim() || '+62 812-0000-0000',
      department: newUserDept.trim() || 'Divisi Konservasi',
      level: newUserLevel,
      roleName: newUserRole,
    });
    setNewUserName('');
    setNewUserEmail('');
    showToast(`Pengguna baru "${newUserName.trim()}" (Level ${newUserLevel}) berhasil ditambahkan.`);
  };

  const handleSaveSiteConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDomains = cfgForm.allowedDomainsText
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
    onUpdateSiteConfig({
      siteName: cfgForm.siteName,
      tagline: cfgForm.tagline,
      logoUrl: cfgForm.logoUrl,
      heroTitle: cfgForm.heroTitle,
      heroDescription: cfgForm.heroDescription,
      programSectionTitle: cfgForm.programSectionTitle,
      programSectionSubtitle: cfgForm.programSectionSubtitle,
      allowedDomains:
        parsedDomains.length > 0 ? parsedDomains : DEFAULT_ALLOWED_DOMAINS,
      contactPersonName: cfgForm.contactPersonName,
      contactPersonPhone: cfgForm.contactPersonPhone,
      contactPersonEmail: cfgForm.contactPersonEmail,
      officeAddress: cfgForm.officeAddress,
      footerText: cfgForm.footerText,
    });
    showToast(
      'Konfigurasi tampilan Website (Logo YGI, Nama Web, Domain Otorisasi, CP, Alamat, Hero) berhasil disimpan secara real-time!'
    );
  };

  const allowedTabs = getVisibleCmsTabsForLevel(currentUser.level);

  React.useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser.level, activeTab]);

  const allNavItems: {
    id: CmsTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Analitik & Performa',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'contents',
      label: 'Konten & Kategori',
      icon: <FileText className="w-4 h-4" />,
      badge: pendingContents.length > 0 ? pendingContents.length : undefined,
    },
    {
      id: 'programs',
      label: 'Program Kerja',
      icon: <Layers className="w-4 h-4" />,
      badge: workPrograms.length > 0 ? workPrograms.length : undefined,
    },
    {
      id: 'repository',
      label: 'Repositori Dokumen (GDrive)',
      icon: <FolderOpen className="w-4 h-4" />,
      badge: repositoryFiles.length > 0 ? repositoryFiles.length : undefined,
    },
    {
      id: 'letters',
      label: 'Surat Organisasi (Otomatis)',
      icon: <MailCheck className="w-4 h-4" />,
      badge: pendingLetters.length > 0 ? pendingLetters.length : undefined,
    },
    {
      id: 'reports',
      label: 'Laporan Surat Tugas',
      icon: <ClipboardCheck className="w-4 h-4" />,
      badge: pendingReports.length > 0 ? pendingReports.length : undefined,
    },
    {
      id: 'users',
      label: 'User & Hak Akses (RBAC)',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Konfigurasi Website & CP',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'notifications',
      label: 'Notifikasi & Audit Log',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
  ];

  const navItems = allNavItems.filter((item) => allowedTabs.includes(item.id));

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F4F7F4] text-[#0F2417]">
      {/* Left Sidebar Navigation (268px on desktop) */}
      <aside className="w-full lg:w-[268px] shrink-0 bg-[#0F291E] text-white border-b lg:border-b-0 lg:border-r border-[#1E4631] flex flex-col justify-between">
        <div>
          <div className="p-5 border-b border-[#1E4631]">
            <p className="text-[11px] font-mono-tabular text-emerald-300/90">
              CMS CLOUD FIRESTORE
            </p>
            <h1 className="text-base font-bold font-display text-white truncate mt-0.5">
              {siteConfig.siteName}
            </h1>
            <p className="text-xs text-emerald-200/75 mt-1">
              Level {currentUser.level} · {currentUser.roleName.toUpperCase()}
            </p>
          </div>

          <nav aria-label="Menu Ruang Kerja CMS" className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#2D6A4F] text-white'
                      : 'text-emerald-100/80 hover:bg-[#163829] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span className="font-mono-tabular text-[11px] px-1.5 py-0.5 rounded bg-[#A7F3D0] text-[#0F291E] font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Session Actions in Sidebar Footer */}
        <div className="p-4 border-t border-[#1E4631] bg-[#0B1F17]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToPublic}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-[#1E4631] hover:bg-[#2D6A4F] text-white rounded-md transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web Publik</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Keluar dari CMS"
              className="inline-flex items-center justify-center gap-1 py-2 px-3 text-xs font-semibold bg-red-950/80 hover:bg-red-900 text-red-100 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* SaaS Top Header Contract: Breadcrumb on left, 1-2 primary actions on right */}
        <header className="bg-white border-b border-[#D5E0D8] px-6 py-4 flex items-center justify-between gap-4">
          <div className="text-xs text-[#4B6855] truncate">
            <span className="font-medium text-[#0F2417]">CMS Organisasi</span>
            <span className="mx-2">/</span>
            <span className="font-semibold text-[#1B4332]">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
            <span className="mx-2">·</span>
            <span>
              Login Aktif: <strong>{currentUser.displayName}</strong> (Level{' '}
              {currentUser.level})
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className="px-3 py-1.5 text-xs font-semibold text-[#1B4332] bg-[#EBF1ED] hover:bg-[#DCE7DF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Notifikasi ({unreadNotificationsCount})
            </button>
            <button
              type="button"
              onClick={onBackToPublic}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143325] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Lihat Website Publik
            </button>
          </div>
        </header>

        {/* Feedback Toast Banner */}
        {statusBanner && (
          <div
            role="status"
            className="mx-6 mt-4 p-3.5 bg-[#1B4332] text-white text-xs font-medium rounded-lg flex items-center justify-between gap-4"
          >
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner('')}
              className="text-emerald-200 hover:text-white font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Workspace Tab Content */}
        <main className="p-6 space-y-6 max-w-[1220px]">
          {/* ===============================================================
              TAB 1: ANALYTICS & PERFORMANCE DASHBOARD
          =============================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold font-display text-[#0F2417]">
                  Dashboard Analitik Surat Bulanan &amp; Performa Penyelesaian Tugas
                </h2>
                <p className="text-xs text-[#4B6855] mt-1">
                  Pemantauan real-time jumlah penerbitan surat organisasi setiap bulan, status persetujuan, dan tingkat penyelesaian laporan Surat Tugas.
                </p>
              </div>

              {/* 4 KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#D5E0D8] rounded-xl p-5">
                  <p className="text-xs text-[#4B6855] mb-1">
                    Total Surat Diterbitkan (2026)
                  </p>
                  <p className="text-2xl font-bold font-mono-tabular text-[#0F2417]">
                    {letters.length} Surat
                  </p>
                  <p className="text-xs text-[#1B4332] mt-1 font-mono-tabular">
                    Counter Terakhir: #{String(letterSequence).padStart(3, '0')}
                  </p>
                </div>

                <div className="bg-white border border-[#D5E0D8] rounded-xl p-5">
                  <p className="text-xs text-[#4B6855] mb-1">
                    Performa Penyelesaian Surat Tugas
                  </p>
                  <p className="text-2xl font-bold font-mono-tabular text-[#1B4332]">
                    {taskPerf.overallCompletionPercentage}%
                  </p>
                  <p className="text-xs text-[#4B6855] mt-1 font-mono-tabular">
                    {taskPerf.completedTasks} dari {taskPerf.totalSuratTugas} Surat Tugas Selesai
                  </p>
                </div>

                <div className="bg-white border border-[#D5E0D8] rounded-xl p-5">
                  <p className="text-xs text-[#4B6855] mb-1">
                    Rata-Rata Capaian Laporan Kegiatan
                  </p>
                  <p className="text-2xl font-bold font-mono-tabular text-[#0F2417]">
                    {taskPerf.averageReportScore}%
                  </p>
                  <p className="text-xs text-[#4B6855] mt-1 font-mono-tabular">
                    {taskPerf.totalReportsSubmitted} Laporan Bukti Foto &amp; Dokumen
                  </p>
                </div>

                <div className="bg-white border border-[#D5E0D8] rounded-xl p-5">
                  <p className="text-xs text-[#4B6855] mb-1">
                    Antrean Persetujuan (Approval)
                  </p>
                  <p className="text-2xl font-bold font-mono-tabular text-amber-700">
                    {pendingContents.length + pendingLetters.length} Item
                  </p>
                  <p className="text-xs text-[#4B6855] mt-1 font-mono-tabular">
                    {pendingContents.length} Konten Lv.2 · {pendingLetters.length} Surat
                  </p>
                </div>
              </div>

              {/* Monthly Issued Letters Chart & Task Completion Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-[#D5E0D8] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-bold font-display text-[#0F2417]">
                        Statistik Penerbitan Surat Organisasi per Bulan (2026)
                      </h3>
                      <p className="text-xs text-[#4B6855]">
                        Distribusi jumlah surat yang diterbitkan beserta porsi Surat Tugas bulanan
                      </p>
                    </div>
                    <span className="text-xs font-mono-tabular text-[#1B4332] font-semibold">
                      Tahun Buku 2026
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-end h-44 pt-4 px-2 border-b border-[#E2ECE5]">
                    {monthlyStats.map((stat) => {
                      const heightPct = Math.round(
                        (stat.totalCount / maxMonthlyCount) * 100
                      );
                      return (
                        <div
                          key={stat.month}
                          className="flex flex-col items-center justify-end h-full gap-1.5"
                        >
                          <span className="text-[11px] font-mono-tabular font-semibold text-[#0F2417]">
                            {stat.totalCount}
                          </span>
                          <div className="w-full max-w-[28px] bg-[#E6EDE8] rounded-t-md h-28 flex items-end overflow-hidden">
                            <div
                              style={{
                                height: `${
                                  stat.totalCount > 0 ? Math.max(18, heightPct) : 4
                                }%`,
                              }}
                              className={`w-full transition-all rounded-t-md ${
                                stat.totalCount > 0
                                  ? 'bg-[#1B4332]'
                                  : 'bg-[#CBD8CE]'
                              }`}
                              title={`${stat.monthLabel}: ${stat.totalCount} Surat (${stat.suratTugasCount} Surat Tugas)`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-12 gap-2 pt-2 px-2 text-center">
                    {monthlyStats.map((stat) => (
                      <span
                        key={stat.month}
                        className="text-[11px] font-mono-tabular text-[#4B6855]"
                      >
                        {stat.monthLabel}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Overall Task Completion Performance Panel */}
                <div className="lg:col-span-5 bg-white border border-[#D5E0D8] rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display text-[#0F2417] mb-1">
                      Performa Penyelesaian Surat Tugas
                    </h3>
                    <p className="text-xs text-[#4B6855] mb-5">
                      Evaluasi realisasi kegiatan lapangan berdasarkan Surat Tugas yang diterbitkan
                    </p>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[#0F2417]">
                            Tugas Selesai Dilaporkan (Completed)
                          </span>
                          <span className="font-mono-tabular font-semibold text-[#1B4332]">
                            {taskPerf.completedTasks} Tugas ({taskPerf.overallCompletionPercentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#E6EDE8] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1B4332]"
                            style={{
                              width: `${taskPerf.overallCompletionPercentage}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[#0F2417]">
                            Sedang Dilaksanakan di Lapangan (In Progress)
                          </span>
                          <span className="font-mono-tabular font-semibold text-amber-700">
                            {taskPerf.inProgressTasks} Tugas
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#E6EDE8] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-600"
                            style={{
                              width: `${
                                taskPerf.totalSuratTugas > 0
                                  ? Math.round(
                                      (taskPerf.inProgressTasks /
                                        taskPerf.totalSuratTugas) *
                                        100
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[#0F2417]">
                            Baru Ditugaskan / Menunggu Pelaksanaan
                          </span>
                          <span className="font-mono-tabular font-semibold text-[#4B6855]">
                            {taskPerf.assignedPendingTasks} Tugas
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#E6EDE8] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#64826E]"
                            style={{
                              width: `${
                                taskPerf.totalSuratTugas > 0
                                  ? Math.round(
                                      (taskPerf.assignedPendingTasks /
                                        taskPerf.totalSuratTugas) *
                                        100
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#E2ECE5] flex items-center justify-between">
                    <span className="text-xs text-[#4B6855]">
                      Laporan Terverifikasi: <strong>{taskPerf.verifiedReportsCount}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reports')}
                      className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
                    >
                      Buka Modul Laporan Kegiatan →
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Real-Time Activity Audit Log Table */}
              <div className="bg-white border border-[#D5E0D8] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E2ECE5] flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display text-[#0F2417]">
                      Log Aktivitas Audit Real-Time (Transparansi Organisasi)
                    </h3>
                    <p className="text-xs text-[#4B6855]">
                      Setiap pembuatan Surat Tugas, persetujuan konten Level 2, dan pelaporan kegiatan tercatat otomatis
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notifications')}
                    className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
                  >
                    Lihat Semua Log ({activityLogs.length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F0F5F1] text-[#3A5243] border-b border-[#D5E0D8]">
                        <th className="py-2.5 px-4 font-semibold">Waktu</th>
                        <th className="py-2.5 px-4 font-semibold">Pelaksana &amp; Level</th>
                        <th className="py-2.5 px-4 font-semibold">Jenis Aksi</th>
                        <th className="py-2.5 px-4 font-semibold">Rincian Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6EDE8]">
                      {activityLogs.slice(0, 5).map((log) => (
                        <tr key={log.id} className="hover:bg-[#F9FBF9]">
                          <td className="py-2.5 px-4 font-mono-tabular text-[#4B6855] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-[#0F2417] whitespace-nowrap">
                            {log.actorName} (Lv.{log.actorLevel})
                          </td>
                          <td className="py-2.5 px-4 font-mono-tabular text-[#1B4332] whitespace-nowrap">
                            {log.actionType}
                          </td>
                          <td className="py-2.5 px-4 text-[#243B2C]">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              TAB 2: CONTENT CRUD, CATEGORIES & LEVEL 2 APPROVAL
          =============================================================== */}
          {activeTab === 'contents' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold font-display text-[#0F2417]">
                    Manajemen Konten Publikasi &amp; Kategori
                  </h2>
                  <p className="text-xs text-[#4B6855] mt-1">
                    Aturan Otorisasi: Konten yang dibuat oleh <strong>User Level 2 (Kontributor)</strong> wajib disetujui oleh <strong>Admin (Level 1/0)</strong> sebelum terbit di halaman utama.
                  </p>
                </div>
                <div className="text-xs font-mono-tabular bg-[#E6EDE8] px-3 py-1.5 rounded-lg text-[#0F2417]">
                  Status Sesi Anda: <strong>Level {currentUser.level} ({currentUser.roleName.toUpperCase()})</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Create Content Form */}
                <form
                  onSubmit={handleContentFormSubmit}
                  className="lg:col-span-7 bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#E2ECE5] pb-3">
                    <h3 className="text-base font-bold font-display text-[#0F2417]">
                      Tambah Konten / Artikel Baru
                    </h3>
                    <span className="text-xs text-[#1B4332] font-medium">
                      {currentUser.level === 2
                        ? 'Otomatis Masuk Antrean Approval Level 1'
                        : 'Langsung Terbit (Otorisasi Admin)'}
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="cms-article-title"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Judul Artikel Publikasi
                    </label>
                    <input
                      id="cms-article-title"
                      type="text"
                      value={articleTitle}
                      onChange={(e) => setArticleTitle(e.target.value)}
                      placeholder="Contoh: Evaluasi Pertumbuhan Bibit Shorea di Blok Meranti..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg text-[#0F2417]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="cms-article-category"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Kategori Konten
                      </label>
                      <select
                        id="cms-article-category"
                        value={articleCategory}
                        onChange={(e) => setArticleCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg text-[#0F2417]"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.slug}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="cms-article-theme"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Ilustrasi Visual
                      </label>
                      <select
                        id="cms-article-theme"
                        value={articleTheme}
                        onChange={(e) =>
                          setArticleTheme(e.target.value as VisualTheme)
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg text-[#0F2417]"
                      >
                        <option value="canopy">Kanopi &amp; Biodiversitas</option>
                        <option value="reforestation">Reboisasi &amp; Pembibitan</option>
                        <option value="watershed">Hidrologi &amp; Restorasi DAS</option>
                        <option value="agroforestry">Agroforestri Masyarakat</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="cms-article-readtime"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Estimasi Baca (Menit)
                      </label>
                      <input
                        id="cms-article-readtime"
                        type="number"
                        min={1}
                        max={60}
                        value={articleReadTime}
                        onChange={(e) => setArticleReadTime(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg text-[#0F2417] font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="cms-article-summary"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Ringkasan Eksekutif (Excerpt)
                    </label>
                    <input
                      id="cms-article-summary"
                      type="text"
                      value={articleSummary}
                      onChange={(e) => setArticleSummary(e.target.value)}
                      placeholder="Ringkasan singkat 1-2 kalimat untuk kartu halaman depan..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg text-[#0F2417]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cms-article-body"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Isi Lengkap Konten
                    </label>
                    <textarea
                      id="cms-article-body"
                      rows={4}
                      value={articleBody}
                      onChange={(e) => setArticleBody(e.target.value)}
                      placeholder="Tuliskan laporan lengkap atau artikel ilmiah (minimal 20 karakter)..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg text-[#0F2417]"
                    />
                  </div>

                  {/* Image / Video Attachment Section */}
                  <div className="p-4 bg-[#F6F8F6] border border-[#CED9D1] rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label
                        htmlFor="cms-article-media-type"
                        className="text-xs font-semibold text-[#0F2417] flex items-center gap-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[#1B4332]" />
                        <Video className="w-3.5 h-3.5 text-[#1B4332]" />
                        <span>Lampiran Media Konten (Gambar atau Video)</span>
                      </label>
                      <select
                        id="cms-article-media-type"
                        value={articleMediaType}
                        onChange={(e) =>
                          setArticleMediaType(
                            e.target.value as ContentMediaType
                          )
                        }
                        className="px-2.5 py-1.5 text-xs bg-white border border-[#CED9D1] rounded-lg text-[#0F2417] font-semibold"
                      >
                        <option value="none">
                          Tanpa Media Tambahan (Ilustrasi Tema)
                        </option>
                        <option value="image">
                          Tambahkan Gambar (Upload / URL)
                        </option>
                        <option value="video">
                          Tambahkan Video (Upload / URL)
                        </option>
                      </select>
                    </div>

                    {articleMediaType !== 'none' && (
                      <div className="space-y-3 pt-2 border-t border-[#E2ECE5]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="cms-article-media-file"
                              className="block text-[11px] font-semibold text-[#243B2C] mb-1"
                            >
                              {articleMediaType === 'image'
                                ? 'Unggah File Gambar (.jpg, .png, .webp)'
                                : 'Unggah File Video (.mp4, .webm)'}
                            </label>
                            <input
                              id="cms-article-media-file"
                              type="file"
                              accept={
                                articleMediaType === 'image'
                                  ? 'image/*'
                                  : 'video/mp4,video/webm,video/*'
                              }
                              onChange={handleArticleMediaFileUpload}
                              className="w-full text-[11px] text-[#3A5243] bg-white border border-[#CED9D1] rounded-lg p-1.5"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="cms-article-media-url"
                              className="block text-[11px] font-semibold text-[#243B2C] mb-1"
                            >
                              {articleMediaType === 'image'
                                ? 'Atau Masukkan URL Gambar'
                                : 'Atau Masukkan URL Video (.mp4 / Embed)'}
                            </label>
                            <input
                              id="cms-article-media-url"
                              type="text"
                              value={articleMediaUrl}
                              onChange={(e) =>
                                setArticleMediaUrl(e.target.value)
                              }
                              placeholder={
                                articleMediaType === 'image'
                                  ? 'https://.../foto-kegiatan.jpg'
                                  : 'https://.../dokumentasi-video.mp4'
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CED9D1] rounded-lg font-mono-tabular"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="cms-article-media-caption"
                            className="block text-[11px] font-semibold text-[#243B2C] mb-1"
                          >
                            Keterangan / Caption{' '}
                            {articleMediaType === 'image' ? 'Gambar' : 'Video'}
                          </label>
                          <input
                            id="cms-article-media-caption"
                            type="text"
                            value={articleMediaCaption}
                            onChange={(e) =>
                              setArticleMediaCaption(e.target.value)
                            }
                            placeholder="Tuliskan keterangan dokumentasi gambar/video..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CED9D1] rounded-lg"
                          />
                        </div>

                        {articleMediaUrl && (
                          <div className="p-2.5 bg-white border border-[#DCE6DF] rounded-lg space-y-1.5">
                            <p className="text-[11px] font-semibold text-[#1B4332]">
                              Pratinjau{' '}
                              {articleMediaType === 'image'
                                ? 'Gambar'
                                : 'Video'}{' '}
                              Terlampir:
                            </p>
                            {articleMediaType === 'image' ? (
                              <img
                                src={articleMediaUrl}
                                alt={articleMediaCaption || 'Pratinjau gambar'}
                                referrerPolicy="no-referrer"
                                className="max-h-44 rounded-md object-cover border border-[#E2ECE5]"
                              />
                            ) : (
                              <video
                                src={articleMediaUrl}
                                controls
                                preload="metadata"
                                className="max-h-48 w-full rounded-md bg-black"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {currentUser.level === 2
                        ? 'Simpan & Ajukan Persetujuan Admin (Level 2)'
                        : 'Terbitkan Konten Sekarang'}
                    </span>
                  </button>
                </form>

                {/* Category Management Panel */}
                <div className="lg:col-span-5 bg-white border border-[#D5E0D8] rounded-xl p-6 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold font-display text-[#0F2417] border-b border-[#E2ECE5] pb-3 mb-4">
                      Kelola Kategori Konten ({categories.length})
                    </h3>

                    <form onSubmit={handleCategorySubmit} className="space-y-3 mb-5">
                      <div>
                        <label
                          htmlFor="cms-new-cat-name"
                          className="block text-xs font-semibold text-[#0F2417] mb-1"
                        >
                          Nama Kategori Baru
                        </label>
                        <input
                          id="cms-new-cat-name"
                          type="text"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="Misal: Ekowisata Hutan Adat"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="cms-new-cat-desc"
                          className="block text-xs font-semibold text-[#0F2417] mb-1"
                        >
                          Deskripsi Singkat
                        </label>
                        <input
                          id="cms-new-cat-desc"
                          type="text"
                          value={newCatDesc}
                          onChange={(e) => setNewCatDesc(e.target.value)}
                          placeholder="Penjelasan ruang lingkup kategori..."
                          className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 px-3 text-xs font-semibold bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-lg transition-colors cursor-pointer"
                      >
                        + Tambah Kategori Konten
                      </button>
                    </form>

                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-2.5 bg-[#F6F8F6] border border-[#DCE6DF] rounded-lg text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[#0F2417]">
                              {cat.name}{' '}
                              <span className="font-mono-tabular text-[#4B6855] font-normal">
                                ({cat.slug})
                              </span>
                            </p>
                            <p className="text-[11px] text-[#4B6855] line-clamp-1">
                              {cat.description}
                            </p>
                          </div>
                          {currentUser.level <= 1 && categories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeleteCategory(cat.id)}
                              aria-label={`Hapus kategori ${cat.name}`}
                              className="p-1 text-red-700 hover:text-red-900 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* All Content List & Approval Queue */}
              <div className="bg-white border border-[#D5E0D8] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E2ECE5] flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display text-[#0F2417]">
                      Daftar Seluruh Konten &amp; Antrean Persetujuan Level 2 ({contents.length})
                    </h3>
                    <p className="text-xs text-[#4B6855]">
                      Admin (Level 1) dan Superadmin (Level 0) dapat menyetujui artikel berstatus <strong>pending_approval</strong> agar langsung tayang di web publik.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F0F5F1] text-[#3A5243] border-b border-[#D5E0D8]">
                        <th className="py-2.5 px-4 font-semibold">Judul Artikel</th>
                        <th className="py-2.5 px-4 font-semibold">Kategori</th>
                        <th className="py-2.5 px-4 font-semibold">Penulis &amp; Level</th>
                        <th className="py-2.5 px-4 font-semibold">Status Publikasi</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Tindakan Otorisasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6EDE8]">
                      {contents.map((item) => (
                        <tr key={item.id} className="hover:bg-[#F9FBF9]">
                          <td className="py-3 px-4 font-semibold text-[#0F2417] max-w-xs">
                            <p className="truncate">{item.title}</p>
                            <p className="text-[11px] font-normal text-[#4B6855] truncate">
                              {item.summary}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-[#243B2C] whitespace-nowrap">
                            {item.categoryName}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-medium text-[#0F2417]">
                              {item.authorName}
                            </span>
                            <span className="block text-[11px] text-[#4B6855]">
                              Level {item.authorLevel}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium">
                            {item.status === 'published' && (
                              <span className="text-emerald-800">
                                Terbit Resmi (Published)
                              </span>
                            )}
                            {item.status === 'pending_approval' && (
                              <span className="text-amber-700 font-semibold">
                                Menunggu Persetujuan Admin (Lv.1/0)
                              </span>
                            )}
                            {item.status === 'rejected' && (
                              <span className="text-red-700">
                                Ditolak / Revisi
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                            {item.status === 'pending_approval' &&
                              (currentUser.level <= 1 ||
                                currentUser.permissions.canApproveContent) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUpdateContentStatus(item.id, 'published');
                                      showToast(
                                        `Artikel "${item.title}" telah disetujui dan resmi diterbitkan di Website Publik!`
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Setujui &amp; Terbitkan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUpdateContentStatus(item.id, 'rejected');
                                      showToast(
                                        `Artikel "${item.title}" ditolak untuk revisi.`
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-800 rounded cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Tolak</span>
                                  </button>
                                </>
                              )}
                            {currentUser.level <= 1 && (
                              <button
                                type="button"
                                onClick={() => onDeleteContent(item.id)}
                                aria-label={`Hapus artikel ${item.title}`}
                                className="p-1 text-red-700 hover:text-red-900 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              TAB 2B: WORK PROGRAMS MANAGEMENT (LEVEL 0 & LEVEL 1)
          =============================================================== */}
          {activeTab === 'programs' &&
            canManageWorkPrograms(currentUser.level) && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold font-display text-[#0F2417]">
                      Manajemen Program Kerja Organisasi (Tampil di Homepage)
                    </h2>
                    <p className="text-xs text-[#4B6855] mt-1">
                      Menu khusus <strong>Superadmin (Level 0)</strong> dan{' '}
                      <strong>Admin/Editor (Level 1)</strong> untuk mengubah,
                      menambah, atau menghapus daftar Program Kerja yang
                      ditampilkan pada bagian <code>#program</code> di halaman
                      utama.
                    </p>
                  </div>
                  <div className="text-xs font-mono-tabular bg-[#E6EDE8] px-3 py-1.5 rounded-lg text-[#0F2417]">
                    Otorisasi Aktif:{' '}
                    <strong>
                      Level {currentUser.level} (
                      {currentUser.roleName.toUpperCase()})
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Add New Work Program Form */}
                  <form
                    onSubmit={handleAddWorkProgramSubmit}
                    className="lg:col-span-6 bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-4"
                  >
                    <div className="border-b border-[#E2ECE5] pb-3">
                      <h3 className="text-base font-bold font-display text-[#0F2417]">
                        Tambah Program Kerja Baru
                      </h3>
                      <p className="text-xs text-[#4B6855] mt-0.5">
                        Kartu program kerja baru akan langsung tampil pada
                        halaman depan website.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="prog-new-code"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Nomor / Label Kode Program
                      </label>
                      <input
                        id="prog-new-code"
                        type="text"
                        value={newProgCode}
                        onChange={(e) => setNewProgCode(e.target.value)}
                        placeholder="Contoh: 04. Ekowisata & Konservasi Adat"
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg font-mono-tabular"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="prog-new-title"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Judul Program Kerja
                      </label>
                      <input
                        id="prog-new-title"
                        type="text"
                        value={newProgTitle}
                        onChange={(e) => setNewProgTitle(e.target.value)}
                        placeholder="Contoh: Pemberdayaan Masyarakat Hutan Adat"
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="prog-new-desc"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Deskripsi Program Kerja
                      </label>
                      <textarea
                        id="prog-new-desc"
                        rows={3}
                        value={newProgDesc}
                        onChange={(e) => setNewProgDesc(e.target.value)}
                        placeholder="Jelaskan rincian pelaksanaan program kerja organisasi..."
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambahkan ke Program Kerja Homepage</span>
                    </button>
                  </form>

                  {/* Edit Program Kerja Section Headline & Subtitle */}
                  <form
                    onSubmit={handleSaveProgramSectionHeader}
                    className="lg:col-span-6 bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="border-b border-[#E2ECE5] pb-3">
                        <h3 className="text-base font-bold font-display text-[#0F2417]">
                          Judul &amp; Subjudul Seksi Program Kerja
                        </h3>
                        <p className="text-xs text-[#4B6855] mt-0.5">
                          Sesuaikan tajuk utama bagian Program Kerja pada
                          halaman depan.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="prog-sec-title"
                          className="block text-xs font-semibold text-[#0F2417] mb-1"
                        >
                          Judul Seksi Program Kerja
                        </label>
                        <input
                          id="prog-sec-title"
                          type="text"
                          value={cfgForm.programSectionTitle}
                          onChange={(e) =>
                            setCfgForm({
                              ...cfgForm,
                              programSectionTitle: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="prog-sec-subtitle"
                          className="block text-xs font-semibold text-[#0F2417] mb-1"
                        >
                          Deskripsi Subjudul Seksi Program Kerja
                        </label>
                        <textarea
                          id="prog-sec-subtitle"
                          rows={3}
                          value={cfgForm.programSectionSubtitle}
                          onChange={(e) =>
                            setCfgForm({
                              ...cfgForm,
                              programSectionSubtitle: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-fit px-4 py-2.5 text-xs font-semibold bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Simpan Judul Seksi Program Kerja
                    </button>
                  </form>
                </div>

                {/* Existing Work Programs List with Inline Edit & Delete */}
                <div className="bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E2ECE5] pb-3">
                    <div>
                      <h3 className="text-base font-bold font-display text-[#0F2417]">
                        Daftar Program Kerja Aktif di Homepage (
                        {workPrograms.length})
                      </h3>
                      <p className="text-xs text-[#4B6855]">
                        Klik <strong>Ubah Program</strong> untuk menyunting teks
                        kartu Program Kerja secara langsung.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {workPrograms.map((prog) => {
                      const isEditing = editingProgId === prog.id;
                      return (
                        <div
                          key={prog.id}
                          className="bg-[#F6F8F6] border border-[#CED9D1] rounded-xl p-5 flex flex-col justify-between gap-4"
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-[#0F2417] mb-1">
                                  Kode / Nomor Program
                                </label>
                                <input
                                  type="text"
                                  value={editProgCode}
                                  onChange={(e) =>
                                    setEditProgCode(e.target.value)
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#1B4332] rounded-md font-mono-tabular"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#0F2417] mb-1">
                                  Judul Program Kerja
                                </label>
                                <input
                                  type="text"
                                  value={editProgTitle}
                                  onChange={(e) =>
                                    setEditProgTitle(e.target.value)
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#1B4332] rounded-md font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#0F2417] mb-1">
                                  Deskripsi Program
                                </label>
                                <textarea
                                  rows={3}
                                  value={editProgDesc}
                                  onChange={(e) =>
                                    setEditProgDesc(e.target.value)
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#1B4332] rounded-md"
                                />
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveEditWorkProgram(prog.id)
                                  }
                                  className="px-3 py-1.5 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-md cursor-pointer"
                                >
                                  Simpan Perubahan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingProgId(null)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-[#E6EDE8] hover:bg-[#D5E0D8] text-[#0F2417] rounded-md cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div>
                                <p className="text-xs font-mono-tabular font-semibold text-[#2D6A4F] mb-1.5">
                                  {prog.code}
                                </p>
                                <h4 className="text-base font-bold font-display text-[#0F2417] mb-2">
                                  {prog.title}
                                </h4>
                                <p className="text-xs text-[#3A5243] leading-relaxed">
                                  {prog.description}
                                </p>
                              </div>

                              <div className="pt-3 border-t border-[#DCE6DF] flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProgId(prog.id);
                                    setEditProgCode(prog.code);
                                    setEditProgTitle(prog.title);
                                    setEditProgDesc(prog.description);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#EBF1ED] text-[#1B4332] border border-[#CED9D1] rounded-md transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Ubah Program</span>
                                </button>

                                {workPrograms.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteWorkProgram(prog.id);
                                      showToast(
                                        `Program Kerja "${prog.title}" telah dihapus.`
                                      );
                                    }}
                                    aria-label={`Hapus program ${prog.title}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          {/* ===============================================================
              TAB 2C: GOOGLE DRIVE PDF REPOSITORY (LEVEL 0/1 UPLOAD, LEVEL 2 VIEW & DOWNLOAD)
          =============================================================== */}
          {activeTab === 'repository' && (
            <CmsRepositoryTab
              currentUser={currentUser}
              siteName={siteConfig.siteName}
              repositoryFiles={repositoryFiles}
              onUploadRepositoryFile={onUploadRepositoryFile}
              onSyncDriveFiles={onSyncDriveFiles}
              onDeleteRepositoryFile={onDeleteRepositoryFile}
              onNotifyToast={showToast}
            />
          )}

          {/* ===============================================================
              TAB 3: AUTOMATED ORGANIZATIONAL LETTER GENERATOR & COUNTER
          =============================================================== */}
          {activeTab === 'letters' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold font-display text-[#0F2417]">
                    Generator Surat Organisasi Otomatis &amp; Counter Nomor Database
                  </h2>
                  <p className="text-xs text-[#4B6855] mt-1">
                    Unggah/sesuaikan template surat, gunakan penomoran berurutan otomatis, dan kirim pemberitahuan khusus otomatis saat menerbitkan <strong>Surat Tugas</strong>.
                  </p>
                </div>
                <div className="bg-[#0F291E] text-white px-4 py-2 rounded-lg text-xs font-mono-tabular">
                  Nomor Urut Berikutnya: <strong>{nextPreviewNumber}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Create Organizational Letter Form */}
                <form
                  onSubmit={handleCreateLetterSubmit}
                  className="lg:col-span-7 bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-4"
                >
                  <h3 className="text-base font-bold font-display text-[#0F2417] border-b border-[#E2ECE5] pb-3">
                    Terbitkan Surat Organisasi Baru
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="letter-template-select"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Pilih Template Surat
                      </label>
                      <select
                        id="letter-template-select"
                        value={selectedTemplateId}
                        onChange={(e) => {
                          const tpl = templates.find(
                            (t) => t.id === e.target.value
                          );
                          setSelectedTemplateId(e.target.value);
                          if (tpl) {
                            setLetterCategory(tpl.category);
                            setLetterPrefix(tpl.codePrefix);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.codePrefix})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="letter-category-select"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Kategori Surat
                      </label>
                      <select
                        id="letter-category-select"
                        value={letterCategory}
                        onChange={(e) => {
                          const cat = e.target.value as LetterCategory;
                          setLetterCategory(cat);
                          const mapPrefix: Record<LetterCategory, string> = {
                            'Surat Tugas': 'ST',
                            'Surat Keputusan': 'SK',
                            'Surat Undangan': 'SU',
                            'Surat Edaran': 'SE',
                          };
                          setLetterPrefix(mapPrefix[cat]);
                        }}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                      >
                        <option value="Surat Tugas">
                          Surat Tugas (Notifikasi Otomatis Atasan &amp; Petugas)
                        </option>
                        <option value="Surat Keputusan">Surat Keputusan (SK)</option>
                        <option value="Surat Undangan">Surat Undangan (SU)</option>
                        <option value="Surat Edaran">Surat Edaran (SE)</option>
                      </select>
                    </div>
                  </div>

                  {letterCategory === 'Surat Tugas' && (
                    <div className="p-3 bg-[#EBF3EE] border border-[#2D6A4F]/40 rounded-lg text-xs text-[#0F2417]">
                      <strong>Mode Kategori Surat Tugas Aktif:</strong> Sistem secara otomatis akan mengirimkan pemberitahuan khusus ke <strong>Atasan Terkait</strong> dan <strong>Orang yang Diberi Tugas</strong>, serta mencatat log aktivitas real-time untuk audit transparan.
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="letter-subject-input"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Perihal / Subjek Surat
                    </label>
                    <input
                      id="letter-subject-input"
                      type="text"
                      value={letterSubject}
                      onChange={(e) => setLetterSubject(e.target.value)}
                      placeholder="Contoh: Penugasan Inventarisasi Tegakan Hutan Lindung Sektor Mahakam..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="letter-assignee-select"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Orang yang Diberi Tugas / Penerima
                      </label>
                      <select
                        id="letter-assignee-select"
                        value={letterAssigneeId}
                        onChange={(e) => setLetterAssigneeId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                      >
                        {users.map((u) => (
                          <option key={u.uid} value={u.uid}>
                            {u.displayName} (Lv.{u.level} — {u.roleName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="letter-supervisor-select"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Atasan Terkait (Penerima Notifikasi Pengawas)
                      </label>
                      <select
                        id="letter-supervisor-select"
                        value={letterSupervisorId}
                        onChange={(e) => setLetterSupervisorId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                      >
                        {users
                          .filter((u) => u.level <= 1)
                          .map((u) => (
                            <option key={u.uid} value={u.uid}>
                              {u.displayName} (Lv.{u.level} — {u.roleName})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="letter-location-input"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Lokasi Penugasan / Kegiatan
                    </label>
                    <input
                      id="letter-location-input"
                      type="text"
                      value={letterLocation}
                      onChange={(e) => setLetterLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="letter-desc-input"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Rincian Tugas / Isi Pokok Surat
                    </label>
                    <textarea
                      id="letter-desc-input"
                      rows={3}
                      value={letterTaskDesc}
                      onChange={(e) => setLetterTaskDesc(e.target.value)}
                      placeholder="Uraikan instruksi penugasan atau ketetapan surat..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Generate Surat Otomatis ({nextPreviewNumber})
                  </button>
                </form>

                {/* Upload & Customize Letter Template Panel */}
                <form
                  onSubmit={handleSaveNewTemplate}
                  className="lg:col-span-5 bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-4"
                >
                  <div className="border-b border-[#E2ECE5] pb-3">
                    <h3 className="text-base font-bold font-display text-[#0F2417]">
                      Unggah &amp; Sesuaikan Template Surat
                    </h3>
                    <p className="text-xs text-[#4B6855]">
                      Mendukung variabel otomatis: <code className="font-mono-tabular">{'{{NOMOR_SURAT}}'}</code>, <code className="font-mono-tabular">{'{{PENERIMA_TUGAS}}'}</code>, <code className="font-mono-tabular">{'{{ATASAN_TERKAIT}}'}</code>, <code className="font-mono-tabular">{'{{LOKASI}}'}</code>
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="template-file-upload"
                      className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold text-[#1B4332] bg-[#F0F5F1] hover:bg-[#E2ECE5] border border-dashed border-[#2D6A4F] rounded-lg cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah File Template (.txt / .md / .html)</span>
                    </label>
                    <input
                      id="template-file-upload"
                      type="file"
                      accept=".txt,.md,.html"
                      onChange={handleTemplateFileUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label
                        htmlFor="tpl-name-input"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Nama Template Baru
                      </label>
                      <input
                        id="tpl-name-input"
                        type="text"
                        value={tplName}
                        onChange={(e) => setTplName(e.target.value)}
                        placeholder="Misal: Surat Tugas Khusus Audit"
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tpl-prefix-input"
                        className="block text-xs font-semibold text-[#0F2417] mb-1"
                      >
                        Kode Surat
                      </label>
                      <input
                        id="tpl-prefix-input"
                        type="text"
                        value={tplPrefix}
                        onChange={(e) => setTplPrefix(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="tpl-body-editor"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Isi Template Surat (Dapat Disesuaikan)
                    </label>
                    <textarea
                      id="tpl-body-editor"
                      rows={6}
                      value={tplBody}
                      onChange={(e) => setTplBody(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F9FBF9] border border-[#CED9D1] rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 text-xs font-semibold bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Simpan Template Kustom
                  </button>
                </form>
              </div>

              {/* Issued Letters Table & Approval Status Tracker */}
              <div className="bg-white border border-[#D5E0D8] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E2ECE5]">
                  <h3 className="text-base font-bold font-display text-[#0F2417]">
                    Arsip Penomoran Surat &amp; Pelacakan Status Persetujuan ({letters.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F0F5F1] text-[#3A5243] border-b border-[#D5E0D8]">
                        <th className="py-2.5 px-4 font-semibold">Nomor Surat</th>
                        <th className="py-2.5 px-4 font-semibold">Kategori &amp; Perihal</th>
                        <th className="py-2.5 px-4 font-semibold">Penerima &amp; Atasan</th>
                        <th className="py-2.5 px-4 font-semibold">Status Persetujuan</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6EDE8]">
                      {letters.map((letItem) => (
                        <tr key={letItem.id} className="hover:bg-[#F9FBF9]">
                          <td className="py-3 px-4 font-mono-tabular font-semibold text-[#1B4332] whitespace-nowrap">
                            {letItem.letterNumber}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <p className="font-semibold text-[#0F2417]">
                              {letItem.category}
                            </p>
                            <p className="text-[#3A5243] truncate">
                              {letItem.subject}
                            </p>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <p className="font-medium text-[#0F2417]">
                              Tugas: {letItem.recipientName}
                            </p>
                            <p className="text-[11px] text-[#4B6855]">
                              Atasan: {letItem.supervisorName}
                            </p>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {letItem.status === 'approved' && (
                              <span className="text-emerald-800 font-semibold">
                                Disetujui (Approved)
                              </span>
                            )}
                            {letItem.status === 'pending_approval' && (
                              <span className="text-amber-700 font-semibold">
                                Dalam Proses Persetujuan
                              </span>
                            )}
                            {letItem.status === 'rejected' && (
                              <span className="text-red-700 font-semibold">
                                Ditolak
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewLetter(letItem)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#EBF1ED] hover:bg-[#DCE7DF] text-[#0F2417] rounded cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintLetter(letItem)}
                              aria-label={`Print surat ${letItem.letterNumber}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#EBF3EE] hover:bg-[#DCE7DF] text-[#1B4332] border border-[#B7D1C1] rounded cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadLetterPdf(letItem)}
                              aria-label={`Download PDF surat ${letItem.letterNumber}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PDF (.pdf)</span>
                            </button>
                            {letItem.status === 'pending_approval' &&
                              currentUser.level <= 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateLetterStatus(letItem.id, 'approved');
                                    showToast(
                                      `Surat ${letItem.letterNumber} telah disetujui dan notifikasi dikirim ke pemohon!`
                                    );
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Setujui</span>
                                </button>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              TAB 4: ACTIVITY REPORTS BASED ON SURAT TUGAS + APPROVAL LEVEL 1 & 0
          =============================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold font-display text-[#0F2417]">
                  Pelaporan Hasil Kegiatan Berdasarkan Surat Tugas &amp; Approval (Level 1 &amp; Level 0)
                </h2>
                <p className="text-xs text-[#4B6855] mt-1">
                  Laporkan realisasi kegiatan lapangan berdasarkan Surat Tugas lengkap dengan lampiran bukti foto dan dokumen pendukung. Laporan yang diunggah oleh <strong>Anggota Level 2</strong> otomatis masuk ke antrean <strong>Approval Level 1 (Admin/Editor) &amp; Level 0 (Superadmin)</strong>.
                </p>
              </div>

              {/* Approval Queue Panel for Level 2 Task Reports */}
              <div className="bg-[#EBF3EE] border border-[#2D6A4F] rounded-xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold font-display text-[#0F2417]">
                      Antrean Approval Laporan Surat Tugas Anggota Level 2 ({pendingReports.length} Menunggu Persetujuan)
                    </h3>
                    <p className="text-xs text-[#243B2C]">
                      {canApproveTaskReport(currentUser.level)
                        ? `Anda login sebagai Level ${currentUser.level} (${currentUser.roleName.toUpperCase()}) — memiliki wewenang menyetujui (Approve) atau meminta revisi Laporan Surat Tugas dari anggota Level 2.`
                        : 'Anda login sebagai Anggota Level 2 — laporan yang Anda unggah akan diverifikasi dan disetujui (Approve) oleh Admin Level 1 atau Superadmin Level 0.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-md bg-[#1B4332] text-white text-xs font-mono-tabular font-semibold shrink-0">
                    Otorisasi Approval: Level 1 &amp; Level 0
                  </span>
                </div>

                {pendingReports.length === 0 ? (
                  <p className="text-xs text-[#3A5243] bg-white/80 border border-[#CED9D1] rounded-lg p-3">
                    Seluruh Laporan Surat Tugas dari Anggota Level 2 telah selesai diverifikasi / disetujui.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {pendingReports.map((pendRep) => (
                      <div
                        key={pendRep.id}
                        className="bg-white border border-[#CED9D1] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono-tabular font-bold text-[#1B4332]">
                              {pendRep.letterNumber}
                            </span>
                            <span className="text-[#4B6855]">·</span>
                            <span className="font-semibold text-amber-800">
                              Menunggu Approval Level 1 / Level 0
                            </span>
                          </div>
                          <p className="text-sm font-bold text-[#0F2417]">
                            {pendRep.taskTitle}
                          </p>
                          <p className="text-xs text-[#3A5243]">
                            Diunggah oleh Anggota Level 2: <strong>{pendRep.submittedByName}</strong> · Capaian: <strong>{pendRep.completionRate}%</strong> · Lampiran: <code className="font-mono-tabular">{pendRep.photoEvidenceName}</code> &amp; <code className="font-mono-tabular">{pendRep.supportingDocName}</code>
                          </p>
                        </div>

                        {canApproveTaskReport(currentUser.level) && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onVerifyTaskReport(pendRep.id, 'verified');
                                showToast(
                                  `Laporan Surat Tugas "${pendRep.taskTitle}" berhasil di-Approve oleh Level ${currentUser.level} (${currentUser.displayName})!`
                                );
                              }}
                              aria-label={`Approve laporan ${pendRep.taskTitle}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve Laporan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onVerifyTaskReport(
                                  pendRep.id,
                                  'revision_needed'
                                );
                                showToast(
                                  `Laporan "${pendRep.taskTitle}" dikembalikan ke pelapor Level 2 untuk revisi.`
                                );
                              }}
                              aria-label={`Revisi laporan ${pendRep.taskTitle}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-800 rounded-lg cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Minta Revisi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleReportSubmit}
                  className="lg:col-span-6 bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-4"
                >
                  <h3 className="text-base font-bold font-display text-[#0F2417] border-b border-[#E2ECE5] pb-3">
                    Formulir Upload Laporan Hasil Kegiatan
                  </h3>

                  <div>
                    <label
                      htmlFor="report-st-select"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Pilih Referensi Surat Tugas
                    </label>
                    <select
                      id="report-st-select"
                      value={reportLetterId}
                      onChange={(e) => setReportLetterId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    >
                      {suratTugasList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.letterNumber} — {st.subject} ({st.recipientName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="report-title-input"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Judul Laporan Pelaksanaan Kegiatan
                    </label>
                    <input
                      id="report-title-input"
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="Contoh: Hasil Verifikasi Kamera Jebak & Pengukuran Bibit Blok Kapuas..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="report-rate-input"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Persentase Penyelesaian Tugas ({reportRate}%)
                    </label>
                    <input
                      id="report-rate-input"
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={reportRate}
                      onChange={(e) => setReportRate(Number(e.target.value))}
                      className="w-full accent-[#1B4332]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="report-summary-input"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Uraian Hasil Kegiatan &amp; Temuan Lapangan
                    </label>
                    <textarea
                      id="report-summary-input"
                      rows={3}
                      value={reportSummary}
                      onChange={(e) => setReportSummary(e.target.value)}
                      placeholder="Tuliskan hasil pelaksanaan tugas secara terukur (minimal 15 karakter)..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>

                  {/* Photo Evidence & Supporting Document Attachments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-[#F6F8F6] border border-[#CED9D1] rounded-lg space-y-2">
                      <label
                        htmlFor="report-photo-upload"
                        className="block text-xs font-semibold text-[#0F2417]"
                      >
                        1. Lampiran Bukti Foto Kegiatan
                      </label>
                      <input
                        id="report-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUploadChange}
                        className="text-[11px] text-[#3A5243] w-full"
                      />
                      <input
                        type="text"
                        aria-label="Nama file bukti foto"
                        value={reportPhotoName}
                        onChange={(e) => setReportPhotoName(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-white border border-[#CED9D1] rounded font-mono-tabular"
                      />
                    </div>

                    <div className="p-3 bg-[#F6F8F6] border border-[#CED9D1] rounded-lg space-y-2">
                      <label
                        htmlFor="report-doc-upload"
                        className="block text-xs font-semibold text-[#0F2417]"
                      >
                        2. Dokumen Pendukung (PDF/BA)
                      </label>
                      <input
                        id="report-doc-upload"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleDocUploadChange}
                        className="text-[11px] text-[#3A5243] w-full"
                      />
                      <input
                        type="text"
                        aria-label="Nama dokumen pendukung"
                        value={reportDocName}
                        onChange={(e) => setReportDocName(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-white border border-[#CED9D1] rounded font-mono-tabular"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {currentUser.level === 2
                      ? 'Upload Laporan Surat Tugas (Ajukan Approval ke Level 1 & 0)'
                      : 'Kirim Laporan Kegiatan & Lampiran Bukti'}
                  </button>
                </form>

                {/* Submitted Reports Cards with Photo Evidence & Document Preview */}
                <div className="lg:col-span-6 space-y-4">
                  <h3 className="text-base font-bold font-display text-[#0F2417]">
                    Daftar Laporan Kegiatan Terlampir ({reports.length})
                  </h3>

                  {reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-white border border-[#D5E0D8] rounded-xl overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12">
                        <div className="sm:col-span-4">
                          {rep.photoEvidenceData.startsWith('data:image/') ? (
                            <img
                              src={rep.photoEvidenceData}
                              alt={rep.photoEvidenceName}
                              referrerPolicy="no-referrer"
                              className="w-full h-full min-h-[140px] object-cover"
                            />
                          ) : (
                            <ArticleThemeIllustration
                              theme={
                                (rep.photoEvidenceData.replace(
                                  'svg:',
                                  ''
                                ) as VisualTheme) || 'reforestation'
                              }
                              title={rep.taskTitle}
                              className="h-full min-h-[140px]"
                            />
                          )}
                        </div>
                        <div className="sm:col-span-8 p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-xs text-[#4B6855] mb-1">
                              <span className="font-mono-tabular font-semibold text-[#1B4332]">
                                Ref: {rep.letterNumber}
                              </span>
                              <span className="font-mono-tabular font-bold text-[#0F2417]">
                                Capaian: {rep.completionRate}%
                              </span>
                            </div>
                            <h4 className="text-sm font-bold font-display text-[#0F2417] mb-1">
                              {rep.taskTitle}
                            </h4>
                            <p className="text-xs text-[#3A5243] leading-relaxed mb-3">
                              {rep.summaryResult}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-[#E6EDE8] space-y-1 text-[11px] text-[#4B6855]">
                            <p className="font-mono-tabular">
                              Bukti Foto: <strong>{rep.photoEvidenceName}</strong>
                            </p>
                            <p className="font-mono-tabular">
                              Dokumen: <strong>{rep.supportingDocName}</strong> ({rep.supportingDocSummary})
                            </p>
                            <div className="flex items-center justify-between flex-wrap gap-2 pt-1.5">
                              <span>Pelapor: {rep.submittedByName}</span>
                              {rep.verificationStatus === 'verified' && (
                                <span className="text-emerald-800 font-semibold">
                                  Disetujui / Terverifikasi (Level 1/0)
                                </span>
                              )}
                              {rep.verificationStatus === 'revision_needed' && (
                                <span className="text-red-700 font-semibold">
                                  Perlu Revisi
                                </span>
                              )}
                              {rep.verificationStatus === 'submitted' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-amber-700 font-semibold">
                                    Menunggu Approval Lv.1/0
                                  </span>
                                  {canApproveTaskReport(currentUser.level) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onVerifyTaskReport(rep.id, 'verified');
                                        showToast(
                                          `Laporan "${rep.taskTitle}" berhasil di-Approve oleh Level ${currentUser.level}!`
                                        );
                                      }}
                                      className="px-2.5 py-1 bg-[#1B4332] hover:bg-[#143325] text-white rounded font-semibold cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              TAB 5: REAL-TIME USER & PRIVILEGE MANAGEMENT (LEVEL 0, 1, 2)
          =============================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold font-display text-[#0F2417]">
                  Manajemen User &amp; Pengaturan Hak Akses Real-Time (Level 0, 1, 2)
                </h2>
                <p className="text-xs text-[#4B6855] mt-1">
                  Kelola pemisahan level pengguna: <strong>Level 0 (Superadmin)</strong>, <strong>Level 1 (Admin / Editor)</strong>, dan <strong>Level 2 (User Biasa / Kontributor)</strong> beserta hak akses sistem.
                </p>
              </div>

              {/* Add New User Form */}
              <form
                onSubmit={handleAddUserSubmit}
                className="bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-4"
              >
                <h3 className="text-base font-bold font-display text-[#0F2417] border-b border-[#E2ECE5] pb-3">
                  Registrasi Pengguna Terverifikasi Baru
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label
                      htmlFor="new-user-name"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Nama Lengkap
                    </label>
                    <input
                      id="new-user-name"
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Nama personel..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-user-email"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Email Resmi (PII Terisolasi)
                    </label>
                    <input
                      id="new-user-email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="nama@wanalestari.or.id"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-user-dept"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Divisi / Unit Kerja
                    </label>
                    <input
                      id="new-user-dept"
                      type="text"
                      value={newUserDept}
                      onChange={(e) => setNewUserDept(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-user-level"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Level Otorisasi
                    </label>
                    <select
                      id="new-user-level"
                      value={newUserLevel}
                      onChange={(e) => {
                        const lv = Number(e.target.value) as UserLevel;
                        setNewUserLevel(lv);
                        if (lv === 0) setNewUserRole('superadmin');
                        else if (lv === 1) setNewUserRole('admin');
                        else setNewUserRole('contributor');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    >
                      <option value={0}>Level 0 — Superadmin</option>
                      <option value={1}>Level 1 — Admin / Editor</option>
                      <option value={2}>Level 2 — User Biasa / Kontributor</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 px-4 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg transition-colors cursor-pointer"
                    >
                      + Tambah User
                    </button>
                  </div>
                </div>
              </form>

              {/* Users & Granular Privilege Matrix Table */}
              <div className="bg-white border border-[#D5E0D8] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E2ECE5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-base font-bold font-display text-[#0F2417]">
                    Matriks Hak Akses &amp; Level Pengguna Real-Time ({users.length} Akun)
                  </h3>
                  <span className="text-xs text-[#1B4332] font-medium">
                    {canSuperadminEditUserName(currentUser.level)
                      ? 'Mode Superadmin (Level 0): Dapat mengedit Nama, Unit Kerja, dan menonaktifkan pengguna'
                      : 'Hanya Superadmin (Level 0) yang dapat mengedit Nama, Unit Kerja & status aktif pengguna'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F0F5F1] text-[#3A5243] border-b border-[#D5E0D8]">
                        <th className="py-2.5 px-4 font-semibold">Nama &amp; Unit Kerja</th>
                        <th className="py-2.5 px-4 font-semibold">Level &amp; Peran</th>
                        <th className="py-2.5 px-4 font-semibold">Status &amp; Autentikasi</th>
                        <th className="py-2.5 px-4 font-semibold">Hak Akses Spesifik (Real-Time Toggle)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6EDE8]">
                      {users.map((u) => {
                        const isUserActive = u.isActive !== false;
                        return (
                          <tr
                            key={u.uid}
                            className={`hover:bg-[#F9FBF9] ${
                              !isUserActive ? 'bg-red-50/40 opacity-80' : ''
                            }`}
                          >
                            <td className="py-3 px-4 space-y-1.5">
                              {/* Inline Name Editor for Level 0 Superadmin */}
                              {editingUserId === u.uid &&
                              canSuperadminEditUserName(currentUser.level) ? (
                                <div className="space-y-2 max-w-xs">
                                  <input
                                    type="text"
                                    aria-label={`Input nama baru untuk ${u.displayName}`}
                                    value={editingUserNameValue}
                                    onChange={(e) =>
                                      setEditingUserNameValue(e.target.value)
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#1B4332] rounded font-semibold text-[#0F2417]"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const check = validateAndFormatUserName(
                                          editingUserNameValue
                                        );
                                        if (!check.valid) {
                                          showToast(
                                            check.error || 'Nama tidak valid.'
                                          );
                                          return;
                                        }
                                        onUpdateUserName(u.uid, check.cleanedName);
                                        setEditingUserId(null);
                                        setEditingUserNameValue('');
                                        showToast(
                                          `Nama pengguna berhasil diperbarui menjadi "${check.cleanedName}" oleh Superadmin.`
                                        );
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded cursor-pointer"
                                    >
                                      Simpan Nama
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUserId(null);
                                        setEditingUserNameValue('');
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#E6EDE8] hover:bg-[#D5E0D8] text-[#0F2417] rounded cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center flex-wrap gap-2">
                                  <p
                                    className={`font-semibold ${
                                      isUserActive
                                        ? 'text-[#0F2417]'
                                        : 'text-red-900 line-through'
                                    }`}
                                  >
                                    {u.displayName}
                                  </p>
                                  {canSuperadminEditUserName(currentUser.level) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUserId(u.uid);
                                        setEditingUserNameValue(u.displayName);
                                      }}
                                      aria-label={`Edit nama ${u.displayName}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-[#1B4332] bg-[#EBF3EE] hover:bg-[#DCE7DF] rounded transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      <span>Edit Nama</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Inline Unit Kerja (Department) Editor for Level 0 Superadmin */}
                              {editingDeptUserId === u.uid &&
                              canSuperadminEditUserName(currentUser.level) ? (
                                <div className="space-y-2 max-w-xs pt-1">
                                  <input
                                    type="text"
                                    aria-label={`Input unit kerja baru untuk ${u.displayName}`}
                                    value={editingDeptValue}
                                    onChange={(e) =>
                                      setEditingDeptValue(e.target.value)
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#1B4332] rounded font-medium text-[#0F2417]"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const check =
                                          validateAndFormatDepartment(
                                            editingDeptValue
                                          );
                                        if (!check.valid) {
                                          showToast(
                                            check.error ||
                                              'Unit Kerja tidak valid.'
                                          );
                                          return;
                                        }
                                        onUpdateUserDepartment(
                                          u.uid,
                                          check.cleanedDepartment
                                        );
                                        setEditingDeptUserId(null);
                                        setEditingDeptValue('');
                                        showToast(
                                          `Unit Kerja ${u.displayName} berhasil diperbarui menjadi "${check.cleanedDepartment}".`
                                        );
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded cursor-pointer"
                                    >
                                      Simpan Unit Kerja
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingDeptUserId(null);
                                        setEditingDeptValue('');
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#E6EDE8] hover:bg-[#D5E0D8] text-[#0F2417] rounded cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center flex-wrap gap-2">
                                  <p className="text-[11px] font-mono-tabular text-[#4B6855]">
                                    {u.email} · Unit Kerja:{' '}
                                    <strong className="text-[#0F2417]">
                                      {u.department}
                                    </strong>
                                  </p>
                                  {canSuperadminEditUserName(
                                    currentUser.level
                                  ) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingDeptUserId(u.uid);
                                        setEditingDeptValue(u.department);
                                      }}
                                      aria-label={`Edit Unit Kerja ${u.displayName}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-[#1B4332] bg-[#EBF3EE] hover:bg-[#DCE7DF] rounded transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      <span>Edit Unit Kerja</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <select
                                aria-label={`Ubah level untuk ${u.displayName}`}
                                value={`${u.level}:${u.roleName}`}
                                onChange={(e) => {
                                  const [lvStr, rName] =
                                    e.target.value.split(':');
                                  const newLv = Number(lvStr) as UserLevel;
                                  const newRole = rName as RoleName;
                                  onUpdateUserRoleAndPermissions(
                                    u.uid,
                                    newLv,
                                    newRole,
                                    u.isVerified,
                                    getDefaultPermissionsForLevel(newLv)
                                  );
                                  showToast(
                                    `Hak akses ${u.displayName} diperbarui menjadi Level ${newLv} (${newRole.toUpperCase()}).`
                                  );
                                }}
                                className="px-2.5 py-1.5 text-xs bg-white border border-[#CED9D1] rounded font-semibold text-[#0F2417]"
                              >
                                <option value="0:superadmin">
                                  Level 0 — Superadmin
                                </option>
                                <option value="1:admin">
                                  Level 1 — Admin
                                </option>
                                <option value="1:editor">
                                  Level 1 — Editor
                                </option>
                                <option value="2:contributor">
                                  Level 2 — User / Kontributor
                                </option>
                              </select>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[11px] font-semibold ${
                                    isUserActive
                                      ? 'text-emerald-800'
                                      : 'text-red-700'
                                  }`}
                                >
                                  Status: {isUserActive ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[#1B4332] font-mono-tabular text-[11px]">
                                  <Shield className="w-3 h-3" />
                                  <span>{u.authProvider}</span>
                                </span>
                              </div>

                              {/* Password Viewer & Inline Editor for Level 0 Superadmin */}
                              {canSuperadminManageUserPassword(
                                currentUser.level
                              ) && (
                                <div className="pt-0.5">
                                  {editingPasswordUserId === u.uid ? (
                                    <div className="space-y-1.5 max-w-xs">
                                      <input
                                        type="text"
                                        aria-label={`Input password baru untuk ${u.displayName}`}
                                        value={editingPasswordValue}
                                        onChange={(e) =>
                                          setEditingPasswordValue(
                                            e.target.value
                                          )
                                        }
                                        placeholder="Masukkan password baru..."
                                        className="w-full px-2.5 py-1 text-xs font-mono-tabular bg-white border border-[#1B4332] rounded text-[#0F2417]"
                                      />
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const check =
                                              validateAndFormatUserPassword(
                                                editingPasswordValue
                                              );
                                            if (!check.valid) {
                                              showToast(
                                                check.error ||
                                                  'Password tidak valid.'
                                              );
                                              return;
                                            }
                                            onUpdateUserPassword(
                                              u.uid,
                                              check.cleanedPassword
                                            );
                                            setEditingPasswordUserId(null);
                                            setEditingPasswordValue('');
                                            showToast(
                                              `Password untuk "${u.displayName}" berhasil diperbarui oleh Superadmin.`
                                            );
                                          }}
                                          className="px-2.5 py-1 text-[11px] font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded cursor-pointer"
                                        >
                                          Simpan Password
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingPasswordUserId(null);
                                            setEditingPasswordValue('');
                                          }}
                                          className="px-2.5 py-1 text-[11px] font-semibold bg-[#E6EDE8] hover:bg-[#D5E0D8] text-[#0F2417] rounded cursor-pointer"
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center flex-wrap gap-1.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0F5F1] border border-[#D5E0D8] rounded text-[11px] font-mono-tabular text-[#0F2417]">
                                        <KeyRound className="w-3 h-3 text-[#1B4332]" />
                                        <span>Password:</span>
                                        <strong data-testid={`user-password-${u.uid}`}>
                                          {hiddenPasswordUids[u.uid]
                                            ? '••••••••••••'
                                            : getEffectiveUserPassword(u)}
                                        </strong>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setHiddenPasswordUids((prev) => ({
                                            ...prev,
                                            [u.uid]: !prev[u.uid],
                                          }))
                                        }
                                        aria-label={
                                          hiddenPasswordUids[u.uid]
                                            ? `Tampilkan password ${u.displayName}`
                                            : `Sembunyikan password ${u.displayName}`
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-[#3A5243] bg-[#F0F5F1] hover:bg-[#E2ECE5] rounded transition-colors cursor-pointer"
                                      >
                                        {hiddenPasswordUids[u.uid] ? (
                                          <Eye className="w-3 h-3" />
                                        ) : (
                                          <EyeOff className="w-3 h-3" />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPasswordUserId(u.uid);
                                          setEditingPasswordValue(
                                            getEffectiveUserPassword(u)
                                          );
                                        }}
                                        aria-label={`Edit password ${u.displayName}`}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-[#1B4332] bg-[#EBF3EE] hover:bg-[#DCE7DF] rounded transition-colors cursor-pointer"
                                      >
                                        <Pencil className="w-3 h-3" />
                                        <span>Edit Password</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {canSuperadminManageUserStatus(
                                currentUser.level,
                                currentUser.uid,
                                u.uid
                              ) && (
                                <div className="flex items-center flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onToggleUserActive(u.uid);
                                      showToast(
                                        isUserActive
                                          ? `Akun pengguna "${u.displayName}" telah dinonaktifkan oleh Superadmin.`
                                          : `Akun pengguna "${u.displayName}" telah diaktifkan kembali oleh Superadmin.`
                                      );
                                    }}
                                    aria-label={
                                      isUserActive
                                        ? `Nonaktifkan user ${u.displayName}`
                                        : `Aktifkan user ${u.displayName}`
                                    }
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                                      isUserActive
                                        ? 'bg-red-100 hover:bg-red-200 text-red-800'
                                        : 'bg-[#1B4332] hover:bg-[#143325] text-white'
                                    }`}
                                  >
                                    <Power className="w-3 h-3" />
                                    <span>
                                      {isUserActive
                                        ? 'Nonaktifkan User'
                                        : 'Aktifkan User'}
                                    </span>
                                  </button>

                                  {canSuperadminDeleteUser(
                                    currentUser.level,
                                    currentUser.uid,
                                    u.uid
                                  ) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteUser(u.uid);
                                        showToast(
                                          `Pengguna "${u.displayName}" berhasil dihapus dari sistem oleh Superadmin.`
                                        );
                                      }}
                                      aria-label={`Hapus user ${u.displayName}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-red-700 hover:bg-red-800 text-white rounded transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Hapus User</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-3">
                                {(
                                  [
                                    ['canManageContent', 'CRUD Konten'],
                                    ['canApproveContent', 'Approve Konten Lv.2'],
                                    ['canManageLetters', 'Buat Surat'],
                                    ['canApproveLetters', 'Approve Surat'],
                                    ['canSubmitReports', 'Lapor Tugas'],
                                    ['canConfigureWeb', 'Konfigurasi Web'],
                                  ] as const
                                ).map(([permKey, label]) => (
                                  <label
                                    key={permKey}
                                    className="inline-flex items-center gap-1.5 text-[11px] text-[#243B2C] cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={!isUserActive}
                                      checked={u.permissions[permKey]}
                                      onChange={(e) => {
                                        onUpdateUserRoleAndPermissions(
                                          u.uid,
                                          u.level,
                                          u.roleName,
                                          u.isVerified,
                                          {
                                            ...u.permissions,
                                            [permKey]: e.target.checked,
                                          }
                                        );
                                        showToast(
                                          `Izin "${label}" untuk ${u.displayName} diperbarui secara real-time.`
                                        );
                                      }}
                                      className="accent-[#1B4332]"
                                    />
                                    <span>{label}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              TAB 6: WEBSITE CONFIGURATION (NAME, CP, HERO, ADDRESS)
          =============================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold font-display text-[#0F2417]">
                  Konfigurasi Tampilan Website Publik (Nama Web, CP, Hero &amp; Kontak)
                </h2>
                <p className="text-xs text-[#4B6855] mt-1">
                  Perubahan pada formulir ini akan langsung memperbarui tampilan halaman depan Website bertema Hijau Hutan secara real-time.
                </p>
              </div>

              <form
                onSubmit={handleSaveSiteConfig}
                className="bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-4 max-w-3xl"
              >
                {/* Logo Organisasi YGI Upload Section */}
                <div className="p-4 bg-[#F6F8F6] border border-[#CED9D1] rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={cfgForm.logoUrl || DEFAULT_YGI_LOGO_DATA_URL}
                        alt="Pratinjau Logo Organisasi YGI"
                        data-testid="cms-logo-preview"
                        referrerPolicy="no-referrer"
                        className="h-20 w-auto min-w-[5rem] max-w-[240px] rounded-xl object-contain object-center bg-[#0F291E] border border-[#1B4332] p-1.5 shrink-0 block"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#0F2417]">
                          Logo Organisasi YGI (Ukuran Diperbesar &amp; Utuh Tanpa Terpotong)
                        </p>
                        <p className="text-[11px] text-[#4B6855]">
                          Unggah gambar logo resmi Yayasan Gunung Parama Indonesia (.png, .jpg, .svg, .webp). Sistem otomatis menyesuaikan rasio penuh tanpa memotong bagian bawah logo.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label
                        htmlFor="cfg-logo-upload"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo YGI</span>
                      </label>
                      <input
                        id="cfg-logo-upload"
                        type="file"
                        accept="image/*"
                        aria-label="Upload Logo Organisasi YGI"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCfgForm({
                            ...cfgForm,
                            logoUrl: DEFAULT_YGI_LOGO_DATA_URL,
                          })
                        }
                        className="px-2.5 py-2 text-xs font-semibold bg-[#E6EDE8] hover:bg-[#D5E0D8] text-[#0F2417] rounded-lg cursor-pointer"
                      >
                        Reset Default YGI
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="cfg-logo-url"
                      className="block text-[11px] font-semibold text-[#0F2417] mb-1"
                    >
                      Atau Masukkan URL / Data URI Logo Organisasi YGI
                    </label>
                    <input
                      id="cfg-logo-url"
                      type="text"
                      value={cfgForm.logoUrl}
                      onChange={(e) =>
                        setCfgForm({ ...cfgForm, logoUrl: e.target.value })
                      }
                      placeholder="https://... atau data:image/..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#CED9D1] rounded-lg font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="cfg-site-name"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Nama Website / Organisasi
                    </label>
                    <input
                      id="cfg-site-name"
                      type="text"
                      value={cfgForm.siteName}
                      onChange={(e) =>
                        setCfgForm({ ...cfgForm, siteName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cfg-tagline"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Tagline / Subjudul Lembaga
                    </label>
                    <input
                      id="cfg-tagline"
                      type="text"
                      value={cfgForm.tagline}
                      onChange={(e) =>
                        setCfgForm({ ...cfgForm, tagline: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cfg-hero-title"
                    className="block text-xs font-semibold text-[#0F2417] mb-1"
                  >
                    Headline Utama Hero Website
                  </label>
                  <input
                    id="cfg-hero-title"
                    type="text"
                    value={cfgForm.heroTitle}
                    onChange={(e) =>
                      setCfgForm({ ...cfgForm, heroTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cfg-hero-desc"
                    className="block text-xs font-semibold text-[#0F2417] mb-1"
                  >
                    Deskripsi Hero Website
                  </label>
                  <textarea
                    id="cfg-hero-desc"
                    rows={2}
                    value={cfgForm.heroDescription}
                    onChange={(e) =>
                      setCfgForm({ ...cfgForm, heroDescription: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E2ECE5]">
                  <div>
                    <label
                      htmlFor="cfg-cp-name"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Nama Contact Person (CP)
                    </label>
                    <input
                      id="cfg-cp-name"
                      type="text"
                      value={cfgForm.contactPersonName}
                      onChange={(e) =>
                        setCfgForm({
                          ...cfgForm,
                          contactPersonName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cfg-cp-phone"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Nomor Telepon / WhatsApp CP
                    </label>
                    <input
                      id="cfg-cp-phone"
                      type="text"
                      value={cfgForm.contactPersonPhone}
                      onChange={(e) =>
                        setCfgForm({
                          ...cfgForm,
                          contactPersonPhone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg font-mono-tabular"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cfg-cp-email"
                      className="block text-xs font-semibold text-[#0F2417] mb-1"
                    >
                      Email Resmi CP
                    </label>
                    <input
                      id="cfg-cp-email"
                      type="email"
                      value={cfgForm.contactPersonEmail}
                      onChange={(e) =>
                        setCfgForm({
                          ...cfgForm,
                          contactPersonEmail: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg font-mono-tabular"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cfg-address"
                    className="block text-xs font-semibold text-[#0F2417] mb-1"
                  >
                    Alamat Kantor Sekretariat
                  </label>
                  <input
                    id="cfg-address"
                    type="text"
                    value={cfgForm.officeAddress}
                    onChange={(e) =>
                      setCfgForm({ ...cfgForm, officeAddress: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cfg-footer"
                    className="block text-xs font-semibold text-[#0F2417] mb-1"
                  >
                    Teks Hak Cipta Footer
                  </label>
                  <input
                    id="cfg-footer"
                    type="text"
                    value={cfgForm.footerText}
                    onChange={(e) =>
                      setCfgForm({ ...cfgForm, footerText: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
                  />
                </div>

                {/* Allowed Deployment Domains for Google OAuth (Vercel & Custom Domains) */}
                <div className="p-4 bg-[#F6F8F6] border border-[#CED9D1] rounded-xl space-y-2">
                  <label
                    htmlFor="cfg-allowed-domains"
                    className="block text-xs font-bold text-[#0F2417]"
                  >
                    Allowlist Domain Otorisasi Login Google (Termasuk Vercel Deployment)
                  </label>
                  <p className="text-[11px] text-[#4B6855]">
                    Daftar domain yang diizinkan untuk autentikasi Google OAuth (pisahkan dengan koma). Domain <strong>https://ygi-omega.vercel.app/</strong> (<code>ygi-omega.vercel.app</code>) telah ditambahkan secara default.
                  </p>
                  <input
                    id="cfg-allowed-domains"
                    type="text"
                    value={cfgForm.allowedDomainsText}
                    onChange={(e) =>
                      setCfgForm({
                        ...cfgForm,
                        allowedDomainsText: e.target.value,
                      })
                    }
                    placeholder="ygi-omega.vercel.app, https://ygi-omega.vercel.app, level-router-mcf5x.firebaseapp.com, localhost"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg font-mono-tabular"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg transition-colors cursor-pointer"
                >
                  Simpan Konfigurasi Website Sekarang
                </button>
              </form>
            </div>
          )}

          {/* ===============================================================
              TAB 7: NOTIFICATIONS & REAL-TIME ACTIVITY LOGS
          =============================================================== */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold font-display text-[#0F2417]">
                  {canViewAuditLogs(currentUser.level)
                    ? 'Pusat Notifikasi Persetujuan Surat, Penugasan & Log Audit Real-Time'
                    : 'Pusat Notifikasi Persetujuan Surat, Penugasan & Pelaporan'}
                </h2>
                <p className="text-xs text-[#4B6855] mt-1">
                  {canViewAuditLogs(currentUser.level)
                    ? 'Lacak pemberitahuan otomatis untuk Atasan Terkait, Penerima Surat Tugas, status persetujuan surat, serta jejak audit sistem.'
                    : 'Lacak pemberitahuan otomatis untuk Atasan Terkait, Penerima Surat Tugas, serta status persetujuan surat dan laporan kegiatan.'}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div
                  className={`${
                    canViewAuditLogs(currentUser.level)
                      ? 'lg:col-span-6'
                      : 'lg:col-span-12'
                  } bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-3`}
                >
                  <h3 className="text-base font-bold font-display text-[#0F2417] border-b border-[#E2ECE5] pb-3">
                    Daftar Notifikasi Sistem ({notifications.length})
                  </h3>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 rounded-lg border text-xs ${
                          notif.isRead
                            ? 'bg-[#F9FBF9] border-[#DCE6DF]'
                            : 'bg-[#EBF3EE] border-[#2D6A4F]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono-tabular font-semibold text-[#1B4332]">
                            {notif.category.toUpperCase()}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-[#4B6855]">
                            {new Date(notif.createdAt).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="font-bold text-[#0F2417] mb-1">
                          {notif.title}
                        </p>
                        <p className="text-[#243B2C] leading-relaxed mb-2">
                          {notif.message}
                        </p>
                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(notif.id)}
                            className="text-[11px] font-semibold text-[#1B4332] underline cursor-pointer"
                          >
                            Tandai Sudah Dibaca
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {canViewAuditLogs(currentUser.level) && (
                  <div className="lg:col-span-6 bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-3">
                    <h3 className="text-base font-bold font-display text-[#0F2417] border-b border-[#E2ECE5] pb-3">
                      Rekam Jejak Log Aktivitas Audit ({activityLogs.length})
                    </h3>

                    <div className="space-y-3 max-h-[460px] overflow-y-auto">
                      {activityLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3.5 bg-[#F6F8F6] border border-[#DCE6DF] rounded-lg text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] text-[#4B6855] mb-1">
                            <span className="font-mono-tabular font-semibold text-[#1B4332]">
                              {log.actionType}
                            </span>
                            <span className="font-mono-tabular">
                              {new Date(log.createdAt).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <p className="text-[#0F2417] font-medium mb-1">
                            {log.details}
                          </p>
                          <p className="text-[11px] text-[#4B6855]">
                            Oleh: {log.actorName} (Level {log.actorLevel})
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Preview Surat Organisasi */}
      {previewLetter && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="letter-preview-title"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#CED9D1] rounded-xl max-w-2xl w-full overflow-hidden shadow-xl">
            <div className="bg-[#0F291E] text-white px-6 py-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono-tabular text-emerald-300">
                  DOKUMEN RESMI ORGANISASI (YGI)
                </p>
                <h3
                  id="letter-preview-title"
                  className="text-base font-bold font-display"
                >
                  {previewLetter.letterNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintLetter(previewLetter)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#1E4631] hover:bg-[#2D6A4F] text-white rounded cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Surat</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadLetterPdf(previewLetter)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#A7F3D0] hover:bg-[#6EE7B7] text-[#0F291E] rounded cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF (.pdf)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLetter(null)}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-900/80 hover:bg-red-800 text-white rounded cursor-pointer"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="border-b-2 border-[#0F291E] pb-3 flex items-center justify-center gap-3 text-center">
                <img
                  src={siteConfig.logoUrl || DEFAULT_YGI_LOGO_DATA_URL}
                  alt="Logo YGI"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded object-contain bg-[#0F291E] p-1 shrink-0"
                />
                <div>
                  <p className="text-base font-bold font-display text-[#0F2417]">
                    {siteConfig.siteName.toUpperCase()} (YGI)
                  </p>
                  <p className="text-xs text-[#4B6855]">
                    {siteConfig.officeAddress} · Telp: {siteConfig.contactPersonPhone}
                  </p>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-xs font-mono-tabular text-[#0F2417] bg-[#F6F8F6] p-4 rounded-lg border border-[#DCE6DF] leading-relaxed">
                {previewLetter.renderedBody}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
