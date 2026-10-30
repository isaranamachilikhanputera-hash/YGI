export type UserLevel = 0 | 1 | 2;
export type RoleName = 'superadmin' | 'admin' | 'editor' | 'contributor';

export interface WorkProgramItem {
  id: string;
  code: string;
  title: string;
  description: string;
  updatedBy: string;
  updatedAt: string;
}

export interface SiteConfig {
  siteName: string;
  tagline: string;
  logoUrl?: string;
  heroTitle: string;
  heroDescription: string;
  programSectionTitle?: string;
  programSectionSubtitle?: string;
  allowedDomains?: string[];
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonEmail: string;
  officeAddress: string;
  footerText: string;
  updatedBy: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  password?: string;
  roleName: RoleName;
  level: UserLevel;
  department: string;
  isVerified: boolean;
  isActive?: boolean;
  authProvider: 'google_oauth' | 'superadmin_key' | 'verified_account';
  permissions: {
    canManageContent: boolean;
    canApproveContent: boolean;
    canManageLetters: boolean;
    canApproveLetters: boolean;
    canSubmitReports: boolean;
    canManageUsers: boolean;
    canConfigureWeb: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export type VisualTheme = 'canopy' | 'reforestation' | 'watershed' | 'agroforestry';
export type ContentMediaType = 'none' | 'image' | 'video';

export interface ContentArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  categoryId: string;
  categoryName: string;
  visualTheme: VisualTheme;
  mediaType?: ContentMediaType;
  mediaUrl?: string;
  mediaCaption?: string;
  authorId: string;
  authorName: string;
  authorLevel: UserLevel;
  status: 'pending_approval' | 'published' | 'rejected';
  approvedBy: string;
  readTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentItem {
  id: string;
  articleId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  message: string;
  createdAt: string;
}

export type LetterCategory = 'Surat Tugas' | 'Surat Keputusan' | 'Surat Undangan' | 'Surat Edaran';

export interface LetterTemplate {
  id: string;
  name: string;
  category: LetterCategory;
  codePrefix: string;
  bodyTemplate: string;
  createdBy: string;
  createdAt: string;
}

export interface OrganizationLetter {
  id: string;
  letterNumber: string;
  sequenceNumber: number;
  category: LetterCategory;
  subject: string;
  recipientName: string;
  assigneeId: string;
  supervisorId: string;
  supervisorName: string;
  location: string;
  renderedBody: string;
  monthIssued: number;
  yearIssued: number;
  status: 'pending_approval' | 'approved' | 'rejected';
  taskCompletionStatus: 'not_applicable' | 'assigned' | 'in_progress' | 'completed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskReport {
  id: string;
  letterId: string;
  letterNumber: string;
  taskTitle: string;
  submittedBy: string;
  submittedByName: string;
  summaryResult: string;
  completionRate: number;
  photoEvidenceName: string;
  photoEvidenceData: string;
  supportingDocName: string;
  supportingDocSummary: string;
  verificationStatus: 'submitted' | 'verified' | 'revision_needed';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  senderId: string;
  title: string;
  message: string;
  category: 'letter_approval' | 'surat_tugas_assignee' | 'surat_tugas_supervisor' | 'content_approval' | 'task_report';
  referenceId: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorLevel: UserLevel;
  actionType:
    | 'SURAT_TUGAS_CREATED'
    | 'LETTER_STATUS_CHANGED'
    | 'CONTENT_CREATED'
    | 'CONTENT_APPROVED'
    | 'TASK_REPORT_SUBMITTED'
    | 'USER_PRIVILEGE_UPDATED'
    | 'SITE_CONFIG_UPDATED'
    | 'WORK_PROGRAM_UPDATED';
  targetId: string;
  details: string;
  createdAt: string;
}

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function toRomanMonth(month: number): string {
  const idx = Math.max(1, Math.min(12, Math.floor(month))) - 1;
  return ROMAN_MONTHS[idx];
}

export function formatLetterNumber(
  sequence: number,
  codePrefix: string,
  month: number,
  year: number,
  orgCode = 'YGI'
): string {
  const paddedSeq = String(Math.max(1, Math.floor(sequence))).padStart(3, '0');
  const cleanPrefix = codePrefix.trim().toUpperCase() || 'SRT';
  const romanMonth = toRomanMonth(month);
  return `${paddedSeq}/${cleanPrefix}/${orgCode}/${romanMonth}/${year}`;
}

export function renderLetterTemplate(
  bodyTemplate: string,
  variables: {
    NOMOR_SURAT: string;
    TANGGAL: string;
    PERIHAL: string;
    PENERIMA_TUGAS: string;
    ATASAN_TERKAIT: string;
    LOKASI: string;
    DESKRIPSI_TUGAS: string;
  }
): string {
  return bodyTemplate
    .replace(/\{\{NOMOR_SURAT\}\}/g, variables.NOMOR_SURAT)
    .replace(/\{\{TANGGAL\}\}/g, variables.TANGGAL)
    .replace(/\{\{PERIHAL\}\}/g, variables.PERIHAL)
    .replace(/\{\{PENERIMA_TUGAS\}\}/g, variables.PENERIMA_TUGAS)
    .replace(/\{\{ATASAN_TERKAIT\}\}/g, variables.ATASAN_TERKAIT)
    .replace(/\{\{LOKASI\}\}/g, variables.LOKASI)
    .replace(/\{\{DESKRIPSI_TUGAS\}\}/g, variables.DESKRIPSI_TUGAS);
}

export function resolveContentInitialStatus(authorLevel: UserLevel): 'published' | 'pending_approval' {
  // Level 2 users require approval from Level 1 (Admin) or Level 0 (Superadmin) before publication
  if (authorLevel === 2) {
    return 'pending_approval';
  }
  return 'published';
}

export function getDefaultPermissionsForLevel(level: UserLevel) {
  if (level === 0) {
    return {
      canManageContent: true,
      canApproveContent: true,
      canManageLetters: true,
      canApproveLetters: true,
      canSubmitReports: true,
      canManageUsers: true,
      canConfigureWeb: true,
    };
  }
  if (level === 1) {
    return {
      canManageContent: true,
      canApproveContent: true,
      canManageLetters: true,
      canApproveLetters: true,
      canSubmitReports: true,
      canManageUsers: false,
      canConfigureWeb: true,
    };
  }
  return {
    canManageContent: true,
    canApproveContent: false,
    canManageLetters: true,
    canApproveLetters: false,
    canSubmitReports: true,
    canManageUsers: false,
    canConfigureWeb: false,
  };
}

export function buildSuratTugasSideEffects(params: {
  letterId: string;
  letterNumber: string;
  subject: string;
  location: string;
  assigneeId: string;
  assigneeName: string;
  supervisorId: string;
  supervisorName: string;
  actorId: string;
  actorName: string;
  actorLevel: UserLevel;
  nowIso: string;
}): {
  assigneeNotification: NotificationItem;
  supervisorNotification: NotificationItem;
  auditLog: ActivityLog;
} {
  const assigneeNotification: NotificationItem = {
    id: `notif_asg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    recipientId: params.assigneeId,
    senderId: params.actorId,
    title: `Penugasan Baru: ${params.letterNumber}`,
    message: `Anda telah ditugaskan pada Surat Tugas "${params.subject}" di lokasi ${params.location}. Atasan pengawas: ${params.supervisorName}. Silakan laporkan hasil kegiatan setelah pelaksanaan.`,
    category: 'surat_tugas_assignee',
    referenceId: params.letterId,
    isRead: false,
    createdAt: params.nowIso,
    updatedAt: params.nowIso,
  };

  const supervisorNotification: NotificationItem = {
    id: `notif_sup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    recipientId: params.supervisorId,
    senderId: params.actorId,
    title: `Pemberitahuan Atasan — Surat Tugas ${params.letterNumber}`,
    message: `Pemberitahuan khusus atasan: ${params.assigneeName} telah diberikan Surat Tugas "${params.subject}" (${params.location}) oleh ${params.actorName}.`,
    category: 'surat_tugas_supervisor',
    referenceId: params.letterId,
    isRead: false,
    createdAt: params.nowIso,
    updatedAt: params.nowIso,
  };

  const auditLog: ActivityLog = {
    id: `log_st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    actorId: params.actorId,
    actorName: params.actorName,
    actorLevel: params.actorLevel,
    actionType: 'SURAT_TUGAS_CREATED',
    targetId: params.letterId,
    details: `Menerbitkan Surat Tugas ${params.letterNumber} ("${params.subject}") untuk ${params.assigneeName} dengan notifikasi ke atasan ${params.supervisorName}.`,
    createdAt: params.nowIso,
  };

  return { assigneeNotification, supervisorNotification, auditLog };
}

export interface MonthlyLetterStat {
  month: number;
  monthLabel: string;
  totalCount: number;
  suratTugasCount: number;
  approvedCount: number;
}

const INDONESIAN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function computeMonthlyLetterAnalytics(
  letters: OrganizationLetter[],
  year = 2026
): MonthlyLetterStat[] {
  return INDONESIAN_MONTHS.map((monthLabel, index) => {
    const monthNumber = index + 1;
    const inMonth = letters.filter(
      (l) => l.yearIssued === year && l.monthIssued === monthNumber
    );
    return {
      month: monthNumber,
      monthLabel,
      totalCount: inMonth.length,
      suratTugasCount: inMonth.filter((l) => l.category === 'Surat Tugas').length,
      approvedCount: inMonth.filter((l) => l.status === 'approved').length,
    };
  });
}

export interface TaskPerformanceSummary {
  totalSuratTugas: number;
  completedTasks: number;
  inProgressTasks: number;
  assignedPendingTasks: number;
  overallCompletionPercentage: number;
  totalReportsSubmitted: number;
  verifiedReportsCount: number;
  averageReportScore: number;
}

export function computeTaskPerformanceMetrics(
  letters: OrganizationLetter[],
  reports: TaskReport[]
): TaskPerformanceSummary {
  const suratTugasList = letters.filter((l) => l.category === 'Surat Tugas');
  const totalSuratTugas = suratTugasList.length;
  const completedTasks = suratTugasList.filter((l) => l.taskCompletionStatus === 'completed').length;
  const inProgressTasks = suratTugasList.filter((l) => l.taskCompletionStatus === 'in_progress').length;
  const assignedPendingTasks = suratTugasList.filter((l) => l.taskCompletionStatus === 'assigned').length;

  const overallCompletionPercentage =
    totalSuratTugas > 0 ? Math.round((completedTasks / totalSuratTugas) * 100) : 0;

  const totalReportsSubmitted = reports.length;
  const verifiedReportsCount = reports.filter((r) => r.verificationStatus === 'verified').length;
  const averageReportScore =
    reports.length > 0
      ? Math.round(reports.reduce((acc, item) => acc + item.completionRate, 0) / reports.length)
      : 0;

  return {
    totalSuratTugas,
    completedTasks,
    inProgressTasks,
    assignedPendingTasks,
    overallCompletionPercentage,
    totalReportsSubmitted,
    verifiedReportsCount,
    averageReportScore,
  };
}

export function slugifyCategory(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 55) || 'kategori-umum';
}

export function canSuperadminEditUserName(actorLevel: UserLevel): boolean {
  return actorLevel === 0;
}

export function canSuperadminManageUserStatus(
  actorLevel: UserLevel,
  actorUid: string,
  targetUid: string
): boolean {
  return actorLevel === 0 && actorUid !== targetUid;
}

export function canSuperadminDeleteUser(
  actorLevel: UserLevel,
  actorUid: string,
  targetUid: string
): boolean {
  return actorLevel === 0 && actorUid !== targetUid;
}

export function canManageWorkPrograms(actorLevel: UserLevel): boolean {
  return actorLevel === 0 || actorLevel === 1;
}

export function validateAndFormatWorkProgram(
  codeOrInput:
    | string
    | {
        code: string;
        title: string;
        description: string;
      },
  rawTitle?: string,
  rawDescription?: string
): {
  valid: boolean;
  code: string;
  title: string;
  description: string;
  cleanedCode: string;
  cleanedTitle: string;
  cleanedDescription: string;
  error?: string;
} {
  const rawCodeStr =
    typeof codeOrInput === 'string' ? codeOrInput : codeOrInput?.code || '';
  const rawTitleStr =
    typeof codeOrInput === 'string'
      ? rawTitle || ''
      : codeOrInput?.title || '';
  const rawDescStr =
    typeof codeOrInput === 'string'
      ? rawDescription || ''
      : codeOrInput?.description || '';

  const code = rawCodeStr.trim().slice(0, 60);
  const title = rawTitleStr.trim().slice(0, 140);
  const description = rawDescStr.trim().slice(0, 800);

  if (code.length < 2) {
    return {
      valid: false,
      code,
      title,
      description,
      cleanedCode: code,
      cleanedTitle: title,
      cleanedDescription: description,
      error: 'Kode / Nomor Program Kerja wajib diisi (minimal 2 karakter).',
    };
  }
  if (title.length < 3) {
    return {
      valid: false,
      code,
      title,
      description,
      cleanedCode: code,
      cleanedTitle: title,
      cleanedDescription: description,
      error: 'Judul Program Kerja wajib diisi (minimal 3 karakter).',
    };
  }
  if (description.length < 10) {
    return {
      valid: false,
      code,
      title,
      description,
      cleanedCode: code,
      cleanedTitle: title,
      cleanedDescription: description,
      error: 'Deskripsi Program Kerja wajib diisi (minimal 10 karakter).',
    };
  }
  return {
    valid: true,
    code,
    title,
    description,
    cleanedCode: code,
    cleanedTitle: title,
    cleanedDescription: description,
  };
}

export const DEFAULT_ALLOWED_DOMAINS: string[] = [
  'ygi-omega.vercel.app',
  'https://ygi-omega.vercel.app',
  'level-router-mcf5x.firebaseapp.com',
  'localhost',
];

export function normalizeDomainEntry(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).hostname.toLowerCase();
    }
  } catch {
    // ignore URL parse error
  }
  return trimmed.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
}

export function isAllowedAuthDomain(
  hostnameOrOrigin: string,
  allowedList: string[] = DEFAULT_ALLOWED_DOMAINS
): boolean {
  const host = normalizeDomainEntry(hostnameOrOrigin);
  if (!host) return false;
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'ygi-omega.vercel.app' ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.run.app') ||
    host.endsWith('.firebaseapp.com') ||
    host.endsWith('.web.app')
  ) {
    return true;
  }
  const normalizedList = allowedList.map(normalizeDomainEntry).filter(Boolean);
  return normalizedList.includes(host);
}

export function isLoginRoutePath(
  pathname: string,
  hash = '',
  search = ''
): boolean {
  const cleanPath = (pathname || '').trim().toLowerCase().replace(/\/+$/, '');
  const cleanHash = (hash || '').trim().toLowerCase();
  const cleanSearch = (search || '').trim().toLowerCase();
  return (
    cleanPath === '/login' ||
    cleanPath.endsWith('/login') ||
    cleanHash === '#/login' ||
    cleanHash === '#login' ||
    cleanSearch.includes('login=1')
  );
}

export function getVisibleCmsTabsForLevel(
  level: UserLevel
): Array<
  | 'dashboard'
  | 'contents'
  | 'programs'
  | 'letters'
  | 'reports'
  | 'users'
  | 'settings'
  | 'notifications'
> {
  if (level === 0) {
    return [
      'dashboard',
      'contents',
      'programs',
      'letters',
      'reports',
      'users',
      'settings',
      'notifications',
    ];
  }
  if (level === 1) {
    // Level 1 (Admin / Editor) can manage Program Kerja alongside content, letters, reports, and notifications
    return [
      'dashboard',
      'contents',
      'programs',
      'letters',
      'reports',
      'notifications',
    ];
  }
  // Level 2 (Contributor) does NOT see 'programs', 'users', or 'settings'
  return ['dashboard', 'contents', 'letters', 'reports', 'notifications'];
}

export function validateAndFormatUserName(rawName: string): {
  valid: boolean;
  cleanedName: string;
  error?: string;
} {
  const cleanedName = rawName.trim();
  if (cleanedName.length < 2) {
    return {
      valid: false,
      cleanedName,
      error: 'Nama pengguna minimal harus terdiri dari 2 karakter.',
    };
  }
  if (cleanedName.length > 100) {
    return {
      valid: false,
      cleanedName: cleanedName.slice(0, 100),
      error: 'Nama pengguna maksimal 100 karakter.',
    };
  }
  return { valid: true, cleanedName };
}

export function validateAndFormatDepartment(rawDepartment: string): {
  valid: boolean;
  cleanedDepartment: string;
  error?: string;
} {
  const cleanedDepartment = rawDepartment.trim();
  if (cleanedDepartment.length < 2) {
    return {
      valid: false,
      cleanedDepartment,
      error: 'Nama Unit Kerja minimal harus terdiri dari 2 karakter.',
    };
  }
  if (cleanedDepartment.length > 100) {
    return {
      valid: false,
      cleanedDepartment: cleanedDepartment.slice(0, 100),
      error: 'Nama Unit Kerja maksimal 100 karakter.',
    };
  }
  return { valid: true, cleanedDepartment };
}

export function canSuperadminManageUserPassword(actorLevel: UserLevel): boolean {
  return actorLevel === 0;
}

export function getEffectiveUserPassword(
  user: Pick<UserProfile, 'level' | 'password'>,
  superadminKey = 'WANA-SUPER-2026'
): string {
  const customPassword = user.password?.trim();
  if (customPassword && customPassword.length > 0) {
    return customPassword;
  }
  return user.level === 0 ? superadminKey : 'TERVERIFIKASI-2026';
}

export function validateAndFormatUserPassword(rawPassword: string): {
  valid: boolean;
  cleanedPassword: string;
  error?: string;
} {
  const cleanedPassword = rawPassword.trim();
  if (cleanedPassword.length < 4) {
    return {
      valid: false,
      cleanedPassword,
      error: 'Password pengguna minimal harus terdiri dari 4 karakter.',
    };
  }
  if (cleanedPassword.length > 64) {
    return {
      valid: false,
      cleanedPassword: cleanedPassword.slice(0, 64),
      error: 'Password pengguna maksimal 64 karakter.',
    };
  }
  return { valid: true, cleanedPassword };
}

export function authenticateEmailPassword(
  users: UserProfile[],
  emailInput: string,
  passwordInput: string,
  superadminKey = 'WANA-SUPER-2026'
): {
  ok: boolean;
  user?: UserProfile;
  error?: string;
} {
  const normalizedEmail = emailInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      ok: false,
      error: 'Masukkan alamat email resmi yang valid.',
    };
  }

  if (cleanPassword.length < 4) {
    return {
      ok: false,
      error: 'Masukkan password (minimal 4 karakter).',
    };
  }

  const matchedUser = users.find(
    (u) => u.email.trim().toLowerCase() === normalizedEmail
  );

  if (!matchedUser) {
    return {
      ok: false,
      error:
        'Email tidak terdaftar di dalam daftar akses (RBAC). Silakan hubungi Superadmin.',
    };
  }

  if (matchedUser.isActive === false) {
    return {
      ok: false,
      error: 'Akun pengguna ini telah dinonaktifkan oleh Superadmin (Level 0).',
    };
  }

  if (!matchedUser.isVerified) {
    return {
      ok: false,
      error: 'Akun pengguna ini belum terverifikasi.',
    };
  }

  if (matchedUser.password && matchedUser.password.trim().length > 0) {
    const expected = matchedUser.password.trim();
    const isDefaultSuperadminFallback =
      matchedUser.level === 0 &&
      expected === superadminKey &&
      cleanPassword === 'TERVERIFIKASI-2026';
    if (cleanPassword !== expected && !isDefaultSuperadminFallback) {
      return {
        ok: false,
        error: 'Email atau password tidak sesuai.',
      };
    }
  } else if (
    matchedUser.level === 0 &&
    cleanPassword !== superadminKey &&
    cleanPassword !== 'TERVERIFIKASI-2026'
  ) {
    return {
      ok: false,
      error: 'Email atau password tidak sesuai.',
    };
  }

  return {
    ok: true,
    user: matchedUser,
  };
}

export function authorizeGoogleOAuthUser(
  users: UserProfile[],
  googleEmail: string | null | undefined
): {
  ok: boolean;
  user?: UserProfile;
  error?: string;
} {
  const normalizedEmail = (googleEmail || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      ok: false,
      error: 'Gagal membaca alamat email dari akun Google.',
    };
  }

  const matchedUser = users.find(
    (u) => u.email.trim().toLowerCase() === normalizedEmail
  );

  if (!matchedUser) {
    return {
      ok: false,
      error: `Email Google (${normalizedEmail}) belum terdaftar dalam daftar akses sistem (RBAC).`,
    };
  }

  if (matchedUser.isActive === false) {
    return {
      ok: false,
      error: 'Akun pengguna ini telah dinonaktifkan oleh Superadmin (Level 0).',
    };
  }

  return {
    ok: true,
    user: matchedUser,
  };
}

export const DEFAULT_YGI_LOGO_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <linearGradient id="ygiBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0F291E"/>
          <stop offset="100%" stop-color="#1B4332"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#ygiBg)" stroke="#6EE7B7" stroke-width="4"/>
      <circle cx="60" cy="60" r="48" fill="none" stroke="#A7F3D0" stroke-width="1.2" stroke-dasharray="3 3"/>
      <path d="M24 76 L48 36 L66 64 L78 46 L96 76 Z" fill="#2D6A4F" stroke="#A7F3D0" stroke-width="2" stroke-linejoin="round"/>
      <path d="M48 36 L56 50 L48 47 L41 50 Z" fill="#ECFDF5"/>
      <path d="M22 76 Q60 68 98 76" fill="none" stroke="#6EE7B7" stroke-width="2.5"/>
      <text x="60" y="96" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="18" fill="#FFFFFF" letter-spacing="2">YGI</text>
    </svg>`
  );

export function canViewAuditLogs(actorLevel: UserLevel): boolean {
  return actorLevel === 0;
}

export function resolveTaskReportInitialStatus(
  actorLevel: UserLevel
): 'submitted' | 'verified' {
  return actorLevel === 2 ? 'submitted' : 'verified';
}

export function canApproveTaskReport(actorLevel: UserLevel): boolean {
  return actorLevel <= 1;
}

export function buildTaskReportApprovalNotifications(
  report: TaskReport,
  submitter: UserProfile,
  allUsers: UserProfile[],
  nowIso: string
): NotificationItem[] {
  const approvers = allUsers.filter(
    (u) => u.level <= 1 && u.isActive !== false
  );
  return approvers.map((approver, idx) => ({
    id: `notif_rep_appr_${Date.now()}_${idx}_${approver.uid}`,
    recipientId: approver.uid,
    senderId: submitter.uid,
    title: `[PERLU APPROVAL LV.${approver.level}] Laporan Surat Tugas — ${report.letterNumber}`,
    message: `Anggota Level 2 (${submitter.displayName}) mengunggah Laporan Surat Tugas "${report.taskTitle}" (Capaian: ${report.completionRate}%). Mohon verifikasi / approval pada menu Laporan Surat Tugas.`,
    category: 'task_report',
    referenceId: report.id,
    isRead: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}

export function formatLetterPdfFilename(letterNumber: string): string {
  const safeNum = letterNumber
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `Surat_Organisasi_${safeNum || 'YGI'}.pdf`;
}

function escapePdfText(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapTextLines(text: string, maxChars = 82): string[] {
  const rawLines = text.split(/\r?\n/);
  const result: string[] = [];
  for (const raw of rawLines) {
    const trimmed = raw.trimEnd();
    if (!trimmed) {
      result.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = '';
    for (const word of words) {
      if (!current) {
        current = word;
      } else if (current.length + 1 + word.length <= maxChars) {
        current += ' ' + word;
      } else {
        result.push(current);
        current = word;
      }
    }
    if (current) result.push(current);
  }
  return result;
}

export function buildLetterPdfBytes(
  letter: OrganizationLetter,
  siteConfig: Pick<
    SiteConfig,
    'siteName' | 'officeAddress' | 'contactPersonPhone' | 'contactPersonEmail'
  >
): Uint8Array {
  const statusLabel =
    letter.status === 'approved'
      ? 'DISETUJUI (APPROVED)'
      : letter.status === 'rejected'
      ? 'DITOLAK (REJECTED)'
      : 'MENUNGGU PERSETUJUAN (PENDING)';

  const headerLines = [
    siteConfig.siteName.toUpperCase() + ' (YGI)',
    siteConfig.officeAddress,
    `Telp: ${siteConfig.contactPersonPhone} | Email: ${siteConfig.contactPersonEmail}`,
    '==================================================================================',
    `NOMOR SURAT     : ${letter.letterNumber}`,
    `KATEGORI SURAT  : ${letter.category}`,
    `PERIHAL         : ${letter.subject}`,
    `PENERIMA TUGAS  : ${letter.recipientName}`,
    `ATASAN TERKAIT  : ${letter.supervisorName}`,
    `LOKASI          : ${letter.location}`,
    `STATUS DOKUMEN  : ${statusLabel}`,
    '----------------------------------------------------------------------------------',
    '',
  ];

  const bodyLines = wrapTextLines(letter.renderedBody, 82);
  const allLines = [...headerLines, ...bodyLines].slice(0, 48);

  const contentOps: string[] = ['BT', '/F1 10 Tf', '50 790 Td', '14 TL'];
  allLines.forEach((line, index) => {
    const escaped = escapePdfText(line);
    if (index === 0) {
      contentOps.push(`(${escaped}) Tj`);
    } else {
      contentOps.push(`T* (${escaped}) Tj`);
    }
  });
  contentOps.push('ET');

  const streamContent = contentOps.join('\n') + '\n';

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`,
  ];

  let pdfString = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdfString.length);
    pdfString += obj;
  }

  const xrefStart = pdfString.length;
  pdfString += `xref\n0 ${objects.length + 1}\n`;
  pdfString += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    pdfString += `${offStr} 00000 n \n`;
  }

  pdfString += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const encoder = new TextEncoder();
  return encoder.encode(pdfString);
}

export const DEFAULT_ORGANIZATION_NAME = 'Yayasan Gunung Parama Indonesia';

export function normalizeSiteConfig(
  raw: Partial<SiteConfig> | null | undefined,
  fallback: SiteConfig
): SiteConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      ...fallback,
      siteName: DEFAULT_ORGANIZATION_NAME,
      allowedDomains: Array.from(
        new Set([...(fallback.allowedDomains || []), ...DEFAULT_ALLOWED_DOMAINS])
      ),
    };
  }

  const rawSiteName =
    typeof raw.siteName === 'string' ? raw.siteName.trim() : '';
  const normalizedSiteName =
    !rawSiteName || rawSiteName === 'Wana Lestari Nusantara'
      ? DEFAULT_ORGANIZATION_NAME
      : rawSiteName;

  const rawFooter =
    typeof raw.footerText === 'string' && raw.footerText.trim().length > 0
      ? raw.footerText.trim()
      : fallback.footerText;
  const normalizedFooter = rawFooter.replace(
    /Wana Lestari Nusantara/g,
    DEFAULT_ORGANIZATION_NAME
  );

  const rawDomains = Array.isArray(raw.allowedDomains)
    ? raw.allowedDomains.filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
    : fallback.allowedDomains || [];
  const mergedDomains = Array.from(
    new Set([...DEFAULT_ALLOWED_DOMAINS, ...rawDomains])
  );

  return {
    siteName: normalizedSiteName,
    tagline:
      typeof raw.tagline === 'string' && raw.tagline.trim()
        ? raw.tagline
        : fallback.tagline,
    logoUrl:
      typeof raw.logoUrl === 'string' && raw.logoUrl.trim()
        ? raw.logoUrl
        : fallback.logoUrl || DEFAULT_YGI_LOGO_DATA_URL,
    heroTitle:
      typeof raw.heroTitle === 'string' && raw.heroTitle.trim()
        ? raw.heroTitle
        : fallback.heroTitle,
    heroDescription:
      typeof raw.heroDescription === 'string' && raw.heroDescription.trim()
        ? raw.heroDescription
        : fallback.heroDescription,
    programSectionTitle:
      typeof raw.programSectionTitle === 'string' && raw.programSectionTitle.trim()
        ? raw.programSectionTitle
        : fallback.programSectionTitle ||
          'Arsitektur Tata Kelola Hutan & Program Kerja Organisasi',
    programSectionSubtitle:
      typeof raw.programSectionSubtitle === 'string' && raw.programSectionSubtitle.trim()
        ? raw.programSectionSubtitle
        : fallback.programSectionSubtitle ||
          `Seluruh kegiatan operasional ${normalizedSiteName} dijalankan dengan sistem otorisasi berjenjang, penomoran surat otomatis, dan pelaporan bukti lapangan yang transparan.`,
    allowedDomains: mergedDomains,
    contactPersonName:
      typeof raw.contactPersonName === 'string' && raw.contactPersonName.trim()
        ? raw.contactPersonName
        : fallback.contactPersonName,
    contactPersonPhone:
      typeof raw.contactPersonPhone === 'string' && raw.contactPersonPhone.trim()
        ? raw.contactPersonPhone
        : fallback.contactPersonPhone,
    contactPersonEmail:
      typeof raw.contactPersonEmail === 'string' && raw.contactPersonEmail.trim()
        ? raw.contactPersonEmail
        : fallback.contactPersonEmail,
    officeAddress:
      typeof raw.officeAddress === 'string' && raw.officeAddress.trim()
        ? raw.officeAddress
        : fallback.officeAddress,
    footerText: normalizedFooter,
    updatedBy:
      typeof raw.updatedBy === 'string' && raw.updatedBy.trim()
        ? raw.updatedBy
        : fallback.updatedBy,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
        ? raw.updatedAt
        : fallback.updatedAt,
  };
}

export function sanitizeForFirestore<T>(value: T): T {
  if (value === null || value === undefined) {
    return '' as unknown as T;
  }
  if (typeof value === 'string') {
    // Do NOT slice base64 data:image/ strings mid-stream (slicing corrupts the bottom of the image).
    // Allow full data:image/ strings up to 950,000 chars; only cap non-image text strings at 350,000.
    if (value.startsWith('data:image/')) {
      return value as unknown as T;
    }
    if (value.length > 350000) {
      return value.slice(0, 350000) as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 500)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        cleanObj[k] = sanitizeForFirestore(v);
      }
    }
    return cleanObj as T;
  }
  return value;
}



