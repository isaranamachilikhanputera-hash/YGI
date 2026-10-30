import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  DriveRepositoryFile,
  DriveUploadStage,
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_FOLDER_URL,
  MAX_REPOSITORY_PDF_SIZE_BYTES,
  canUploadToRepository,
  formatFileSizeLabel,
  validateRepositoryPdfUpload,
  buildRepositoryPdfBytes,
  computeDriveUploadProgressPercent,
  isUploadedToGoogleDrive,
  getGoogleDriveEmbedPreviewUrl,
  getGoogleDriveFileViewUrl,
  buildGoogleDriveMultipartParts,
} from '../utils/cmsLogic';
import {
  connectGoogleDriveOAuth,
  getGoogleDriveAccessToken,
  setGoogleDriveAccessToken,
} from '../firebase';
import {
  FolderUp,
  FileText,
  Download,
  ExternalLink,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  ShieldCheck,
  HardDrive,
  Eye,
  X,
  UploadCloud,
} from 'lucide-react';

interface CmsRepositoryTabProps {
  currentUser: UserProfile;
  siteName: string;
  repositoryFiles: DriveRepositoryFile[];
  onUploadRepositoryFile: (newFile: DriveRepositoryFile) => void;
  onSyncDriveFiles: (syncedFiles: DriveRepositoryFile[]) => void;
  onDeleteRepositoryFile: (fileId: string) => void;
  onNotifyToast: (msg: string) => void;
}

const REPOSITORY_CATEGORIES = [
  'SOP Lapangan',
  'Laporan Konservasi',
  'SK & Regulasi',
  'Dokumen Kemitraan',
  'Publikasi Ilmiah',
];

// In-memory Blob URL cache for instant high-resolution PDF preview of files uploaded in the current session
const sessionPdfBlobUrls = new Map<string, string>();

