import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLetterNumber,
  renderLetterTemplate,
  resolveContentInitialStatus,
  buildSuratTugasSideEffects,
  computeMonthlyLetterAnalytics,
  computeTaskPerformanceMetrics,
  getDefaultPermissionsForLevel,
  canSuperadminEditUserName,
  canSuperadminManageUserStatus,
  canSuperadminDeleteUser,
  canSuperadminManageUserPassword,
  getEffectiveUserPassword,
  getVisibleCmsTabsForLevel,
  validateAndFormatUserName,
  validateAndFormatDepartment,
  validateAndFormatUserPassword,
  authenticateEmailPassword,
  authorizeGoogleOAuthUser,
  DEFAULT_YGI_LOGO_DATA_URL,
  canViewAuditLogs,
  resolveTaskReportInitialStatus,
  canApproveTaskReport,
  buildTaskReportApprovalNotifications,
  formatLetterPdfFilename,
  buildLetterPdfBytes,
  UserProfile,
  OrganizationLetter,
  TaskReport,
} from './cmsLogic';

test('formatLetterNumber generates sequential Roman month numbering with YGI initials accurately', () => {
  assert.equal(formatLetterNumber(1, 'ST', 10, 2026), '001/ST/YGI/X/2026');
  assert.equal(formatLetterNumber(14, 'SK', 3, 2026), '014/SK/YGI/III/2026');
  assert.equal(formatLetterNumber(105, 'SU', 12, 2026), '105/SU/YGI/XII/2026');
});

test('resolveContentInitialStatus enforces approval requirement for Level 2 users', () => {
  assert.equal(resolveContentInitialStatus(2), 'pending_approval');
  assert.equal(resolveContentInitialStatus(1), 'published');
  assert.equal(resolveContentInitialStatus(0), 'published');
});

test('renderLetterTemplate replaces all organizational placeholders', () => {
  const tpl = 'Nomor: {{NOMOR_SURAT}} | Kepada: {{PENERIMA_TUGAS}} | Atasan: {{ATASAN_TERKAIT}} | Lokasi: {{LOKASI}}';
  const rendered = renderLetterTemplate(tpl, {
    NOMOR_SURAT: '007/ST/YGI/X/2026',
    TANGGAL: '28 Oktober 2026',
    PERIHAL: 'Patroli Hutan Lindung',
    PENERIMA_TUGAS: 'Raka Pratama',
    ATASAN_TERKAIT: 'Dr. Hendra Wijaya',
    LOKASI: 'Blok Meranti Kalimantan',
    DESKRIPSI_TUGAS: 'Pemantauan patok batas',
  });
  assert.equal(
    rendered,
    'Nomor: 007/ST/YGI/X/2026 | Kepada: Raka Pratama | Atasan: Dr. Hendra Wijaya | Lokasi: Blok Meranti Kalimantan'
  );
});

test('buildSuratTugasSideEffects creates notifications for both assignee and supervisor plus audit log', () => {
  const effects = buildSuratTugasSideEffects({
    letterId: 'let_09',
    letterNumber: '009/ST/YGI/X/2026',
    subject: 'Audit Restorasi Mangrove',
    location: 'Pesisir Timur',
    assigneeId: 'usr_level2_raka',
    assigneeName: 'Raka Pratama',
    supervisorId: 'usr_level1_hendra',
    supervisorName: 'Dr. Hendra Wijaya',
    actorId: 'usr_level0_super',
    actorName: 'Ir. Bagus Santoso',
    actorLevel: 0,
    nowIso: '2026-10-28T10:00:00.000Z',
  });

  assert.equal(effects.assigneeNotification.recipientId, 'usr_level2_raka');
  assert.equal(effects.assigneeNotification.category, 'surat_tugas_assignee');
  assert.equal(effects.supervisorNotification.recipientId, 'usr_level1_hendra');
  assert.equal(effects.supervisorNotification.category, 'surat_tugas_supervisor');
  assert.equal(effects.auditLog.actionType, 'SURAT_TUGAS_CREATED');
  assert.equal(effects.auditLog.targetId, 'let_09');
});

