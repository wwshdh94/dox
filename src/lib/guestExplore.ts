/** Guest explore + welcome routing helpers */

import type { AppSettings, User } from '@/types';

export function isGuestExplore(settings: Pick<AppSettings, 'guestExplore'>): boolean {
  return settings.guestExplore === true;
}

export function isGuestUser(user: User | null | undefined): boolean {
  return user?.isGuestPreview === true;
}

export function shouldShowWelcome(settings: Pick<AppSettings, 'welcomeSeen' | 'guestExplore'>): boolean {
  return !settings.welcomeSeen && !settings.guestExplore;
}

export function canBrowseWithoutAuth(
  user: User | null,
  settings: Pick<AppSettings, 'guestExplore'>,
): boolean {
  return Boolean(user) || isGuestExplore(settings);
}
