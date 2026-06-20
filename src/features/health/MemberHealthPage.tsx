import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ExpiryChip } from '@/components/ExpiryChip';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { useVaultStore } from '@/store/useVaultStore';
import { HEALTH_CATEGORY_LABELS } from '@/lib/health';
import { docsForMemberByDomain } from '@/lib/docTags';
import type { HealthSummary } from '@/types';

export function MemberHealthPage() {
  const { id } = useParams<{ id: string }>();
  const members = useVaultStore((s) => s.members);
  const allDocuments = useVaultStore((s) => s.documents);
  const updateMember = useVaultStore((s) => s.updateMember);
  const member = useMemo(() => members.find((m) => m.id === id), [members, id]);
  const healthDocs = useMemo(
    () => (id ? docsForMemberByDomain(allDocuments, id, 'health') : []),
    [allDocuments, id],
  );
  const [editOpen, setEditOpen] = useState(false);
  const [summary, setSummary] = useState<HealthSummary>({});
  const navigate = useNavigate();

  if (!member) {
    return (
      <div className="min-h-full pb-28">
        <Header title="Health" backFallback="/health" />
        <main className="page-main animate-fade-up">
          <p className="text-sm text-muted">Member not found</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  const grouped = healthDocs.reduce<Record<string, typeof healthDocs>>((acc, doc) => {
    const key = doc.docType;
    acc[key] = acc[key] ?? [];
    acc[key].push(doc);
    return acc;
  }, {});

  const openEdit = () => {
    setSummary(member.healthSummary ?? {});
    setEditOpen(true);
  };

  const saveSummary = () => {
    updateMember(member.id, { healthSummary: summary });
    setEditOpen(false);
  };

  const copyEmergency = () => {
    const s = member.healthSummary;
    if (!s) return;
    const lines = [
      s.bloodGroup && `Blood group: ${s.bloodGroup}`,
      s.allergies && `Allergies: ${s.allergies}`,
      s.conditions && `Conditions: ${s.conditions}`,
      s.emergencyContact && `Emergency: ${s.emergencyContact}${s.emergencyPhone ? ` (${s.emergencyPhone})` : ''}`,
    ].filter(Boolean);
    void navigator.clipboard.writeText(lines.join('\n'));
  };

  const hs = member.healthSummary;

  return (
    <div className="min-h-full pb-28">
      <Header title={member.displayName} backFallback="/health" />
      <main className="page-main animate-fade-up space-y-5">
        <section className="surface-panel-elevated space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="section-label">Emergency card</p>
            <Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={openEdit}>
              Edit
            </Button>
          </div>
          {hs?.bloodGroup || hs?.allergies || hs?.conditions ? (
            <div className="space-y-2 text-sm">
              {hs.bloodGroup && (
                <p>
                  <span className="text-muted">Blood group </span>
                  <span className="font-semibold">{hs.bloodGroup}</span>
                </p>
              )}
              {hs.allergies && (
                <p>
                  <span className="text-muted">Allergies </span>
                  <span className="font-semibold">{hs.allergies}</span>
                </p>
              )}
              {hs.conditions && (
                <p>
                  <span className="text-muted">Conditions </span>
                  <span>{hs.conditions}</span>
                </p>
              )}
              {(hs.emergencyContact || hs.emergencyPhone) && (
                <p>
                  <span className="text-muted">Emergency </span>
                  {hs.emergencyContact}
                  {hs.emergencyPhone && (
                    <a href={`tel:${hs.emergencyPhone}`} className="ml-1 text-accent-ink">
                      {hs.emergencyPhone}
                    </a>
                  )}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Add blood group, allergies, and emergency contact for quick access.</p>
          )}
          <Button variant="secondary" className="w-full text-xs" onClick={copyEmergency} disabled={!hs}>
            Copy emergency summary
          </Button>
        </section>

        {Object.entries(grouped).map(([type, docs]) => (
          <section key={type} className="space-y-2">
            <p className="section-label">{HEALTH_CATEGORY_LABELS[type] ?? type}</p>
            {docs.map((d) => (
              <Card key={d.id} onClick={() => navigate(`/documents/${d.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold tracking-tight">{d.title}</p>
                    {d.fields.insurer && (
                      <p className="text-xs text-muted">{String(d.fields.insurer)}</p>
                    )}
                    {d.fields.labName && (
                      <p className="text-xs text-muted">{String(d.fields.labName)}</p>
                    )}
                  </div>
                  {d.expiryDate && <ExpiryChip date={d.expiryDate} />}
                </div>
              </Card>
            ))}
          </section>
        ))}

        {healthDocs.length === 0 && (
          <p className="text-sm text-muted">No health records for {member.displayName} yet.</p>
        )}
      </main>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Emergency card">
        <div className="space-y-4">
          <Input
            label="Blood group"
            value={summary.bloodGroup ?? ''}
            onChange={(e) => setSummary({ ...summary, bloodGroup: e.target.value })}
            placeholder="e.g. O+"
          />
          <Input
            label="Allergies"
            value={summary.allergies ?? ''}
            onChange={(e) => setSummary({ ...summary, allergies: e.target.value })}
            placeholder="e.g. Penicillin, peanuts"
          />
          <Input
            label="Conditions"
            value={summary.conditions ?? ''}
            onChange={(e) => setSummary({ ...summary, conditions: e.target.value })}
            placeholder="e.g. Asthma, diabetes"
          />
          <Input
            label="Emergency contact name"
            value={summary.emergencyContact ?? ''}
            onChange={(e) => setSummary({ ...summary, emergencyContact: e.target.value })}
          />
          <Input
            label="Emergency phone"
            value={summary.emergencyPhone ?? ''}
            onChange={(e) => setSummary({ ...summary, emergencyPhone: e.target.value })}
            placeholder="+91…"
          />
          <Button className="w-full" onClick={saveSummary}>
            Save
          </Button>
        </div>
      </Modal>
      <BottomNav />
    </div>
  );
}