test('computeMonthlyLetterAnalytics and computeTaskPerformanceMetrics calculate accurate KPIs', () => {
  const sampleLetters: OrganizationLetter[] = [
    {
      id: 'l1',
      letterNumber: '001/ST/YGI/X/2026',
      sequenceNumber: 1,
      category: 'Surat Tugas',
      subject: 'Tugas 1',
      recipientName: 'Raka',
      assigneeId: 'u2',
      supervisorId: 'u1',
      supervisorName: 'Hendra',
      location: 'Bogor',
      renderedBody: 'Isi surat tugas lengkap minimal dua puluh karakter',
      monthIssued: 10,
      yearIssued: 2026,
      status: 'approved',
      taskCompletionStatus: 'completed',
      createdBy: 'u1',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-02T00:00:00Z',
    },
    {
      id: 'l2',
      letterNumber: '002/ST/YGI/X/2026',
      sequenceNumber: 2,
      category: 'Surat Tugas',
      subject: 'Tugas 2',
      recipientName: 'Siti',
      assigneeId: 'u3',
      supervisorId: 'u1',
      supervisorName: 'Hendra',
      location: 'Jambi',
      renderedBody: 'Isi surat tugas kedua minimal dua puluh karakter',
      monthIssued: 10,
      yearIssued: 2026,
      status: 'pending_approval',
      taskCompletionStatus: 'assigned',
      createdBy: 'u1',
      createdAt: '2026-10-05T00:00:00Z',
      updatedAt: '2026-10-05T00:00:00Z',
    },
  ];

  const sampleReports: TaskReport[] = [
    {
      id: 'r1',
      letterId: 'l1',
      letterNumber: '001/ST/YGI/X/2026',
      taskTitle: 'Laporan Tugas 1',
      submittedBy: 'u2',
      submittedByName: 'Raka',
      summaryResult: 'Kegiatan penanaman 500 bibit selesai tepat waktu.',
      completionRate: 100,
      photoEvidenceName: 'dokumentasi_bibit.jpg',
      photoEvidenceData: 'svg:reforestation',
      supportingDocName: 'berita_acara_penanaman.pdf',
      supportingDocSummary: 'BA-01/YGI/2026 Terverifikasi',
      verificationStatus: 'verified',
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-11T00:00:00Z',
    },
  ];

  const monthly = computeMonthlyLetterAnalytics(sampleLetters, 2026);
  const octStat = monthly.find((m) => m.month === 10)!;
  assert.equal(octStat.totalCount, 2);
  assert.equal(octStat.suratTugasCount, 2);
  assert.equal(octStat.approvedCount, 1);

  const perf = computeTaskPerformanceMetrics(sampleLetters, sampleReports);
  assert.equal(perf.totalSuratTugas, 2);
  assert.equal(perf.completedTasks, 1);
  assert.equal(perf.overallCompletionPercentage, 50);
  assert.equal(perf.averageReportScore, 100);
});

test('getDefaultPermissionsForLevel separates Level 0, Level 1, and Level 2 capabilities', () => {
  assert.equal(getDefaultPermissionsForLevel(0).canManageUsers, true);
  assert.equal(getDefaultPermissionsForLevel(1).canApproveContent, true);
  assert.equal(getDefaultPermissionsForLevel(1).canManageUsers, false);
  assert.equal(getDefaultPermissionsForLevel(2).canApproveContent, false);
});