export function CmsRepositoryTab({
  currentUser,
  siteName,
  repositoryFiles,
  onUploadRepositoryFile,
  onSyncDriveFiles,
  onDeleteRepositoryFile,
  onNotifyToast,
}: CmsRepositoryTabProps) {
  const canUpload = canUploadToRepository(currentUser.level);

  // Upload Form State (Level 0 & Level 1 only)
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState(REPOSITORY_CATEGORIES[0]);
  const [docDescription, setDocDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileMime, setSelectedFileMime] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState(0);
  const [selectedFileDataUrl, setSelectedFileDataUrl] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Live Google Drive Upload Progress State
  const [uploadStage, setUploadStage] = useState<DriveUploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const [totalUploadBytes, setTotalUploadBytes] = useState<number>(0);
  const [uploadStatusDetail, setUploadStatusDetail] = useState<string>('');
  const [lastUploadedItem, setLastUploadedItem] =
    useState<DriveRepositoryFile | null>(null);

  // Google Drive API OAuth Sync State
  const [driveConnected, setDriveConnected] = useState<boolean>(
    () => Boolean(getGoogleDriveAccessToken())
  );
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  // Filter & Search State (All Levels 0, 1, 2)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Document Preview ("Lihat Dokumen") Modal State
  const [viewingFile, setViewingFile] = useState<DriveRepositoryFile | null>(
    null
  );
  const [viewerMode, setViewerMode] = useState<
    'sheet' | 'native_pdf' | 'gdrive_embed'
  >('sheet');
  const [viewerPdfUrl, setViewerPdfUrl] = useState<string>('');
  const [isLoadingViewerPdf, setIsLoadingViewerPdf] = useState<boolean>(false);

  // Destructive Action Confirmation Modal State (Workspace Integration rule)
  const [pendingDeleteFile, setPendingDeleteFile] =
    useState<DriveRepositoryFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Prepare PDF preview URL whenever viewingFile changes
  useEffect(() => {
    if (!viewingFile) {
      setViewerPdfUrl('');
      return;
    }

    let revokedUrl: string | null = null;
    let cancelled = false;

    const loadPreview = async () => {
      setIsLoadingViewerPdf(true);
      try {
        // 1. Check in-memory session blob URL first (exact uploaded PDF file)
        const sessionUrl = sessionPdfBlobUrls.get(viewingFile.id);
        if (sessionUrl) {
          if (!cancelled) setViewerPdfUrl(sessionUrl);
          return;
        }

        // 2. If connected to Google Drive API and item has a real driveFileId, try fetching exact binary from Google Drive
        const token = getGoogleDriveAccessToken();
        if (token && viewingFile.driveFileId) {
          try {
            const res = await fetch(
              `https://www.googleapis.com/drive/v3/files/${viewingFile.driveFileId}?alt=media&supportsAllDrives=true`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            if (res.ok) {
              const blob = await res.blob();
              const pdfBlob = new Blob([blob], { type: 'application/pdf' });
              const objUrl = URL.createObjectURL(pdfBlob);
              revokedUrl = objUrl;
              sessionPdfBlobUrls.set(viewingFile.id, objUrl);
              if (!cancelled) setViewerPdfUrl(objUrl);
              return;
            }
          } catch {
            // Fall through to inline pdfDataUrl or generated PDF preview
          }
        }

        // 3. Check stored base64 data URL
        if (
          viewingFile.pdfDataUrl &&
          viewingFile.pdfDataUrl.startsWith('data:application/pdf')
        ) {
          if (!cancelled) setViewerPdfUrl(viewingFile.pdfDataUrl);
          return;
        }

        // 4. Generate a valid, readable PDF preview sheet with full document metadata & summary
        const pdfBytes = buildRepositoryPdfBytes(viewingFile, siteName);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const objUrl = URL.createObjectURL(blob);
        revokedUrl = objUrl;
        if (!cancelled) setViewerPdfUrl(objUrl);
      } finally {
        if (!cancelled) setIsLoadingViewerPdf(false);
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
      if (revokedUrl && !sessionPdfBlobUrls.has(viewingFile.id)) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [viewingFile, siteName]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError('');
    setUploadStage('idle');
    setUploadProgress(0);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setSelectedFileName('');
      setSelectedFileMime('');
      setSelectedFileSize(0);
      setSelectedFileDataUrl('');
      return;
    }

    const check = validateRepositoryPdfUpload({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      actorLevel: currentUser.level,
      title: docTitle,
    });

    setSelectedFileName(file.name);
    setSelectedFileMime(file.type || 'application/pdf');
    setSelectedFileSize(file.size);

    if (!check.valid) {
      setSelectedFile(null);
      setSelectedFileDataUrl('');
      setValidationError(
        check.error ||
          'File tidak memenuhi syarat (wajib berformat PDF dan maksimal 10 MB).'
      );
      return;
    }

    setSelectedFile(file);
    if (!docTitle.trim()) {
      setDocTitle(check.cleanedTitle);
    }

    // Read compact PDF data URL for immediate preview & download availability across sessions
    if (file.size <= 200 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedFileDataUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFileDataUrl('');
    }
  };

  // Upload a PDF Blob/File to Google Drive API v3 with real-time XMLHttpRequest upload progress
  const uploadBlobToGoogleDriveWithProgress = (
    token: string,
    fileBlob: Blob,
    metadata: {
      name: string;
      mimeType: string;
      parents: string[];
      description?: string;
    },
    onProgress: (loaded: number, total: number) => void
  ): Promise<{
    id: string;
    name?: string;
    size?: string | number;
    webViewLink?: string;
    webContentLink?: string;
  }> => {
    // Support automated Playwright verification when __YGI_MOCK_GDRIVE_UPLOAD__ is enabled
    const win =
      typeof window !== 'undefined'
        ? (window as unknown as Record<string, any>)
        : {};
    if (win.__YGI_MOCK_GDRIVE_UPLOAD__) {
      return new Promise((resolve) => {
        const total = fileBlob.size || 1024;
        setTimeout(() => onProgress(Math.round(total * 0.35), total), 120);
        setTimeout(() => onProgress(Math.round(total * 0.75), total), 260);
        setTimeout(() => {
          onProgress(total, total);
          const mockId = `1GDrive_${Date.now()}`;
          resolve({
            id: mockId,
            name: metadata.name,
            size: total,
            webViewLink: `https://drive.google.com/file/d/${mockId}/view?usp=drivesdk`,
            webContentLink: `https://drive.google.com/uc?export=download&id=${mockId}`,
          });
        }, 420);
      });
    }

    return new Promise((resolve, reject) => {
      const boundary = `-------ygi_gdrive_multipart_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const { headerPart, footerPart, contentTypeHeader } =
        buildGoogleDriveMultipartParts(metadata, boundary);

      const multipartBody = new Blob([headerPart, fileBlob, footerPart], {
        type: contentTypeHeader,
      });

      const xhr = new XMLHttpRequest();
      xhr.open(
        'POST',
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,size,mimeType,webViewLink,webContentLink',
        true
      );
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', contentTypeHeader);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        } else {
          onProgress(fileBlob.size / 2, fileBlob.size);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (!parsed || !parsed.id) {
              reject(
                new Error(
                  'Respons Google Drive tidak menyertakan File ID dokumen.'
                )
              );
              return;
            }
            resolve(parsed);
          } catch {
            reject(new Error('Gagal membaca respons JSON dari Google Drive API.'));
          }
        } else {
          let apiErrorMessage = `Google Drive API menolak upload (HTTP ${xhr.status}).`;
          try {
            const errJson = JSON.parse(xhr.responseText);
            if (errJson?.error?.message) {
              apiErrorMessage = `Google Drive API (${xhr.status}): ${errJson.error.message}`;
            }
          } catch {
            // Keep default status message
          }
          const err = new Error(apiErrorMessage) as Error & { status?: number };
          err.status = xhr.status;
          reject(err);
        }
      };

      xhr.onerror = () => {
        reject(
          new Error(
            'Koneksi jaringan terputus saat mengunggah berkas PDF ke Google Drive.'
          )
        );
      };

      xhr.send(multipartBody);
    });
  };

  const fetchDriveFolderFilesWithToken = async (accessToken: string) => {
    const q = encodeURIComponent(
      `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='application/pdf' and trashed=false`
    );
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,size,mimeType,webViewLink,webContentLink,createdTime,description)`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Google Drive API merespons status ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data.files)) {
      const mapped: DriveRepositoryFile[] = data.files.map((f: any) => ({
        id: `gdrive_${f.id}`,
        fileName: f.name || 'Dokumen_YGI.pdf',
        title: (f.name || 'Dokumen YGI').replace(/\.pdf$/i, ''),
        description:
          f.description ||
          'Dokumen PDF tersinkronisasi langsung dari folder Google Drive organisasi.',
        category: 'Laporan Konservasi',
        mimeType: 'application/pdf',
        sizeBytes: Number(f.size) || 102400,
        driveFolderId: GOOGLE_DRIVE_FOLDER_ID,
        driveFolderUrl: GOOGLE_DRIVE_FOLDER_URL,
        driveFileId: f.id,
        webViewLink:
          f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
        webContentLink:
          f.webContentLink ||
          `https://drive.google.com/uc?export=download&id=${f.id}`,
        uploadedByUid: currentUser.uid,
        uploadedByName: currentUser.displayName,
        uploadedByLevel: currentUser.level === 2 ? 1 : currentUser.level,
        uploadedByRole:
          currentUser.level === 2 ? 'admin' : currentUser.roleName,
        syncSource: 'google_drive_api',
        createdAt: f.createdTime || new Date().toISOString(),
      }));
      onSyncDriveFiles(mapped);
      return mapped.length;
    }
    return 0;
  };

  const handleConnectAndSyncGoogleDrive = async () => {
    setValidationError('');
    setIsSyncingDrive(true);
    try {
      let token = getGoogleDriveAccessToken();
      if (!token) {
        const authRes = await connectGoogleDriveOAuth(false);
        token = authRes.accessToken;
      }
      setDriveConnected(true);
      const count = await fetchDriveFolderFilesWithToken(token);
      onNotifyToast(
        `Terhubung ke Google Drive! Folder (${GOOGLE_DRIVE_FOLDER_ID}) berhasil disinkronkan (${count} berkas PDF ditemukan di Drive).`
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menghubungkan ke Google Drive API.';
      setValidationError(msg);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setLastUploadedItem(null);

    if (!canUpload) {
      setValidationError(
        'Akses ditolak: Hanya Level 0 dan Level 1 yang dapat mengunggah dokumen.'
      );
      return;
    }

    const check = validateRepositoryPdfUpload({
      fileName: selectedFileName,
      mimeType: selectedFileMime,
      sizeBytes: selectedFileSize,
      actorLevel: currentUser.level,
      title: docTitle,
    });

    if (!check.valid || !selectedFile) {
      setValidationError(
        check.error || 'File PDF tidak valid atau melebihi batas 10 MB.'
      );
      return;
    }

    setIsUploading(true);
    setUploadedBytes(0);
    setTotalUploadBytes(selectedFile.size);

    try {
      // STAGE 1: OAuth Token Check / Interactive Authorization
      setUploadStage('authenticating');
      setUploadProgress(computeDriveUploadProgressPercent('authenticating'));
      setUploadStatusDetail(
        'Memverifikasi otorisasi akun Google Drive (https://www.googleapis.com/auth/drive)...'
      );

      const win =
        typeof window !== 'undefined'
          ? (window as unknown as Record<string, any>)
          : {};
      let token = getGoogleDriveAccessToken();

      if (!token && win.__YGI_MOCK_GDRIVE_UPLOAD__) {
        token = 'mock_gdrive_oauth_token';
      }

      if (!token) {
        setUploadStatusDetail(
          'Menunggu persetujuan login Google Drive pada jendela popup OAuth...'
        );
        const authRes = await connectGoogleDriveOAuth(false);
        token = authRes.accessToken;
        setDriveConnected(true);
      }

      // STAGE 2: Prepare RFC 2387 Multipart/Related Payload for Target Folder
      setUploadStage('preparing');
      setUploadProgress(computeDriveUploadProgressPercent('preparing'));
      setUploadStatusDetail(
        `Menyiapkan paket dokumen PDF "${check.cleanedFileName}" (${formatFileSizeLabel(
          selectedFile.size
        )}) untuk folder Google Drive (${GOOGLE_DRIVE_FOLDER_ID})...`
      );

      const metadata = {
        name: check.cleanedFileName,
        mimeType: 'application/pdf',
        parents: [GOOGLE_DRIVE_FOLDER_ID],
        description:
          docDescription.trim() ||
          `Diunggah oleh ${currentUser.displayName} (Level ${currentUser.level}) melalui CMS YGI.`,
      };

      // STAGE 3: Upload Binary Stream to Google Drive with Live Progress Bar
      setUploadStage('uploading_gdrive');
      setUploadProgress(
        computeDriveUploadProgressPercent(
          'uploading_gdrive',
          0,
          selectedFile.size
        )
      );
      setUploadStatusDetail(
        `Mengunggah berkas PDF ke Google Drive (0 B / ${formatFileSizeLabel(
          selectedFile.size
        )})...`
      );

      let uploadedData: {
        id: string;
        name?: string;
        size?: string | number;
        webViewLink?: string;
        webContentLink?: string;
      };

      try {
        uploadedData = await uploadBlobToGoogleDriveWithProgress(
          token,
          selectedFile,
          metadata,
          (loaded, total) => {
            setUploadedBytes(loaded);
            setTotalUploadBytes(total);
            const pct = computeDriveUploadProgressPercent(
              'uploading_gdrive',
              loaded,
              total
            );
            setUploadProgress(pct);
            setUploadStatusDetail(
              `Mengunggah berkas PDF ke Google Drive (${formatFileSizeLabel(
                loaded
              )} / ${formatFileSizeLabel(total)} · ${pct}%)...`
            );
          }
        );
      } catch (firstErr) {
        const status = (firstErr as { status?: number })?.status;
        if (status === 401 && !win.__YGI_MOCK_GDRIVE_UPLOAD__) {
          // Token expired or missing scope; refresh via consent popup and retry once
          setGoogleDriveAccessToken(null);
          setUploadStage('authenticating');
          setUploadProgress(15);
          setUploadStatusDetail(
            'Sesi token Google Drive kedaluwarsa. Meminta otorisasi ulang Google Drive...'
          );
          const refreshed = await connectGoogleDriveOAuth(true);
          token = refreshed.accessToken;
          setDriveConnected(true);
          setUploadStage('uploading_gdrive');
          uploadedData = await uploadBlobToGoogleDriveWithProgress(
            token,
            selectedFile,
            metadata,
            (loaded, total) => {
              setUploadedBytes(loaded);
              setTotalUploadBytes(total);
              const pct = computeDriveUploadProgressPercent(
                'uploading_gdrive',
                loaded,
                total
              );
              setUploadProgress(pct);
              setUploadStatusDetail(
                `Mengunggah berkas PDF ke Google Drive (${formatFileSizeLabel(
                  loaded
                )} / ${formatFileSizeLabel(total)} · ${pct}%)...`
              );
            }
          );
        } else {
          throw firstErr;
        }
      }

      // STAGE 4: Verify Google Drive File ID & Share Reader Permission for Level 2
      setUploadStage('verifying_gdrive');
      setUploadProgress(computeDriveUploadProgressPercent('verifying_gdrive'));
      setUploadedBytes(selectedFile.size);
      setUploadStatusDetail(
        `Memverifikasi tautan dokumen di Google Drive (File ID: ${uploadedData.id}) & membuka akses baca untuk anggota Level 2...`
      );

      if (!win.__YGI_MOCK_GDRIVE_UPLOAD__) {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${uploadedData.id}/permissions?supportsAllDrives=true`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'reader', type: 'anyone' }),
          }
        ).catch(() => {
          // Ignore if folder-level inheritance already grants link sharing
        });
      }

      const nowIso = new Date().toISOString();
      const driveFileId = uploadedData.id;
      const webViewLink =
        uploadedData.webViewLink ||
        `https://drive.google.com/file/d/${driveFileId}/view?usp=drivesdk`;
      const webContentLink =
        uploadedData.webContentLink ||
        `https://drive.google.com/uc?export=download&id=${driveFileId}`;

      const newRepoItem: DriveRepositoryFile = {
        id: `gdrive_${driveFileId}`,
        fileName: check.cleanedFileName,
        title: check.cleanedTitle,
        description:
          docDescription.trim() ||
          `Dokumen PDF resmi "${check.cleanedTitle}" yang diunggah oleh ${currentUser.displayName} (Level ${currentUser.level}) ke folder Google Drive organisasi.`,
        category: docCategory,
        mimeType: 'application/pdf',
        sizeBytes: selectedFile.size,
        driveFolderId: GOOGLE_DRIVE_FOLDER_ID,
        driveFolderUrl: GOOGLE_DRIVE_FOLDER_URL,
        driveFileId,
        webViewLink,
        webContentLink,
        pdfDataUrl: selectedFileDataUrl || undefined,
        uploadedByUid: currentUser.uid,
        uploadedByName: currentUser.displayName,
        uploadedByLevel: currentUser.level,
        uploadedByRole: currentUser.roleName,
        syncSource: 'google_drive_api',
        createdAt: nowIso,
      };

      // Cache exact local Blob URL for instant in-app PDF preview
      const localObjUrl = URL.createObjectURL(selectedFile);
      sessionPdfBlobUrls.set(newRepoItem.id, localObjUrl);

      // STAGE 5: 100% Complete — ONLY NOW add to Repository List!
      setUploadStage('completed');
      setUploadProgress(100);
      setUploadStatusDetail(
        `100% Selesai! Dokumen "${newRepoItem.fileName}" berhasil terupload ke folder Google Drive (${GOOGLE_DRIVE_FOLDER_ID}) dengan ID: ${driveFileId}.`
      );
      setLastUploadedItem(newRepoItem);

      onUploadRepositoryFile(newRepoItem);

      // Reset form inputs after successful Google Drive upload
      setDocTitle('');
      setDocDescription('');
      setSelectedFile(null);
      setSelectedFileName('');
      setSelectedFileMime('');
      setSelectedFileSize(0);
      setSelectedFileDataUrl('');

      const fileInputEl = document.getElementById(
        'repo-pdf-file-input'
      ) as HTMLInputElement | null;
      if (fileInputEl) {
        fileInputEl.value = '';
      }

      onNotifyToast(
        `100% Berhasil! File PDF "${newRepoItem.fileName}" telah terupload ke Google Drive (${GOOGLE_DRIVE_FOLDER_ID}) dan muncul pada daftar repositori.`
      );
    } catch (err) {
      const rawMsg =
        err instanceof Error
          ? err.message
          : 'Gagal mengunggah berkas PDF ke Google Drive.';
      setUploadStage('error');
      setUploadProgress(0);
      setUploadStatusDetail(
        `Upload ke Google Drive belum berhasil: ${rawMsg}. Dokumen tidak dimasukkan ke daftar repositori sebelum berhasil terupload ke Google Drive.`
      );
      setValidationError(
        `Gagal terupload ke Google Drive: ${rawMsg}. Pastikan Anda menyetujui popup login Google Drive dan akun Google Anda memiliki izin akses Edit/Upload pada folder Google Drive (${GOOGLE_DRIVE_FOLDER_ID}).`
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Re-upload an existing un-synced item from the table directly to Google Drive with live progress
  const handlePushExistingItemToDrive = async (item: DriveRepositoryFile) => {
    if (!canUpload) return;
    setValidationError('');
    setLastUploadedItem(null);
    setIsUploading(true);

    try {
      setUploadStage('authenticating');
      setUploadProgress(12);
      setUploadStatusDetail(
        `Memverifikasi otorisasi Google Drive untuk mengunggah "${item.fileName}"...`
      );

      const win =
        typeof window !== 'undefined'
          ? (window as unknown as Record<string, any>)
          : {};
      let token = getGoogleDriveAccessToken();
      if (!token && win.__YGI_MOCK_GDRIVE_UPLOAD__) {
        token = 'mock_gdrive_oauth_token';
      }
      if (!token) {
        const authRes = await connectGoogleDriveOAuth(false);
        token = authRes.accessToken;
        setDriveConnected(true);
      }

      // Build PDF blob from stored pdfDataUrl or generated repository PDF
      let pdfBlob: Blob;
      if (
        item.pdfDataUrl &&
        item.pdfDataUrl.startsWith('data:application/pdf')
      ) {
        const res = await fetch(item.pdfDataUrl);
        pdfBlob = await res.blob();
      } else {
        const bytes = buildRepositoryPdfBytes(item, siteName);
        pdfBlob = new Blob([bytes], { type: 'application/pdf' });
      }

      setUploadedBytes(0);
      setTotalUploadBytes(pdfBlob.size);
      setUploadStage('uploading_gdrive');
      setUploadProgress(25);
      setUploadStatusDetail(
        `Mengunggah "${item.fileName}" ke folder Google Drive (${GOOGLE_DRIVE_FOLDER_ID})...`
      );

      const uploadedData = await uploadBlobToGoogleDriveWithProgress(
        token,
        pdfBlob,
        {
          name: item.fileName,
          mimeType: 'application/pdf',
          parents: [GOOGLE_DRIVE_FOLDER_ID],
          description: item.description,
        },
        (loaded, total) => {
          setUploadedBytes(loaded);
          setTotalUploadBytes(total);
          const pct = computeDriveUploadProgressPercent(
            'uploading_gdrive',
            loaded,
            total
          );
          setUploadProgress(pct);
          setUploadStatusDetail(
            `Mengunggah "${item.fileName}" ke Google Drive (${formatFileSizeLabel(
              loaded
            )} / ${formatFileSizeLabel(total)} · ${pct}%)...`
          );
        }
      );

      setUploadStage('verifying_gdrive');
      setUploadProgress(95);

      const updatedItem: DriveRepositoryFile = {
        ...item,
        driveFileId: uploadedData.id,
        webViewLink:
          uploadedData.webViewLink ||
          `https://drive.google.com/file/d/${uploadedData.id}/view?usp=drivesdk`,
        webContentLink:
          uploadedData.webContentLink ||
          `https://drive.google.com/uc?export=download&id=${uploadedData.id}`,
        syncSource: 'google_drive_api',
      };

      setUploadStage('completed');
      setUploadProgress(100);
      setUploadStatusDetail(
        `100% Selesai! "${item.fileName}" kini telah terupload ke Google Drive (ID: ${uploadedData.id}).`
      );
      setLastUploadedItem(updatedItem);
      onUploadRepositoryFile(updatedItem);
      onNotifyToast(
        `Dokumen "${item.fileName}" berhasil diunggah ke folder Google Drive (${GOOGLE_DRIVE_FOLDER_ID})!`
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal mengunggah dokumen ke Google Drive.';
      setUploadStage('error');
      setUploadProgress(0);
      setUploadStatusDetail(`Gagal mengunggah "${item.fileName}": ${msg}`);
      setValidationError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewRepositoryDocument = (item: DriveRepositoryFile) => {
    setViewingFile(item);
    setViewerMode('sheet');
  };

  const handleDownloadRepositoryPdf = async (item: DriveRepositoryFile) => {
    const token = getGoogleDriveAccessToken();

    // 1. Check in-memory session blob URL first
    const sessionUrl = sessionPdfBlobUrls.get(item.id);
    if (sessionUrl) {
      const a = document.createElement('a');
      a.href = sessionUrl;
      a.download = item.fileName.endsWith('.pdf')
        ? item.fileName
        : `${item.fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onNotifyToast(`Mengunduh berkas PDF "${item.fileName}"...`);
      return;
    }

    // 2. If connected to Google Drive API and item has a live driveFileId, download binary from Drive API
    if (token && item.driveFileId) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${item.driveFileId}?alt=media&supportsAllDrives=true`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.fileName.endsWith('.pdf')
            ? item.fileName
            : `${item.fileName}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          onNotifyToast(
            `Berhasil mengunduh berkas asli "${item.fileName}" dari Google Drive!`
          );
          return;
        }
      } catch {
        // Fallback to inline pdfDataUrl or generated PDF bytes
      }
    }

    // 3. If inline PDF Data URL was stored on upload, download it directly
    if (item.pdfDataUrl && item.pdfDataUrl.startsWith('data:application/pdf')) {
      const a = document.createElement('a');
      a.href = item.pdfDataUrl;
      a.download = item.fileName.endsWith('.pdf')
        ? item.fileName
        : `${item.fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onNotifyToast(
        `Berhasil mengunduh dokumen PDF "${item.fileName}" (${formatFileSizeLabel(
          item.sizeBytes
        )})!`
      );
      return;
    }

    // 4. Generate valid PDF binary containing the repository document details
    const pdfBytes = buildRepositoryPdfBytes(item, siteName);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.fileName.endsWith('.pdf')
      ? item.fileName
      : `${item.fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    onNotifyToast(
      `Dokumen PDF "${item.fileName}" (${formatFileSizeLabel(
        item.sizeBytes
      )}) berhasil diunduh!`
    );
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteFile || !canUpload) return;
    setIsDeleting(true);
    try {
      const token = getGoogleDriveAccessToken();
      if (token && pendingDeleteFile.driveFileId) {
        try {
          await fetch(
            `https://www.googleapis.com/drive/v3/files/${pendingDeleteFile.driveFileId}?supportsAllDrives=true`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch {
          // Proceed with removing from CMS state even if remote file was already removed
        }
      }
      onDeleteRepositoryFile(pendingDeleteFile.id);
      onNotifyToast(
        `Dokumen PDF "${pendingDeleteFile.fileName}" telah dihapus dari repositori.`
      );
      setPendingDeleteFile(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredFiles = repositoryFiles.filter((file) => {
    const matchesCategory =
      categoryFilter === 'ALL' || file.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      file.title.toLowerCase().includes(q) ||
      file.fileName.toLowerCase().includes(q) ||
      file.description.toLowerCase().includes(q) ||
      file.uploadedByName.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Target Google Drive Folder Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-[#D5E0D8] rounded-xl p-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-mono-tabular text-[#1B4332] bg-[#EBF3EE] px-2.5 py-1 rounded-md font-semibold">
            <HardDrive className="w-3.5 h-3.5" />
            <span>
              GOOGLE DRIVE REPOSITORY · FOLDER ID: {GOOGLE_DRIVE_FOLDER_ID}
            </span>
          </div>
          <h2 className="text-xl font-bold font-display text-[#0F2417]">
            {canUpload
              ? 'Upload & Manajemen Repositori Dokumen PDF (Google Drive)'
              : 'Repositori Dokumen Resmi Organisasi (Google Drive)'}
          </h2>
          <p className="text-xs text-[#4B6855] max-w-3xl leading-relaxed">
            {canUpload ? (
              <>
                Menu khusus <strong>Superadmin (Level 0)</strong> dan{' '}
                <strong>Admin/Editor (Level 1)</strong> untuk mengunggah berkas
                berjenis <strong>PDF (.pdf)</strong> dengan ukuran maksimal{' '}
                <strong>10 MB</strong> langsung ke folder Google Drive
                organisasi. Dokumen hanya akan masuk ke daftar repositori setelah
                proses upload ke Google Drive mencapai <strong>100%</strong>.
              </>
            ) : (
              <>
                Daftar dokumen resmi organisasi berformat <strong>PDF</strong>{' '}
                yang telah diunggah oleh <strong>Superadmin (Level 0)</strong>{' '}
                dan <strong>Admin/Editor (Level 1)</strong>. Anda (Level 2)
                dapat klik <strong>Lihat Dokumen</strong> untuk membaca pratinjau
                atau <strong>Download PDF</strong> untuk mengunduh berkas.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="gdrive-folder-link"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F0F5F1] hover:bg-[#E2ECE5] text-[#1B4332] border border-[#CED9D1] rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Folder Google Drive</span>
          </a>

          <button
            type="button"
            disabled={isSyncingDrive}
            onClick={handleConnectAndSyncGoogleDrive}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`}
            />
            <span>
              {isSyncingDrive
                ? 'Menyinkronkan Google Drive...'
                : driveConnected
                ? 'Sinkronkan Ulang Google Drive'
                : 'Hubungkan & Sinkronkan Google Drive'}
            </span>
          </button>
        </div>
      </div>

      {/* Target Folder URL Bar */}
      <div className="bg-[#0F291E] text-white rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
          <span className="text-emerald-200 shrink-0">
            Target Link Google Drive:
          </span>
          <code className="font-mono-tabular text-white bg-[#163829] px-2.5 py-1 rounded truncate">
            {GOOGLE_DRIVE_FOLDER_URL}
          </code>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-mono-tabular text-[11px] text-emerald-200">
          <span>
            Status OAuth:{' '}
            <strong className={driveConnected ? 'text-emerald-300' : 'text-amber-300'}>
              {driveConnected ? 'Terhubung ke GDrive' : 'Siap Otorisasi saat Upload'}
            </strong>
          </span>
          <span>·</span>
          <span>Format: .PDF (&le; 10 MB)</span>
        </div>
      </div>

      {/* LEVEL 0 & LEVEL 1 EXCLUSIVE: UPLOAD PDF TO GOOGLE DRIVE FORM */}
      {canUpload && (
        <form
          onSubmit={handleUploadSubmit}
          data-testid="repository-upload-form"
          className="bg-white border border-[#D5E0D8] rounded-xl p-6 space-y-4"
        >
          <div className="border-b border-[#E2ECE5] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold font-display text-[#0F2417]">
                Unggah Dokumen PDF Baru ke Google Drive Repository (Level 0 &amp;
                Level 1)
              </h3>
              <p className="text-xs text-[#4B6855] mt-0.5">
                Hanya menerima file berjenis{' '}
                <strong>PDF (application/pdf)</strong> dengan ukuran maksimal{' '}
                <strong>
                  10 MB ({formatFileSizeLabel(MAX_REPOSITORY_PDF_SIZE_BYTES)})
                </strong>
                . Dilengkapi indikator progress real-time hingga terupload ke
                link Google Drive tujuan.
              </p>
            </div>
            <span className="text-xs font-mono-tabular px-2.5 py-1 rounded bg-[#EBF3EE] text-[#1B4332] font-semibold">
              Otorisasi Upload: Level {currentUser.level}
            </span>
          </div>

          {validationError && (
            <div
              role="alert"
              data-testid="repository-upload-error"
              className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <label
                htmlFor="repo-doc-title"
                className="block text-xs font-semibold text-[#0F2417] mb-1"
              >
                Judul Dokumen PDF
              </label>
              <input
                id="repo-doc-title"
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Contoh: Pedoman Restorasi Gambut 2026"
                className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
              />
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="repo-doc-category"
                className="block text-xs font-semibold text-[#0F2417] mb-1"
              >
                Kategori Repositori
              </label>
              <select
                id="repo-doc-category"
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
              >
                {REPOSITORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="repo-pdf-file-input"
                className="block text-xs font-semibold text-[#0F2417] mb-1"
              >
                Pilih Berkas PDF (Wajib .pdf · Maks 10 MB)
              </label>
              <input
                id="repo-pdf-file-input"
                type="file"
                accept=".pdf,application/pdf"
                aria-label="Pilih Berkas PDF Maksimal 10 MB"
                onChange={handleFileInputChange}
                className="w-full text-xs text-[#0F2417] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1B4332] file:text-white hover:file:bg-[#143325] bg-[#F6F8F6] border border-[#CED9D1] rounded-lg p-1 cursor-pointer"
              />
            </div>
          </div>

          {selectedFileName && !validationError && (
            <div className="p-3 bg-[#EBF3EE] border border-[#2D6A4F]/40 rounded-lg flex items-center justify-between text-xs text-[#0F2417]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1B4332] shrink-0" />
                <span>
                  Berkas siap diunggah ke Google Drive:{' '}
                  <strong>{selectedFileName}</strong> (
                  {formatFileSizeLabel(selectedFileSize)} · PDF Terverifikasi
                  &le; 10 MB)
                </span>
              </div>
              <span className="font-mono-tabular text-[11px] text-[#1B4332] font-semibold">
                Target Folder: {GOOGLE_DRIVE_FOLDER_ID}
              </span>
            </div>
          )}

          {/* LIVE UPLOAD PROGRESS BAR PANEL (0% -> 100%) */}
          {uploadStage !== 'idle' && (
            <div
              data-testid="gdrive-upload-progress-panel"
              className={`p-4 rounded-xl border space-y-3 ${
                uploadStage === 'completed'
                  ? 'bg-[#EBF3EE] border-[#1B4332]/40'
                  : uploadStage === 'error'
                  ? 'bg-red-50 border-red-300'
                  : 'bg-[#F4F8F5] border-[#2D6A4F]/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UploadCloud
                    className={`w-4 h-4 shrink-0 ${
                      uploadStage === 'error'
                        ? 'text-red-700'
                        : 'text-[#1B4332]'
                    } ${isUploading ? 'animate-bounce' : ''}`}
                  />
                  <span className="text-xs font-bold text-[#0F2417]">
                    {uploadStage === 'authenticating' &&
                      'Tahap 1/4: Otorisasi Akun Google Drive...'}
                    {uploadStage === 'preparing' &&
                      'Tahap 2/4: Menyiapkan Paket Multipart PDF...'}
                    {uploadStage === 'uploading_gdrive' &&
                      'Tahap 3/4: Mengunggah Berkas PDF ke Folder Google Drive...'}
                    {uploadStage === 'verifying_gdrive' &&
                      'Tahap 4/4: Memverifikasi File ID & Link Google Drive...'}
                    {uploadStage === 'completed' &&
                      'Upload Selesai (100%) — Berkas Terupload di Google Drive!'}
                    {uploadStage === 'error' &&
                      'Upload ke Google Drive Terhenti / Gagal'}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono-tabular text-xs font-bold">
                  {totalUploadBytes > 0 && (
                    <span className="text-[#3A5243] font-normal">
                      {formatFileSizeLabel(uploadedBytes)} /{' '}
                      {formatFileSizeLabel(totalUploadBytes)}
                    </span>
                  )}
                  <span
                    data-testid="gdrive-upload-progress-percent"
                    className={`px-2 py-0.5 rounded ${
                      uploadStage === 'completed'
                        ? 'bg-[#1B4332] text-white'
                        : uploadStage === 'error'
                        ? 'bg-red-700 text-white'
                        : 'bg-[#2D6A4F] text-white'
                    }`}
                  >
                    {uploadProgress}%
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div
                role="progressbar"
                aria-label="Progress Upload Google Drive"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-3 bg-[#D5E0D8] rounded-full overflow-hidden"
              >
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    uploadStage === 'error'
                      ? 'bg-red-600'
                      : uploadStage === 'completed'
                      ? 'bg-[#1B4332]'
                      : 'bg-[#2D6A4F]'
                  }`}
                  style={{
                    width: `${
                      uploadStage === 'error' ? 100 : Math.max(4, uploadProgress)
                    }%`,
                  }}
                />
              </div>

              {/* 4-Step Milestone Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 text-[11px] font-mono-tabular">
                <div
                  className={`px-2.5 py-1 rounded border ${
                    uploadProgress >= 12
                      ? 'bg-white border-[#2D6A4F] text-[#0F2417] font-semibold'
                      : 'bg-white/60 border-[#CED9D1] text-[#4B6855]'
                  }`}
                >
                  1. OAuth GDrive {uploadProgress >= 12 ? '✓' : ''}
                </div>
                <div
                  className={`px-2.5 py-1 rounded border ${
                    uploadProgress >= 22
                      ? 'bg-white border-[#2D6A4F] text-[#0F2417] font-semibold'
                      : 'bg-white/60 border-[#CED9D1] text-[#4B6855]'
                  }`}
                >
                  2. Paket PDF {uploadProgress >= 22 ? '✓' : ''}
                </div>
                <div
                  className={`px-2.5 py-1 rounded border ${
                    uploadProgress >= 90
                      ? 'bg-white border-[#2D6A4F] text-[#0F2417] font-semibold'
                      : uploadStage === 'uploading_gdrive'
                      ? 'bg-[#EBF3EE] border-[#1B4332] text-[#1B4332] font-semibold'
                      : 'bg-white/60 border-[#CED9D1] text-[#4B6855]'
                  }`}
                >
                  3. Transfer GDrive {uploadProgress >= 90 ? '✓' : ''}
                </div>
                <div
                  className={`px-2.5 py-1 rounded border ${
                    uploadProgress === 100
                      ? 'bg-[#1B4332] border-[#1B4332] text-white font-semibold'
                      : 'bg-white/60 border-[#CED9D1] text-[#4B6855]'
                  }`}
                >
                  4. Terverifikasi 100% {uploadProgress === 100 ? '✓' : ''}
                </div>
              </div>

              <p className="text-xs text-[#2D4738] leading-relaxed">
                {uploadStatusDetail}
              </p>

              {/* Action links once 100% uploaded to Google Drive */}
              {uploadStage === 'completed' && lastUploadedItem && (
                <div className="pt-2 border-t border-[#1B4332]/20 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#1B4332]">
                    File ID Google Drive:{' '}
                    <code className="font-mono-tabular bg-white px-2 py-0.5 rounded border border-[#CED9D1]">
                      {lastUploadedItem.driveFileId}
                    </code>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleViewRepositoryDocument(lastUploadedItem)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#F0F5F1] text-[#1B4332] border border-[#1B4332] rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Dokumen Ini</span>
                    </button>
                    <a
                      href={getGoogleDriveFileViewUrl(
                        lastUploadedItem.driveFileId,
                        lastUploadedItem.webViewLink
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka File di Google Drive</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="repo-doc-desc"
              className="block text-xs font-semibold text-[#0F2417] mb-1"
            >
              Ringkasan / Keterangan Dokumen untuk Anggota Level 2
            </label>
            <textarea
              id="repo-doc-desc"
              rows={2}
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Tuliskan keterangan singkat isi dokumen agar memudahkan Anggota Level 2 saat melihat & mengunduh..."
              className="w-full px-3 py-2 text-xs bg-white border border-[#CED9D1] rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <p className="text-[11px] text-[#4B6855]">
              Dokumen hanya akan masuk ke tabel repositori di bawah setelah
              proses upload ke folder Google Drive selesai{' '}
              <strong>100%</strong>.
            </p>
            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] disabled:opacity-60 text-white rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <FolderUp className="w-4 h-4" />
              <span>
                {isUploading
                  ? `Mengunggah ke Google Drive (${uploadProgress}%)...`
                  : 'Upload PDF ke Google Drive Repository'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* REPOSITORY LIST, VIEW & DOWNLOAD SECTION (VISIBLE TO LEVEL 0, LEVEL 1, AND LEVEL 2) */}
      <div className="bg-white border border-[#D5E0D8] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#E2ECE5] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold font-display text-[#0F2417]">
              Daftar Dokumen Repositori Google Drive ({filteredFiles.length}{' '}
              Berkas PDF)
            </h3>
            <p className="text-xs text-[#4B6855] mt-0.5">
              Dihimpun dari unggahan pengurus <strong>Level 0</strong> dan{' '}
              <strong>Level 1</strong> pada folder Google Drive organisasi. Klik{' '}
              <strong>Lihat Dokumen</strong> untuk membaca pratinjau PDF atau{' '}
              <strong>Download PDF</strong> untuk mengunduh berkas.
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#4B6855] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Cari dokumen repositori PDF"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul atau nama file PDF..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#F6F8F6] border border-[#CED9D1] rounded-lg text-[#0F2417] w-full sm:w-56"
              />
            </div>

            <select
              aria-label="Filter kategori repositori"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F6F8F6] border border-[#CED9D1] rounded-lg text-[#0F2417]"
            >
              <option value="ALL">
                Semua Kategori ({repositoryFiles.length})
              </option>
              {REPOSITORY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F0F5F1] text-[#3A5243] border-b border-[#D5E0D8]">
                <th className="py-3 px-4 font-semibold">
                  Dokumen PDF &amp; Status GDrive
                </th>
                <th className="py-3 px-4 font-semibold">Kategori</th>
                <th className="py-3 px-4 font-semibold">Ukuran File</th>
                <th className="py-3 px-4 font-semibold">
                  Diunggah Oleh (Level 0 / 1)
                </th>
                <th className="py-3 px-4 font-semibold text-right">
                  Aksi Lihat, Unduh &amp; Google Drive
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EDE8]">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 px-4 text-center text-xs text-[#4B6855]"
                  >
                    Belum ada dokumen PDF yang sesuai dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((item) => {
                  const uploadedOnDrive = isUploadedToGoogleDrive(item);
                  return (
                    <tr
                      key={item.id}
                      data-testid={`repo-row-${item.id}`}
                      className="hover:bg-[#F9FBF9]"
                    >
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-lg bg-[#EBF3EE] text-[#1B4332] shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-bold text-[#0F2417] truncate">
                                {item.title}
                              </p>
                              {uploadedOnDrive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EBF3EE] text-[#1B4332] border border-[#2D6A4F]/30 font-mono-tabular text-[10px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Terupload di GDrive
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-mono-tabular text-[10px] font-semibold">
                                  <AlertCircle className="w-3 h-3" />
                                  Belum Terupload ke GDrive
                                </span>
                              )}
                            </div>
                            <p className="font-mono-tabular text-[11px] text-[#1B4332] truncate mt-0.5">
                              {item.fileName}
                              {item.driveFileId
                                ? ` · ID: ${item.driveFileId}`
                                : ''}
                            </p>
                            <p className="text-[11px] text-[#4B6855] mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-[#F0F5F1] border border-[#D5E0D8] text-[#1B4332] font-medium text-[11px]">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono-tabular font-semibold text-[#0F2417]">
                        {formatFileSizeLabel(item.sizeBytes)}
                        <span className="block text-[10px] font-normal text-[#4B6855]">
                          PDF (&le; 10 MB)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-[#0F2417]">
                          {item.uploadedByName}
                        </p>
                        <p className="text-[11px] text-[#1B4332] font-mono-tabular">
                          Level {item.uploadedByLevel} ·{' '}
                          {item.uploadedByRole.toUpperCase()}
                        </p>
                        <p className="text-[10px] text-[#4B6855]">
                          {new Date(item.createdAt).toLocaleDateString(
                            'id-ID',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {/* Button to View/Preview Document in Modal */}
                          <button
                            type="button"
                            onClick={() => handleViewRepositoryDocument(item)}
                            aria-label={`Lihat Dokumen ${item.fileName}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#EBF3EE] hover:bg-[#DCEAE1] text-[#1B4332] border border-[#2D6A4F]/30 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Dokumen</span>
                          </button>

                          {/* Button to Download PDF */}
                          <button
                            type="button"
                            onClick={() => handleDownloadRepositoryPdf(item)}
                            aria-label={`Download PDF ${item.fileName}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </button>

                          {/* If an earlier trial item wasn't uploaded to Google Drive yet, allow Level 0/1 to push it now */}
                          {!uploadedOnDrive && canUpload && (
                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={() => handlePushExistingItemToDrive(item)}
                              aria-label={`Upload ${item.fileName} ke Google Drive`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Upload ke GDrive</span>
                            </button>
                          )}

                          {/* Direct Link to Google Drive File / Folder */}
                          <a
                            href={getGoogleDriveFileViewUrl(
                              item.driveFileId,
                              item.webViewLink
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Buka ${item.fileName} di Google Drive`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-[#F0F5F1] hover:bg-[#E2ECE5] text-[#1B4332] border border-[#CED9D1] rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>GDrive</span>
                          </a>

                          {canUpload && (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteFile(item)}
                              aria-label={`Hapus dokumen ${item.fileName}`}
                              className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DOCUMENT VIEWER MODAL ("LIHAT DOKUMEN") */}
      {viewingFile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-repo-doc-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white border border-[#CED9D1] rounded-xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#0F291E] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E4631]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-emerald-300">
                  <span>PRATINJAU DOKUMEN REPOSITORI</span>
                  <span>·</span>
                  <span>{viewingFile.category.toUpperCase()}</span>
                  <span>·</span>
                  <span>{formatFileSizeLabel(viewingFile.sizeBytes)}</span>
                </div>
                <h3
                  id="view-repo-doc-title"
                  className="text-base font-bold font-display text-white truncate mt-0.5"
                >
                  {viewingFile.title} ({viewingFile.fileName})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="inline-flex rounded-lg bg-[#163829] p-0.5 border border-[#2D6A4F]">
                  <button
                    type="button"
                    onClick={() => setViewerMode('sheet')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                      viewerMode === 'sheet'
                        ? 'bg-[#2D6A4F] text-white'
                        : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    Lembar Dokumen
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerMode('native_pdf')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                      viewerMode === 'native_pdf'
                        ? 'bg-[#2D6A4F] text-white'
                        : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    Frame PDF
                  </button>
                  {viewingFile.driveFileId && (
                    <button
                      type="button"
                      onClick={() => setViewerMode('gdrive_embed')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        viewerMode === 'gdrive_embed'
                          ? 'bg-[#2D6A4F] text-white'
                          : 'text-emerald-200 hover:text-white'
                      }`}
                    >
                      Embed GDrive
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadRepositoryPdf(viewingFile)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <a
                  href={getGoogleDriveFileViewUrl(
                    viewingFile.driveFileId,
                    viewingFile.webViewLink
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1E4631] hover:bg-[#2D6A4F] text-white rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Google Drive</span>
                </a>

                <button
                  type="button"
                  onClick={() => setViewingFile(null)}
                  aria-label="Tutup pratinjau dokumen"
                  className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-[#1E4631] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metadata Sub-bar */}
            <div className="px-6 py-2.5 bg-[#F0F5F1] border-b border-[#D5E0D8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#3A5243]">
              <div>
                Diunggah oleh:{' '}
                <strong className="text-[#0F2417]">
                  {viewingFile.uploadedByName}
                </strong>{' '}
                (Level {viewingFile.uploadedByLevel} ·{' '}
                {viewingFile.uploadedByRole.toUpperCase()})
              </div>
              <div className="font-mono-tabular text-[11px]">
                {viewingFile.driveFileId
                  ? `Google Drive File ID: ${viewingFile.driveFileId}`
                  : `Target Folder ID: ${viewingFile.driveFolderId}`}
              </div>
            </div>

            {/* PDF Frame / Document Sheet Viewport */}
            <div className="p-6 bg-[#E6EDE8] flex-1 overflow-y-auto space-y-4">
              {viewerMode === 'sheet' ? (
                <div className="bg-white border border-[#CED9D1] rounded-xl p-8 max-w-3xl mx-auto shadow-sm space-y-6">
                  {/* Official Letterhead */}
                  <div className="border-b-2 border-[#0F291E] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-mono-tabular font-bold text-[#1B4332]">
                        ARSIP DOKUMEN RESMI REPOSITORI GOOGLE DRIVE
                      </p>
                      <h4 className="text-lg font-bold font-display text-[#0F2417] mt-0.5">
                        {siteName.toUpperCase()} (YGI)
                      </h4>
                      <p className="text-xs text-[#4B6855] mt-0.5">
                        Folder Tujuan Google Drive:{' '}
                        <code className="font-mono-tabular text-[#0F2417]">
                          {GOOGLE_DRIVE_FOLDER_ID}
                        </code>
                      </p>
                    </div>
                    <div>
                      {isUploadedToGoogleDrive(viewingFile) ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EBF3EE] text-[#1B4332] border border-[#2D6A4F]/40 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          Terverifikasi di Google Drive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold">
                          <AlertCircle className="w-4 h-4" />
                          Arsip CMS (Belum Terupload ke GDrive)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F6F8F6] border border-[#D5E0D8] rounded-lg p-4 text-xs">
                    <div>
                      <span className="text-[#4B6855] block">Judul Dokumen:</span>
                      <strong className="text-[#0F2417] text-sm">
                        {viewingFile.title}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#4B6855] block">Nama Berkas PDF:</span>
                      <code className="font-mono-tabular font-semibold text-[#1B4332]">
                        {viewingFile.fileName}
                      </code>
                    </div>
                    <div>
                      <span className="text-[#4B6855] block">Kategori &amp; Ukuran:</span>
                      <strong className="text-[#0F2417]">
                        {viewingFile.category} ·{' '}
                        {formatFileSizeLabel(viewingFile.sizeBytes)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#4B6855] block">
                        Diunggah Oleh &amp; Tanggal:
                      </span>
                      <strong className="text-[#0F2417]">
                        {viewingFile.uploadedByName} (Level{' '}
                        {viewingFile.uploadedByLevel}) ·{' '}
                        {new Date(viewingFile.createdAt).toLocaleDateString(
                          'id-ID',
                          {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          }
                        )}
                      </strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[#4B6855] block">
                        Tautan Google Drive:
                      </span>
                      <a
                        href={getGoogleDriveFileViewUrl(
                          viewingFile.driveFileId,
                          viewingFile.webViewLink
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono-tabular text-[#1B4332] underline break-all"
                      >
                        {getGoogleDriveFileViewUrl(
                          viewingFile.driveFileId,
                          viewingFile.webViewLink
                        )}
                      </a>
                    </div>
                  </div>

                  {/* Document Summary & Content Body */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#3A5243]">
                      Ringkasan &amp; Keterangan Isi Dokumen PDF
                    </h5>
                    <div className="p-4 bg-[#F9FBF9] border border-[#E2ECE5] rounded-lg text-sm text-[#0F2417] leading-relaxed whitespace-pre-wrap">
                      {viewingFile.description}
                    </div>
                  </div>

                  {/* Footer Actions inside Document Sheet */}
                  <div className="pt-3 border-t border-[#E2ECE5] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewerMode('native_pdf')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#F0F5F1] hover:bg-[#E2ECE5] text-[#1B4332] border border-[#CED9D1] rounded-lg cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Buka Frame PDF</span>
                      </button>
                      {viewingFile.driveFileId && (
                        <button
                          type="button"
                          onClick={() => setViewerMode('gdrive_embed')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#F0F5F1] hover:bg-[#E2ECE5] text-[#1B4332] border border-[#CED9D1] rounded-lg cursor-pointer"
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>Tampilkan Embed Google Drive</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadRepositoryPdf(viewingFile)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1B4332] hover:bg-[#143325] text-white rounded-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Berkas PDF Sekarang</span>
                    </button>
                  </div>
                </div>
              ) : viewerMode === 'gdrive_embed' &&
                getGoogleDriveEmbedPreviewUrl(viewingFile.driveFileId) ? (
                <iframe
                  title={`Google Drive Preview ${viewingFile.title}`}
                  src={
                    getGoogleDriveEmbedPreviewUrl(viewingFile.driveFileId) || ''
                  }
                  className="w-full h-[64vh] rounded-lg border border-[#CED9D1] bg-white"
                />
              ) : isLoadingViewerPdf ? (
                <div className="w-full h-[64vh] rounded-lg border border-[#CED9D1] bg-white flex flex-col items-center justify-center gap-2 text-xs text-[#4B6855]">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#1B4332]" />
                  <span>Memuat pratinjau dokumen PDF...</span>
                </div>
              ) : (
                <iframe
                  title={`Pratinjau PDF ${viewingFile.title}`}
                  src={viewerPdfUrl}
                  className="w-full h-[64vh] rounded-lg border border-[#CED9D1] bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Before Deleting Repository File (Mandatory per workspace-integration) */}
      {pendingDeleteFile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-repo-title"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#CED9D1] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3
              id="confirm-delete-repo-title"
              className="text-base font-bold font-display text-[#0F2417]"
            >
              Konfirmasi Hapus Dokumen Repositori
            </h3>
            <p className="text-xs text-[#3A5243] leading-relaxed">
              Apakah Anda yakin ingin menghapus berkas PDF{' '}
              <strong>{pendingDeleteFile.fileName}</strong> dari daftar
              repositori organisasi? Tindakan ini akan menghapus akses unduhan
              bagi pengguna Level 2.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPendingDeleteFile(null)}
                className="px-3.5 py-2 text-xs font-semibold bg-[#E6EDE8] hover:bg-[#D5E0D8] text-[#0F2417] rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-red-700 hover:bg-red-800 text-white rounded-lg cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Dokumen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
