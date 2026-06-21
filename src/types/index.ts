export type ThemeMode = 'light' | 'dark' | 'system';
export type AssetType = 'vehicle' | 'property' | 'purchase' | 'subscription';

/** Tab scope — Family, Health, or Assets */
export type DocDomain = 'family' | 'health' | 'assets';

/** Subject-matter classification */
export type DocCategory =
  | 'identity'
  | 'health_medical'
  | 'vehicle'
  | 'property'
  | 'financial'
  | 'education'
  | 'purchase'
  | 'legal'
  | 'other';

export type DocType =
  | 'passport'
  | 'pan'
  | 'aadhaar'
  | 'vehicle_rc'
  | 'vehicle_puc'
  | 'vehicle_insurance'
  | 'insurance'
  | 'health_insurance'
  | 'lab_report'
  | 'prescription'
  | 'vaccination'
  | 'medical_bill'
  | 'discharge_summary'
  | 'purchase_receipt'
  | 'warranty'
  | 'other';

export type MemberStatus = 'active' | 'disabled' | 'pending';
export type MemberRole = 'owner' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: 'free' | 'pro' | 'family';
  /** Unique code for referring new users */
  referralCode: string;
  /** Referral code used at signup */
  referredBy?: string;
  /** Uploads counted toward qualifying referral (need 5) */
  referralUploads: number;
  /** True once 5 uploads completed and referrer rewarded */
  referralQualified: boolean;
}

export interface HealthSummary {
  bloodGroup?: string;
  allergies?: string;
  conditions?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface FamilyMember {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  relationship: string;
  status: MemberStatus;
  role: MemberRole;
  avatarUrl?: string;
  healthSummary?: HealthSummary;
  /** Token for app invite link */
  inviteToken?: string;
  /** When the member joined the PreVault app (accepted invite / signed in) */
  joinedAt?: string;
  /** Last time this member was active in the app */
  lastActiveAt?: string;
}

export interface PurchaseFields {
  productName: string;
  brand?: string;
  serialNumber?: string;
  amount: number;
  currency: string;
  purchaseDate: string;
  storeName: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  warrantyUntil?: string;
  warrantyTerms?: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  label: string;
  regNumber?: string;
  ownedByMemberId?: string;
  purchaseFields?: PurchaseFields;
}

export interface DocFields {
  [key: string]: string | number | null | undefined;
}

export interface Document {
  id: string;
  title: string;
  docType: DocType;
  /** Tab scope: family | health | assets */
  domain?: DocDomain;
  /** Subject class: identity, vehicle, health_medical, etc. */
  category?: DocCategory;
  memberId?: string;
  assetId?: string;
  expiryDate?: string;
  fields: DocFields;
  notes?: string;
  renewedAt?: string;
  /** When archived, document is hidden from main tabs but kept intact. */
  archivedAt?: string;
  fileName?: string;
  fileDataUrl?: string;
  /** pending = uploaded, awaiting user verification; verified = confirmed in vault */
  verificationStatus?: 'pending' | 'verified';
  createdAt: string;
  updatedAt: string;
}

export type ActivityEvent =
  | 'uploaded'
  | 'verified'
  | 'viewed'
  | 'shared'
  | 'revoked'
  | 'temp_link_created'
  | 'temp_link_accessed'
  | 'deleted'
  | 'copied_field'
  | 'renewed'
  | 'archived'
  | 'unarchived'
  | 'bundle_created'
  | 'bundle_updated'
  | 'bundle_shared'
  | 'bundle_link_accessed'
  | 'bundle_link_revoked'
  | 'bundle_printed'
  | 'backup_created'
  | 'backup_restored'
  | 'referral_rewarded'
  | 'member_invited'
  | 'member_enabled'
  | 'member_disabled'
  | 'member_doc_limit_reached';

export interface ActivityLog {
  id: string;
  documentId?: string;
  bundleId?: string;
  event: ActivityEvent;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface TempShareLink {
  id: string;
  documentId: string;
  token: string;
  expiresAt: string;
  purpose: 'view' | 'id_fields';
  viewCount: number;
  maxViews: number;
  status: 'active' | 'revoked' | 'expired';
  createdAt?: string;
  createdByMemberId?: string;
  createdByName?: string;
}

/** Saved document bundle for repeated sharing (insurance, hospital, KYC, etc.) */
export interface SharedBundle {
  id: string;
  name: string;
  purpose: string;
  documentIds: string[];
  memberId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Time-limited link for a shared bundle */
export interface BundleShareLink {
  id: string;
  bundleId: string;
  token: string;
  expiresAt: string;
  purpose: string;
  sharedWith?: string;
  watermark: boolean;
  viewCount: number;
  maxViews: number;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  createdByMemberId?: string;
  createdByName?: string;
}

export interface VisitingCard {
  slug: string;
  template: 'doctor' | 'business' | 'custom';
  published: boolean;
  fields: {
    name: string;
    title: string;
    organization: string;
    phone: string;
    email: string;
    website?: string;
    address?: string;
    specialty?: string;
  };
}

export type FamilyHomeView = 'me' | 'family';

export interface AppSettings {
  theme: ThemeMode;
  pushReminders: boolean;
  emailReminders: boolean;
  cloudAiEnabled: boolean;
  privacyMode: boolean;
  /** Unlock app with device biometrics (WebAuthn) on open */
  biometricLockEnabled?: boolean;
  /** @deprecated Replaced by biometricLockEnabled */
  lockPin?: string;
  recoveryCode?: string;
  onboardingComplete: boolean;
  consentedAt?: string;
  /** Family tab segmented control — defaults to Me */
  familyHomeView?: FamilyHomeView;
  lastBackupAt?: string;
  lastBackupProvider?: 'file' | 'google_drive';
  lastDriveBackupFileId?: string;
}

export interface ShareGrant {
  id: string;
  documentId: string;
  memberId: string;
}