test('Superadmin Level 0 exclusive controls: name edit, department edit, and user deactivation', () => {
  assert.equal(canSuperadminEditUserName(0), true);
  assert.equal(canSuperadminEditUserName(1), false);
  assert.equal(canSuperadminEditUserName(2), false);

  assert.equal(canSuperadminManageUserStatus(0, 'usr_super_1', 'usr_target_2'), true);
  assert.equal(canSuperadminManageUserStatus(0, 'usr_super_1', 'usr_super_1'), false);
  assert.equal(canSuperadminManageUserStatus(1, 'usr_admin_1', 'usr_target_2'), false);

  assert.equal(validateAndFormatUserName('  Prof. Dr. Hendra Wijaya  ').valid, true);
  assert.equal(validateAndFormatUserName('  Prof. Dr. Hendra Wijaya  ').cleanedName, 'Prof. Dr. Hendra Wijaya');
  assert.equal(validateAndFormatUserName('A').valid, false);

  assert.equal(validateAndFormatDepartment('  Direktorat Restorasi Ekosistem  ').valid, true);
  assert.equal(validateAndFormatDepartment('  Direktorat Restorasi Ekosistem  ').cleanedDepartment, 'Direktorat Restorasi Ekosistem');
  assert.equal(validateAndFormatDepartment('X').valid, false);

  assert.equal(canSuperadminDeleteUser(0, 'usr_super_1', 'usr_target_2'), true);
  assert.equal(canSuperadminDeleteUser(0, 'usr_super_1', 'usr_super_1'), false);
  assert.equal(canSuperadminDeleteUser(1, 'usr_admin_1', 'usr_target_2'), false);
  assert.equal(canSuperadminDeleteUser(2, 'usr_user_1', 'usr_target_2'), false);

  const lv0Tabs = getVisibleCmsTabsForLevel(0);
  assert.equal(lv0Tabs.includes('users'), true);
  assert.equal(lv0Tabs.includes('settings'), true);

  const lv1Tabs = getVisibleCmsTabsForLevel(1);
  assert.equal(lv1Tabs.includes('users'), false);
  assert.equal(lv1Tabs.includes('settings'), false);

  const lv2Tabs = getVisibleCmsTabsForLevel(2);
  assert.equal(lv2Tabs.includes('users'), false);
  assert.equal(lv2Tabs.includes('settings'), false);
});

