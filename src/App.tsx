/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import {
  db,
  auth,
  googleProvider,
  OperationType,
  handleFirestoreError,
} from './firebase';
import {
  SiteConfig,
  UserProfile,
  UserLevel,
  RoleName,
  CategoryItem,
  ContentArticle,
  ContentMediaType,
  CommentItem,
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
  buildSuratTugasSideEffects,
  getDefaultPermissionsForLevel,
  slugifyCategory,
  canSuperadminEditUserName,
  canSuperadminManageUserStatus,
  canSuperadminDeleteUser,
  canSuperadminManageUserPassword,
  validateAndFormatUserName,
  validateAndFormatDepartment,
  validateAndFormatUserPassword,
  authorizeGoogleOAuthUser,
  resolveTaskReportInitialStatus,
  canApproveTaskReport,
  buildTaskReportApprovalNotifications,
  normalizeSiteConfig,
  sanitizeForFirestore,
} from './utils/cmsLogic';
import {
  INITIAL_SITE_CONFIG,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_CONTENTS,
  INITIAL_COMMENTS,
  INITIAL_LETTER_TEMPLATES,
  INITIAL_LETTERS,
  INITIAL_TASK_REPORTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITY_LOGS,
} from './data/seedData';
import { PublicPortal } from './components/PublicPortal';
import { CmsLoginModal } from './components/CmsLoginModal';
import { CmsWorkspace } from './components/CmsWorkspace';

const STORAGE_PREFIX = 'ygi_cms_v2_';

