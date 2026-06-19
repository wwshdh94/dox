import { useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { UpgradeHint } from '@/components/UpgradeHint';
import { memberAvatarGradient } from '@/lib/avatar';
import { readFileDataUrl } from '@/lib/files';
import { memberHasJoined, memberLastActiveLabel, memberStatusLabel } from '@/lib/memberActivity';
import { canAddMember, canEnableMember, remainingMemberSlots } from '@/lib/planLimits';
import { useVaultStore } from '@/store/useVaultStore';
import type { FamilyMember } from '@/types';

function MemberEditModal({
  member,
  open,
  onClose,
}: {
  member: FamilyMember;
  open: boolean;
  onClose: () => void;
}) {
  const updateMember = useVaultStore((s) => s.updateMember);
  const markMemberJoined = useVaultStore((s) => s.markMemberJoined);
  const [displayName, setDisplayName] = useState(member.displayName);
  const [phone, setPhone] = useState(member.phone ?? '');
  const [email, setEmail] = useState(member.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState(member.avatarUrl ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const save = () => {
    updateMember(member.id, {
      displayName: displayName.trim() || member.displayName,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit member">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${memberAvatarGradient(displayName)} text-2xl font-semibold text-white`}
            >
              {displayName.charAt(0) || '?'}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setAvatarUrl(await readFileDataUrl(file));
            }}
          />
          <Button variant="secondary" className="text-xs" onClick={() => fileRef.current?.click()}>
            {avatarUrl ? 'Change photo' : 'Add photo'}
          </Button>
        </div>
        <Input label="Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {!memberHasJoined(member) && member.role !== 'owner' && (
          <Button variant="secondary" className="w-full text-xs" onClick={() => markMemberJoined(member.id)}>
            Mark as joined (demo)
          </Button>
        )}
        <Button className="w-full" onClick={save}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

export function FamilyManagementPage() {
  const user = useVaultStore((s) => s.user);
  const members = useVaultStore((s) => s.members);
  const addMember = useVaultStore((s) => s.addMember);
  const disableMember = useVaultStore((s) => s.disableMember);
  const enableMember = useVaultStore((s) => s.enableMember);

  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);
  const [enableError, setEnableError] = useState('');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Spouse');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [memberError, setMemberError] = useState('');

  const activeMembers = members.filter((m) => m.status !== 'disabled');
  const disabledMembers = members.filter((m) => m.status === 'disabled');
  const memberSlotsLeft = remainingMemberSlots(user, members);
  const canAdd = canAddMember(user, members);
  const canEnable = canEnableMember(user, members);

  return (
    <div className="min-h-full pb-28">
      <Header title="Family" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-5">
        <p className="text-sm text-muted">
          Add members, edit contact details, and manage access. Document vaults stay on each member&apos;s
          page from Home.
        </p>

        <section className="space-y-2">
          <p className="section-label">Members</p>
          {activeMembers.map((member) => (
            <div key={member.id} className="surface-panel flex items-center gap-3 p-4">
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt="" className="h-12 w-12 rounded-2xl object-cover" />
              ) : (
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${memberAvatarGradient(member.displayName)} text-lg font-semibold text-white`}
                >
                  {member.displayName.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{member.displayName}</p>
                <p className="text-xs text-muted">{member.relationship}</p>
                <p className="mt-1 text-xs text-muted">
                  {memberStatusLabel(member)}
                  {memberHasJoined(member) && ` · ${memberLastActiveLabel(member)}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button variant="ghost" className="text-xs" onClick={() => setEditMember(member)}>
                  Edit
                </Button>
                {member.role !== 'owner' && (
                  <Button
                    variant="ghost"
                    className="text-xs text-danger"
                    onClick={() => disableMember(member.id)}
                  >
                    Disable
                  </Button>
                )}
              </div>
            </div>
          ))}
        </section>

        {disabledMembers.length > 0 && (
          <section className="space-y-2">
            <p className="section-label">Disabled</p>
            {enableError && <p className="text-sm text-danger">{enableError}</p>}
            {disabledMembers.map((member) => (
              <div key={member.id} className="surface-panel flex items-center gap-3 p-4 opacity-80">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{member.displayName}</p>
                  <p className="text-xs text-muted">{member.relationship} · Disabled</p>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0 text-xs"
                  disabled={!canEnable}
                  onClick={() => {
                    setEnableError('');
                    const ok = enableMember(member.id);
                    if (!ok) {
                      setEnableError('Cannot enable — family member limit reached on your plan.');
                    }
                  }}
                >
                  Enable
                </Button>
              </div>
            ))}
            {!canEnable && disabledMembers.length > 0 && (
              <UpgradeHint message="Free plan includes you plus 2 active family members. Disable someone else or upgrade to re-enable." />
            )}
          </section>
        )}

        {memberSlotsLeft !== null && memberSlotsLeft > 0 && (
          <p className="text-xs text-muted">
            {memberSlotsLeft} family slot{memberSlotsLeft === 1 ? '' : 's'} left on your plan
          </p>
        )}

        <Button
          variant="secondary"
          className="w-full"
          disabled={!canAdd}
          onClick={() => {
            setMemberError('');
            setAddOpen(true);
          }}
        >
          + Add family member
        </Button>
        {!canAdd && <UpgradeHint message="Free plan includes you plus 2 family members." />}

      </main>
      <BottomNav />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add family member">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
          <Input label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
          <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {memberError && <p className="text-sm text-danger">{memberError}</p>}
          <Button
            className="w-full"
            onClick={() => {
              if (!name.trim()) return;
              const id = addMember({
                displayName: name.trim(),
                relationship,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
              });
              if (!id) {
                setMemberError('Family member limit reached on your plan.');
                return;
              }
              setAddOpen(false);
              setName('');
              setPhone('');
              setEmail('');
            }}
          >
            Add
          </Button>
        </div>
      </Modal>

      {editMember && (
        <MemberEditModal
          member={editMember}
          open={Boolean(editMember)}
          onClose={() => setEditMember(null)}
        />
      )}
    </div>
  );
}
