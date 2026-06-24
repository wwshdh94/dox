import { APP_NAME } from '@/lib/appMeta';
import { LegalDocumentPage } from './LegalDocumentPage';
import { PRIVACY_SECTIONS } from './legalContent';

export function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      intro={`How ${APP_NAME} collects, uses, and protects your personal data under Indian law.`}
      sections={PRIVACY_SECTIONS}
      sibling={{ href: '/terms', label: 'Terms of Service' }}
    />
  );
}
