import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/format';
import {
  buildInboxNotifications,
  countUnreadInbox,
  dismissInboxNotification,
  handleInboxNotificationTap,
  inboxDismissLabel,
  type InboxNotification,
  type VaultInboxContext,
} from '@/lib/inboxNotifications';
import { useVaultStore } from '@/store/useVaultStore';

function BellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DismissIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function typeLabel(type: InboxNotification['type']): string {
  switch (type) {
    case 'mention':
      return 'Mention';
    case 'platform_update':
      return 'Update';
    case 'feedback_reply':
      return 'Feedback';
    case 'document_review':
      return 'Review';
    case 'expiring_soon':
      return 'Expiry';
    case 'health_insurance_expiring':
      return 'Health';
    default:
      return 'Alert';
  }
}

type PanelAnchor = {
  top: number;
  right: number;
  width: number;
  originX: number;
  originY: number;
};

function measurePanelFromBell(bell: DOMRect): PanelAnchor {
  const gap = 8;
  const margin = 16;
  const width = window.innerWidth - margin * 2;
  const right = margin;
  const top = bell.bottom + gap;
  const panelLeft = window.innerWidth - right - width;
  const bellCenterX = bell.left + bell.width / 2;
  const bellCenterY = bell.top + bell.height / 2;

  return {
    top,
    right,
    width,
    originX: bellCenterX - panelLeft,
    originY: bellCenterY - top,
  };
}

export function NotificationBell({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const documents = useVaultStore((s) => s.documents);
  const members = useVaultStore((s) => s.members);
  const shareGrants = useVaultStore((s) => s.shareGrants);
  const user = useVaultStore((s) => s.user);
  const familyHomeView = useVaultStore((s) => s.settings.familyHomeView ?? 'me');
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(0);
  const [panelAnchor, setPanelAnchor] = useState<PanelAnchor | null>(null);
  const [tick, setTick] = useState(0);
  void tick;

  const measureHeaderOffset = useCallback(() => {
    const header = document.querySelector('header');
    return header ? Math.ceil(header.getBoundingClientRect().height) : 0;
  }, []);

  const syncPanelAnchor = useCallback(() => {
    const bell = bellRef.current;
    if (!bell) return;
    setPanelAnchor(measurePanelFromBell(bell.getBoundingClientRect()));
  }, []);

  const vaultContext = useMemo<VaultInboxContext>(
    () => ({
      documents,
      members,
      user,
      shareGrants,
      familyHomeView,
    }),
    [documents, members, user, shareGrants, familyHomeView],
  );

  const unread = useMemo(() => countUnreadInbox(userId, vaultContext), [userId, vaultContext, tick]);
  const items = useMemo(
    () => buildInboxNotifications(userId, vaultContext),
    [userId, vaultContext, tick],
  );

  const refresh = () => setTick((t) => t + 1);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220);
  }, []);

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    setHeaderOffset(measureHeaderOffset());
    syncPanelAnchor();
    setOpen(true);
    setClosing(false);
  };

  useEffect(() => {
    if (!open) return;
    const sync = () => {
      setHeaderOffset(measureHeaderOffset());
      syncPanelAnchor();
    };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [open, measureHeaderOffset, syncPanelAnchor]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || closing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closing, close]);

  const onTap = (item: InboxNotification) => {
    handleInboxNotificationTap(item);
    close();
    refresh();
    if (item.type === 'platform_update') return;
    navigate(item.href);
  };

  const onDismiss = (item: InboxNotification) => {
    dismissInboxNotification(item);
    refresh();
  };

  const badge = unread > 9 ? '9+' : String(unread);
  const panelTop = panelAnchor?.top ?? headerOffset + 8;
  const panelMaxHeight = `calc(100dvh - ${panelTop + 16}px)`;

  const panel =
    open && panelAnchor && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close notifications"
              className={`notif-backdrop fixed inset-x-0 bottom-0 z-[25] ${
                closing ? 'animate-notif-scrim-out' : 'animate-notif-scrim-in'
              }`}
              style={{ top: headerOffset }}
              onClick={close}
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
              className={`notif-panel fixed z-[26] flex flex-col overflow-hidden ${
                closing ? 'animate-notif-from-bell-out' : 'animate-notif-from-bell-in'
              }`}
              style={{
                top: panelAnchor.top,
                right: panelAnchor.right,
                width: panelAnchor.width,
                maxHeight: panelMaxHeight,
                transformOrigin: `${panelAnchor.originX}px ${panelAnchor.originY}px`,
              }}
            >
                <div className="flex items-center justify-between bg-white px-4 py-3 dark:bg-[#1a2433]">
                  <p className="text-sm font-semibold tracking-tight text-text">Notifications</p>
                  <button
                    type="button"
                    aria-label="Close notifications"
                    onClick={close}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-bg-subtle hover:text-text"
                  >
                    <DismissIcon />
                  </button>
                </div>
                <div className="notif-panel-body min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
                  {items.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted">No notifications yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li key={item.id}>
                          <div
                            className={`notif-item flex items-stretch overflow-hidden text-sm ${
                              item.unread ? 'notif-item--unread' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onTap(item)}
                              className="min-w-0 flex-1 px-4 py-3 text-left transition-colors hover:bg-accent-soft/40"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-text">{item.title}</p>
                                <span className="shrink-0 text-[0.6rem] font-semibold uppercase text-muted">
                                  {typeLabel(item.type)}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-muted">{item.body}</p>
                              <p className="mt-1 text-[0.65rem] text-muted">{formatDate(item.at)}</p>
                            </button>
                            <button
                              type="button"
                              aria-label={inboxDismissLabel(item.type)}
                              onClick={() => onDismiss(item)}
                              className="flex shrink-0 items-start px-3 py-3 text-muted transition-colors hover:bg-black/5 hover:text-text dark:hover:bg-white/5"
                            >
                              <DismissIcon />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={bellRef}
        type="button"
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
        onClick={toggle}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-border-soft bg-surface-elevated text-accent-ink shadow-sm transition-transform active:scale-95 ${
          open ? 'ring-2 ring-accent/30' : ''
        }`}
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-danger px-1 text-[0.6rem] font-bold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </button>
      {panel}
    </>
  );
}
