import { useRef, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Input, RadioGroup, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { MemberAvatar } from '@/components/MemberAvatar';
import { UpgradeHint } from '@/components/UpgradeHint';
import { readFileDataUrl } from '@/lib/files';
import { getOwnerMember } from '@/lib/family';
import {
  eligibleParentMembers,
  genderForRelationship,
  childRelationshipForGender,
  isChildRelationship,
  MEMBER_RELATIONSHIPS,
} from '@/lib/memberRelations';
import { memberHasJoined } from '@/lib/memberActivity';
import { canAddMember, canEnableMember, remainingMemberSlots } from '@/lib/planLimits';
import { useVaultStore } from '@/store/useVaultStore';
import { MemberStatusLegend } from '@/components/MemberStatusLight';
import { FamilyStructureBoard } from '@/features/family/FamilyStructureBoard';
import type { FamilyMember, MemberGender } from '@/types';

function MemberEditModal({
  member,
  open,
  onClose,
}: {
  member: FamilyMember;
  open: boolean;
  onClose: () => void;
}) {
  const members = useVaultStore((s) => s.members);
  const updateMember = useVaultStore((s) => s.updateMember);
  const markMemberJoined = useVaultStore((s) => s.markMemberJoined);
  const [displayName, setDisplayName] = useState(member.displayName);
  const [relationship, setRelationship] = useState(member.relationship);
  const [phone, setPhone] = useState(member.phone ?? '');
  const [email, setEmail] = useState(member.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState(member.avatarUrl ?? '');
  const [gender, setGender] = useState<MemberGender | ''>(member.gender ?? '');
  const [parentMemberId, setParentMemberId] = useState(member.parentMemberId ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(member.dateOfBirth ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const parentOptions = useMemo(
    () => eligibleParentMembers(members, member.id),
    [members, member.id],
  );
  const isChild = isChildRelationship(relationship);

  useEffect(() => {
    if (!open) return;
    setDisplayName(member.displayName);
    setRelationship(member.relationship);
    setPhone(member.phone ?? '');
    setEmail(member.email ?? '');
    setAvatarUrl(member.avatarUrl ?? '');
    setGender(member.gender ?? '');
    setParentMemberId(member.parentMemberId ?? '');
    setDateOfBirth(member.dateOfBirth ?? '');
  }, [open, member]);

  const save = () => {
    updateMember(member.id, {
      displayName: displayName.trim() || member.displayName,
      relationship: relationship.trim() || member.relationship,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
      gender: gender || undefined,
      parentMemberId:
        member.role === 'owner' ? undefined : parentMemberId || undefined,
      dateOfBirth: isChild ? dateOfBirth.trim() || undefined : undefined,
    });
    onClose();
  };

  const previewMember: FamilyMember = {
    ...member,
    displayName: displayName.trim() || member.displayName,
    relationship,
    avatarUrl: avatarUrl || undefined,
    gender: gender || undefined,
    parentMemberId: member.role === 'owner' ? undefined : parentMemberId || undefined,
    dateOfBirth: isChild ? dateOfBirth.trim() || undefined : undefined,
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit member">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <MemberAvatar member={previewMember} size="lg" showGenderPrompt={false} />
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
        <Select
          label="Relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
        >
          {MEMBER_RELATIONSHIPS.map((rel) => (
            <option key={rel} value={rel}>
              {rel}
            </option>
          ))}
        </Select>
        {member.role !== 'owner' && (
          <Select
            label={isChild ? 'Parent / guardian' : 'Family link (parent)'}
            value={parentMemberId}
            onChange={(e) => setParentMemberId(e.target.value)}
          >
            <option value="">{isChild ? 'Select parent' : 'None (top level)'}</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </Select>
        )}
        {isChild && (
          <>
            <Input
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <p className="text-xs text-muted">
              Documents for members under 18 stay with their parent or guardian.
            </p>
          </>
        )}
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
        <Input
          label="Email (for app invite)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="family@gmail.com"
        />
        {!avatarUrl && (
          <RadioGroup
            label="Gender (for portrait icon)"
            name="edit-gender"
            value={gender || 'unset'}
            onChange={(v) => setGender(v === 'unset' ? '' : (v as MemberGender))}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'unset', label: 'Not set' },
            ]}
          />
        )}
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
  const navigate = useNavigate();
  const user = useVaultStore((s) => s.user);
  const members = useVaultStore((s) => s.members);
  const documents = useVaultStore((s) => s.documents);
  const addMember = useVaultStore((s) => s.addMember);
  const disableMember = useVaultStore((s) => s.disableMember);
  const enableMember = useVaultStore((s) => s.enableMember);
  const deleteMember = useVaultStore((s) => s.deleteMember);

  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyMember | null>(null);
  const [enableError, setEnableError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<string>('Spouse');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<MemberGender | ''>('');
  const [parentMemberId, setParentMemberId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [memberError, setMemberError] = useState('');

  const owner = useMemo(() => getOwnerMember(members), [members]);
  const parentOptions = useMemo(() => eligibleParentMembers(members), [members]);
  const isChild = isChildRelationship(relationship);

  const memberSlotsLeft = remainingMemberSlots(user, members);
  const canAdd = canAddMember(user, members);
  const canEnable = canEnableMember(user, members);

  const resetAddForm = () => {
    setName('');
    setRelationship('Spouse');
    setPhone('');
    setEmail('');
    setGender('');
    setParentMemberId(owner?.id ?? '');
    setDateOfBirth('');
    setMemberError('');
  };

  return (
    <div className="min-h-full pb-28">
      <Header title="Family" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-5">
        <p className="text-sm text-muted">
          Add members, set their relationship, and link children to a parent. Documents for members
          under 18 are managed by their parent or guardian. Add each child separately — a Son and a
          Daughter both appear as siblings under you in the tree.
        </p>

        <section>
          <p className="section-label mb-2">Family structure</p>
          <MemberStatusLegend className="mb-3" />
          <FamilyStructureBoard
            members={members}
            documents={documents}
            canEnable={canEnable}
            onEdit={setEditMember}
            onDisable={(member) => disableMember(member.id)}
            onEnable={(member) => {
              setEnableError('');
              const ok = enableMember(member.id);
              if (!ok) {
                setEnableError('Cannot enable — family member limit reached on your plan.');
              }
            }}
            onDelete={(member) => {
              setDeleteError('');
              setDeleteTarget(member);
            }}
          />
          {enableError && <p className="mt-2 text-sm text-danger">{enableError}</p>}
          {!canEnable && members.some((m) => m.status === 'disabled') && (
            <UpgradeHint message="Free plan includes you plus 2 active family members. Disable someone else or upgrade to re-enable." />
          )}
        </section>

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
            resetAddForm();
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
          <Select
            label="Relationship"
            value={relationship}
            onChange={(e) => {
              const next = e.target.value;
              setRelationship(next);
              const nextGender = genderForRelationship(next);
              if (nextGender) setGender(nextGender);
              if (isChildRelationship(next) && owner && !parentMemberId) {
                setParentMemberId(owner.id);
              }
            }}
          >
            {MEMBER_RELATIONSHIPS.map((rel) => (
              <option key={rel} value={rel}>
                {rel}
              </option>
            ))}
          </Select>
          <Select
            label={isChild ? 'Parent / guardian' : 'Family link (parent)'}
            value={parentMemberId}
            onChange={(e) => setParentMemberId(e.target.value)}
          >
            <option value="">{isChild ? 'Select parent' : 'None (top level)'}</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </Select>
          {isChild && (
            <Input
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          )}
          <Input label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
          <Input
            label="Email (for app invite)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="family@gmail.com"
          />
          <RadioGroup
            label="Gender (for portrait icon)"
            name="add-gender"
            value={gender || 'unset'}
            onChange={(v) => {
              const nextGender = v === 'unset' ? '' : (v as MemberGender);
              setGender(nextGender);
              if (isChildRelationship(relationship)) {
                const nextRel = childRelationshipForGender(nextGender);
                if (nextRel) setRelationship(nextRel);
              }
            }}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'unset', label: 'Ask me later' },
            ]}
          />
          {memberError && <p className="text-sm text-danger">{memberError}</p>}
          <Button
            className="w-full"
            onClick={() => {
              if (!name.trim()) return;
              if (isChild && !parentMemberId) {
                setMemberError('Select a parent or guardian for children under 18.');
                return;
              }
              const id = addMember({
                displayName: name.trim(),
                relationship,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                gender: gender || undefined,
                parentMemberId: parentMemberId || undefined,
                dateOfBirth: isChild ? dateOfBirth.trim() || undefined : undefined,
              });
              if (!id) {
                setMemberError('Family member limit reached on your plan.');
                return;
              }
              setAddOpen(false);
              resetAddForm();
              navigate(`/family/${id}`);
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete member?">
        {deleteTarget && (
          <>
            <p className="mb-4 text-sm text-muted">
              Remove <span className="font-medium text-text">{deleteTarget.displayName}</span> from
              your household? This only works before they join PreVault. Their documents move to their
              parent or you.
            </p>
            {deleteError && <p className="mb-3 text-sm text-danger">{deleteError}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  const ok = deleteMember(deleteTarget.id);
                  if (!ok) {
                    setDeleteError('Could not delete this member.');
                    return;
                  }
                  setDeleteTarget(null);
                  if (editMember?.id === deleteTarget.id) setEditMember(null);
                }}
              >
                Delete
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
