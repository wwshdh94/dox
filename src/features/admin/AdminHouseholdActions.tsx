import { useState } from 'react';
import { Button } from '@/components/Button';
import { getAdminSession } from '@/lib/adminAuth';
import {
  adminEmailHousehold,
  adminPushHousehold,
  adminSendPlatformUpdate,
  adminSetHouseholdPlan,
} from '@/lib/adminActions';
import type { PlatformHousehold } from '@/lib/adminPlatformRegistry';
import {
  adminBlockUser,
  adminGrantDiscount,
  adminUnblockUser,
  isHouseholdBlocked,
} from '@/features/admin/adminModerationOps';
import type { User } from '@/types';

function DiscountModal({
  household,
  onClose,
  onSubmit,
}: {
  household: PlatformHousehold;
  onClose: () => void;
  onSubmit: (input: {
    percentOff: number;
    code: string;
    label: string;
    expiresAt?: string;
  }) => void | Promise<void>;
}) {
  const [percentOff, setPercentOff] = useState('50');
  const [code, setCode] = useState(`SAVE50`);
  const [label, setLabel] = useState('Launch discount');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const pct = Number(percentOff);
    if (!Number.isFinite(pct) || pct < 1) return;
    setBusy(true);
    try {
      await onSubmit({
        percentOff: pct,
        code,
        label,
        expiresAt: expiresAt || undefined,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-4 shadow-lg">
        <p className="text-sm font-semibold text-text">Grant discount — {household.name}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-muted">
            % off
            <input
              type="number"
              min={1}
              max={100}
              value={percentOff}
              onChange={(e) => setPercentOff(e.target.value)}
              className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-muted">
            Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm uppercase"
            />
          </label>
          <label className="block text-xs font-medium text-muted sm:col-span-2">
            Label (shown to user)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-muted sm:col-span-2">
            Expires (optional)
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="!min-h-9 px-3 py-2 text-xs" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="!min-h-9 px-3 py-2 text-xs" onClick={handleSubmit} disabled={busy}>
            Grant
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionModal({
  title,
  initialTitle,
  initialBody,
  requireBody,
  onClose,
  onSubmit,
}: {
  title: string;
  initialTitle?: string;
  initialBody?: string;
  requireBody?: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; body: string }) => void | Promise<void>;
}) {
  const [composeTitle, setComposeTitle] = useState(initialTitle ?? '');
  const [composeBody, setComposeBody] = useState(initialBody ?? '');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (requireBody && !composeBody.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ title: composeTitle, body: composeBody });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-4 shadow-lg"
        role="dialog"
        aria-labelledby="admin-action-title"
      >
        <p id="admin-action-title" className="text-sm font-semibold text-text">
          {title}
        </p>
        <div className="mt-3 space-y-3">
          <label className="block text-xs font-medium text-muted">
            Title
            <input
              value={composeTitle}
              onChange={(e) => setComposeTitle(e.target.value)}
              className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>
          <label className="block text-xs font-medium text-muted">
            Message
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="!min-h-9 px-3 py-2 text-xs" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="!min-h-9 px-3 py-2 text-xs" onClick={handleSubmit} disabled={busy}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminHouseholdActions({
  household,
  currentUserId,
  onPlanChange,
  onActionComplete,
}: {
  household: PlatformHousehold;
  currentUserId?: string | null;
  onPlanChange: (plan: User['plan']) => void;
  onActionComplete: () => void;
}) {
  const [modal, setModal] = useState<'push' | 'update' | 'email' | 'discount' | null>(null);
  const blocked = isHouseholdBlocked(household);
  const adminEmail = getAdminSession()?.email ?? 'admin';

  const finish = () => onActionComplete();

  return (
    <>
      <div className="flex flex-wrap gap-1">
        <Button
          variant="ghost"
          className="!min-h-8 px-2 py-1 text-[0.65rem]"
          title="Email user"
          onClick={() => setModal('email')}
        >
          Email
        </Button>
        <Button
          variant="ghost"
          className="!min-h-8 px-2 py-1 text-[0.65rem]"
          title="Send push notification"
          onClick={() => setModal('push')}
        >
          Push
        </Button>
        <Button
          variant="ghost"
          className="!min-h-8 px-2 py-1 text-[0.65rem]"
          title="Send in-app update"
          onClick={() => setModal('update')}
        >
          Update
        </Button>
        {household.plan !== 'pro' && (
          <Button
            variant="secondary"
            className="!min-h-8 px-2 py-1 text-[0.65rem]"
            title="Enable Pro"
            onClick={() => {
              adminSetHouseholdPlan(household, 'pro', (plan) => {
                if (currentUserId === household.userId) onPlanChange(plan);
              });
              finish();
            }}
          >
            Pro
          </Button>
        )}
        {household.plan !== 'family' && (
          <Button
            variant="secondary"
            className="!min-h-8 px-2 py-1 text-[0.65rem]"
            title="Enable Family plan"
            onClick={() => {
              adminSetHouseholdPlan(household, 'family', (plan) => {
                if (currentUserId === household.userId) onPlanChange(plan);
              });
              finish();
            }}
          >
            Family
          </Button>
        )}
        {household.plan !== 'free' && (
          <Button
            variant="ghost"
            className="!min-h-8 px-2 py-1 text-[0.65rem] text-muted"
            title="Set Free plan"
            onClick={() => {
              if (!window.confirm(`Set ${household.name} to Free?`)) return;
              adminSetHouseholdPlan(household, 'free', (plan) => {
                if (currentUserId === household.userId) onPlanChange(plan);
              });
              finish();
            }}
          >
            Free
          </Button>
        )}
        <Button
          variant="ghost"
          className="!min-h-8 px-2 py-1 text-[0.65rem]"
          title="Grant Pro discount"
          onClick={() => setModal('discount')}
        >
          Discount
        </Button>
        {blocked ? (
          <Button
            variant="secondary"
            className="!min-h-8 px-2 py-1 text-[0.65rem]"
            title="Unblock user"
            onClick={() => {
              adminUnblockUser(household);
              finish();
            }}
          >
            Unblock
          </Button>
        ) : (
          <Button
            variant="danger"
            className="!min-h-8 px-2 py-1 text-[0.65rem]"
            title="Block user"
            onClick={() => {
              const reason = window.prompt('Block reason (shown to user):', 'Policy violation');
              if (reason === null) return;
              void adminBlockUser(household, reason, adminEmail).then((ok) => {
                if (!ok) window.alert('Cannot block the admin owner account.');
                else finish();
              });
            }}
          >
            Block
          </Button>
        )}
      </div>

      {modal === 'email' && (
        <ActionModal
          title={`Email ${household.name}`}
          initialTitle="PreVault support"
          initialBody={`Hi ${household.name},\n\n\n— PreVault team`}
          onClose={() => setModal(null)}
          onSubmit={(payload) => {
            adminEmailHousehold(household, payload);
            finish();
          }}
        />
      )}

      {modal === 'push' && (
        <ActionModal
          title={`Push to ${household.name}`}
          initialTitle="PreVault"
          requireBody
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            await adminPushHousehold(household, payload, currentUserId);
            finish();
          }}
        />
      )}

      {modal === 'update' && (
        <ActionModal
          title={`In-app update for ${household.name}`}
          initialTitle="What's new"
          requireBody
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            await adminSendPlatformUpdate(household, payload);
            finish();
          }}
        />
      )}

      {modal === 'discount' && (
        <DiscountModal
          household={household}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            await adminGrantDiscount(household, input);
            finish();
          }}
        />
      )}
    </>
  );
}
