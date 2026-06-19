import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ExpiryChip } from '@/components/ExpiryChip';
import { useVaultStore } from '@/store/useVaultStore';
import { maskValue } from '@/lib/format';
import { docsForMemberByDomain } from '@/lib/docTags';

export function MemberVaultPanel({
  memberId,
  showRelationship = true,
}: {
  memberId: string;
  showRelationship?: boolean;
}) {
  const members = useVaultStore((s) => s.members);
  const allDocuments = useVaultStore((s) => s.documents);
  const locked = useVaultStore((s) => s.locked);
  const lockPin = useVaultStore((s) => s.settings.lockPin);
  const logActivity = useVaultStore((s) => s.logActivity);
  const member = useMemo(() => members.find((m) => m.id === memberId), [members, memberId]);
  const familyDocs = useMemo(
    () => docsForMemberByDomain(allDocuments, memberId, 'family'),
    [allDocuments, memberId],
  );
  const healthCount = useMemo(
    () => docsForMemberByDomain(allDocuments, memberId, 'health').length,
    [allDocuments, memberId],
  );
  const [unlocked] = useState(() => !useVaultStore.getState().settings.lockPin);
  const navigate = useNavigate();

  if (!member) return null;

  const passport = familyDocs.find((d) => d.docType === 'passport');
  const pan = familyDocs.find((d) => d.docType === 'pan');

  const copyField = (field: string, value: string) => {
    if (lockPin && !unlocked) {
      navigate('/lock');
      return;
    }
    void navigator.clipboard.writeText(value);
    logActivity('copied_field', { field }, passport?.id);
  };

  return (
    <div className="space-y-4">
      {showRelationship && <p className="text-sm text-muted">{member.relationship}</p>}

      {(passport || pan) && (
        <section className="surface-panel space-y-2 p-4">
          <p className="section-label">Quick copy</p>
          {passport?.fields.passportNumber && (
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl bg-accent-soft/40 px-3 py-2.5 text-sm transition-colors hover:bg-accent-soft"
              onClick={() => copyField('passport', String(passport.fields.passportNumber))}
            >
              <span>Passport</span>
              <span className="font-mono">
                {unlocked && !locked
                  ? String(passport.fields.passportNumber)
                  : maskValue(String(passport.fields.passportNumber))}
              </span>
            </button>
          )}
          {pan?.fields.panNumber && (
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl bg-accent-soft/40 px-3 py-2.5 text-sm transition-colors hover:bg-accent-soft"
              onClick={() => copyField('pan', String(pan.fields.panNumber))}
            >
              <span>PAN</span>
              <span className="font-mono">
                {unlocked && !locked
                  ? String(pan.fields.panNumber)
                  : maskValue(String(pan.fields.panNumber))}
              </span>
            </button>
          )}
          {lockPin && !unlocked && (
            <Button variant="ghost" className="w-full text-xs" onClick={() => navigate('/lock')}>
              Unlock to copy
            </Button>
          )}
        </section>
      )}

      {healthCount > 0 && (
        <button
          type="button"
          onClick={() => navigate(`/health/${member.id}`)}
          className="w-full rounded-2xl border border-border-soft bg-accent-soft/30 px-4 py-3 text-left text-sm transition-colors hover:bg-accent-soft/50"
        >
          <span className="font-medium text-accent-ink">
            {healthCount} health record{healthCount === 1 ? '' : 's'}
          </span>
          <span className="mt-0.5 block text-xs text-muted">View in Health tab →</span>
        </button>
      )}

      <div className="space-y-2">
        <p className="section-label">Documents</p>
        {familyDocs.length === 0 && <p className="text-sm text-muted">No family documents yet.</p>}
        {familyDocs.map((d) => (
          <Card key={d.id} onClick={() => navigate(`/documents/${d.id}`)}>
            <div className="flex items-center justify-between">
              <span>{d.title}</span>
              <ExpiryChip date={d.expiryDate} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
