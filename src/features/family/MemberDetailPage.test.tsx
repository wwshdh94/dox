import { describe, expect, it, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MemberDetailPage } from './MemberDetailPage';
import { AppLayout } from '@/components/AppLayout';
import { useVaultStore } from '@/store/useVaultStore';

function renderMemberPage(memberId: string) {
  return render(
    <MemoryRouter initialEntries={[`/family/${memberId}`]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/family/:id" element={<MemberDetailPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('MemberDetailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useVaultStore.setState({
      user: {
        id: 'demo-user',
        email: 'demo@gmail.com',
        name: 'Rahul Sharma',
        plan: 'pro',
        referralCode: 'TESTCODE',
        referralUploads: 0,
        referralQualified: false,
      },
      members: [],
      assets: [],
      documents: [],
      activities: [],
      shareGrants: [],
      tempLinks: [],
      visitingCard: null,
      settings: {
        theme: 'system',
        pushReminders: true,
        emailReminders: true,
        cloudAiEnabled: false,
        privacyMode: true,
        onboardingComplete: true,
      },
      locked: false,
    });
    useVaultStore.persist.rehydrate();
  });

  it('renders without infinite update loop', () => {
    useVaultStore.getState().finishOnboarding();
    const memberId = useVaultStore.getState().members[0]!.id;

    expect(() => renderMemberPage(memberId)).not.toThrow();
  });
});
