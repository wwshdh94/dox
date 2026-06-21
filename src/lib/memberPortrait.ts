import type { MemberGender } from '@/types';
import type { MemberAgeBand } from '@/lib/memberAge';

export type MemberPortraitKind =
  | 'man'
  | 'woman'
  | 'boy'
  | 'girl'
  | 'old_man'
  | 'old_woman';

/** Map gender + age band to a portrait icon kind. Defaults to adult when age is unknown. */
export function resolveMemberPortraitKind(
  gender: MemberGender | undefined,
  ageBand: MemberAgeBand | undefined,
): MemberPortraitKind | undefined {
  if (!gender) return undefined;

  const band: MemberAgeBand = ageBand ?? 'adult';

  if (gender === 'male') {
    if (band === 'child') return 'boy';
    if (band === 'senior') return 'old_man';
    return 'man';
  }

  if (band === 'child') return 'girl';
  if (band === 'senior') return 'old_woman';
  return 'woman';
}

export const MEMBER_PORTRAIT_LABELS: Record<MemberPortraitKind, string> = {
  man: 'Man',
  woman: 'Woman',
  boy: 'Boy',
  girl: 'Girl',
  old_man: 'Old man',
  old_woman: 'Old woman',
};
