import { uid } from '@/lib/format';

/** Token for household member app invite (stored on member record). */
export function generateInviteToken(): string {
  return uid().replace(/-/g, '').slice(0, 12);
}