test('authenticateEmailPassword and authorizeGoogleOAuthUser enforce access list and active status', () => {
  const mockUsers: UserProfile[] = [
    {
      uid: 'u_super',
      displayName: 'Ir. Bagus',
      email: 'isaranamachilikhanputera@gmail.com',
      phone: '+62811',
      roleName: 'superadmin',
      level: 0,
      department: 'Dewan Eksekutif',
      isVerified: true,
      isActive: true,
      authProvider: 'superadmin_key',
      permissions: getDefaultPermissionsForLevel(0),
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'u_inactive',
      displayName: 'Raka Nonaktif',
      email: 'raka@wanalestari.or.id',
      phone: '+62812',
      roleName: 'contributor',
      level: 2,
      department: 'Patroli',
      isVerified: false,
      isActive: false,
      authProvider: 'verified_account',
      permissions: getDefaultPermissionsForLevel(2),
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const validLogin = authenticateEmailPassword(
    mockUsers,
    'isaranamachilikhanputera@gmail.com',
    'WANA-SUPER-2026'
  );
  assert.equal(validLogin.ok, true);
  assert.equal(validLogin.user?.uid, 'u_super');

  const unregisteredLogin = authenticateEmailPassword(
    mockUsers,
    'asing@luar.com',
    'TERVERIFIKASI-2026'
  );
  assert.equal(unregisteredLogin.ok, false);

  const deactivatedLogin = authenticateEmailPassword(
    mockUsers,
    'raka@wanalestari.or.id',
    'TERVERIFIKASI-2026'
  );
  assert.equal(deactivatedLogin.ok, false);

  const validOAuth = authorizeGoogleOAuthUser(
    mockUsers,
    'isaranamachilikhanputera@gmail.com'
  );
  assert.equal(validOAuth.ok, true);

  const unlistedOAuth = authorizeGoogleOAuthUser(
    mockUsers,
    'unknown@gmail.com'
  );
  assert.equal(unlistedOAuth.ok, false);

  assert.equal(canSuperadminManageUserPassword(0), true);
  assert.equal(canSuperadminManageUserPassword(1), false);
  assert.equal(canSuperadminManageUserPassword(2), false);

  assert.equal(getEffectiveUserPassword({ level: 0 }), 'WANA-SUPER-2026');
  assert.equal(getEffectiveUserPassword({ level: 1 }), 'TERVERIFIKASI-2026');
  assert.equal(
    getEffectiveUserPassword({ level: 2, password: 'RAHASIA-BARU-2026' }),
    'RAHASIA-BARU-2026'
  );

  assert.equal(validateAndFormatUserPassword('  PASS-BARU-99  ').valid, true);
  assert.equal(
    validateAndFormatUserPassword('  PASS-BARU-99  ').cleanedPassword,
    'PASS-BARU-99'
  );
  assert.equal(validateAndFormatUserPassword('123').valid, false);
});

test('PDF generator, YGI logo, TaskReport approval routing (Level 2 -> Level 1 & 0), and Audit Log visibility', () => {
  // 1. Audit Log visibility: only Level 0 sees Audit Log
  assert.equal(canViewAuditLogs(0), true);
  assert.equal(canViewAuditLogs(1), false);
  assert.equal(canViewAuditLogs(2), false);

  // 2. Default YGI Logo data URL
  assert.equal(DEFAULT_YGI_LOGO_DATA_URL.startsWith('data:image/svg+xml;utf8,'), true);
  assert.equal(DEFAULT_YGI_LOGO_DATA_URL.includes('YGI'), true);

  // 3. Task Report initial status & approval routing to Level 1 and Level 0
  assert.equal(resolveTaskReportInitialStatus(2), 'submitted');
  assert.equal(resolveTaskReportInitialStatus(1), 'verified');
  assert.equal(resolveTaskReportInitialStatus(0), 'verified');

  assert.equal(canApproveTaskReport(0), true);
  assert.equal(canApproveTaskReport(1), true);
  assert.equal(canApproveTaskReport(2), false);

  const sampleUsers: UserProfile[] = [
    {
      uid: 'u_lv0',
      displayName: 'Ir. Bagus',
      email: 'bagus@ygi.or.id',
      phone: '+62811',
      roleName: 'superadmin',
      level: 0,
      department: 'Dewan Eksekutif',
      isVerified: true,
      isActive: true,
      authProvider: 'superadmin_key',
      permissions: getDefaultPermissionsForLevel(0),
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'u_lv1',
      displayName: 'Dr. Hendra',
      email: 'hendra@ygi.or.id',
      phone: '+62812',
      roleName: 'admin',
      level: 1,
      department: 'Direktorat Konservasi',
      isVerified: true,
      isActive: true,
      authProvider: 'verified_account',
      permissions: getDefaultPermissionsForLevel(1),
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'u_lv2',
      displayName: 'Raka Pratama',
      email: 'raka@ygi.or.id',
      phone: '+62813',
      roleName: 'contributor',
      level: 2,
      department: 'Tim Patroli',
      isVerified: true,
      isActive: true,
      authProvider: 'verified_account',
      permissions: getDefaultPermissionsForLevel(2),
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const sampleReport: TaskReport = {
    id: 'rep_test_99',
    letterId: 'let_004',
    letterNumber: '004/ST/YGI/X/2026',
    taskTitle: 'Laporan Patroli Meranti',
    submittedBy: 'u_lv2',
    submittedByName: 'Raka Pratama',
    summaryResult: 'Patroli selesai 95%.',
    completionRate: 95,
    photoEvidenceName: 'foto.jpg',
    photoEvidenceData: 'svg:canopy',
    supportingDocName: 'ba.pdf',
    supportingDocSummary: 'BA Patroli',
    verificationStatus: 'submitted',
    createdAt: '2026-10-29T00:00:00Z',
    updatedAt: '2026-10-29T00:00:00Z',
  };

  const notifs = buildTaskReportApprovalNotifications(
    sampleReport,
    sampleUsers[2],
    sampleUsers,
    '2026-10-29T00:00:00Z'
  );
  assert.equal(notifs.length, 2);
  assert.equal(notifs.some((n) => n.recipientId === 'u_lv0'), true);
  assert.equal(notifs.some((n) => n.recipientId === 'u_lv1'), true);

  // 4. PDF filename & valid PDF binary output
  assert.equal(
    formatLetterPdfFilename('001/ST/YGI/VIII/2026'),
    'Surat_Organisasi_001-ST-YGI-VIII-2026.pdf'
  );

  const sampleLetter: OrganizationLetter = {
    id: 'let_pdf_1',
    letterNumber: '001/ST/YGI/VIII/2026',
    sequenceNumber: 1,
    month: 8,
    year: 2026,
    category: 'Surat Tugas',
    subject: 'Penugasan Patroli Hutan',
    recipientId: 'u_lv2',
    recipientName: 'Raka Pratama',
    supervisorId: 'u_lv1',
    supervisorName: 'Dr. Hendra',
    location: 'Blok Sebangau',
    renderedBody: 'SURAT TUGAS RESMI YGI\nNomor: 001/ST/YGI/VIII/2026',
    status: 'approved',
    taskCompletionStatus: 'in_progress',
    createdBy: 'u_lv1',
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: '2026-08-10T00:00:00Z',
  };

  const pdfBytes = buildLetterPdfBytes(sampleLetter, {
    siteName: 'Yayasan Gunung Parama Indonesia',
    officeAddress: 'Jl. Ir. H. Juanda No. 48, Bogor',
    contactPersonPhone: '+62 812-8890-4412',
    contactPersonEmail: 'sekretariat@wanalestari.or.id',
  });
  const pdfText = new TextDecoder().decode(pdfBytes);
  assert.equal(pdfText.startsWith('%PDF-1.4'), true);
  assert.equal(pdfText.includes('001/ST/YGI/VIII/2026'), true);
  assert.equal(pdfText.trim().endsWith('%%EOF'), true);
});

test('normalizeSiteConfig migrates legacy Wana Lestari Nusantara to Yayasan Gunung Parama Indonesia while preserving custom names', async () => {
  const { normalizeSiteConfig, sanitizeForFirestore, DEFAULT_ORGANIZATION_NAME } = await import('./cmsLogic');
  const { INITIAL_SITE_CONFIG } = await import('../data/seedData');

  assert.equal(INITIAL_SITE_CONFIG.siteName, 'Yayasan Gunung Parama Indonesia');
  assert.equal(DEFAULT_ORGANIZATION_NAME, 'Yayasan Gunung Parama Indonesia');

  // Legacy siteName migrates automatically
  const migrated = normalizeSiteConfig(
    {
      ...INITIAL_SITE_CONFIG,
      siteName: 'Wana Lestari Nusantara',
      footerText: '© 2026 Wana Lestari Nusantara. Hak Cipta Dilindungi.',
    },
    INITIAL_SITE_CONFIG
  );
  assert.equal(migrated.siteName, 'Yayasan Gunung Parama Indonesia');
  assert.equal(migrated.footerText.includes('Yayasan Gunung Parama Indonesia'), true);

  // User-customized siteName is preserved
  const custom = normalizeSiteConfig(
    {
      ...INITIAL_SITE_CONFIG,
      siteName: 'Yayasan Gunung Parama Indonesia — Sektor Kalimantan',
    },
    INITIAL_SITE_CONFIG
  );
  assert.equal(custom.siteName, 'Yayasan Gunung Parama Indonesia — Sektor Kalimantan');

  // sanitizeForFirestore strips undefined fields cleanly and never truncates data:image base64 logos
  const largeLogoDataUrl = 'data:image/png;base64,' + 'A'.repeat(400000);
  const cleaned = sanitizeForFirestore({
    id: 'art_1',
    title: 'Judul',
    mediaUrl: undefined,
    logoUrl: largeLogoDataUrl,
  });
  assert.equal('mediaUrl' in cleaned, false);
  assert.equal(cleaned.title, 'Judul');
  assert.equal(cleaned.logoUrl.length, largeLogoDataUrl.length);
  assert.equal(cleaned.logoUrl.endsWith('AAAA'), true);
});

test('Work Program RBAC (Level 0 & Level 1), Vercel domain allowlist, and /login route detection', async () => {
  const {
    canManageWorkPrograms,
    validateAndFormatWorkProgram,
    getVisibleCmsTabsForLevel,
    isAllowedAuthDomain,
    isLoginRoutePath,
    DEFAULT_ALLOWED_DOMAINS,
  } = await import('./cmsLogic');

  // Level 0 and Level 1 can manage Work Programs, Level 2 cannot
  assert.equal(canManageWorkPrograms(0), true);
  assert.equal(canManageWorkPrograms(1), true);
  assert.equal(canManageWorkPrograms(2), false);

  assert.equal(getVisibleCmsTabsForLevel(0).includes('programs'), true);
  assert.equal(getVisibleCmsTabsForLevel(1).includes('programs'), true);
  assert.equal(getVisibleCmsTabsForLevel(2).includes('programs'), false);

  const validProg = validateAndFormatWorkProgram(
    '  01. Kurasi Konten  ',
    '  Verifikasi Data Ilmiah  ',
    '  Kontributor mengirimkan laporan yang diverifikasi oleh Admin Level 1.  '
  );
  assert.equal(validProg.valid, true);
  assert.equal(validProg.cleanedCode, '01. Kurasi Konten');
  assert.equal(validProg.cleanedTitle, 'Verifikasi Data Ilmiah');

  const invalidProg = validateAndFormatWorkProgram('01', 'Ab', 'Terlalu pendek');
  assert.equal(invalidProg.valid, false);

  // Vercel domain https://ygi-omega.vercel.app/ is allowed
  assert.equal(
    DEFAULT_ALLOWED_DOMAINS.some((d) => d.includes('ygi-omega.vercel.app')),
    true
  );
  assert.equal(isAllowedAuthDomain('https://ygi-omega.vercel.app/'), true);
  assert.equal(isAllowedAuthDomain('ygi-omega.vercel.app'), true);
  assert.equal(isAllowedAuthDomain('preview-123.vercel.app'), true);

  // /login route detection
  assert.equal(isLoginRoutePath('/login'), true);
  assert.equal(isLoginRoutePath('/login/'), true);
  assert.equal(isLoginRoutePath('/', '#/login'), true);
  assert.equal(isLoginRoutePath('/', '', '?login=1'), true);
  assert.equal(isLoginRoutePath('/'), false);
});

test('Google Drive PDF Repository RBAC (Level 0/1 upload, Level 2 view/download) and 10MB PDF validation', async () => {
  const {
    GOOGLE_DRIVE_FOLDER_ID,
    GOOGLE_DRIVE_FOLDER_URL,
    MAX_REPOSITORY_PDF_SIZE_BYTES,
    canUploadToRepository,
    canViewAndDownloadRepository,
    getVisibleCmsTabsForLevel,
    validateRepositoryPdfUpload,
    formatFileSizeLabel,
    buildRepositoryPdfBytes,
    computeDriveUploadProgressPercent,
    isUploadedToGoogleDrive,
    getGoogleDriveEmbedPreviewUrl,
    getGoogleDriveFileViewUrl,
    buildGoogleDriveMultipartParts,
  } = await import('./cmsLogic');

  assert.equal(GOOGLE_DRIVE_FOLDER_ID, '1UvK-WbdQIUJFfcwtJyP2wTtQpgygrucc');
  assert.equal(
    GOOGLE_DRIVE_FOLDER_URL,
    'https://drive.google.com/drive/folders/1UvK-WbdQIUJFfcwtJyP2wTtQpgygrucc?usp=drive_link'
  );
  assert.equal(MAX_REPOSITORY_PDF_SIZE_BYTES, 10 * 1024 * 1024);

  // Level 0 and Level 1 can upload; Level 2 cannot upload
  assert.equal(canUploadToRepository(0), true);
  assert.equal(canUploadToRepository(1), true);
  assert.equal(canUploadToRepository(2), false);

  // All levels (0, 1, and 2) can view and download from the repository tab
  assert.equal(canViewAndDownloadRepository(0), true);
  assert.equal(canViewAndDownloadRepository(1), true);
  assert.equal(canViewAndDownloadRepository(2), true);
  assert.equal(getVisibleCmsTabsForLevel(0).includes('repository'), true);
  assert.equal(getVisibleCmsTabsForLevel(1).includes('repository'), true);
  assert.equal(getVisibleCmsTabsForLevel(2).includes('repository'), true);

  // Valid PDF <= 10MB by Level 0 or Level 1 succeeds
  const validLv0 = validateRepositoryPdfUpload({
    fileName: 'Pedoman_Restorasi_2026.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2 * 1024 * 1024, // 2 MB
    actorLevel: 0,
    title: 'Pedoman Restorasi 2026',
  });
  assert.equal(validLv0.valid, true);
  assert.equal(validLv0.cleanedFileName, 'Pedoman_Restorasi_2026.pdf');

  const validLv1Exact10Mb = validateRepositoryPdfUpload({
    fileName: 'Laporan_Tahunan_10MB.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 10 * 1024 * 1024, // exact 10 MB limit
    actorLevel: 1,
  });
  assert.equal(validLv1Exact10Mb.valid, true);

  // Rejects upload from Level 2
  const rejectedLv2 = validateRepositoryPdfUpload({
    fileName: 'Dokumen_Level2.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 500 * 1024,
    actorLevel: 2,
  });
  assert.equal(rejectedLv2.valid, false);

  // Rejects non-PDF files (.docx, .jpg)
  const rejectedNonPdf = validateRepositoryPdfUpload({
    fileName: 'Lampiran_Foto.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 500 * 1024,
    actorLevel: 0,
  });
  assert.equal(rejectedNonPdf.valid, false);

  // Rejects PDF > 10MB
  const rejectedOver10Mb = validateRepositoryPdfUpload({
    fileName: 'Peta_Resolusi_Tinggi_11MB.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 10 * 1024 * 1024 + 1,
    actorLevel: 1,
  });
  assert.equal(rejectedOver10Mb.valid, false);

  assert.equal(formatFileSizeLabel(10 * 1024 * 1024), '10.00 MB');

  // Upload progress calculation from 0% -> 100%
  assert.equal(computeDriveUploadProgressPercent('idle'), 0);
  assert.equal(computeDriveUploadProgressPercent('authenticating'), 12);
  assert.equal(computeDriveUploadProgressPercent('preparing'), 22);
  assert.equal(
    computeDriveUploadProgressPercent('uploading_gdrive', 500, 1000),
    58
  );
  assert.equal(
    computeDriveUploadProgressPercent('uploading_gdrive', 1000, 1000),
    90
  );
  assert.equal(computeDriveUploadProgressPercent('verifying_gdrive'), 95);
  assert.equal(computeDriveUploadProgressPercent('completed'), 100);
  assert.equal(computeDriveUploadProgressPercent('error'), 0);

  // Verify Google Drive upload status vs local mirror
  assert.equal(
    isUploadedToGoogleDrive({
      driveFileId: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
      syncSource: 'google_drive_api',
    }),
    true
  );
  assert.equal(
    isUploadedToGoogleDrive({
      driveFileId: undefined,
      syncSource: 'cms_cloud_mirror',
    }),
    false
  );

  // Verify Google Drive preview & view URLs
  assert.equal(
    getGoogleDriveEmbedPreviewUrl('1FileId123'),
    'https://drive.google.com/file/d/1FileId123/preview'
  );
  assert.equal(getGoogleDriveEmbedPreviewUrl(''), null);
  assert.equal(
    getGoogleDriveFileViewUrl('1FileId123'),
    'https://drive.google.com/file/d/1FileId123/view?usp=drivesdk'
  );

  // Verify RFC 2387 multipart/related framing for Google Drive API v3
  const multipart = buildGoogleDriveMultipartParts(
    {
      name: 'Dokumen_Resmi.pdf',
      mimeType: 'application/pdf',
      parents: [GOOGLE_DRIVE_FOLDER_ID],
    },
    'test_boundary_123'
  );
  assert.equal(
    multipart.contentTypeHeader,
    'multipart/related; boundary=test_boundary_123'
  );
  assert.equal(
    multipart.headerPart.includes('"parents":["1UvK-WbdQIUJFfcwtJyP2wTtQpgygrucc"]'),
    true
  );
  assert.equal(multipart.footerPart, '\r\n--test_boundary_123--');

  // Repository PDF binary generator produces valid PDF
  const pdfBytes = buildRepositoryPdfBytes({
    title: 'SOP Patroli Konservasi',
    fileName: 'SOP_Patroli_Konservasi.pdf',
    category: 'SOP Lapangan',
    description: 'Standar operasional prosedur patroli hutan.',
    sizeBytes: 1048576,
    uploadedByName: 'Ir. Bagus Santoso, IPU',
    uploadedByLevel: 0,
    createdAt: '2026-10-30T00:00:00.000Z',
    driveFolderUrl: GOOGLE_DRIVE_FOLDER_URL,
  });
  const pdfStr = new TextDecoder().decode(pdfBytes);
  assert.equal(pdfStr.startsWith('%PDF-1.4'), true);
  assert.equal(pdfStr.includes('SOP_Patroli_Konservasi.pdf'), true);
  assert.equal(pdfStr.trim().endsWith('%%EOF'), true);
});




