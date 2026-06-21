import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ActivityLog,
  AppSettings,
  Asset,
  BundleShareLink,
  Document,
  FamilyMember,
  ShareGrant,
  SharedBundle,
  TempShareLink,
  User,
  VisitingCard,
} from '@/types';
import { uid } from '@/lib/format';
import { appendAdminEvent } from '@/lib/adminEvents';
import { syncPlatformHouseholdFromVault } from '@/lib/adminPlatformRegistry';
import { generateInviteToken } from '@/lib/invites';
import { inferDocTags, isHealthDomainDoc } from '@/lib/docTags';
import {
  consumePendingReferral,
  generateReferralCode,
  grantReferralReward,
  REFERRAL_QUALIFYING_UPLOADS,
} from '@/lib/referrals';
import {
  bundleShareDurationHours,
  canAddAsset,
  canAddMember,
  canCreateBundle,
  canCreateTempLink,
  activityLogRetentionDays,
  tempLinkDurationHours,
} from '@/lib/planLimits';
import { countActiveTempLinks, isShareLinkExpired } from '@/lib/activityLog';
import {
  checkCanAddDocument,
  checkCanVerifyDocument,
  countDocumentsForMember,
  memberCapReachedAfterAdd,
  membersAtDocumentCap,
  resolveDocumentMemberId,
} from '@/lib/documentLimits';
import { notifyMemberDocLimitReached, notifyMembersAtCap } from '@/lib/adminNotify';
import { isDocumentVerified } from '@/lib/verificationQueue';
import type { VaultExportPayload } from '@/lib/vaultBackup';

interface VaultState {
  user: User | null;
  members: FamilyMember[];
  assets: Asset[];
  documents: Document[];
  activities: ActivityLog[];
  shareGrants: ShareGrant[];
  tempLinks: TempShareLink[];
  bundles: SharedBundle[];
  bundleShareLinks: BundleShareLink[];
  visitingCard: VisitingCard | null;
  settings: AppSettings;
  locked: boolean;

  signInDemo: (opts?: { referredBy?: string }) => void;
  signOut: () => void;
  setUserPlan: (plan: User['plan']) => void;
  acceptConsent: () => void;
  completeOnboarding: () => void;
  finishOnboarding: () => void;
  setSettings: (partial: Partial<AppSettings>) => void;
  unlock: (pin: string) => boolean;
  lock: () => void;
  setLockPin: (pin: string) => void;

  addMember: (m: Omit<FamilyMember, 'id' | 'status' | 'role'> & { role?: FamilyMember['role'] }) => string;
  updateMember: (id: string, partial: Partial<FamilyMember>) => void;
  ensureMemberInviteToken: (memberId: string) => string;
  disableMember: (id: string) => void;
  enableMember: (id: string) => boolean;
  markMemberJoined: (id: string) => void;
  touchMemberActivity: () => void;

  addAsset: (a: Omit<Asset, 'id'>) => string;
  updateAsset: (id: string, partial: Partial<Asset>) => void;

