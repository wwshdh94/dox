import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import type { LegalSection } from './legalContent';

export function LegalDocumentPage({
  title,
  intro,
  sections,
  sibling,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  sibling?: { href: string; label: string };
}) {
  return (
    <div className="min-h-full pb-12">
      <Header title={title} backFallback="/login" />
      <main className="page-main animate-fade-up space-y-6">
        <div className="surface-panel-elevated space-y-3 p-5">
          <p className="font-display text-xl text-text">{title}</p>
          <p className="text-sm text-muted">{intro}</p>
          {sibling ? (
            <p className="text-xs text-muted">
              See also{' '}
              <Link to={sibling.href} className="text-accent-ink">
                {sibling.label}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="surface-panel space-y-2 p-4">
              <h2 className="text-sm font-semibold text-text">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
