import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DocumentFilePreview } from '@/components/DocumentFilePreview';
import { DocTagChips } from '@/components/DocTagChips';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Input, Select, Textarea } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { useVaultStore } from '@/store/useVaultStore';
import { expiryStatus, formatDate, isValidEmail } from '@/lib/format';
import { documentBackPath } from '@/lib/navigation';
import { countActiveTempLinks } from '@/lib/activityLog';
import {
  canCreateTempLink,
  tempLinkDurationHours,
} from '@/lib/planLimits';
import { fieldLabelFor } from '@/lib/docFields';
import { UpgradeHint } from '@/components/UpgradeHint';

function ShareWhatsAppIcon() {
  return (
    <svg className="h-8 w-8 shrink-0 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function ShareEmailIcon() {
  return (
    <svg className="h-8 w-8 shrink-0 text-[#2563EB]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="m4 8 8 5 8-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareLinkIcon() {
  return (
    <svg className="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareTimerIcon() {
  return (
    <svg className="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 9v4l2.5 2.5M9 3h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareNativeIcon() {
  return (
    <svg className="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v10M8 7l4-4 4 4M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ShareDuration = '15m' | '1h' | '24h' | 'permanent';

const shareTileClass =
  'flex aspect-[1.618/1] h-auto w-full flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3';

/** Full-width row; height matches one grid tile (2× tile aspect ratio). */
const shareNativeButtonClass =
  'flex aspect-[3.236/1] h-auto w-full flex-row items-center justify-center gap-2.5 rounded-2xl px-4 py-3';

const whatsAppAccentClass =
  'border-[#25D366] text-[#128C7E] ring-2 ring-[#25D366]/25 hover:border-[#25D366] hover:bg-[#25D366]/10';

const emailAccentClass =
  'border-[#2563EB] text-[#1D4ED8] ring-2 ring-[#2563EB]/25 hover:border-[#2563EB] hover:bg-[#2563EB]/10';

const shareFieldLabelClass =
  'pl-4 text-sm font-semibold tracking-wide text-white drop-shadow-sm';

const shareFieldWrapperClass = 'space-y-3';

function shareDurationToOpts(duration: ShareDuration): { hours?: number; permanent?: boolean; label: string } {
  switch (duration) {
    case '15m':
      return { hours: 0.25, label: '15 min' };
    case '1h':
      return { hours: 1, label: '1 hr' };
    case '24h':
      return { hours: 24, label: '24 hr' };
    case 'permanent':
      return { permanent: true, label: 'Permanent' };
  }
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const allDocuments = useVaultStore((s) => s.documents);
  const allTempLinks = useVaultStore((s) => s.tempLinks);
  const shareGrants = useVaultStore((s) => s.shareGrants);
  const user = useVaultStore((s) => s.user);
  const doc = useMemo(() => allDocuments.find((d) => d.id === id), [allDocuments, id]);
  const members = useVaultStore((s) => s.members);
  const updateDocument = useVaultStore((s) => s.updateDocument);
  const deleteDocument = useVaultStore((s) => s.deleteDocument);
  const archiveDocument = useVaultStore((s) => s.archiveDocument);
  const markRenewed = useVaultStore((s) => s.markRenewed);
  const createTempLink = useVaultStore((s) => s.createTempLink);
  const addShareGrant = useVaultStore((s) => s.addShareGrant);
  const revokeShare = useVaultStore((s) => s.revokeShare);
  const viewedRef = useRef<string | null>(null);
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [shareChoiceOpen, setShareChoiceOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareError, setShareError] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [waDuration, setWaDuration] = useState<ShareDuration>('1h');
  const [emailAddress, setEmailAddress] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailDuration, setEmailDuration] = useState<ShareDuration>('1h');
  const [urlDurationOpen, setUrlDurationOpen] = useState(false);
  const [urlDuration, setUrlDuration] = useState<ShareDuration>('1h');
  const navigate = useNavigate();

  const activeTempCount = countActiveTempLinks(allTempLinks);
  const shareHours = tempLinkDurationHours(user);
  const canShare = canCreateTempLink(user, activeTempCount);

  useEffect(() => {
    if (!id || viewedRef.current === id) return;
    viewedRef.current = id;
    useVaultStore.getState().logActivity('viewed', {}, id);
  }, [id]);

  useEffect(() => {
    if (doc) {
      const saved = doc.notes ?? '';
      setNotes(saved);
      setNotesOpen(Boolean(saved.trim()));
    }
  }, [doc?.id]);

  if (!doc) {
    return (
      <div className="min-h-full pb-28">
        <Header title="Document" backFallback="/" />
        <main className="page-main animate-fade-up">
          <p className="text-sm text-muted">Document not found</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  const backTo = documentBackPath(doc);
  const renewalEligible = expiryStatus(doc.expiryDate) === 'expiring' || expiryStatus(doc.expiryDate) === 'expired';
  const viewer = members.find((m) => m.role === 'viewer');
  const familyAccessEnabled = Boolean(viewer && shareGrants.some((g) => g.documentId === doc.id && g.memberId === viewer.id));

  const saveNotes = () => {
    const trimmed = notes.trim();
    if (trimmed !== (doc.notes ?? '')) {
      updateDocument(doc.id, { notes: trimmed || undefined });
    }
    if (!trimmed) setNotesOpen(false);
  };

  const openOneHourUrl = () => {
    setShareChoiceOpen(false);
    openTempUrl({ hours: 1, label: '1 hr' });
  };

  const openCustomUrl = () => {
    setShareChoiceOpen(false);
    setUrlDuration(shareHours >= 24 ? '24h' : '1h');
    setUrlDurationOpen(true);
  };

  const createShareUrl = (opts?: { hours?: number; permanent?: boolean }): string | null => {
    setShareError('');
    const link = createTempLink(doc.id, opts);
    if (!link) {
      setShareError('Temp share limit reached on your plan.');
      return null;
    }
    return `${window.location.origin}/v/${link.token}`;
  };

  const openTempUrl = (opts?: { hours?: number; permanent?: boolean; label?: string }) => {
    const url = createShareUrl(opts);
    if (!url) return;
    setQrUrl(url);
    setShareOpen(true);
  };

  const shareViaWhatsApp = (phone?: string) => {
    const { hours, permanent, label } = shareDurationToOpts(waDuration);
    const url = createShareUrl({ hours, permanent });
    if (!url) return;
    const text = `PreVault secure link (${label}): ${url}`;
    const target = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(target, '_blank', 'noopener,noreferrer');
    setWhatsAppOpen(false);
  };

  const openWhatsApp = () => {
    setShareError('');
    setWaNumber('');
    setWaDuration('1h');
    setWhatsAppOpen(true);
  };

  const shareViaEmail = (recipient?: string) => {
    if (recipient && !isValidEmail(recipient)) {
      setShareError('Enter a valid email address.');
      return;
    }
    const { hours, permanent, label } = shareDurationToOpts(emailDuration);
    const url = createShareUrl({ hours, permanent });
    if (!url) return;
    const subject = `PreVault secure link: ${doc.title}`;
    const body = `Here is a secure PreVault link (${label}):\n\n${url}\n`;
    const mailto = recipient
      ? `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setEmailOpen(false);
  };

  const openEmail = () => {
    setShareError('');
    setEmailAddress('');
    setEmailTouched(false);
    setEmailDuration('1h');
    setEmailOpen(true);
  };

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const shareViaNative = async () => {
    const url = createShareUrl({ hours: 1 });
    if (!url) return;

    if (canNativeShare) {
      try {
        await navigator.share({
          title: `PreVault: ${doc.title}`,
          text: `Secure document link (1 hr): ${doc.title}`,
          url,
        });
        setShareChoiceOpen(false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setShareError('Could not open the share sheet.');
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareChoiceOpen(false);
    } catch {
      openTempUrl({ hours: 1, label: '1 hr' });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col pb-28">
      <Header title={doc.title} backFallback={backTo} />
      <main className="page-main w-full flex min-h-0 flex-1 flex-col space-y-4 animate-fade-up">
        <DocumentFilePreview fileName={doc.fileName} fileDataUrl={doc.fileDataUrl} />

        <DocTagChips doc={doc} />

        {doc.verificationStatus === 'pending' && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
            <p className="font-medium">Awaiting verification</p>
            <p className="mt-1 text-xs text-muted">
              Confirm extracted fields to add this document to your vault.
            </p>
            <Link
              to={`/upload?verify=${doc.id}`}
              className="mt-2 inline-block text-xs font-medium text-accent-ink"
            >
              Complete verification →
            </Link>
          </div>
        )}

        <div className="surface-panel space-y-1 p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-accent-ink">Encrypted</p>
          {doc.expiryDate && (
            <p className="mt-2">Expires {formatDate(doc.expiryDate)}</p>
          )}
          {Object.entries(doc.fields).map(([k, v]) => (
            v !== '' && v != null && (
              <p key={k} className="mt-1">
                <span className="text-muted">{fieldLabelFor(doc.docType, k)}: </span>{String(v)}
              </p>
            )
          ))}
        </div>

        {notesOpen ? (
          <Textarea
            label="Notes"
            value={notes}
            autoFocus={!notes.trim()}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />
        ) : (
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="w-full rounded-2xl border border-dashed border-border-soft bg-surface px-4 py-3.5 text-left text-sm text-muted transition-colors hover:border-border hover:bg-surface-elevated active:scale-[0.99]"
          >
            Tap to add notes
          </button>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setShareChoiceOpen(true)}
            disabled={!canShare}
          >
            Share
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/upload?edit=${doc.id}`)}>
            Edit
          </Button>
          {renewalEligible && (
            <Button variant="secondary" onClick={() => markRenewed(doc.id)}>
              Mark renewed
            </Button>
          )}
          <div
            className={`flex min-h-11 min-w-[10.5rem] flex-1 items-center justify-between gap-2 rounded-2xl border border-border bg-surface-elevated px-4 py-2.5 shadow-sm sm:flex-none ${
              viewer ? '' : 'opacity-60'
            }`}
            title={
              viewer
                ? familyAccessEnabled
                  ? `${viewer.displayName} can view in Family tab`
                  : `Share with ${viewer.displayName} in Family tab`
                : 'Add a family viewer in Profile → Family members'
            }
          >
            <span className="text-sm font-semibold tracking-tight text-text">Family access</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  familyAccessEnabled ? 'text-success' : 'text-muted'
                }`}
              >
                {familyAccessEnabled ? 'On' : 'Off'}
              </span>
              <button
                type="button"
                disabled={!viewer}
                onClick={() => {
                  if (!viewer) return;
                  if (familyAccessEnabled) revokeShare(doc.id, viewer.id);
                  else addShareGrant(doc.id, viewer.id);
                }}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-200 ${
                  familyAccessEnabled
                    ? 'bg-success shadow-sm ring-2 ring-success/35'
                    : 'bg-border'
                } ${!viewer ? 'cursor-not-allowed' : ''}`}
                aria-pressed={familyAccessEnabled}
                aria-label="Toggle family access"
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full shadow-md transition-all duration-200 ${
                    familyAccessEnabled ? 'left-[1.375rem] bg-white' : 'left-0.5 bg-surface-elevated'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {shareError && <p className="text-sm text-danger">{shareError}</p>}
        {!canShare && (
          <UpgradeHint message="Free plan allows 2 active temp links. Pro extends link duration to 24 hours." />
        )}

        <div className="min-h-4 flex-1" aria-hidden="true" />

        <Link
          to="/profile/activity"
          className="block text-center text-xs font-medium text-accent-ink"
        >
          Manage active links & activity →
        </Link>

        <div className="flex gap-2">
          <Button variant="secondary" className="w-full" onClick={() => setArchiveOpen(true)}>
            Archive
          </Button>
          <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </main>

      <Modal open={archiveOpen} onClose={() => setArchiveOpen(false)} title="Archive document?">
        <p className="mb-4 text-sm text-muted">
          This will hide the document from Family/Health/Assets. You can restore it later from Profile → Archived.
        </p>
        <Button
          className="w-full"
          onClick={() => {
            archiveDocument(doc.id);
            navigate(backTo);
          }}
        >
          Archive
        </Button>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Permanently delete this document?">
        <p className="mb-4 text-sm text-muted">
          This cannot be undone. The file, extracted fields, notes, family access, and all share links will be removed.
        </p>
        <Button
          variant="danger"
          className="w-full"
          onClick={() => {
            deleteDocument(doc.id);
            navigate(backTo);
          }}
        >
          Delete permanently
        </Button>
      </Modal>

      <Modal open={shareChoiceOpen} onClose={() => setShareChoiceOpen(false)} transparent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              className={`${shareTileClass} ${whatsAppAccentClass}`}
              onClick={() => {
                setShareChoiceOpen(false);
                openWhatsApp();
              }}
            >
              <ShareWhatsAppIcon />
              <span className="text-sm font-semibold">WhatsApp</span>
            </Button>
            <Button
              variant="secondary"
              className={`${shareTileClass} ${emailAccentClass}`}
              onClick={() => {
                setShareChoiceOpen(false);
                openEmail();
              }}
            >
              <ShareEmailIcon />
              <span className="text-sm font-semibold">Email</span>
            </Button>
            <Button variant="secondary" className={shareTileClass} onClick={openOneHourUrl}>
              <ShareLinkIcon />
              <span className="text-center text-sm font-semibold leading-snug">
                Temp URL
                <br />
                1 hour
              </span>
            </Button>
            <Button variant="secondary" className={shareTileClass} onClick={openCustomUrl}>
              <ShareTimerIcon />
              <span className="text-center text-sm font-semibold leading-snug">
                Temp URL
                <br />
                Custom time
              </span>
            </Button>
          </div>
          <Button
            variant="secondary"
            className={shareNativeButtonClass}
            onClick={() => void shareViaNative()}
            disabled={!canShare}
          >
            <ShareNativeIcon />
            <span className="text-lg font-semibold leading-none tracking-tight">Share with other apps</span>
          </Button>
          {!canShare && (
            <UpgradeHint message="Free plan allows 2 active temp links. Pro extends link duration to 24 hours." />
          )}
          {shareError && <p className="text-sm text-danger">{shareError}</p>}
        </div>
      </Modal>

      <Modal open={urlDurationOpen} onClose={() => setUrlDurationOpen(false)} transparent>
        <div className="space-y-4">
          <Select
            label="Link validity"
            labelClassName={shareFieldLabelClass}
            wrapperClassName={shareFieldWrapperClass}
            value={urlDuration}
            onChange={(e) => setUrlDuration(e.target.value as ShareDuration)}
          >
            <option value="15m" disabled={shareHours < 0.25}>15 minutes</option>
            <option value="1h" disabled={shareHours < 1}>1 hour</option>
            <option value="24h" disabled={shareHours < 24}>24 hours</option>
            <option value="permanent" disabled={!(user?.plan === 'pro' || user?.plan === 'family')}>
              Permanent (until revoked)
            </option>
          </Select>
          <Button
            className="w-full"
            onClick={() => {
              const { hours, permanent, label } = shareDurationToOpts(urlDuration);
              setUrlDurationOpen(false);
              openTempUrl({ hours, permanent, label });
            }}
          >
            Create link
          </Button>
          {shareError && <p className="text-sm text-danger">{shareError}</p>}
        </div>
      </Modal>

      <Modal open={whatsAppOpen} onClose={() => setWhatsAppOpen(false)} transparent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 items-end">
            <Select
              label="Link validity"
              labelClassName={shareFieldLabelClass}
            wrapperClassName={shareFieldWrapperClass}
              value={waDuration}
              onChange={(e) => setWaDuration(e.target.value as ShareDuration)}
            >
              <option value="15m" disabled={shareHours < 0.25}>15 minutes</option>
              <option value="1h" disabled={shareHours < 1}>1 hour</option>
              <option value="24h" disabled={shareHours < 24}>24 hours</option>
              <option value="permanent" disabled={!(user?.plan === 'pro' || user?.plan === 'family')}>
                Permanent (until revoked)
              </option>
            </Select>

            <Button
              variant="secondary"
              className={`w-full ${whatsAppAccentClass}`}
              onClick={() => shareViaWhatsApp()}
            >
              Select on Whatsapp
            </Button>
          </div>

          <Input
            label="New WhatsApp number"
            labelClassName={shareFieldLabelClass}
            wrapperClassName={shareFieldWrapperClass}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            pattern="[0-9]*"
            placeholder="e.g. 919876543210"
            value={waNumber}
            onChange={(e) => setWaNumber(e.target.value.replace(/[^\d]/g, ''))}
          />

          <Button
            variant="secondary"
            className={`w-full ${whatsAppAccentClass}`}
            onClick={() => shareViaWhatsApp(waNumber)}
            disabled={waNumber.length < 10}
          >
            Send to Number on Whatsapp
          </Button>

          {shareError && <p className="text-sm text-danger">{shareError}</p>}
          {!canShare && (
            <UpgradeHint message="Free plan allows 2 active temp links. Pro extends link duration to 24 hours." />
          )}
        </div>
      </Modal>

      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} transparent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 items-end">
            <Select
              label="Link validity"
              labelClassName={shareFieldLabelClass}
            wrapperClassName={shareFieldWrapperClass}
              value={emailDuration}
              onChange={(e) => setEmailDuration(e.target.value as ShareDuration)}
            >
              <option value="15m" disabled={shareHours < 0.25}>15 minutes</option>
              <option value="1h" disabled={shareHours < 1}>1 hour</option>
              <option value="24h" disabled={shareHours < 24}>24 hours</option>
              <option value="permanent" disabled={!(user?.plan === 'pro' || user?.plan === 'family')}>
                Permanent (until revoked)
              </option>
            </Select>

            <Button
              variant="secondary"
              className={`w-full ${emailAccentClass}`}
              onClick={() => shareViaEmail()}
            >
              Select on Email
            </Button>
          </div>

          <Input
            label="New email address"
            labelClassName={shareFieldLabelClass}
            wrapperClassName={shareFieldWrapperClass}
            type="text"
            inputMode="text"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g. name@example.com"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value.trim())}
            onBlur={() => setEmailTouched(true)}
          />
          {emailTouched && emailAddress && !isValidEmail(emailAddress) && (
            <p className="text-xs text-danger">Enter a valid email address (e.g. name@example.com).</p>
          )}

          <Button
            variant="secondary"
            className={`w-full ${emailAccentClass}`}
            onClick={() => shareViaEmail(emailAddress)}
            disabled={!isValidEmail(emailAddress)}
          >
            Add new email address to share
          </Button>

          {shareError && <p className="text-sm text-danger">{shareError}</p>}
          {!canShare && (
            <UpgradeHint message="Free plan allows 2 active temp links. Pro extends link duration to 24 hours." />
          )}
        </div>
      </Modal>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} transparent>
        <p className="break-all rounded-xl bg-bg p-2 text-xs">{qrUrl}</p>
        <Button className="mt-3 w-full" onClick={() => void navigator.clipboard.writeText(qrUrl)}>
          Copy link
        </Button>
      </Modal>
      <BottomNav />
    </div>
  );
}
