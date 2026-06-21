import { MemberAvatar } from '@/components/MemberAvatar';
import { memberHasJoined, memberLastActiveLabel, memberStatusLabel } from '@/lib/memberActivity';
import {
  mailtoShareUrl,
  memberInviteMessage,
  memberInviteUrl,
  whatsAppShareUrl,
} from '@/lib/referrals';
import { useVaultStore } from '@/store/useVaultStore';
import type { FamilyMember } from '@/types';
import { Button } from '@/components/Button';

export function MemberInviteSection({ member }: { member: FamilyMember }) {
  const user = useVaultStore((s) => s.user);
  const ensureMemberInviteToken = useVaultStore((s) => s.ensureMemberInviteToken);

  const referralCode = user?.referralCode ?? '';
  const joined = memberHasJoined(member);
  const inviteToken = member.inviteToken ?? ensureMemberInviteToken(member.id);
  const inviteUrl = referralCode ? memberInviteUrl(referralCode, member.displayName) : '';

  const shareInvite = (channel: 'whatsapp' | 'email' | 'copy') => {
    if (!user || !referralCode) return;
    const message = memberInviteMessage(user.name, member.displayName, referralCode);
    if (channel === 'whatsapp') {
      window.open(whatsAppShareUrl(message), '_blank', 'noopener,noreferrer');
    } else if (channel === 'email') {
      const to = member.email ? member.email : '';
      window.location.href = mailtoShareUrl(
        `${user.name} invited you to PreVault`,
        to ? `To: ${to}\n\n${message}` : message,
      );
    } else {
      void navigator.clipboard.writeText(`${message}\n\n${inviteUrl}`);
    }
  };

  return (
    <section className="surface-panel space-y-4 p-4">
      <div className="flex items-center gap-4">
        <MemberAvatar member={member} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold tracking-tight">{member.displayName}</p>
          <p className="text-sm text-muted">{member.relationship}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                joined
                  ? 'bg-accent-soft text-accent-ink'
                  : member.status === 'disabled'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-bg text-muted'
              }`}
            >
              {memberStatusLabel(member)}
            </span>
            {joined && (
              <span className="text-xs text-muted">{memberLastActiveLabel(member)}</span>
            )}
          </div>
        </div>
      </div>

      {member.role !== 'owner' && !joined && member.status !== 'disabled' && (
        <div className="space-y-2 border-t border-border-soft pt-4">
          <p className="section-label">Invite to PreVault</p>
          <p className="text-xs text-muted">
            Share an app invite so {member.displayName.split(' ')[0]} can join your family vault.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="flex-1 text-xs" onClick={() => shareInvite('whatsapp')}>
              WhatsApp
            </Button>
            <Button variant="secondary" className="flex-1 text-xs" onClick={() => shareInvite('email')}>
              Email
            </Button>
            <Button variant="secondary" className="flex-1 text-xs" onClick={() => shareInvite('copy')}>
              Copy link
            </Button>
          </div>
          {inviteToken && (
            <p className="text-[0.65rem] text-muted">Invite ref: {inviteToken.slice(0, 8)}…</p>
          )}
        </div>
      )}
    </section>
  );
}
