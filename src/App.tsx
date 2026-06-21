import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { ScrollToTop } from '@/components/ScrollToTop';
import { LoginPage } from '@/features/auth/LoginPage';
import { OnboardingPage } from '@/features/auth/OnboardingPage';
import { ProfilePage } from '@/features/auth/ProfilePage';
import { FamilyPage, ExpiringPage } from '@/features/family/FamilyPage';
import { MemberDetailPage } from '@/features/family/MemberDetailPage';
import { FamilyManagementPage } from '@/features/family/FamilyManagementPage';
import { AssetsPage } from '@/features/assets/AssetsPage';
import { AssetDetailPage } from '@/features/assets/AssetDetailPage';
import { HealthPage } from '@/features/health/HealthPage';
import { MemberHealthPage } from '@/features/health/MemberHealthPage';
import { DocumentDetailPage } from '@/features/documents/DocumentDetailPage';
import { UploadPage } from '@/features/documents/UploadPage';
import { SettingsPage } from '@/features/security/SettingsPage';
import { AppearanceSettingsPage } from '@/features/security/AppearanceSettingsPage';
import { SecurityPage } from '@/features/security/SecurityPage';
import { LockPage } from '@/features/security/LockPage';
import { VisitingCardPage, PublicCardPage } from '@/features/visiting-card/VisitingCardPage';
import { TempSharePage } from '@/features/temp-share/TempSharePage';
import { BundlesPage } from '@/features/bundles/BundlesPage';
import { BundleCreatePage } from '@/features/bundles/BundleCreatePage';
import { BundleDetailPage } from '@/features/bundles/BundleDetailPage';
import { BundleSharePage } from '@/features/bundles/BundleSharePage';
import { BackupPage } from '@/features/backup/BackupPage';
import { ReferralsPage } from '@/features/referrals/ReferralsPage';
import { PlanPage } from '@/features/plan/PlanPage';
import { FeedbackPage } from '@/features/feedback/FeedbackPage';
import { BlockedAccountPage } from '@/features/auth/BlockedAccountPage';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ArchivedDocumentsPage } from '@/features/documents/ArchivedDocumentsPage';
import { ActivityLogPage } from '@/features/profile/ActivityLogPage';
import { useTheme } from '@/hooks/useTheme';

const AdminGatePage = lazy(() =>
  import('@/features/admin/AdminGatePage').then((m) => ({ default: m.AdminGatePage })),
);
const AdminDashboardPage = lazy(() =>
  import('@/features/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminOpsFinancePage = lazy(() =>
  import('@/features/admin/AdminOpsFinancePage').then((m) => ({ default: m.AdminOpsFinancePage })),
);

function AdminRouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoadingScreen label="Loading admin…" />
    </div>
  );
}

function PublicCardRoute() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return null;
  return <PublicCardPage slug={slug} />;
}

export default function App() {
  useTheme();

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={<FamilyPage />} />
          <Route path="/expiring" element={<ExpiringPage />} />
          <Route path="/family/:id" element={<MemberDetailPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/health/:id" element={<MemberHealthPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/family" element={<FamilyManagementPage />} />
          <Route path="/profile/appearance" element={<AppearanceSettingsPage />} />
          <Route path="/profile/settings" element={<SettingsPage />} />
          <Route path="/profile/security" element={<SecurityPage />} />
          <Route path="/profile/activity" element={<ActivityLogPage />} />
          <Route path="/profile/archived" element={<ArchivedDocumentsPage />} />
          <Route path="/profile/backup" element={<BackupPage />} />
          <Route path="/profile/referrals" element={<ReferralsPage />} />
          <Route path="/profile/plan" element={<PlanPage />} />
          <Route path="/profile/feedback" element={<FeedbackPage />} />
          <Route path="/blocked" element={<BlockedAccountPage />} />
          <Route path="/profile/visiting-card" element={<VisitingCardPage />} />
          <Route path="/bundles" element={<BundlesPage />} />
          <Route path="/bundles/new" element={<BundleCreatePage />} />
          <Route path="/bundles/:id" element={<BundleDetailPage />} />
          <Route path="/lock" element={<LockPage />} />
          <Route path="/c/:slug" element={<PublicCardRoute />} />
          <Route path="/v/:token" element={<TempSharePage />} />
          <Route path="/p/:token" element={<BundleSharePage />} />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<AdminRouteFallback />}>
                <AdminGatePage />
              </Suspense>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <Suspense fallback={<AdminRouteFallback />}>
                <AdminDashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <Suspense fallback={<AdminRouteFallback />}>
                <AdminOpsFinancePage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
