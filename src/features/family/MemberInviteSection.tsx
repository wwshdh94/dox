import { useEffect, useState } from 'react';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { MemberStatusLight } from '@/components/MemberStatusLight';
import { memberHasJoined } from '@/lib/memberActivity';
import { isValidEmail } from '@/lib/format';
import {
  mailtoShareUrl,
  memberInviteMessage,
  memberInviteUrl,
  whatsAppShareUrl,
} from '@/lib/referrals';
import { authRedirectUrl, isSupabaseConfigured } from '@/lib/supabase/auth';
import { createHouseholdInvite } from '@/lib/supabase/households';
import { useVaultStore } from '@/store/useVaultStore';
import type { FamilyMember } from '@/types';

function householdInviteMessage(
  inviterName: string,
  email: string,
  inviteLink: string,
): string {
  return [
    `${inviterName} invited you to join our family vault on PreVault.`,
    '',
    `Sign in with Google using ${email} to join:`,
    inviteLink,
  ].join('\n');
}

export function MemberInviteSection({
  member,
  variant = 'full',
}: {
  member: FamilyMember;
  variant?: 'full' | 'actions';
}) {
  const user = useVaultStore((s) => s.user);
  const updateMember = useVaultStore((s) => s.updateMember);
  const ensureMemberInviteToken = useVaultStore((s) => s.ensureMemberInviteToken);

  const [emailDraft, setEmailDraft] = useState(member.email ?? '');
  const [emailError, setEmailError] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    setEmailDraft(member.email ?? '');
    setInviteLink('');
    setInviteError('');
  }, [member.id, member.email]);

  const supabaseEnabled = isSupabaseConfigured();
  const joined = memberHasJoined(member);
  const referralCode = user?.referralCode ?? '';
  const inviteToken = member.inviteToken ?? ensureMemberInviteToken(member.id);
  const memberEmail = member.email?.trim() ?? '';
  const firstName = member.displayName.split(' ')[0];

  if (member.role === 'owner' || joined || member.status === 'disabled') {
    if (variant === 'actions') return null;
    return (
      <section className="surface-panel space-y-4 p-4">
        <MemberSummary member={member} />
      </section>
    );
  }

  const saveEmail = () => {
    const next = emailDraft.trim();
    if (!next) {
      setEmailError('Enter their Gmail address.');
      return;
    }
    if (!isValidEmail(next)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    updateMember(member.id, { email: next });
    setEmailError('');
  };

  const ensureInviteLink = async (): Promise<string | null> => {
    if (inviteLink) return inviteLink;
    if (!user) return null;

    if (supabaseEnabled) {
      if (!memberEmail) return null;
      setInviteBusy(true);
      setInviteError('');
      const res = await createHouseholdInvite(memberEmail);
      setInviteBusy(false);
      if (!res.ok) {
        setInviteError(res.error);
        return null;
      }
      const base = new URL(authRedirectUrl()).origin;
      const link = `${base}/join?token=${encodeURIComponent(res.inviteToken)}&member=${encodeURIComponent(member.id)}`;
      setInviteLink(link);
      return link;
    }

    if (!referralCode) {
      setInviteError('Sign in to create an invite link.');
      return null;
    }
    const link = memberInviteUrl(referralCode, member.displayName);
    setInviteLink(link);
    return link;
  };

  const shareInvite = async (channel: 'whatsapp' | 'email' | 'copy') => {
    if (!user) return;
    const link = await ensureInviteLink();
    if (!link) return;

    if (supabaseEnabled && memberEmail) {
      const message = householdInviteMessage(user.name, memberEmail, link);
      if (channel === 'whatsapp') {
        window.open(whatsAppShareUrl(message), '_blank', 'noopener,noreferrer');
      } else if (channel === 'email') {
        window.location.href = mailtoShareUrl(
          `${user.name} invited you to PreVault`,
          `To: ${memberEmail}\n\n${message}`,
        );
      } else {
        void navigator.clipboard.writeText(message);
      }
      return;
    }

    if (!referralCode) return;
    const message = memberInviteMessage(user.name, member.displayName, referralCode);
    if (channel === 'whatsapp') {
      window.open(whatsAppShareUrl(message), '_blank', 'noopener,noreferrer');
    } else if (channel === 'email') {
      const to = memberEmail || '';
      window.location.href = mailtoShareUrl(
        `${user.name} invited you to PreVault`,
        to ? `To: ${to}\n\n${message}` : message,
      );
    } else {
      void navigator.clipboard.writeText(`${message}\n\n${link}`);
    }
  };

  const inviteActions = (
    <div className="space-y-2">
      <p className="section-label">Invite to PreVault</p>
      <p className="text-xs text-muted">
        Share a link so {firstName} can join your household vault
        {memberEmail ? ` (${memberEmail})` : ''}.
      </p>
      {inviteError ? <p className="text-xs text-danger whitespace-pre-line">{inviteError}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1 text-xs"
          disabled={inviteBusy || !memberEmail}
          onClick={() => void shareInvite('whatsapp')}
        >
          {inviteBusy ? 'Creating…' : 'Share on WhatsApp'}
        </Button>
        <Button
          variant="secondary"
          className="flex-1 text-xs"
          disabled={inviteBusy || !memberEmail}
          onClick={() => void shareInvite('email')}
        >
          Email
        </Button>
        <Button
          variant="secondary"
          className="flex-1 text-xs"
          disabled={inviteBusy || !memberEmail}
          onClick={() => void shareInvite('copy')}
        >
          Copy link
        </Button>
      </div>
      {inviteLink ? (
        <p className="break-all font-mono text-[0.65rem] text-muted">{inviteLink}</p>
      ) : null}
      {!supabaseEnabled && inviteToken ? (
        <p className="text-[0.65rem] text-muted">Invite ref: {inviteToken.slice(0, 8)}…</p>
      ) : null}
    </div>
  );

  const emailPrompt = (
    <div className="space-y-2">
      <p className="section-label">Invite to PreVault</p>
      <p className="text-xs text-muted">
        Add {firstName}&apos;s Gmail to send a household invite.
      </p>
      <Input
        label="Email"
        type="email"
        value={emailDraft}
        onChange={(e) => {
          setEmailDraft(e.target.value);
          setEmailError('');
        }}
        placeholder="family@gmail.com"
      />
      {emailError ? <p className="text-xs text-danger">{emailError}</p> : null}
      <Button className="w-full text-xs" onClick={saveEmail}>
        Save email
      </Button>
    </div>
  );

  if (variant === 'actions') {
    return (
      <section className="surface-panel p-4">
        {memberEmail ? inviteActions : emailPrompt}
      </section>
    );
  }

  return (
    <section className="surface-panel space-y-4 p-4">
      <MemberSummary member={member} />
      <div className="border-t border-border-soft pt-4">
        {memberEmail ? inviteActions : emailPrompt}
      </div>
    </section>
  );
}

function MemberSummary({ member }: { member: FamilyMember }) {
  return (
    <div className="flex items-center gap-4">
      <MemberAvatar member={member} size="md" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold tracking-tight">{member.displayName}</p>
        <p className="text-sm text-muted">{member.relationship}</p>
        <div className="mt-2">
          <MemberStatusLight member={member} detailed />
        </div>
      </div>
    </div>
  );
}