  addDocument: (d: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => string;
  verifyDocument: (
    id: string,
    partial: Partial<
      Pick<Document, 'title' | 'expiryDate' | 'fields' | 'notes' | 'assetId' | 'memberId'>
    >,
  ) => boolean;
  updateDocument: (id: string, partial: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  markRenewed: (id: string) => void;
  archiveDocument: (id: string) => void;
  unarchiveDocument: (id: string) => void;

  logActivity: (
    event: ActivityLog['event'],
    meta?: Record<string, string | number | boolean>,
    documentId?: string,
    bundleId?: string,
  ) => void;

  addShareGrant: (documentId: string, memberId: string) => void;
  revokeShare: (documentId: string, memberId: string) => void;
  revokeAllForMember: (memberId: string) => void;

  createTempLink: (
    documentId: string,
    opts?: { hours?: number; permanent?: boolean },
  ) => TempShareLink | null;
  revokeTempLink: (id: string) => void;
  purgeExpiredShareLinks: () => void;
  pruneActivityLogs: () => void;

  createBundle: (b: Omit<SharedBundle, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateBundle: (id: string, partial: Partial<Omit<SharedBundle, 'id' | 'createdAt'>>) => void;
  deleteBundle: (id: string) => void;
  createBundleShareLink: (
    bundleId: string,
    opts?: { sharedWith?: string; purpose?: string; watermark?: boolean; hours?: number },
  ) => BundleShareLink;
  revokeBundleShareLink: (id: string) => void;
  recordBundleLinkAccess: (token: string) => void;
  recordBundlePrint: (token: string) => void;

  setVisitingCard: (card: VisitingCard) => void;
  getVaultExportPayload: () => VaultExportPayload;
  restoreVault: (payload: VaultExportPayload) => void;
  recordBackup: (provider: 'file' | 'google_drive', driveFileId?: string) => void;
  seedDemoData: () => void;
  syncPlatformMetrics: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  pushReminders: true,
  emailReminders: true,
  cloudAiEnabled: false,
  privacyMode: true,
  onboardingComplete: false,
};

function shareActor(state: Pick<VaultState, 'user' | 'members'>): { memberId?: string; name: string } {
  const owner = state.members.find((m) => m.role === 'owner');
  return {
    memberId: owner?.id,
    name: owner?.displayName ?? state.user?.name ?? 'You',
  };
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      user: null,
      members: [],
      assets: [],
      documents: [],
      activities: [],
      shareGrants: [],
      tempLinks: [],
      bundles: [],
      bundleShareLinks: [],
      visitingCard: null,
      settings: defaultSettings,
      locked: false,

      signInDemo: (opts) => {
        const referredBy = opts?.referredBy ?? consumePendingReferral();
        const userId = uid();
        const adminOwnerEmail = import.meta.env.VITE_ADMIN_OWNER_EMAIL as string | undefined;
        const email = adminOwnerEmail?.trim() || 'demo@gmail.com';
        set({
          user: {
            id: userId,
            email,
            name: 'Rahul Sharma',
            avatarUrl: undefined,
            plan: 'free',
            referralCode: generateReferralCode(),
            referredBy,
            referralUploads: 0,
            referralQualified: false,
          },
        });
        appendAdminEvent({
          type: 'signup',
          householdUserId: userId,
          householdEmail: email,
          plan: 'free',
          meta: { referredBy: referredBy ?? '' },
        });
        get().syncPlatformMetrics();
      },

      signOut: () => {
        set({
          user: null,
          members: [],
          assets: [],
          documents: [],
          activities: [],
          shareGrants: [],
          tempLinks: [],
          bundles: [],
          bundleShareLinks: [],
          visitingCard: null,
          settings: { ...defaultSettings },
          locked: false,
        });
      },

      setUserPlan: (plan) => {
        set((s) => {
          if (!s.user) return s;
          const settings = { ...s.settings };
          if (plan === 'free') {
            settings.emailReminders = false;
            settings.cloudAiEnabled = false;
            settings.privacyMode = true;
          }
          appendAdminEvent({
            type: 'plan_change',
            householdUserId: s.user.id,
            householdEmail: s.user.email,
            plan,
          });
          return { user: { ...s.user, plan }, settings };
        });
        get().syncPlatformMetrics();
      },

      acceptConsent: () => {
        set((s) => ({
          settings: { ...s.settings, consentedAt: new Date().toISOString() },
        }));
      },

      completeOnboarding: () => {
        set((s) => ({
          settings: { ...s.settings, onboardingComplete: true },
        }));
      },

      finishOnboarding: () => {
        const code = crypto.randomUUID().slice(0, 8).toUpperCase();
        const { members } = get();
        if (members.length > 0) {
          set((s) => ({
            settings: { ...s.settings, recoveryCode: code, onboardingComplete: true },
          }));
          return;
        }

        const selfId = uid();
        const spouseId = uid();
        const vehicleId = uid();
        const purchaseId = uid();
        const now = new Date().toISOString();
        const passportExpiry = new Date();
        passportExpiry.setMonth(passportExpiry.getMonth() + 2);

        const newMembers: FamilyMember[] = [
          {
            id: selfId,
            displayName: 'Rahul Sharma',
            email: 'rahul@gmail.com',
            relationship: 'Self',
            status: 'active',
            role: 'owner',
            healthSummary: {
              bloodGroup: 'O+',
              allergies: 'Penicillin',
              emergencyContact: 'Priya Sharma',
              emergencyPhone: '+919876543210',
            },
          },
          {
            id: spouseId,
            displayName: 'Priya Sharma',
            email: 'priya@gmail.com',
            relationship: 'Spouse',
            status: 'active',
            role: 'viewer',
            healthSummary: {
              bloodGroup: 'B+',
              allergies: 'None known',
            },
          },
        ];

        const newAssets: Asset[] = [
          {
            id: vehicleId,
            type: 'vehicle',
            label: 'Swift — MH01AB1234',
            regNumber: 'MH01AB1234',
          },
          {
            id: purchaseId,
            type: 'purchase',
            label: 'MacBook Pro 14',
            ownedByMemberId: selfId,
            purchaseFields: {
              productName: 'MacBook Pro 14" M3',
              brand: 'Apple',
              amount: 189900,
              currency: 'INR',
              purchaseDate: '2025-06-12',
              storeName: 'Imagine Apple Reseller',
              storePhone: '+919876543210',
              warrantyUntil: '2026-06-12',
              warrantyTerms: '1 year standard warranty',
            },
          },
        ];

        const newDocuments: Document[] = [
          {
            id: uid(),
            title: 'Passport',
            docType: 'passport',
            domain: 'family',
            category: 'identity',
            memberId: selfId,
            expiryDate: passportExpiry.toISOString().slice(0, 10),
            fields: {
              passportNumber: 'Z1234567',
              fullName: 'Rahul Sharma',
              dateOfIssue: '2015-06-01',
              expiryDate: passportExpiry.toISOString().slice(0, 10),
            },
            createdAt: now,
            updatedAt: now,
          },
          {
            id: uid(),
            title: 'PAN',
            docType: 'pan',
            domain: 'family',
            category: 'identity',
            memberId: selfId,
            fields: { panNumber: 'ABCDE1234F', fullName: 'Rahul Sharma' },
            createdAt: now,
            updatedAt: now,
          },
          {
            id: uid(),
            title: 'RC',
            docType: 'vehicle_rc',
            domain: 'assets',
            category: 'vehicle',
            assetId: vehicleId,
            expiryDate: '2027-03-15',
            fields: { registrationNumber: 'MH01AB1234' },
            createdAt: now,
            updatedAt: now,
          },
          {
            id: uid(),
            title: 'PUC',
            docType: 'vehicle_puc',
            domain: 'assets',
            category: 'vehicle',
            assetId: vehicleId,
            expiryDate: '2025-07-01',
            fields: { registrationNumber: 'MH01AB1234', validTill: '2025-07-01' },
            createdAt: now,
            updatedAt: now,
          },
          {
            id: uid(),
            title: 'Vehicle Insurance',
            docType: 'vehicle_insurance',
            domain: 'assets',
            category: 'vehicle',
            assetId: vehicleId,
            expiryDate: '2026-01-20',
            fields: { policyNumber: 'POL882211', insurer: 'HDFC ERGO', renewalDate: '2026-01-20' },
            createdAt: now,
            updatedAt: now,
          },
          {
            id: uid(),
            title: 'MacBook Invoice',
            docType: 'purchase_receipt',
            domain: 'assets',
            category: 'purchase',
            assetId: purchaseId,
            expiryDate: '2026-06-12',
            fields: {
              productName: 'MacBook Pro 14" M3',
              amount: 189900,
              storeName: 'Imagine Apple Reseller',
              purchaseDate: '2025-06-12',
              warrantyUntil: '2026-06-12',
            },
            notes: 'Keep for AppleCare claim',
            createdAt: now,
            updatedAt: now,
          },
          {
            id: uid(),
            title: 'Star Health Insurance',
            docType: 'health_insurance',
            domain: 'health',
            category: 'health_medical',
            memberId: selfId,
            expiryDate: passportExpiry.toISOString().slice(0, 10),
            fields: {
              policyNumber: 'SH-882910',
              insurer: 'Star Health',
              sumInsured: '500000',
              renewalDate: passportExpiry.toISOString().slice(0, 10),
            },
            createdAt: now,
            updatedAt: now,
          },
          {
            id: uid(),
            title: 'CBC Lab Report',
            docType: 'lab_report',
            domain: 'health',
            category: 'health_medical',
            memberId: spouseId,
            fields: { labName: 'Thyrocare', testDate: '2025-11-08' },
            notes: 'Annual checkup — all normal',
            createdAt: now,
            updatedAt: now,
          },
          {
            id: uid(),
            title: 'COVID Booster',
            docType: 'vaccination',
            domain: 'health',
            category: 'health_medical',
            memberId: spouseId,
            expiryDate: '2026-11-08',
            fields: { vaccine: 'Covishield', dose: 'Booster' },
            createdAt: now,
            updatedAt: now,
          },
        ];

        const uploadedActivities: ActivityLog[] = newDocuments.map((d) => ({
          id: uid(),
          documentId: d.id,
          event: 'uploaded' as const,
          metadata: { docType: d.docType },
          createdAt: now,
        }));

        set((s) => ({
          members: newMembers,
          assets: newAssets,
          documents: newDocuments,
          activities: [...uploadedActivities, ...s.activities].slice(0, 500),
          settings: { ...s.settings, recoveryCode: code, onboardingComplete: true },
        }));
      },

      setSettings: (partial) => {
        set((s) => ({ settings: { ...s.settings, ...partial } }));
      },

      unlock: (pin) => {
        const { settings } = get();
        if (!settings.lockPin || settings.lockPin === pin) {
          set({ locked: false });
          return true;
        }
        return false;
      },

      lock: () => set({ locked: true }),

      setLockPin: (pin) => {
        set((s) => ({ settings: { ...s.settings, lockPin: pin }, locked: true }));
      },

      addMember: (m) => {
        const { user, members } = get();
        const isOwner = m.role === 'owner' || m.relationship === 'Self';
        if (!isOwner && !canAddMember(user, members)) return '';

        const id = uid();
        const now = new Date().toISOString();
        set((s) => ({
          members: [
            ...s.members,
            {
              id,
              displayName: m.displayName,
              email: m.email,
              phone: m.phone,
              relationship: m.relationship,
              status: isOwner ? 'active' : 'pending',
              role: m.role ?? 'viewer',
              joinedAt: isOwner ? now : undefined,
              lastActiveAt: isOwner ? now : undefined,
            },
          ],
        }));
        return id;
      },

      updateMember: (id, partial) => {
        set((s) => ({
          members: s.members.map((m) => (m.id === id ? { ...m, ...partial } : m)),
        }));
      },

      ensureMemberInviteToken: (memberId) => {
        const member = get().members.find((m) => m.id === memberId);
        if (member?.inviteToken) return member.inviteToken;
        const token = generateInviteToken();
        set((s) => ({
          members: s.members.map((m) =>
            m.id === memberId ? { ...m, inviteToken: token } : m,
          ),
        }));
        get().logActivity('member_invited', { memberId });
        return token;
      },

      disableMember: (id) => {
        get().revokeAllForMember(id);
        set((s) => ({
          members: s.members.map((m) =>
            m.id === id ? { ...m, status: 'disabled' as const } : m,
          ),
        }));
        get().logActivity('member_disabled', { memberId: id });
      },

      enableMember: (id) => {
        const { user, members } = get();
        const member = members.find((m) => m.id === id);
        if (!member || member.status !== 'disabled' || member.role === 'owner') return false;
        if (!canAddMember(user, members)) return false;

        set((s) => ({
          members: s.members.map((m) =>
            m.id === id
              ? {
                  ...m,
                  status: m.joinedAt ? ('active' as const) : ('pending' as const),
                }
              : m,
          ),
        }));
        get().logActivity('member_enabled', { memberId: id });
        return true;
      },

      markMemberJoined: (id) => {
        const now = new Date().toISOString();
        set((s) => ({
          members: s.members.map((m) =>
            m.id === id
              ? { ...m, joinedAt: m.joinedAt ?? now, lastActiveAt: now, status: 'active' as const }
              : m,
          ),
        }));
      },

      touchMemberActivity: () => {
        const { user, members } = get();
        if (!user) return;
        const now = new Date().toISOString();
        const member = members.find(
          (m) =>
            m.status !== 'disabled' &&
            (m.role === 'owner' ||
              (m.email && m.email.toLowerCase() === user.email.toLowerCase())),
        );
        if (!member) return;
        set((s) => ({
          members: s.members.map((m) =>
            m.id === member.id
              ? {
                  ...m,
                  lastActiveAt: now,
                  joinedAt: m.joinedAt ?? now,
                  status: m.status === 'pending' ? ('active' as const) : m.status,
                }
              : m,
          ),
        }));
      },

      addAsset: (a) => {
        if (!canAddAsset(get().user, get().assets.length)) return '';

        const id = uid();
        set((s) => ({ assets: [...s.assets, { ...a, id }] }));
        return id;
      },

      updateAsset: (id, partial) => {
        set((s) => ({
          assets: s.assets.map((a) => (a.id === id ? { ...a, ...partial } : a)),
        }));
      },

      addDocument: (d) => {
        const status = d.verificationStatus ?? 'verified';
        const docs = get().documents;
        const user = get().user;
        const assets = get().assets;
        const members = get().members;

        const gate = checkCanAddDocument(user, docs, assets, members, {
          memberId: d.memberId,
          assetId: d.assetId,
          verificationStatus: status,
        });
        if (!gate.allowed) return '';

        const id = uid();
        const now = new Date().toISOString();
        const tags = inferDocTags(d.docType, {
          memberId: d.memberId,
          assetId: d.assetId,
        });
        set((s) => ({
          documents: [
            ...s.documents,
            {
              ...d,
              verificationStatus: status,
              domain: d.domain ?? tags.domain,
              category: d.category ?? tags.category,
              id,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        get().logActivity('uploaded', { docType: d.docType, pending: status === 'pending' }, id);

        const memberId = resolveDocumentMemberId(
          { memberId: d.memberId, assetId: d.assetId },
          assets,
          members,
        );
        if (memberId) {
          const memberCount = countDocumentsForMember(
            get().documents,
            assets,
            members,
            memberId,
          );
          const member = members.find((m) => m.id === memberId);
          if (member && memberCapReachedAfterAdd(memberCount)) {
            get().logActivity('member_doc_limit_reached', {
              memberId,
              memberName: member.displayName,
              count: memberCount,
            });
            void notifyMemberDocLimitReached({ user, member, documentCount: memberCount });
          }
        }

        const currentUser = get().user;
        if (currentUser?.referredBy && !currentUser.referralQualified && status !== 'pending') {
          const uploads = currentUser.referralUploads + 1;
          const qualified = uploads >= REFERRAL_QUALIFYING_UPLOADS;
          set((s) => ({
            user: s.user
              ? {
                  ...s.user,
                  referralUploads: uploads,
                  referralQualified: qualified,
                }
              : null,
          }));
          if (qualified) {
            const granted = grantReferralReward(currentUser.referredBy, currentUser.id);
            if (granted) {
              get().logActivity('referral_rewarded', { referrerCode: currentUser.referredBy });
              appendAdminEvent({
                type: 'referral_rewarded',
                householdUserId: currentUser.id,
                householdEmail: currentUser.email,
                meta: { referrerCode: currentUser.referredBy },
              });
            }
          }
        }

        get().syncPlatformMetrics();
        return id;
      },

      verifyDocument: (id, partial) => {
        const doc = get().documents.find((d) => d.id === id);
        if (!doc || isDocumentVerified(doc)) return false;

        const user = get().user;
        const gate = checkCanVerifyDocument(user, get().documents, doc);
        if (!gate.allowed) return false;

        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id
              ? {
                  ...d,
                  ...partial,
                  verificationStatus: 'verified' as const,
                  updatedAt: new Date().toISOString(),
                }
              : d,
          ),
        }));
        get().logActivity('verified', {}, id);

        const currentUser = get().user;
        if (currentUser?.referredBy && !currentUser.referralQualified) {
          const uploads = currentUser.referralUploads + 1;
          const qualified = uploads >= REFERRAL_QUALIFYING_UPLOADS;
          set((s) => ({
            user: s.user
              ? {
                  ...s.user,
                  referralUploads: uploads,
                  referralQualified: qualified,
                }
              : null,
          }));
          if (qualified) {
            const granted = grantReferralReward(currentUser.referredBy, currentUser.id);
            if (granted) {
              get().logActivity('referral_rewarded', { referrerCode: currentUser.referredBy });
              appendAdminEvent({
                type: 'referral_rewarded',
                householdUserId: currentUser.id,
                householdEmail: currentUser.email,
                meta: { referrerCode: currentUser.referredBy },
              });
            }
          }
        }

        get().syncPlatformMetrics();
        return true;
      },

      updateDocument: (id, partial) => {
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, ...partial, updatedAt: new Date().toISOString() } : d,
          ),
        }));
      },

      deleteDocument: (id) => {
        get().logActivity('deleted', {}, id);
        set((s) => ({
          documents: s.documents.filter((d) => d.id !== id),
          shareGrants: s.shareGrants.filter((g) => g.documentId !== id),
          tempLinks: s.tempLinks.filter((l) => l.documentId !== id),
          bundles: s.bundles.map((b) => ({
            ...b,
            documentIds: b.documentIds.filter((docId) => docId !== id),
            updatedAt: new Date().toISOString(),
          })),
        }));
      },

      markRenewed: (id) => {
        const now = new Date().toISOString();
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, renewedAt: now, updatedAt: now } : d,
          ),
        }));
        get().logActivity('renewed', {}, id);
      },

      archiveDocument: (id) => {
        const now = new Date().toISOString();
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, archivedAt: now, updatedAt: now } : d,
          ),
        }));
        get().logActivity('archived', {}, id);
      },

      unarchiveDocument: (id) => {
        const now = new Date().toISOString();
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, archivedAt: undefined, updatedAt: now } : d,
          ),
        }));
        get().logActivity('unarchived', {}, id);
      },

      logActivity: (event, metadata = {}, documentId, bundleId) => {
        if (event === 'viewed' && documentId) {
          const already = get().activities.some(
            (a) => a.documentId === documentId && a.event === 'viewed',
          );
          if (already) return;
        }
        const actor = shareActor(get());
        const meta: Record<string, string | number | boolean> = {
          ...metadata,
          actorName: typeof metadata.actorName === 'string' ? metadata.actorName : actor.name,
        };
        if (actor.memberId) meta.actorMemberId = actor.memberId;
        const retentionDays = activityLogRetentionDays(get().user);
        const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        set((s) => ({
          activities: [
            {
              id: uid(),
              documentId,
              bundleId,
              event,
              metadata: meta,
              createdAt: new Date().toISOString(),
            },
            ...s.activities,
          ]
            .filter((a) => new Date(a.createdAt).getTime() >= cutoff)
            .slice(0, 500),
        }));
      },

      addShareGrant: (documentId, memberId) => {
        set((s) => ({
          shareGrants: [...s.shareGrants, { id: uid(), documentId, memberId }],
        }));
        get().logActivity('shared', { memberId }, documentId);
      },

      revokeShare: (documentId, memberId) => {
        set((s) => ({
          shareGrants: s.shareGrants.filter(
            (g) => !(g.documentId === documentId && g.memberId === memberId),
          ),
        }));
        get().logActivity('revoked', { memberId }, documentId);
      },

      revokeAllForMember: (memberId) => {
        set((s) => ({
          shareGrants: s.shareGrants.filter((g) => g.memberId !== memberId),
        }));
      },

      createTempLink: (documentId, opts) => {
        const { user, tempLinks } = get();
        const activeCount = countActiveTempLinks(tempLinks);
        if (!canCreateTempLink(user, activeCount)) return null;

        const maxHours = tempLinkDurationHours(user);
        const permanent = Boolean(opts?.permanent && (user?.plan === 'pro' || user?.plan === 'family'));
        const requestedHours = opts?.hours;
        const hours =
          permanent ? 24 * 365 * 50 : Math.max(0.25, Math.min(maxHours, requestedHours ?? maxHours));

        const actor = shareActor(get());
        const now = new Date().toISOString();
        const link: TempShareLink = {
          id: uid(),
          documentId,
          token: uid().replace(/-/g, '').slice(0, 24),
          expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
          purpose: 'id_fields',
          viewCount: 0,
          maxViews: 10,
          status: 'active',
          createdAt: now,
          createdByMemberId: actor.memberId,
          createdByName: actor.name,
        };
        set((s) => ({ tempLinks: [...s.tempLinks, link] }));
        get().logActivity(
          'temp_link_created',
          { linkId: link.id, createdByName: actor.name },
          documentId,
        );
        return link;
      },

      revokeTempLink: (id) => {
        const link = get().tempLinks.find((l) => l.id === id);
        set((s) => ({
          tempLinks: s.tempLinks.map((l) =>
            l.id === id ? { ...l, status: 'revoked' as const } : l,
          ),
        }));
        if (link) {
          get().logActivity('revoked', { linkId: id, linkType: 'document' }, link.documentId);
        }
      },

      purgeExpiredShareLinks: () => {
        set((s) => ({
          tempLinks: s.tempLinks.filter((l) => !isShareLinkExpired(l)),
          bundleShareLinks: s.bundleShareLinks.filter((l) => !isShareLinkExpired(l)),
        }));
      },

      pruneActivityLogs: () => {
        const { user, activities } = get();
        const retentionDays = activityLogRetentionDays(user);
        const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        const kept = activities.filter((a) => new Date(a.createdAt).getTime() >= cutoff);
        if (kept.length !== activities.length) {
          set({ activities: kept });
        }
      },

      createBundle: (b) => {
        if (!canCreateBundle(get().user, get().bundles.length)) return '';

        const id = uid();
        const now = new Date().toISOString();
        set((s) => ({
          bundles: [
            ...s.bundles,
            {
              ...b,
              id,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        get().logActivity('bundle_created', { name: b.name, docCount: b.documentIds.length }, undefined, id);
        return id;
      },

      updateBundle: (id, partial) => {
        set((s) => ({
          bundles: s.bundles.map((b) =>
            b.id === id ? { ...b, ...partial, updatedAt: new Date().toISOString() } : b,
          ),
        }));
        get().logActivity('bundle_updated', { name: partial.name ?? '' }, undefined, id);
      },

      deleteBundle: (id) => {
        set((s) => ({
          bundles: s.bundles.filter((b) => b.id !== id),
          bundleShareLinks: s.bundleShareLinks.filter((l) => l.bundleId !== id),
        }));
      },

      createBundleShareLink: (bundleId, opts = {}) => {
        const bundle = get().bundles.find((b) => b.id === bundleId);
        const hours = opts.hours ?? bundleShareDurationHours(get().user);
        const actor = shareActor(get());
        const now = new Date().toISOString();
        const link: BundleShareLink = {
          id: uid(),
          bundleId,
          token: uid().replace(/-/g, '').slice(0, 24),
          expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
          purpose: opts.purpose ?? bundle?.purpose ?? 'Document bundle',
          sharedWith: opts.sharedWith,
          watermark: opts.watermark ?? true,
          viewCount: 0,
          maxViews: 10,
          status: 'active',
          createdAt: now,
          createdByMemberId: actor.memberId,
          createdByName: actor.name,
        };
        set((s) => ({ bundleShareLinks: [...s.bundleShareLinks, link] }));
        get().logActivity(
          'bundle_shared',
          {
            linkId: link.id,
            sharedWith: opts.sharedWith ?? 'unspecified',
            purpose: link.purpose,
            createdByName: actor.name,
          },
          undefined,
          bundleId,
        );
        const u = get().user;
        appendAdminEvent({
          type: 'bundle_shared',
          householdUserId: u?.id,
          householdEmail: u?.email,
          meta: { bundleId, purpose: link.purpose },
        });
        return link;
      },

      revokeBundleShareLink: (id) => {
        const link = get().bundleShareLinks.find((l) => l.id === id);
        set((s) => ({
          bundleShareLinks: s.bundleShareLinks.map((l) =>
            l.id === id ? { ...l, status: 'revoked' as const } : l,
          ),
        }));
        if (link) {
          get().logActivity('bundle_link_revoked', { linkId: id, linkType: 'bundle' }, undefined, link.bundleId);
        }
      },

      recordBundleLinkAccess: (token) => {
        const link = get().bundleShareLinks.find((l) => l.token === token);
        if (!link) return;
        set((s) => ({
          bundleShareLinks: s.bundleShareLinks.map((l) =>
            l.token === token ? { ...l, viewCount: l.viewCount + 1 } : l,
          ),
        }));
        get().logActivity(
          'bundle_link_accessed',
          { linkId: link.id, viewCount: link.viewCount + 1 },
          undefined,
          link.bundleId,
        );
      },

      recordBundlePrint: (token) => {
        const link = get().bundleShareLinks.find((l) => l.token === token);
        if (!link) return;
        get().logActivity('bundle_printed', { linkId: link.id }, undefined, link.bundleId);
      },

      setVisitingCard: (card) => set({ visitingCard: card }),

      getVaultExportPayload: () => {
        const s = get();
        return {
          user: s.user,
          members: s.members,
          assets: s.assets,
          documents: s.documents,
          activities: s.activities,
          shareGrants: s.shareGrants,
          tempLinks: s.tempLinks,
          bundles: s.bundles,
          bundleShareLinks: s.bundleShareLinks,
          visitingCard: s.visitingCard,
          settings: s.settings,
        };
      },

      restoreVault: (payload) => {
        set({
          user: payload.user,
          members: payload.members,
          assets: payload.assets,
          documents: payload.documents,
          activities: payload.activities,
          shareGrants: payload.shareGrants,
          tempLinks: payload.tempLinks,
          bundles: payload.bundles ?? [],
          bundleShareLinks: payload.bundleShareLinks ?? [],
          visitingCard: payload.visitingCard,
          settings: payload.settings,
          locked: false,
        });
        get().logActivity('backup_restored', {});
        const atCap = membersAtDocumentCap(
          payload.documents,
          payload.assets,
          payload.members,
        );
        void notifyMembersAtCap(payload.user, payload.members, atCap);
        get().syncPlatformMetrics();
      },

      recordBackup: (provider, driveFileId) => {
        const now = new Date().toISOString();
        set((s) => ({
          settings: {
            ...s.settings,
            lastBackupAt: now,
            lastBackupProvider: provider,
            lastDriveBackupFileId: driveFileId,
          },
        }));
        get().logActivity('backup_created', { provider });
        const u = get().user;
        appendAdminEvent({
          type: 'backup_created',
          householdUserId: u?.id,
          householdEmail: u?.email,
          meta: { provider },
        });
      },

      seedDemoData: () => {
        const { members, assets, documents } = get();
        if (members.length > 0) return;

        const selfId = get().addMember({
          displayName: 'Rahul Sharma',
          email: 'rahul@gmail.com',
          relationship: 'Self',
          role: 'owner',
        });
        get().addMember({
          displayName: 'Priya Sharma',
          email: 'priya@gmail.com',
          relationship: 'Spouse',
        });
        const priya = get().members.find((m) => m.displayName === 'Priya Sharma');
        if (priya) {
          const joined = new Date(Date.now() - 2 * 3600000).toISOString();
          get().updateMember(priya.id, {
            joinedAt: joined,
            lastActiveAt: joined,
            status: 'active',
          });
        }

        const vehicleId = get().addAsset({
          type: 'vehicle',
          label: 'Swift — MH01AB1234',
          regNumber: 'MH01AB1234',
        });

        const purchaseId = get().addAsset({
          type: 'purchase',
          label: 'MacBook Pro 14',
          ownedByMemberId: selfId,
          purchaseFields: {
            productName: 'MacBook Pro 14" M3',
            brand: 'Apple',
            amount: 189900,
            currency: 'INR',
            purchaseDate: '2025-06-12',
            storeName: 'Imagine Apple Reseller',
            storePhone: '+919876543210',
            warrantyUntil: '2026-06-12',
            warrantyTerms: '1 year standard warranty',
          },
        });

        const passportExpiry = new Date();
        passportExpiry.setMonth(passportExpiry.getMonth() + 2);

        get().addDocument({
          title: 'Passport',
          docType: 'passport',
          memberId: selfId,
          expiryDate: passportExpiry.toISOString().slice(0, 10),
          fields: { passportNumber: 'Z1234567', fullName: 'Rahul Sharma' },
        });

        get().addDocument({
          title: 'RC',
          docType: 'vehicle_rc',
          assetId: vehicleId,
          expiryDate: '2027-03-15',
          fields: { registrationNumber: 'MH01AB1234' },
        });

        get().addDocument({
          title: 'PUC',
          docType: 'vehicle_puc',
          assetId: vehicleId,
          expiryDate: '2025-07-01',
          fields: { registrationNumber: 'MH01AB1234' },
        });

        get().addDocument({
          title: 'Vehicle Insurance',
          docType: 'vehicle_insurance',
          assetId: vehicleId,
          expiryDate: '2026-01-20',
          fields: { policyNumber: 'POL882211', insurer: 'HDFC ERGO' },
        });

        get().addDocument({
          title: 'MacBook Invoice',
          docType: 'purchase_receipt',
          assetId: purchaseId,
          expiryDate: '2026-06-12',
          fields: { amount: 189900, storeName: 'Imagine Apple Reseller' },
          notes: 'Keep for AppleCare claim',
        });

        void documents;
        void assets;
      },

      syncPlatformMetrics: () => {
        const s = get();
        syncPlatformHouseholdFromVault({
          user: s.user,
          members: s.members,
          documents: s.documents,
          assets: s.assets,
          bundles: s.bundles,
          tempLinks: s.tempLinks,
        });
      },
    }),
    {
      name: 'dox-vault',
      version: 4,
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          useVaultStore.getState().purgeExpiredShareLinks();
          useVaultStore.getState().pruneActivityLogs();
        });
      },
      migrate: (persisted, version) => {
        const state = persisted as VaultState;
        if (state.user) {
          const u = state.user as Partial<User> & { id: string };
          if (!u.referralCode) {
            state.user = {
              ...u,
              referralCode: generateReferralCode(),
              referralUploads: u.referralUploads ?? 0,
              referralQualified: u.referralQualified ?? false,
              plan: u.plan ?? 'free',
            } as User;
          }
        }
        if (version < 2 && state.documents) {
          state.documents = state.documents.map((d) => ({
            ...d,
            verificationStatus: d.verificationStatus ?? 'verified',
          }));
        }
        if (version < 3 && state.members) {
          const now = new Date().toISOString();
          state.members = state.members.map((m) => {
            const member = m as FamilyMember;
            if (member.role === 'owner') {
              return {
                ...member,
                joinedAt: member.joinedAt ?? now,
                lastActiveAt: member.lastActiveAt ?? now,
                status: member.status === 'disabled' ? member.status : 'active',
              };
            }
            if (member.joinedAt) {
              return {
                ...member,
                status: member.status === 'disabled' ? member.status : 'active',
              };
            }
            return {
              ...member,
              status: member.status === 'disabled' ? member.status : 'pending',
            };
          });
        }
        if (version < 4) {
          const actorName = state.user?.name ?? 'You';
          if (state.tempLinks) {
            state.tempLinks = state.tempLinks.map((l) => ({
              ...l,
              createdAt: l.createdAt ?? l.expiresAt,
              createdByName: l.createdByName ?? actorName,
            }));
          }
          if (state.bundleShareLinks) {
            state.bundleShareLinks = state.bundleShareLinks.map((l) => ({
              ...l,
              createdByName: l.createdByName ?? actorName,
            }));
          }
        }
        return state;
      },
    },
  ),
);

export function getExpiringDocuments(docs: Document[], withinDays = 30): Document[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + withinDays);

  return docs.filter((d) => {
    if (d.archivedAt) return false;
    if (d.verificationStatus === 'pending') return false;
    if (!d.expiryDate || d.renewedAt) return false;
    const exp = new Date(d.expiryDate);
    return exp <= limit;
  });
}

export function getHealthDocuments(docs: Document[]): Document[] {
  return docs.filter((d) => !d.archivedAt && isHealthDomainDoc(d));
}
