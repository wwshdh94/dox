import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { useVaultStore } from '@/store/useVaultStore';
import { canPublishVisitingCard } from '@/lib/planLimits';
import { UpgradeHint } from '@/components/UpgradeHint';

export function VisitingCardPage() {
  const user = useVaultStore((s) => s.user);
  const card = useVaultStore((s) => s.visitingCard);
  const setVisitingCard = useVaultStore((s) => s.setVisitingCard);
  const [showQr, setShowQr] = useState(false);
  const canPublish = canPublishVisitingCard(user);

  const [fields, setFields] = useState(
    card?.fields ?? {
      name: user?.name ?? '',
      title: 'Consultant',
      organization: 'Clinic / Company',
      phone: '+919876543210',
      email: user?.email ?? '',
      website: '',
      specialty: '',
    },
  );
  const [template, setTemplate] = useState<'doctor' | 'business' | 'custom'>(
    card?.template ?? 'business',
  );

  const slug = card?.slug ?? user?.name.toLowerCase().replace(/\s+/g, '-') ?? 'card';
  const publicUrl = `${window.location.origin}/c/${slug}`;

  const publish = () => {
    if (!canPublish) return;
    setVisitingCard({ slug, template, published: true, fields });
  };

  return (
    <div className="min-h-full pb-8">
      <Header title="Visiting Card" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-4">
        {!canPublish && (
          <UpgradeHint message="Digital visiting cards with QR and vCard export are a Pro feature." />
        )}
        <Select label="Template" value={template} onChange={(e) => setTemplate(e.target.value as typeof template)}>
          <option value="doctor">Doctor</option>
          <option value="business">Business</option>
          <option value="custom">Custom</option>
        </Select>

        {(['name', 'title', 'organization', 'phone', 'email'] as const).map((k) => (
          <Input
            key={k}
            label={k}
            value={fields[k]}
            onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
          />
        ))}

        {template === 'doctor' && (
          <Input
            label="Specialty"
            value={fields.specialty ?? ''}
            onChange={(e) => setFields({ ...fields, specialty: e.target.value })}
          />
        )}

        <Button className="w-full" onClick={publish} disabled={!canPublish}>
          Publish card
        </Button>

        {card?.published && (
          <>
            <Button variant="secondary" className="w-full" onClick={() => setShowQr(!showQr)}>
              Show nearby (QR)
            </Button>
            {showQr && (
              <div className="surface-panel p-6 text-center">
                <p className="mb-2 text-xs text-muted">Scan to open card</p>
                <p className="break-all text-sm text-accent-ink">{publicUrl}</p>
              </div>
            )}
            <Link to={`/c/${slug}`} className="block text-center text-sm text-accent-ink">
              Preview public page →
            </Link>
          </>
        )}

      </main>
    </div>
  );
}

export function PublicCardPage({ slug }: { slug: string }) {
  const card = useVaultStore((s) => s.visitingCard);

  if (!card || card.slug !== slug || !card.published) {
    return (
      <div className="flex min-h-full items-center justify-center p-6 text-muted">
        Card not found
      </div>
    );
  }

  const { fields } = card;
  const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${fields.name}\nORG:${fields.organization}\nTEL:${fields.phone}\nEMAIL:${fields.email}\nEND:VCARD`;

  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <div className="surface-panel-elevated p-6">
        <p className="text-xl font-semibold">{fields.name}</p>
        <p className="text-accent-ink">{fields.title}</p>
        <p className="text-sm text-muted">{fields.organization}</p>
        {fields.specialty && <p className="mt-2 text-sm">{fields.specialty}</p>}
        <a href={`tel:${fields.phone}`} className="mt-4 block text-accent-ink">{fields.phone}</a>
        <a href={`mailto:${fields.email}`} className="block text-accent-ink">{fields.email}</a>
      </div>
      <a
        href={`data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`}
        download="contact.vcf"
        className="block rounded-xl border border-accent-muted bg-accent py-3 text-center text-accent-fg"
      >
        Add to Contacts
      </a>
      <p className="text-center text-xs text-muted">Shared via PreVault</p>
    </div>
  );
}
