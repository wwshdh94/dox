import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { MemberInitialsBadges } from '@/components/MemberInitialsBadges';
import { Input, Select } from '@/components/Input';
import { useVaultStore } from '@/store/useVaultStore';
import { canCreateBundle } from '@/lib/planLimits';
import { UpgradeHint } from '@/components/UpgradeHint';
import { DOMAIN_LABELS, resolveDocTags } from '@/lib/docTags';
import { docOwnerInitials } from '@/lib/family';
import {
  MAX_BUNDLE_NAME_CHARS,
  MAX_BUNDLE_PURPOSE_CHARS,
  clampText,
} from '@/lib/inputLimits';

const PURPOSE_PRESETS = [
  'Insurance claim',
  'Hospital admission',
  'Passport application',
  'Address proof',
  'Identity proof',
  'Custom',
];

export function BundleCreatePage() {
  const documents = useVaultStore((s) => s.documents);
  const members = useVaultStore((s) => s.members);
  const assets = useVaultStore((s) => s.assets);
  const bundles = useVaultStore((s) => s.bundles);
  const user = useVaultStore((s) => s.user);
  const createBundle = useVaultStore((s) => s.createBundle);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [purposePreset, setPurposePreset] = useState(PURPOSE_PRESETS[0]!);
  const [customPurpose, setCustomPurpose] = useState('');
  const [memberId, setMemberId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState('');

  const canCreate = canCreateBundle(user, bundles.length);

  const purpose = purposePreset === 'Custom' ? clampText(customPurpose, MAX_BUNDLE_PURPOSE_CHARS) : purposePreset;
  const showAllDocs = !memberId;

  const filteredDocs = useMemo(() => {
    const visible = documents.filter((d) => !d.archivedAt);
    if (!memberId) return visible;
    return visible.filter((d) => !d.memberId || d.memberId === memberId);
  }, [documents, memberId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = () => {
    if (!name.trim() || selected.size === 0 || !purpose || !canCreate) return;
    setSaveError('');
    const id = createBundle({
      name: name.trim(),
      purpose,
      documentIds: [...selected],
      memberId: memberId || undefined,
    });
    if (!id) {
      setSaveError('Bundle limit reached on your plan.');
      return;
    }
    navigate(`/bundles/${id}`);
  };

  if (!canCreate) {
    return (
      <div className="min-h-full pb-28">
        <Header title="Create Bundle" backFallback="/bundles" />
        <main className="page-main space-y-4">
          <UpgradeHint message="Free plan includes 1 shared bundle." />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-full pb-28">
      <Header title="Create Bundle" backFallback="/bundles" />
      <main className="page-main animate-fade-up space-y-4">
        <p className="text-sm text-muted">
          Pick documents to group together. Save the bundle and share via a time-limited link with
          watermarks.
        </p>

        <Input
          label="Bundle name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, MAX_BUNDLE_NAME_CHARS))}
          maxLength={MAX_BUNDLE_NAME_CHARS}
          placeholder="e.g. Rahul — Hospital admission"
        />

        <Select label="Purpose" value={purposePreset} onChange={(e) => setPurposePreset(e.target.value)}>
          {PURPOSE_PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>

        {purposePreset === 'Custom' && (
          <Input
            label="Custom purpose"
            value={customPurpose}
            onChange={(e) => setCustomPurpose(e.target.value.slice(0, MAX_BUNDLE_PURPOSE_CHARS))}
            maxLength={MAX_BUNDLE_PURPOSE_CHARS}
          />
        )}

        {members.length > 0 && (
          <Select label="Filter by member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">All documents</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </Select>
        )}

        <section className="space-y-2">
          <p className="section-label">Documents ({selected.size} selected)</p>
          {filteredDocs.length === 0 && (
            <p className="text-sm text-muted">No documents available. Upload some first.</p>
          )}
          {filteredDocs.map((d) => {
            const tags = resolveDocTags(d);
            const checked = selected.has(d.id);
            return (
              <Card
                key={d.id}
                className={checked ? 'ring-2 ring-accent-muted' : ''}
                onClick={() => toggle(d.id)}
              >
                <div className="flex w-full items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="shrink-0 accent-accent-ink"
                    aria-label={`Include ${d.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{d.title}</p>
                    <p className="text-xs text-muted">
                      {DOMAIN_LABELS[tags.domain]} · {d.docType.replace(/_/g, ' ')}
                    </p>
                  </div>
                  {showAllDocs && (
                    <MemberInitialsBadges initials={docOwnerInitials(d, members, assets)} />
                  )}
                </div>
              </Card>
            );
          })}
        </section>

        <Button className="w-full" disabled={!name.trim() || selected.size === 0 || !purpose} onClick={save}>
          Save bundle
        </Button>
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
      </main>
      <BottomNav />
    </div>
  );
}
