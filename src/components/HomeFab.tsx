import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Input, Select, Textarea } from '@/components/Input';
import { useVaultStore } from '@/store/useVaultStore';

type HomeContext = 'family' | 'assets' | 'health';
type FabTier = 'wide' | 'mediumWide' | 'medium' | 'narrow';

const tierStyles: Record<FabTier, { minWidth: string; icon: string; text: string }> = {
  wide: { minWidth: 'min-w-[15rem]', icon: 'h-10 w-10 text-lg', text: 'text-sm' },
  mediumWide: { minWidth: 'min-w-[13rem]', icon: 'h-9 w-9 text-base', text: 'text-sm' },
  medium: { minWidth: 'min-w-[11.5rem]', icon: 'h-9 w-9 text-base', text: 'text-sm' },
  narrow: { minWidth: 'min-w-[8rem]', icon: 'h-8 w-8 text-sm', text: 'text-sm' },
};

function FabAddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FabCloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FabOption({
  icon,
  label,
  tier,
  onClick,
}: {
  icon: string;
  label: string;
  tier: FabTier;
  onClick: () => void;
}) {
  const styles = tierStyles[tier];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`surface-panel-elevated flex items-center justify-center gap-2.5 rounded-full px-4 py-2 font-semibold transition-transform active:scale-95 ${styles.minWidth} ${styles.text}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-full bg-accent-soft ${styles.icon}`}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function QuickNoteModal({
  open,
  onClose,
  context,
  defaultMemberId,
}: {
  open: boolean;
  onClose: () => void;
  context: HomeContext;
  defaultMemberId?: string;
}) {
  const members = useVaultStore((s) => s.members);
  const addDocument = useVaultStore((s) => s.addDocument);
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [memberId, setMemberId] = useState(defaultMemberId ?? members[0]?.id ?? '');

  const [saveError, setSaveError] = useState('');

  const reset = () => {
    setTitle('');
    setNote('');
    setMemberId(defaultMemberId ?? members[0]?.id ?? '');
  };

  const save = () => {
    if (!note.trim()) return;
    setSaveError('');
    const id = addDocument({
      title: title.trim() || 'Note',
      docType: 'other',
      domain: 'family',
      category: 'other',
      memberId: context === 'family' ? memberId || undefined : undefined,
      fields: {},
      notes: note.trim(),
      verificationStatus: 'verified',
    });
    if (!id) {
      setSaveError('Could not save note — check plan or member document limits.');
      return;
    }
    reset();
    onClose();
    navigate(`/documents/${id}`);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add note"
    >
      <div className="space-y-4">
        <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        {context === 'family' && members.length > 0 && (
          <Select label="Family member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </Select>
        )}
        <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        <Button className="w-full" disabled={!note.trim()} onClick={save}>
          Save note
        </Button>
      </div>
    </Modal>
  );
}

export function HomeFab({ context, memberId }: { context: HomeContext; memberId?: string }) {
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    const onOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onOutside, true);
    document.addEventListener('touchstart', onOutside, true);
    return () => {
      document.removeEventListener('mousedown', onOutside, true);
      document.removeEventListener('touchstart', onOutside, true);
    };
  }, [open]);

  const memberQuery = context === 'family' && memberId ? `member=${memberId}` : '';
  const uploadBase =
    context === 'assets'
      ? '/upload?type=purchase'
      : context === 'health'
        ? '/upload?context=health'
        : memberQuery
          ? `/upload?${memberQuery}`
          : '/upload';
  const uploadPath = uploadBase;

  return (
    <>
      {open &&
        createPortal(
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-text/20 backdrop-blur-[2px]"
            aria-label="Close add menu"
            onClick={close}
          />,
          document.body,
        )}

      <div className="fab-anchor pointer-events-none fixed right-0 left-0 z-[60] mx-auto max-w-lg px-4">
        <div ref={menuRef} className="pointer-events-auto ml-auto flex w-fit flex-col items-end gap-2.5">
          {open && (
            <>
              <FabOption
                tier="wide"
                icon="📄"
                label="Upload document"
                onClick={() => {
                  close();
                  navigate(uploadPath);
                }}
              />
              <FabOption
                tier="mediumWide"
                icon="📦"
                label="Create Bundle"
                onClick={() => {
                  close();
                  navigate('/bundles/new');
                }}
              />
              <FabOption
                tier="medium"
                icon="📷"
                label="Scan with camera"
                onClick={() => {
                  close();
                  navigate(`${uploadPath}${uploadPath.includes('?') ? '&' : '?'}source=camera`);
                }}
              />
              <FabOption
                tier="narrow"
                icon="📝"
                label="Add note"
                onClick={() => {
                  close();
                  setNoteOpen(true);
                }}
              />
            </>
          )}

          <button
            type="button"
            aria-label={open ? 'Close add menu' : 'Add document'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-4 ring-accent-soft/50 transition-all duration-200 active:scale-95 ${open ? 'bg-text text-bg hover:opacity-90' : 'border border-accent-muted bg-accent text-accent-fg hover:bg-accent-hover'}`}
          >
            {open ? <FabCloseIcon /> : <FabAddIcon />}
          </button>
        </div>
      </div>

      <QuickNoteModal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        context={context}
        defaultMemberId={memberId}
      />
    </>
  );
}
