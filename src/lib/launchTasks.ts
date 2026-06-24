import type { AppSettings, Document, FamilyMember, User } from '@/types';
import { isDocumentReviewed } from '@/lib/documentReview';
import { countAdminApprovedQualityFeedback } from '@/lib/feedback';
import { getOtherFamilyMembers } from '@/lib/family';
import { hasLaunchCohortProAccess, isLaunchCohortMember } from '@/lib/launchCohort';

export const LAUNCH_UPLOAD_DOC_COUNT = 11;
export const LAUNCH_REVIEW_DOC_COUNT = 11;
export const LAUNCH_FAMILY_MEMBER_COUNT = 4;
export const LAUNCH_APPROVED_FEEDBACK_COUNT = 2;

export type LaunchTaskId =
  | 'onboarding_complete'
  | 'upload_11_docs'
  | 'review_11_docs'
  | 'add_4_family_members'
  | 'create_backup'
  | 'approved_feedback'
  | 'install_pwa'
  | 'enable_biometric';

export interface LaunchTaskDef {
  id: LaunchTaskId;
  title: string;
  description: string;
  ctaLabel: string;
  ctaPath: string;
}

export const LAUNCH_TASKS: LaunchTaskDef[] = [
  {
    id: 'onboarding_complete',
    title: 'Finish setup',
    description: 'Complete security onboarding.',
    ctaLabel: 'Open profile',
    ctaPath: '/profile',
  },
  {
    id: 'upload_11_docs',
    title: `Add ${LAUNCH_UPLOAD_DOC_COUNT} documents`,
    description: 'Upload family IDs, insurance, vehicle papers, and other household docs.',
    ctaLabel: 'Upload',
    ctaPath: '/upload',
  },
  {
    id: 'review_11_docs',
    title: `Review ${LAUNCH_REVIEW_DOC_COUNT} documents`,
    description: 'Mark extracted details as reviewed on each document detail page.',
    ctaLabel: 'View documents',
    ctaPath: '/',
  },
  {
    id: 'add_4_family_members',
    title: `Add ${LAUNCH_FAMILY_MEMBER_COUNT} family members`,
    description: 'Add spouse, parents, children, or other dependents to your household.',
    ctaLabel: 'Family',
    ctaPath: '/profile/family',
  },
  {
    id: 'create_backup',
    title: 'Create a backup',
    description: 'Export an encrypted backup file or save to Google Drive.',
    ctaLabel: 'Backup',
    ctaPath: '/profile/backup',
  },
  {
    id: 'approved_feedback',
    title: `Send ${LAUNCH_APPROVED_FEEDBACK_COUNT} quality feedbacks`,
    description:
      'Submit thoughtful feedback (50+ characters each). Admin must approve both for task credit.',
    ctaLabel: 'Feedback',
    ctaPath: '/profile/feedback',
  },
  {
    id: 'install_pwa',
    title: 'Install on home screen',
    description: 'Add PreVault to your phone for faster access (Android recommended).',
    ctaLabel: 'How to install',
    ctaPath: '/profile',
  },
  {
    id: 'enable_biometric',
    title: 'Turn on biometric lock',
    description: 'Unlock PreVault with fingerprint or face on this device.',
    ctaLabel: 'Security',
    ctaPath: '/profile/security',
  },
];

/** Tasks required to unlock lifetime Pro. */
export const LIFETIME_PRO_TASKS_REQUIRED = 6;

export const LIFETIME_PRO_TASK_COUNT = LAUNCH_TASKS.length;

export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone =
    'standalone' in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || displayStandalone;
}

export interface LaunchTaskProgressInput {
  user: User | null;
  documents: Document[];
  members: FamilyMember[];
  settings: AppSettings;
}

export type LaunchTaskStatus = 'done' | 'pending';

export interface LaunchTaskProgress {
  id: LaunchTaskId;
  status: LaunchTaskStatus;
}

function countReviewedDocuments(documents: Document[]): number {
  return documents.filter((d) => isDocumentReviewed(d) && !d.archivedAt).length;
}

function countActiveDocuments(documents: Document[]): number {
  return documents.filter((d) => !d.archivedAt).length;
}

export function evaluateLaunchTask(
  id: LaunchTaskId,
  input: LaunchTaskProgressInput,
): LaunchTaskStatus {
  const { user, documents, members, settings } = input;
  if (!user || !isLaunchCohortMember(user)) return 'pending';

  switch (id) {
    case 'onboarding_complete':
      return settings.onboardingComplete ? 'done' : 'pending';
    case 'upload_11_docs':
      return countActiveDocuments(documents) >= LAUNCH_UPLOAD_DOC_COUNT ? 'done' : 'pending';
    case 'review_11_docs':
      return countReviewedDocuments(documents) >= LAUNCH_REVIEW_DOC_COUNT ? 'done' : 'pending';
    case 'add_4_family_members':
      return getOtherFamilyMembers(members).length >= LAUNCH_FAMILY_MEMBER_COUNT ? 'done' : 'pending';
    case 'create_backup':
      return settings.lastBackupAt ? 'done' : 'pending';
    case 'approved_feedback':
      return countAdminApprovedQualityFeedback(user.id) >= LAUNCH_APPROVED_FEEDBACK_COUNT
        ? 'done'
        : 'pending';
    case 'install_pwa':
      return isPwaInstalled() ? 'done' : 'pending';
    case 'enable_biometric':
      return settings.biometricLockEnabled === true ? 'done' : 'pending';
    default:
      return 'pending';
  }
}

export function approvedFeedbackProgress(userId: string): { approved: number; required: number } {
  return {
    approved: countAdminApprovedQualityFeedback(userId),
    required: LAUNCH_APPROVED_FEEDBACK_COUNT,
  };
}

export function evaluateAllLaunchTasks(input: LaunchTaskProgressInput): LaunchTaskProgress[] {
  return LAUNCH_TASKS.map((task) => ({
    id: task.id,
    status: evaluateLaunchTask(task.id, input),
  }));
}

export function countCompletedLaunchTasks(input: LaunchTaskProgressInput): number {
  return evaluateAllLaunchTasks(input).filter((t) => t.status === 'done').length;
}

export function hasEarnedLifetimePro(input: LaunchTaskProgressInput): boolean {
  if (!input.user) return false;
  if (input.user.lifetimePro) return true;
  if (!isLaunchCohortMember(input.user)) return false;
  return countCompletedLaunchTasks(input) >= LIFETIME_PRO_TASKS_REQUIRED;
}

export function canAccessLifetimeProProgram(user: User | null | undefined): boolean {
  return isLaunchCohortMember(user) || hasLaunchCohortProAccess(user);
}

export function lifetimeProProgressLabel(completed: number): string {
  return `${completed} of ${LIFETIME_PRO_TASK_COUNT} tasks · need ${LIFETIME_PRO_TASKS_REQUIRED} for Lifetime Pro`;
}
