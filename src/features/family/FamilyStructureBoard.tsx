import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberStatusLight } from '@/components/MemberStatusLight';
import {
  buildFamilyTree,
  computeOwnerRelativeTiers,
  groupPartnerNodes,
  type FamilyTreeNode,
} from '@/lib/familyStructure';
import { memberHasJoined } from '@/lib/memberActivity';
import type { Document, FamilyMember } from '@/types';

type OwnerTierClass = 'ancestor-2' | 'ancestor-1' | 'owner' | 'descendant-1' | 'descendant-2';

function tierToClass(tier: number): OwnerTierClass {
  if (tier <= -2) return 'ancestor-2';
  if (tier === -1) return 'ancestor-1';
  if (tier === 0) return 'owner';
  if (tier === 1) return 'descendant-1';
  return 'descendant-2';
}

function generationCardClass(tier: number, disabled: boolean): string {
  const base = `family-gen-card family-gen-card--${tierToClass(tier)}`;
  return disabled ? `${base} opacity-55 saturate-50` : base;
}

function MemberManageCard({
  member,
  documents,
  tier,
  canEnable,
  onEdit,
  onInvite,
  onDisable,
  onEnable,
  onDelete,
}: {
  member: FamilyMember;
  documents: Document[];
  tier: number;
  canEnable: boolean;
  onEdit: (member: FamilyMember) => void;
  onInvite: (member: FamilyMember) => void;
  onDisable: (member: FamilyMember) => void;
  onEnable: (member: FamilyMember) => void;
  onDelete: (member: FamilyMember) => void;
}) {
  const joined = memberHasJoined(member);
  const isDisabled = member.status === 'disabled';
  const isOwner = member.role === 'owner';
  const showInvite = !isOwner && !joined && !isDisabled;
  const showDisable = !isOwner && joined && !isDisabled;
  const showDelete = !isOwner && !joined;
  const showEnable = !isOwner && isDisabled;

  return (
    <article
      className={`flex min-w-[8.5rem] max-w-[11rem] flex-col items-center gap-2 p-3 text-center ${generationCardClass(tier, isDisabled)}`}
    >
      <button
        type="button"
        className="flex w-full flex-col items-center gap-2 rounded-xl transition-colors active:opacity-80"
        onClick={() => onEdit(member)}
      >
        <MemberAvatar member={member} size="md" documents={documents} showGenderPrompt={false} />
        <p className="w-full truncate text-sm font-semibold text-text">{member.displayName}</p>
        <MemberStatusLight member={member} compact detailed />
        {(member.phone || member.email) && (
          <p className="line-clamp-2 w-full text-[0.65rem] leading-snug text-muted">
            {[member.phone, member.email].filter(Boolean).join(' · ')}
          </p>
        )}
      </button>

      {(showInvite || showDisable || showDelete || showEnable) && (
        <div className="flex w-full flex-wrap gap-1">
          {showInvite && (
            <Button
              variant="secondary"
              className="min-w-0 flex-1 px-2 text-[0.65rem]"
              onClick={(e) => {
                e.stopPropagation();
                onInvite(member);
              }}
            >
              Invite
            </Button>
          )}
          {showEnable && (
            <Button
              variant="secondary"
              className="min-w-0 flex-1 px-2 text-[0.65rem]"
              disabled={!canEnable}
              onClick={(e) => {
                e.stopPropagation();
                onEnable(member);
              }}
            >
              Enable
            </Button>
          )}
          {showDisable && (
            <Button
              variant="ghost"
              className="min-w-0 flex-1 px-2 text-[0.65rem] text-danger"
              onClick={(e) => {
                e.stopPropagation();
                onDisable(member);
              }}
            >
              Disable
            </Button>
          )}
          {showDelete && (
            <Button
              variant="ghost"
              className="min-w-0 flex-1 px-2 text-[0.65rem] text-danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(member);
              }}
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function TreeConnector({ tier }: { tier: number }) {
  return (
    <div className="flex justify-center" aria-hidden>
      <div className={`h-4 w-0.5 family-gen-connector--${tierToClass(tier)}`} />
    </div>
  );
}

type CardCallbacks = {
  canEnable: boolean;
  onEdit: (member: FamilyMember) => void;
  onInvite: (member: FamilyMember) => void;
  onDisable: (member: FamilyMember) => void;
  onEnable: (member: FamilyMember) => void;
  onDelete: (member: FamilyMember) => void;
};

function MemberRow({
  member,
  partner,
  documents,
  tiers,
  ...callbacks
}: {
  member: FamilyMember;
  partner?: FamilyMember;
  documents: Document[];
  tiers: Map<string, number>;
} & CardCallbacks) {
  const memberTier = tiers.get(member.id) ?? 0;
  const partnerTier = partner ? (tiers.get(partner.id) ?? 0) : undefined;

  if (!partner) {
    return (
      <MemberManageCard
        member={member}
        documents={documents}
        tier={memberTier}
        {...callbacks}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-center gap-3">
      <MemberManageCard
        member={member}
        documents={documents}
        tier={memberTier}
        {...callbacks}
      />
      <span className="hidden self-center text-lg text-muted sm:inline" aria-hidden>
        &
      </span>
      <MemberManageCard
        member={partner}
        documents={documents}
        tier={partnerTier ?? 0}
        {...callbacks}
      />
    </div>
  );
}

function PartnerGroup({
  nodes,
  documents,
  tiers,
  ...callbacks
}: {
  nodes: FamilyTreeNode[];
  documents: Document[];
  tiers: Map<string, number>;
} & CardCallbacks) {
  const mergedChildren = nodes.flatMap((node) => node.children);
  const rowTier = Math.min(...nodes.map((node) => tiers.get(node.member.id) ?? 0));

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-start justify-center gap-3">
        {nodes.map((node, idx) => (
          <div key={node.member.id} className="flex items-center gap-3">
            {idx > 0 && (
              <span className="hidden text-lg text-muted sm:inline" aria-hidden>
                &
              </span>
            )}
            <MemberManageCard
              member={node.member}
              documents={documents}
              tier={tiers.get(node.member.id) ?? 0}
              {...callbacks}
            />
          </div>
        ))}
      </div>
      {mergedChildren.length > 0 && (
        <>
          <TreeConnector tier={rowTier} />
          <TreeLevel nodes={mergedChildren} tiers={tiers} documents={documents} {...callbacks} />
        </>
      )}
    </div>
  );
}

function TreeBranch({
  node,
  documents,
  tiers,
  ...callbacks
}: {
  node: FamilyTreeNode;
  documents: Document[];
  tiers: Map<string, number>;
} & CardCallbacks) {
  const rowTier = tiers.get(node.member.id) ?? 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <MemberRow
        member={node.member}
        partner={node.partner}
        documents={documents}
        tiers={tiers}
        {...callbacks}
      />
      {node.children.length > 0 && (
        <>
          <TreeConnector tier={rowTier} />
          <TreeLevel nodes={node.children} tiers={tiers} documents={documents} {...callbacks} />
        </>
      )}
    </div>
  );
}

function TreeLevel({
  nodes,
  documents,
  tiers,
  ...callbacks
}: {
  nodes: FamilyTreeNode[];
  documents: Document[];
  tiers: Map<string, number>;
} & CardCallbacks) {
  const groups = groupPartnerNodes(nodes);

  return (
    <div className="flex flex-wrap items-start justify-center gap-6">
      {groups.map((group) =>
        group.length > 1 ? (
          <PartnerGroup
            key={group.map((n) => n.member.id).join('-')}
            nodes={group}
            tiers={tiers}
            documents={documents}
            {...callbacks}
          />
        ) : (
          <TreeBranch
            key={group[0]!.member.id}
            node={group[0]!}
            tiers={tiers}
            documents={documents}
            {...callbacks}
          />
        ),
      )}
    </div>
  );
}

export function FamilyStructureBoard({
  members,
  documents,
  canEnable,
  onEdit,
  onDisable,
  onEnable,
  onDelete,
}: {
  members: FamilyMember[];
  documents: Document[];
  canEnable: boolean;
  onEdit: (member: FamilyMember) => void;
  onDisable: (member: FamilyMember) => void;
  onEnable: (member: FamilyMember) => void;
  onDelete: (member: FamilyMember) => void;
}) {
  const navigate = useNavigate();
  const roots = useMemo(() => buildFamilyTree(members, { includeDisabled: true }), [members]);
  const tiers = useMemo(() => computeOwnerRelativeTiers(roots, members), [roots, members]);
  const onInvite = (member: FamilyMember) => navigate(`/family/${member.id}`);

  if (roots.length === 0) {
    return <p className="text-center text-sm text-muted">No family members yet.</p>;
  }

  const callbacks: CardCallbacks = {
    canEnable,
    onEdit,
    onInvite,
    onDisable,
    onEnable,
    onDelete,
  };

  return (
    <section>
      <TreeLevel nodes={roots} tiers={tiers} documents={documents} {...callbacks} />
    </section>
  );
}