function loadPersistedState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function savePersistedState<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${key}`,
      JSON.stringify(value)
    );
  } catch {
    // Ignore storage quota errors
  }
}

type CmsStateSection =
  | 'site_config'
  | 'users'
  | 'categories'
  | 'contents'
  | 'comments'
  | 'templates'
  | 'letters'
  | 'reports'
  | 'notifications'
  | 'activity_logs';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);

  // Active application state hydrated from localStorage + synced with Cloud Firestore
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() =>
    normalizeSiteConfig(
      loadPersistedState<SiteConfig>('site_config', INITIAL_SITE_CONFIG),
      INITIAL_SITE_CONFIG
    )
  );
  const [users, setUsers] = useState<UserProfile[]>(() =>
    loadPersistedState<UserProfile[]>('users', INITIAL_USERS)
  );
  const [categories, setCategories] = useState<CategoryItem[]>(() =>
    loadPersistedState<CategoryItem[]>('categories', INITIAL_CATEGORIES)
  );
  const [contents, setContents] = useState<ContentArticle[]>(() =>
    loadPersistedState<ContentArticle[]>('contents', INITIAL_CONTENTS)
  );
  const [comments, setComments] = useState<CommentItem[]>(() =>
    loadPersistedState<CommentItem[]>('comments', INITIAL_COMMENTS)
  );
  const [templates, setTemplates] = useState<LetterTemplate[]>(() =>
    loadPersistedState<LetterTemplate[]>('templates', INITIAL_LETTER_TEMPLATES)
  );
  const [letterSequence, setLetterSequence] = useState<number>(() =>
    loadPersistedState<number>('letter_sequence', 5)
  );
  const [letters, setLetters] = useState<OrganizationLetter[]>(() =>
    loadPersistedState<OrganizationLetter[]>('letters', INITIAL_LETTERS)
  );
  const [reports, setReports] = useState<TaskReport[]>(() =>
    loadPersistedState<TaskReport[]>('reports', INITIAL_TASK_REPORTS)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadPersistedState<NotificationItem[]>(
      'notifications',
      INITIAL_NOTIFICATIONS
    )
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    loadPersistedState<ActivityLog[]>('activity_logs', INITIAL_ACTIVITY_LOGS)
  );

  // Navigation & Auth Session State (persisted across reloads)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    loadPersistedState<UserProfile | null>('current_user', null)
  );
  const [viewMode, setViewMode] = useState<'public' | 'cms'>(() =>
    loadPersistedState<'public' | 'cms'>('view_mode', 'public')
  );
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Mirror state changes to localStorage immediately so page reloads never lose data
  useEffect(() => {
    savePersistedState('site_config', siteConfig);
  }, [siteConfig]);

  useEffect(() => {
    savePersistedState('users', users);
  }, [users]);

  useEffect(() => {
    savePersistedState('categories', categories);
  }, [categories]);

  useEffect(() => {
    savePersistedState('contents', contents);
  }, [contents]);

  useEffect(() => {
    savePersistedState('comments', comments);
  }, [comments]);

  useEffect(() => {
    savePersistedState('templates', templates);
  }, [templates]);

  useEffect(() => {
    savePersistedState('letter_sequence', letterSequence);
  }, [letterSequence]);

  useEffect(() => {
    savePersistedState('letters', letters);
  }, [letters]);

  useEffect(() => {
    savePersistedState('reports', reports);
  }, [reports]);

  useEffect(() => {
    savePersistedState('notifications', notifications);
  }, [notifications]);

  useEffect(() => {
    savePersistedState('activity_logs', activityLogs);
  }, [activityLogs]);

  useEffect(() => {
    savePersistedState('current_user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    savePersistedState('view_mode', viewMode);
  }, [viewMode]);

  // Helper to persist any CMS state section to Cloud Firestore (/ygi_cms_state/{sectionId})
  const persistSectionToFirestore = async (
    section: CmsStateSection,
    payload: {
      items?: any[];
      config?: Record<string, any>;
      sequence?: number;
      updatedBy?: string;
    }
  ) => {
    const rawActorUid =
      payload.updatedBy ||
      currentUser?.uid ||
      auth.currentUser?.uid ||
      'usr_superadmin_01';
    const safeUid = /^[a-zA-Z0-9_\-]+$/.test(rawActorUid)
      ? rawActorUid.slice(0, 128)
      : 'usr_superadmin_01';

    const docPayload = {
      section,
      items: sanitizeForFirestore(payload.items || []),
      config: sanitizeForFirestore(payload.config || {}),
      sequence:
        typeof payload.sequence === 'number'
          ? Math.max(0, Math.floor(payload.sequence))
          : 0,
      updatedBy: safeUid,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'ygi_cms_state', section), docPayload);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `ygi_cms_state/${section}`
      );
    }
  };

  // 1. Track Firebase Auth state (only authorize users registered in the access list)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthReady(true);
      if (fbUser) {
        setUsers((prevUsers) => {
          const check = authorizeGoogleOAuthUser(prevUsers, fbUser.email);
          if (check.ok && check.user) {
            setCurrentUser(check.user);
          }
          return prevUsers;
        });
      }
    });
    return () => unsub();
  }, []);

  // 2. Attach real-time Cloud Firestore listeners for all 10 CMS state sections
  useEffect(() => {
    if (!authReady) return;

    const unsubs: Array<() => void> = [];

    // Section 1: site_config
    unsubs.push(
      onSnapshot(
        doc(db, 'ygi_cms_state', 'site_config'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (d.config && typeof d.config === 'object') {
              const normalized = normalizeSiteConfig(
                d.config as Partial<SiteConfig>,
                INITIAL_SITE_CONFIG
              );
              setSiteConfig(normalized);
              // Auto-migrate legacy default name in Firestore if encountered
              if (d.config.siteName === 'Wana Lestari Nusantara') {
                persistSectionToFirestore('site_config', {
                  config: normalized,
                });
              }
            }
          } else {
            persistSectionToFirestore('site_config', {
              config: siteConfig,
            });
          }
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.GET,
            'ygi_cms_state/site_config'
          );
        }
      )
    );

    // Section 2: users
    unsubs.push(
      onSnapshot(
        doc(db, 'ygi_cms_state', 'users'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.items) && d.items.length > 0) {
              const remoteUsers = d.items as UserProfile[];
              setUsers(remoteUsers);
              setCurrentUser((prevCurr) => {
                if (!prevCurr) return null;
                const matched = remoteUsers.find((u) => u.uid === prevCurr.uid);
                return matched || prevCurr;
              });
            }
          } else {
            persistSectionToFirestore('users', { items: users });
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'ygi_cms_state/users');
        }
      )
    );

    // Section 3: categories
    unsubs.push(
      onSnapshot(
        doc(db, 'ygi_cms_state', 'categories'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.items)) {
              setCategories(d.items as CategoryItem[]);
            }
          } else {
            persistSectionToFirestore('categories', { items: categories });
          }
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.GET,
            'ygi_cms_state/categories'
          );
        }
      )
    );

    // Section 4: contents
    unsubs.push(
      onSnapshot(
        doc(db, 'ygi_cms_state', 'contents'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.items)) {
              setContents(d.items as ContentArticle[]);
            }
          } else {
            persistSectionToFirestore('contents', { items: contents });
          }
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.GET,
            'ygi_cms_state/contents'
          );
        }
      )
    );

    // Section 5: comments
    unsubs.push(
      onSnapshot(
        doc(db, 'ygi_cms_state', 'comments'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.items)) {
              setComments(d.items as CommentItem[]);
            }
          } else {
            persistSectionToFirestore('comments', { items: comments });
          }
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.GET,
            'ygi_cms_state/comments'
          );
        }
      )
    );

    // Section 6: templates
    unsubs.push(
      onSnapshot(
        doc(db, 'ygi_cms_state', 'templates'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.items) && d.items.length > 0) {
              setTemplates(d.items as LetterTemplate[]);
            }
          } else {
            persistSectionToFirestore('templates', { items: templates });
          }
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.GET,
            'ygi_cms_state/templates'
          );
        }
      )
    );

    // Section 7: letters & letterSequence
    unsubs.push(
      onSnapshot(
        doc(db, 'ygi_cms_state', 'letters'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.items)) {
              const remoteLetters = d.items as OrganizationLetter[];
              setLetters(remoteLetters);
              const maxSeq = remoteLetters.reduce(
                (max, l) => Math.max(max, l.sequenceNumber || 0),
                0
              );
              const remoteSeq =
                typeof d.sequence === 'number' && d.sequence > 0
                  ? Math.max(d.sequence, maxSeq)
                  : maxSeq || 5;
              setLetterSequence(remoteSeq);
            }
          } else {
            persistSectionToFirestore('letters', {
              items: letters,
              sequence: letterSequence,
            });
          }
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.GET,
            'ygi_cms_state/letters'
          );
        }
      )
    );

    // Section 8: reports
    unsubs.push(
      onSnapshot(
        doc(db, 'ygi_cms_state', 'reports'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.items)) {
              setReports(d.items as TaskReport[]);
            }
          } else {
            persistSectionToFirestore('reports', { items: reports });
          }
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.GET,
            'ygi_cms_state/reports'
          );
        }
      )
    );

    // Section 9: notifications
    unsubs.push(
      onSnapshot(
        doc(db, 'ygi_cms_state', 'notifications'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.items)) {
              setNotifications(d.items as NotificationItem[]);
            }
          } else {
            persistSectionToFirestore('notifications', {
              items: notifications,
            });
          }
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.GET,
            'ygi_cms_state/notifications'
          );
        }
      )
    );

    // Section 10: activity_logs
    unsubs.push(
      onSnapshot(
        doc(db, 'ygi_cms_state', 'activity_logs'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.items)) {
              setActivityLogs(d.items as ActivityLog[]);
            }
          } else {
            persistSectionToFirestore('activity_logs', {
              items: activityLogs,
            });
          }
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.GET,
            'ygi_cms_state/activity_logs'
          );
        }
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady]);

  // Helper to sync with legacy Firestore collections when signed in via live Firebase Auth
  const syncDocToFirestore = async (
    pathCollection: string,
    docId: string,
    payload: Record<string, any>,
    opType: OperationType = OperationType.WRITE
  ) => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, pathCollection, docId), payload);
    } catch (error) {
      handleFirestoreError(error, opType, `${pathCollection}/${docId}`);
    }
  };

  // Handlers for Public Portal & Real-Time Comments
  const handleAddComment = async (
    articleId: string,
    authorName: string,
    message: string
  ) => {
    const nowIso = new Date().toISOString();
    const newComment: CommentItem = {
      id: `cmt_${Date.now()}`,
      articleId,
      authorId: currentUser?.uid || auth.currentUser?.uid || 'guest_reader',
      authorName: authorName.slice(0, 80),
      authorRole: currentUser
        ? `Level ${currentUser.level} (${currentUser.roleName})`
        : 'Pembaca Publik',
      message: message.slice(0, 1000),
      createdAt: nowIso,
    };

    const nextComments = [...comments, newComment];
    setComments(nextComments);
    savePersistedState('comments', nextComments);
    persistSectionToFirestore('comments', { items: nextComments });

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'contents', articleId, 'comments', newComment.id),
          {
            articleId,
            authorId: auth.currentUser.uid,
            authorName: newComment.authorName,
            authorRole: newComment.authorRole,
            message: newComment.message,
            createdAt: serverTimestamp(),
          }
        );
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.CREATE,
          `contents/${articleId}/comments/${newComment.id}`
        );
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const target = comments.find((c) => c.id === commentId);
    const nextComments = comments.filter((c) => c.id !== commentId);
    setComments(nextComments);
    savePersistedState('comments', nextComments);
    persistSectionToFirestore('comments', { items: nextComments });

    if (auth.currentUser && target) {
      try {
        await deleteDoc(
          doc(db, 'contents', target.articleId, 'comments', commentId)
        );
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.DELETE,
          `contents/${target.articleId}/comments/${commentId}`
        );
      }
    }
  };

  // Auth & Navigation Handlers
  const handleOpenCmsClick = () => {
    if (currentUser) {
      setViewMode('cms');
      savePersistedState('view_mode', 'cms');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleGoogleOAuthLogin = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      const check = authorizeGoogleOAuthUser(users, cred.user.email);
      if (!check.ok || !check.user) {
        await signOut(auth);
        throw new Error(
          check.error ||
            'Akun Google Anda belum terdaftar di dalam list akses sistem (RBAC).'
        );
      }
      setCurrentUser(check.user);
      savePersistedState('current_user', check.user);
      setIsLoginModalOpen(false);
      setViewMode('cms');
      savePersistedState('view_mode', 'cms');
    }
  };

  const handleLogout = async () => {
    if (auth.currentUser) {
      await signOut(auth);
    }
    setCurrentUser(null);
    savePersistedState('current_user', null);
    setViewMode('public');
    savePersistedState('view_mode', 'public');
  };

  // Audit Log Helper
  const appendActivityLog = (
    actionType: ActivityLog['actionType'],
    targetId: string,
    details: string,
    actor = currentUser
  ) => {
    if (!actor) return;
    const nowIso = new Date().toISOString();
    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      actorId: actor.uid,
      actorName: actor.displayName,
      actorLevel: actor.level,
      actionType,
      targetId,
      details: details.slice(0, 600),
      createdAt: nowIso,
    };
    const nextLogs = [newLog, ...activityLogs];
    setActivityLogs(nextLogs);
    savePersistedState('activity_logs', nextLogs);
    persistSectionToFirestore('activity_logs', {
      items: nextLogs,
      updatedBy: actor.uid,
    });

    if (auth.currentUser) {
      syncDocToFirestore(
        'activity_logs',
        newLog.id,
        {
          actorId: auth.currentUser.uid,
          actorName: newLog.actorName,
          actorLevel: newLog.actorLevel,
          actionType: newLog.actionType,
          targetId: newLog.targetId,
          details: newLog.details,
          createdAt: serverTimestamp(),
        },
        OperationType.CREATE
      );
    }
  };

  // CMS Handlers
  const handleCreateCategory = (name: string, description: string) => {
    if (!currentUser) return;
    const slug = slugifyCategory(name);
    if (categories.some((c) => c.slug === slug)) return;
    const nowIso = new Date().toISOString();
    const newCat: CategoryItem = {
      id: slug,
      name: name.slice(0, 60),
      slug,
      description: description.slice(0, 200),
      createdBy: currentUser.uid,
      createdAt: nowIso,
    };
    const nextCategories = [...categories, newCat];
    setCategories(nextCategories);
    savePersistedState('categories', nextCategories);
    persistSectionToFirestore('categories', { items: nextCategories });
  };

  const handleDeleteCategory = (categoryId: string) => {
    const nextCategories = categories.filter((c) => c.id !== categoryId);
    setCategories(nextCategories);
    savePersistedState('categories', nextCategories);
    persistSectionToFirestore('categories', { items: nextCategories });
  };

  const handleCreateContent = (data: {
    title: string;
    summary: string;
    body: string;
    categoryId: string;
    visualTheme: VisualTheme;
    mediaType: ContentMediaType;
    mediaUrl: string;
    mediaCaption: string;
    readTimeMinutes: number;
  }) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const initialStatus = resolveContentInitialStatus(currentUser.level);
    const catObj = categories.find(
      (c) => c.slug === data.categoryId || c.id === data.categoryId
    );
    const newArticle: ContentArticle = {
      id: `art_${Date.now()}`,
      title: data.title.slice(0, 180),
      summary: data.summary.slice(0, 400),
      body: data.body.slice(0, 10000),
      categoryId: data.categoryId,
      categoryName: catObj?.name || 'Umum',
      visualTheme: data.visualTheme,
      mediaType: data.mediaType,
      mediaUrl: data.mediaUrl,
      mediaCaption: data.mediaCaption.slice(0, 200),
      authorId: currentUser.uid,
      authorName: currentUser.displayName,
      authorLevel: currentUser.level,
      status: initialStatus,
      approvedBy: initialStatus === 'published' ? currentUser.uid : 'pending',
      readTimeMinutes: data.readTimeMinutes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const nextContents = [newArticle, ...contents];
    setContents(nextContents);
    savePersistedState('contents', nextContents);
    persistSectionToFirestore('contents', { items: nextContents });

    appendActivityLog(
      'CONTENT_CREATED',
      newArticle.id,
      `Membuat konten "${newArticle.title}" oleh Level ${currentUser.level} (Status: ${newArticle.status}).`
    );

    if (initialStatus === 'pending_approval') {
      const adminTarget =
        users.find((u) => u.level === 1) || users[0];
      const notif: NotificationItem = {
        id: `notif_cnt_${Date.now()}`,
        recipientId: adminTarget.uid,
        senderId: currentUser.uid,
        title: `Konten Level 2 Menunggu Approval: ${newArticle.title}`,
        message: `${currentUser.displayName} (Level 2) telah membuat artikel "${newArticle.title}" yang membutuhkan persetujuan Admin Level 1 sebelum diterbitkan.`,
        category: 'content_approval',
        referenceId: newArticle.id,
        isRead: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);
      savePersistedState('notifications', nextNotifs);
      persistSectionToFirestore('notifications', { items: nextNotifs });
    }
  };

  const handleUpdateContentStatus = (
    contentId: string,
    status: 'published' | 'rejected'
  ) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const target = contents.find((c) => c.id === contentId);
    const nextContents = contents.map((c) =>
      c.id === contentId
        ? {
            ...c,
            status,
            approvedBy: currentUser.uid,
            updatedAt: nowIso,
          }
        : c
    );
    setContents(nextContents);
    savePersistedState('contents', nextContents);
    persistSectionToFirestore('contents', { items: nextContents });

    if (target) {
      appendActivityLog(
        'CONTENT_APPROVED',
        contentId,
        `Admin ${currentUser.displayName} (Level ${currentUser.level}) mengubah status artikel "${target.title}" menjadi ${status.toUpperCase()}.`
      );
    }
  };

  const handleDeleteContent = (contentId: string) => {
    const nextContents = contents.filter((c) => c.id !== contentId);
    setContents(nextContents);
    savePersistedState('contents', nextContents);
    persistSectionToFirestore('contents', { items: nextContents });
  };

  const handleSaveTemplate = (data: {
    name: string;
    category: LetterCategory;
    codePrefix: string;
    bodyTemplate: string;
  }) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const newTpl: LetterTemplate = {
      id: `tpl_${Date.now()}`,
      name: data.name.slice(0, 100),
      category: data.category,
      codePrefix: data.codePrefix.slice(0, 10),
      bodyTemplate: data.bodyTemplate.slice(0, 8000),
      createdBy: currentUser.uid,
      createdAt: nowIso,
    };
    const nextTemplates = [newTpl, ...templates];
    setTemplates(nextTemplates);
    savePersistedState('templates', nextTemplates);
    persistSectionToFirestore('templates', { items: nextTemplates });
  };

  const handleCreateLetter = (data: {
    templateId: string;
    category: LetterCategory;
    codePrefix: string;
    subject: string;
    assigneeId: string;
    supervisorId: string;
    location: string;
    taskDescription: string;
  }) => {
    if (!currentUser) return;
    const now = new Date();
    const nowIso = now.toISOString();
    const nextSeq = letterSequence + 1;
    setLetterSequence(nextSeq);
    savePersistedState('letter_sequence', nextSeq);

    const formattedNumber = formatLetterNumber(
      nextSeq,
      data.codePrefix,
      10,
      2026
    );
    const tpl =
      templates.find((t) => t.id === data.templateId) || templates[0];
    const assignee =
      users.find((u) => u.uid === data.assigneeId) || users[0];
    const supervisor =
      users.find((u) => u.uid === data.supervisorId) || users[0];

    const renderedBody = renderLetterTemplate(tpl.bodyTemplate, {
      NOMOR_SURAT: formattedNumber,
      TANGGAL: now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      PERIHAL: data.subject,
      PENERIMA_TUGAS: assignee.displayName,
      ATASAN_TERKAIT: supervisor.displayName,
      LOKASI: data.location,
      DESKRIPSI_TUGAS: data.taskDescription,
    });

    const newLetterId = `let_${Date.now()}`;
    const isAutoApproved = currentUser.level <= 1;

    const newLetter: OrganizationLetter = {
      id: newLetterId,
      letterNumber: formattedNumber,
      sequenceNumber: nextSeq,
      category: data.category,
      subject: data.subject.slice(0, 180),
      recipientName: assignee.displayName,
      assigneeId: assignee.uid,
      supervisorId: supervisor.uid,
      supervisorName: supervisor.displayName,
      location: data.location.slice(0, 120),
      renderedBody,
      monthIssued: 10,
      yearIssued: 2026,
      status: isAutoApproved ? 'approved' : 'pending_approval',
      taskCompletionStatus:
        data.category === 'Surat Tugas' ? 'assigned' : 'not_applicable',
      createdBy: currentUser.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const nextLetters = [newLetter, ...letters];
    setLetters(nextLetters);
    savePersistedState('letters', nextLetters);
    persistSectionToFirestore('letters', {
      items: nextLetters,
      sequence: nextSeq,
    });

    // If category is "Surat Tugas", automatically send special notifications to Supervisor & Assignee + log activity
    if (data.category === 'Surat Tugas') {
      const effects = buildSuratTugasSideEffects({
        letterId: newLetterId,
        letterNumber: formattedNumber,
        subject: newLetter.subject,
        location: newLetter.location,
        assigneeId: assignee.uid,
        assigneeName: assignee.displayName,
        supervisorId: supervisor.uid,
        supervisorName: supervisor.displayName,
        actorId: currentUser.uid,
        actorName: currentUser.displayName,
        actorLevel: currentUser.level,
        nowIso,
      });

      const nextNotifs = [
        effects.supervisorNotification,
        effects.assigneeNotification,
        ...notifications,
      ];
      setNotifications(nextNotifs);
      savePersistedState('notifications', nextNotifs);
      persistSectionToFirestore('notifications', { items: nextNotifs });

      const nextLogs = [effects.auditLog, ...activityLogs];
      setActivityLogs(nextLogs);
      savePersistedState('activity_logs', nextLogs);
      persistSectionToFirestore('activity_logs', { items: nextLogs });
    } else {
      const approvalNotif: NotificationItem = {
        id: `notif_let_${Date.now()}`,
        recipientId: supervisor.uid,
        senderId: currentUser.uid,
        title: `Status Surat Organisasi: ${formattedNumber}`,
        message: `Surat ${data.category} "${newLetter.subject}" telah diterbitkan dengan status: ${newLetter.status.toUpperCase()}.`,
        category: 'letter_approval',
        referenceId: newLetterId,
        isRead: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const nextNotifs = [approvalNotif, ...notifications];
      setNotifications(nextNotifs);
      savePersistedState('notifications', nextNotifs);
      persistSectionToFirestore('notifications', { items: nextNotifs });

      appendActivityLog(
        'LETTER_STATUS_CHANGED',
        newLetterId,
        `Menerbitkan ${data.category} nomor ${formattedNumber} ("${newLetter.subject}").`
      );
    }
  };

  const handleUpdateLetterStatus = (
    letterId: string,
    status: 'approved' | 'rejected'
  ) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const target = letters.find((l) => l.id === letterId);
    const nextLetters = letters.map((l) =>
      l.id === letterId ? { ...l, status, updatedAt: nowIso } : l
    );
    setLetters(nextLetters);
    savePersistedState('letters', nextLetters);
    persistSectionToFirestore('letters', {
      items: nextLetters,
      sequence: letterSequence,
    });

    if (target) {
      const notif: NotificationItem = {
        id: `notif_appr_${Date.now()}`,
        recipientId: target.assigneeId,
        senderId: currentUser.uid,
        title: `Persetujuan Surat ${target.letterNumber}: ${status.toUpperCase()}`,
        message: `Surat "${target.subject}" (${target.letterNumber}) telah diperbarui status persetujuannya menjadi ${status.toUpperCase()} oleh ${currentUser.displayName}.`,
        category: 'letter_approval',
        referenceId: letterId,
        isRead: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);
      savePersistedState('notifications', nextNotifs);
      persistSectionToFirestore('notifications', { items: nextNotifs });

      appendActivityLog(
        'LETTER_STATUS_CHANGED',
        letterId,
        `Mengubah status persetujuan surat ${target.letterNumber} menjadi ${status.toUpperCase()}.`
      );
    }
  };

  const handleSubmitTaskReport = (data: {
    letterId: string;
    taskTitle: string;
    summaryResult: string;
    completionRate: number;
    photoEvidenceName: string;
    photoEvidenceData: string;
    supportingDocName: string;
    supportingDocSummary: string;
  }) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const targetLetter = letters.find((l) => l.id === data.letterId);
    const initialReportStatus = resolveTaskReportInitialStatus(
      currentUser.level
    );
    const newReport: TaskReport = {
      id: `rep_${Date.now()}`,
      letterId: data.letterId,
      letterNumber: targetLetter?.letterNumber || '000/ST/YGI/X/2026',
      taskTitle: data.taskTitle.slice(0, 180),
      submittedBy: currentUser.uid,
      submittedByName: currentUser.displayName,
      summaryResult: data.summaryResult.slice(0, 5000),
      completionRate: data.completionRate,
      photoEvidenceName: data.photoEvidenceName.slice(0, 150),
      photoEvidenceData: data.photoEvidenceData,
      supportingDocName: data.supportingDocName.slice(0, 150),
      supportingDocSummary: data.supportingDocSummary.slice(0, 1000),
      verificationStatus: initialReportStatus,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const nextReports = [newReport, ...reports];
    setReports(nextReports);
    savePersistedState('reports', nextReports);
    persistSectionToFirestore('reports', { items: nextReports });

    // Update referenced Surat Tugas completion status
    const nextLetters: OrganizationLetter[] = letters.map((l) =>
      l.id === data.letterId
        ? {
            ...l,
            taskCompletionStatus:
              initialReportStatus === 'verified' && data.completionRate >= 100
                ? 'completed'
                : 'in_progress',
            updatedAt: nowIso,
          }
        : l
    );
    setLetters(nextLetters);
    savePersistedState('letters', nextLetters);
    persistSectionToFirestore('letters', {
      items: nextLetters,
      sequence: letterSequence,
    });

    if (currentUser.level === 2) {
      const approvalNotifs = buildTaskReportApprovalNotifications(
        newReport,
        currentUser,
        users,
        nowIso
      );
      const nextNotifs = [...approvalNotifs, ...notifications];
      setNotifications(nextNotifs);
      savePersistedState('notifications', nextNotifs);
      persistSectionToFirestore('notifications', { items: nextNotifs });
    } else if (targetLetter) {
      const supNotif: NotificationItem = {
        id: `notif_rep_${Date.now()}`,
        recipientId: targetLetter.supervisorId,
        senderId: currentUser.uid,
        title: `Laporan Kegiatan Masuk — ${targetLetter.letterNumber}`,
        message: `${currentUser.displayName} telah mengirimkan Laporan Hasil Kegiatan "${newReport.taskTitle}" (Capaian: ${newReport.completionRate}%) beserta bukti foto dan dokumen pendukung.`,
        category: 'task_report',
        referenceId: newReport.id,
        isRead: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const nextNotifs = [supNotif, ...notifications];
      setNotifications(nextNotifs);
      savePersistedState('notifications', nextNotifs);
      persistSectionToFirestore('notifications', { items: nextNotifs });
    }

    appendActivityLog(
      'TASK_REPORT_SUBMITTED',
      newReport.id,
      `Melaporkan hasil kegiatan berdasarkan Surat Tugas ${newReport.letterNumber}: "${newReport.taskTitle}" (Capaian ${newReport.completionRate}%, Status: ${
        initialReportStatus === 'submitted'
          ? 'Menunggu Approval Level 1/0'
          : 'Disetujui'
      }).`
    );
  };

  const handleVerifyTaskReport = (
    reportId: string,
    status: 'verified' | 'revision_needed'
  ) => {
    if (!currentUser || !canApproveTaskReport(currentUser.level)) return;
    const nowIso = new Date().toISOString();
    const targetReport = reports.find((r) => r.id === reportId);

    const nextReports = reports.map((r) =>
      r.id === reportId
        ? { ...r, verificationStatus: status, updatedAt: nowIso }
        : r
    );
    setReports(nextReports);
    savePersistedState('reports', nextReports);
    persistSectionToFirestore('reports', { items: nextReports });

    if (targetReport) {
      if (status === 'verified') {
        const nextLetters: OrganizationLetter[] = letters.map((l) =>
          l.id === targetReport.letterId
            ? {
                ...l,
                taskCompletionStatus:
                  targetReport.completionRate >= 100
                    ? 'completed'
                    : 'in_progress',
                updatedAt: nowIso,
              }
            : l
        );
        setLetters(nextLetters);
        savePersistedState('letters', nextLetters);
        persistSectionToFirestore('letters', {
          items: nextLetters,
          sequence: letterSequence,
        });
      }

      const submitterNotif: NotificationItem = {
        id: `notif_rep_res_${Date.now()}`,
        recipientId: targetReport.submittedBy,
        senderId: currentUser.uid,
        title:
          status === 'verified'
            ? `Laporan Surat Tugas Disetujui (Approved) — ${targetReport.letterNumber}`
            : `Laporan Surat Tugas Perlu Revisi — ${targetReport.letterNumber}`,
        message:
          status === 'verified'
            ? `Laporan Surat Tugas "${targetReport.taskTitle}" telah disetujui (Approved) oleh ${currentUser.displayName} (Level ${currentUser.level}).`
            : `Laporan Surat Tugas "${targetReport.taskTitle}" memerlukan revisi menurut pemeriksaan ${currentUser.displayName} (Level ${currentUser.level}).`,
        category: 'task_report',
        referenceId: targetReport.id,
        isRead: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const nextNotifs = [submitterNotif, ...notifications];
      setNotifications(nextNotifs);
      savePersistedState('notifications', nextNotifs);
      persistSectionToFirestore('notifications', { items: nextNotifs });

      appendActivityLog(
        'TASK_REPORT_SUBMITTED',
        targetReport.id,
        `Level ${currentUser.level} (${currentUser.displayName}) melakukan ${
          status === 'verified' ? 'Approval (Verifikasi)' : 'Permintaan Revisi'
        } atas Laporan Surat Tugas "${targetReport.taskTitle}" (${
          targetReport.letterNumber
        }).`
      );
    }
  };

  const handleUpdateUserRoleAndPermissions = (
    uid: string,
    level: UserLevel,
    roleName: RoleName,
    isVerified: boolean,
    permissions: UserProfile['permissions']
  ) => {
    const nowIso = new Date().toISOString();
    const nextUsers = users.map((u) =>
      u.uid === uid
        ? { ...u, level, roleName, isVerified, permissions, updatedAt: nowIso }
        : u
    );
    setUsers(nextUsers);
    savePersistedState('users', nextUsers);
    persistSectionToFirestore('users', { items: nextUsers });

    if (currentUser?.uid === uid) {
      const updatedCurr = {
        ...currentUser,
        level,
        roleName,
        isVerified,
        permissions,
        updatedAt: nowIso,
      };
      setCurrentUser(updatedCurr);
      savePersistedState('current_user', updatedCurr);
    }
    const targetUser = users.find((u) => u.uid === uid);
    appendActivityLog(
      'USER_PRIVILEGE_UPDATED',
      uid,
      `Memperbarui hak akses real-time untuk ${
        targetUser?.displayName || uid
      } menjadi Level ${level} (${roleName.toUpperCase()}).`
    );
  };

  const handleAddNewUser = (data: {
    displayName: string;
    email: string;
    phone: string;
    department: string;
    level: UserLevel;
    roleName: RoleName;
  }) => {
    const nowIso = new Date().toISOString();
    const newUser: UserProfile = {
      uid: `usr_${Date.now()}`,
      displayName: data.displayName.slice(0, 100),
      email: data.email.slice(0, 150),
      phone: data.phone.slice(0, 40),
      password: data.level === 0 ? 'WANA-SUPER-2026' : 'TERVERIFIKASI-2026',
      roleName: data.roleName,
      level: data.level,
      department: data.department.slice(0, 100),
      isVerified: true,
      isActive: true,
      authProvider: 'verified_account',
      permissions: getDefaultPermissionsForLevel(data.level),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    savePersistedState('users', nextUsers);
    persistSectionToFirestore('users', { items: nextUsers });

    appendActivityLog(
      'USER_PRIVILEGE_UPDATED',
      newUser.uid,
      `Menambahkan akun terverifikasi baru: ${newUser.displayName} (Level ${newUser.level} — ${newUser.roleName.toUpperCase()}).`
    );
  };

  const handleUpdateUserName = (uid: string, newDisplayName: string) => {
    if (!currentUser || !canSuperadminEditUserName(currentUser.level)) return;
    const check = validateAndFormatUserName(newDisplayName);
    if (!check.valid) return;

    const nowIso = new Date().toISOString();
    const targetUser = users.find((u) => u.uid === uid);
    const oldName = targetUser?.displayName || uid;

    const nextUsers = users.map((u) =>
      u.uid === uid
        ? { ...u, displayName: check.cleanedName, updatedAt: nowIso }
        : u
    );
    setUsers(nextUsers);
    savePersistedState('users', nextUsers);
    persistSectionToFirestore('users', { items: nextUsers });

    if (currentUser.uid === uid) {
      const updatedCurr = {
        ...currentUser,
        displayName: check.cleanedName,
        updatedAt: nowIso,
      };
      setCurrentUser(updatedCurr);
      savePersistedState('current_user', updatedCurr);
    }

    appendActivityLog(
      'USER_PRIVILEGE_UPDATED',
      uid,
      `Superadmin mengubah nama pengguna dari "${oldName}" menjadi "${check.cleanedName}".`
    );

    if (auth.currentUser && targetUser) {
      syncDocToFirestore(
        'users',
        uid,
        {
          uid: targetUser.uid,
          displayName: check.cleanedName,
          roleName: targetUser.roleName,
          level: targetUser.level,
          department: targetUser.department,
          isVerified: targetUser.isVerified,
          authProvider: targetUser.authProvider,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        OperationType.UPDATE
      );
    }
  };

  const handleUpdateUserDepartment = (uid: string, newDepartment: string) => {
    if (!currentUser || !canSuperadminEditUserName(currentUser.level)) return;
    const check = validateAndFormatDepartment(newDepartment);
    if (!check.valid) return;

    const nowIso = new Date().toISOString();
    const targetUser = users.find((u) => u.uid === uid);
    const oldDept = targetUser?.department || '-';

    const nextUsers = users.map((u) =>
      u.uid === uid
        ? { ...u, department: check.cleanedDepartment, updatedAt: nowIso }
        : u
    );
    setUsers(nextUsers);
    savePersistedState('users', nextUsers);
    persistSectionToFirestore('users', { items: nextUsers });

    if (currentUser.uid === uid) {
      const updatedCurr = {
        ...currentUser,
        department: check.cleanedDepartment,
        updatedAt: nowIso,
      };
      setCurrentUser(updatedCurr);
      savePersistedState('current_user', updatedCurr);
    }

    appendActivityLog(
      'USER_PRIVILEGE_UPDATED',
      uid,
      `Superadmin mengubah Unit Kerja ${targetUser?.displayName || uid} dari "${oldDept}" menjadi "${check.cleanedDepartment}".`
    );

    if (auth.currentUser && targetUser) {
      syncDocToFirestore(
        'users',
        uid,
        {
          uid: targetUser.uid,
          displayName: targetUser.displayName,
          roleName: targetUser.roleName,
          level: targetUser.level,
          department: check.cleanedDepartment,
          isVerified: targetUser.isVerified,
          authProvider: targetUser.authProvider,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        OperationType.UPDATE
      );
    }
  };

  const handleUpdateUserPassword = (uid: string, newPassword: string) => {
    if (!currentUser || !canSuperadminManageUserPassword(currentUser.level)) {
      return;
    }
    const check = validateAndFormatUserPassword(newPassword);
    if (!check.valid) return;

    const nowIso = new Date().toISOString();
    const targetUser = users.find((u) => u.uid === uid);

    const nextUsers = users.map((u) =>
      u.uid === uid
        ? { ...u, password: check.cleanedPassword, updatedAt: nowIso }
        : u
    );
    setUsers(nextUsers);
    savePersistedState('users', nextUsers);
    persistSectionToFirestore('users', { items: nextUsers });

    if (currentUser.uid === uid) {
      const updatedCurr = {
        ...currentUser,
        password: check.cleanedPassword,
        updatedAt: nowIso,
      };
      setCurrentUser(updatedCurr);
      savePersistedState('current_user', updatedCurr);
    }

    appendActivityLog(
      'USER_PRIVILEGE_UPDATED',
      uid,
      `Superadmin memperbarui password akun untuk "${
        targetUser?.displayName || uid
      }" (${targetUser?.email || uid}).`
    );
  };

  const handleToggleUserActive = (uid: string) => {
    if (
      !currentUser ||
      !canSuperadminManageUserStatus(currentUser.level, currentUser.uid, uid)
    ) {
      return;
    }

    const nowIso = new Date().toISOString();
    const targetUser = users.find((u) => u.uid === uid);
    if (!targetUser) return;

    const nextActive = targetUser.isActive === false ? true : false;

    const nextUsers = users.map((u) =>
      u.uid === uid
        ? {
            ...u,
            isActive: nextActive,
            isVerified: nextActive,
            updatedAt: nowIso,
          }
        : u
    );
    setUsers(nextUsers);
    savePersistedState('users', nextUsers);
    persistSectionToFirestore('users', { items: nextUsers });

    appendActivityLog(
      'USER_PRIVILEGE_UPDATED',
      uid,
      `Superadmin ${
        nextActive ? 'mengaktifkan kembali' : 'menonaktifkan'
      } akun pengguna "${targetUser.displayName}" (${targetUser.department}).`
    );

    if (auth.currentUser) {
      syncDocToFirestore(
        'users',
        uid,
        {
          uid: targetUser.uid,
          displayName: targetUser.displayName,
          roleName: targetUser.roleName,
          level: targetUser.level,
          department: targetUser.department,
          isVerified: nextActive,
          authProvider: targetUser.authProvider,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        OperationType.UPDATE
      );
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (
      !currentUser ||
      !canSuperadminDeleteUser(currentUser.level, currentUser.uid, uid)
    ) {
      return;
    }

    const targetUser = users.find((u) => u.uid === uid);
    if (!targetUser) return;

    const nextUsers = users.filter((u) => u.uid !== uid);
    setUsers(nextUsers);
    savePersistedState('users', nextUsers);
    persistSectionToFirestore('users', { items: nextUsers });

    appendActivityLog(
      'USER_PRIVILEGE_UPDATED',
      uid,
      `Superadmin menghapus akun pengguna "${targetUser.displayName}" (${targetUser.email} — ${targetUser.department}) dari sistem.`
    );

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
      }
    }
  };

  const handleUpdateSiteConfig = (
    newConfig: Omit<SiteConfig, 'updatedBy' | 'updatedAt'>
  ) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const updated: SiteConfig = normalizeSiteConfig(
      {
        ...newConfig,
        updatedBy: currentUser.uid,
        updatedAt: nowIso,
      },
      INITIAL_SITE_CONFIG
    );
    setSiteConfig(updated);
    savePersistedState('site_config', updated);
    persistSectionToFirestore('site_config', { config: updated });

    appendActivityLog(
      'SITE_CONFIG_UPDATED',
      'site_config_main',
      `Memperbarui konfigurasi tampilan Website (Nama Web: "${updated.siteName}", CP: "${updated.contactPersonName}").`
    );

    if (auth.currentUser) {
      syncDocToFirestore('site_config', 'main', {
        siteName: updated.siteName,
        tagline: updated.tagline,
        heroTitle: updated.heroTitle,
        heroDescription: updated.heroDescription,
        contactPersonName: updated.contactPersonName,
        contactPersonPhone: updated.contactPersonPhone,
        contactPersonEmail: updated.contactPersonEmail,
        officeAddress: updated.officeAddress,
        footerText: updated.footerText,
        updatedBy: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      });
    }
  };

  const handleMarkNotificationRead = (notificationId: string) => {
    const nextNotifs = notifications.map((n) =>
      n.id === notificationId
        ? { ...n, isRead: true, updatedAt: new Date().toISOString() }
        : n
    );
    setNotifications(nextNotifs);
    savePersistedState('notifications', nextNotifs);
    persistSectionToFirestore('notifications', { items: nextNotifs });
  };

  return (
    <>
      {viewMode === 'cms' && currentUser ? (
        <CmsWorkspace
          currentUser={currentUser}
          users={users}
          siteConfig={siteConfig}
          categories={categories}
          contents={contents}
          templates={templates}
          letterSequence={letterSequence}
          letters={letters}
          reports={reports}
          notifications={notifications}
          activityLogs={activityLogs}
          onSwitchUserRole={(u) => {
            setCurrentUser(u);
            savePersistedState('current_user', u);
          }}
          onBackToPublic={() => {
            setViewMode('public');
            savePersistedState('view_mode', 'public');
          }}
          onLogout={handleLogout}
          onCreateCategory={handleCreateCategory}
          onDeleteCategory={handleDeleteCategory}
          onCreateContent={handleCreateContent}
          onUpdateContentStatus={handleUpdateContentStatus}
          onDeleteContent={handleDeleteContent}
          onSaveTemplate={handleSaveTemplate}
          onCreateLetter={handleCreateLetter}
          onUpdateLetterStatus={handleUpdateLetterStatus}
          onSubmitTaskReport={handleSubmitTaskReport}
          onVerifyTaskReport={handleVerifyTaskReport}
          onUpdateUserRoleAndPermissions={handleUpdateUserRoleAndPermissions}
          onAddNewUser={handleAddNewUser}
          onUpdateUserName={handleUpdateUserName}
          onUpdateUserDepartment={handleUpdateUserDepartment}
          onUpdateUserPassword={handleUpdateUserPassword}
          onToggleUserActive={handleToggleUserActive}
          onDeleteUser={handleDeleteUser}
          onUpdateSiteConfig={handleUpdateSiteConfig}
          onMarkNotificationRead={handleMarkNotificationRead}
        />
      ) : (
        <PublicPortal
          siteConfig={siteConfig}
          categories={categories}
          contents={contents}
          comments={comments}
          currentUser={currentUser}
          onOpenCms={handleOpenCmsClick}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />
      )}

      {isLoginModalOpen && (
        <CmsLoginModal
          users={users}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            savePersistedState('current_user', user);
            setIsLoginModalOpen(false);
            setViewMode('cms');
            savePersistedState('view_mode', 'cms');
          }}
          onGoogleOAuthLogin={handleGoogleOAuthLogin}
        />
      )}
    </>
  );
}

