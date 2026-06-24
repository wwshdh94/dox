import { APP_NAME } from '@/lib/appMeta';
import { LegalDocumentPage } from './LegalDocumentPage';
import { TERMS_SECTIONS } from './legalContent';

export function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      intro={`Rules for using ${APP_NAME}. Please read these before creating an account.`}
      sections={TERMS_SECTIONS}
      sibling={{ href: '/privacy', label: 'Privacy Policy' }}
    />
  );
}
