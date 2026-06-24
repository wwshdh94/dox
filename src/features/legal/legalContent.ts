import {
  APP_GRIEVANCE_OFFICER,
  APP_NAME,
  APP_PRIVACY_EMAIL,
  APP_PUBLIC_ORIGIN,
  APP_SUPPORT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
} from '@/lib/appMeta';

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance',
    paragraphs: [
      `These Terms of Service ("Terms") govern your use of ${APP_NAME}, a document vault progressive web application operated at ${APP_PUBLIC_ORIGIN}. By creating an account or using the service, you agree to these Terms and our Privacy Policy.`,
      'If you do not agree, do not use the service.',
    ],
  },
  {
    id: 'eligibility',
    title: '2. Eligibility',
    paragraphs: [
      'You must be at least 18 years old and capable of entering a binding contract under Indian law.',
      'You are responsible for ensuring that documents you upload belong to you or to household members who have consented to storage and sharing through your vault.',
    ],
  },
  {
    id: 'service',
    title: '3. The service',
    paragraphs: [
      `${APP_NAME} helps Indian households store documents, track expiry dates, receive reminders, and share selected items with family members. Features may include on-device OCR, optional cloud-assisted extraction, encrypted backup, and temporary share links.`,
      'We may add, change, or remove features. We strive for high availability but do not guarantee uninterrupted access.',
    ],
  },
  {
    id: 'account',
    title: '4. Your account',
    paragraphs: [
      'Sign-in is through Google OAuth. You must keep your Google account secure and notify us if you suspect unauthorized access to your vault.',
      'You are responsible for activity under your account, including actions by household members you invite.',
    ],
  },
  {
    id: 'acceptable-use',
    title: '5. Acceptable use',
    paragraphs: ['You agree not to:'],
    bullets: [
      'Upload unlawful, fraudulent, or infringing content',
      'Attempt to bypass security, encryption, or access controls',
      'Use the service to harass others or distribute malware',
      'Scrape, reverse engineer, or overload our systems',
      'Misrepresent your identity or household relationships',
    ],
  },
  {
    id: 'family-sharing',
    title: '6. Family sharing',
    paragraphs: [
      'When you add household members or share documents, you confirm you have a lawful basis to share that personal information with them.',
      'Shared access can be revoked by vault owners or managers. Temporary links expire automatically but should be treated as sensitive while active.',
    ],
  },
  {
    id: 'referrals',
    title: '7. Plans, referrals, and promotions',
    paragraphs: [
      'Free and paid plans may have document or feature limits described in the app. Referral bonuses and launch promotions are subject to fair-use limits and may change with notice.',
      'Fees, billing, and refunds for paid plans will be described at purchase when billing is enabled.',
    ],
  },
  {
    id: 'ip',
    title: '8. Intellectual property',
    paragraphs: [
      `${APP_NAME}, its branding, and software are owned by us or our licensors. You retain ownership of documents and data you upload.`,
      'You grant us a limited license to host, encrypt, process, and display your content solely to provide the service.',
    ],
  },
  {
    id: 'disclaimers',
    title: '9. Disclaimers',
    paragraphs: [
      'The service is provided "as is" to the fullest extent permitted by law. We do not provide legal, tax, insurance, or medical advice.',
      'Extracted fields from OCR or AI are suggestions — you must verify accuracy before relying on them for official purposes.',
    ],
  },
  {
    id: 'liability',
    title: '10. Limitation of liability',
    paragraphs: [
      'To the maximum extent permitted under applicable law, we are not liable for indirect, incidental, special, or consequential damages, or for loss of data caused by factors outside our reasonable control.',
      'Our aggregate liability for any claim relating to the service is limited to the amount you paid us in the twelve months before the claim, or ₹1,000 if you use a free plan.',
    ],
  },
  {
    id: 'termination',
    title: '11. Termination',
    paragraphs: [
      'You may delete your vault or account in Settings → Account. We may suspend or terminate access if you breach these Terms or if required by law.',
      'Upon termination, we will delete or anonymize personal data as described in our Privacy Policy, subject to legal retention requirements.',
    ],
  },
  {
    id: 'law',
    title: '12. Governing law',
    paragraphs: [
      'These Terms are governed by the laws of India. Courts in Bengaluru, Karnataka shall have exclusive jurisdiction, subject to mandatory consumer protections.',
      'Nothing in these Terms limits rights you may have under the Digital Personal Data Protection Act, 2023 or other applicable law.',
    ],
  },
  {
    id: 'changes',
    title: '13. Changes',
    paragraphs: [
      'We may update these Terms. Material changes will be notified in the app or by email. Continued use after the effective date constitutes acceptance.',
    ],
  },
  {
    id: 'contact',
    title: '14. Contact',
    paragraphs: [
      `Questions about these Terms: ${APP_SUPPORT_EMAIL}.`,
      `Effective date: ${LEGAL_EFFECTIVE_DATE}. Draft — pending legal review before public launch.`,
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    paragraphs: [
      `This Privacy Policy explains how ${APP_NAME} ("we", "us") collects, uses, stores, and protects personal data when you use our document vault service.`,
      'We act as a Data Fiduciary under the Digital Personal Data Protection Act, 2023 (DPDP Act). This notice is standalone and separate from our Terms of Service.',
    ],
  },
  {
    id: 'categories',
    title: '2. Data we collect',
    paragraphs: ['Depending on how you use the app, we may process:'],
    bullets: [
      'Account data — Google account identifier, name, email, profile photo',
      'Household data — member names, relationships, invite status, activity timestamps',
      'Document metadata — type, expiry, tags, verification status, sharing settings',
      'Document content — encrypted files and extracted fields you choose to save',
      'Device & usage data — app version, coarse events (e.g. upload completed), crash diagnostics without document content',
      'Communications — support messages, feedback, and referral activity',
    ],
  },
  {
    id: 'purposes',
    title: '3. Why we use your data',
    paragraphs: ['We process personal data only for lawful purposes, including:'],
    bullets: [
      'Providing the vault, sync, reminders, and family sharing features you request',
      'Securing your account, detecting abuse, and maintaining audit logs (metadata only)',
      'Optional cloud OCR or AI extraction when you explicitly enable it',
      'Customer support, product improvement, and legal compliance',
    ],
  },
  {
    id: 'legal-basis',
    title: '4. Legal basis & consent',
    paragraphs: [
      'We rely primarily on your consent at sign-up and when you enable optional features such as cloud AI or family sharing.',
      'You may withdraw consent for optional processing in Settings. Core vault features may require certain data to function.',
    ],
  },
  {
    id: 'security',
    title: '5. Storage & security',
    paragraphs: [
      'Documents are encrypted on your device before upload where supported. Data in transit uses TLS. Production data is stored in India-region infrastructure.',
      'We design for zero-knowledge storage of document content — we cannot read your encrypted files without your keys.',
      'We maintain access controls, row-level security per household, and activity logs that exclude document field values.',
    ],
  },
  {
    id: 'sharing',
    title: '6. Who we share data with',
    paragraphs: ['We do not sell personal data. We may share limited data with:'],
    bullets: [
      'Household members you authorize',
      'Infrastructure providers (e.g. Supabase) under data processing agreements',
      'Cloud OCR providers only when you opt in per upload or in settings',
      'Authorities when required by law or to protect rights and safety',
    ],
  },
  {
    id: 'ai',
    title: '7. AI & OCR processing',
    paragraphs: [
      'On-device OCR runs locally on your phone or browser by default. Cloud-assisted extraction sends document images only after your confirmation and is not used to train public models.',
      'You review and verify extracted fields before they are saved.',
    ],
  },
  {
    id: 'retention',
    title: '8. Retention',
    paragraphs: [
      'We retain personal data while your account is active and as needed to provide the service.',
      'Document activity logs are kept for up to one year. When you delete documents, your vault, or your account, we purge or anonymize data unless law requires longer retention.',
    ],
  },
  {
    id: 'rights',
    title: '9. Your rights (Data Principal)',
    paragraphs: ['Under the DPDP Act you may:'],
    bullets: [
      'Access and correct personal data we hold about you',
      'Withdraw consent for optional processing',
      'Request erasure via Settings → Account (delete vault or account)',
      'Nominate another person to exercise rights on your behalf where applicable',
      'File a grievance with us (see below)',
    ],
  },
  {
    id: 'children',
    title: '10. Children',
    paragraphs: [
      'The service is for users 18 and older. Family profiles for minors may be managed by a parent or guardian who consents on their behalf.',
    ],
  },
  {
    id: 'cookies',
    title: '11. Cookies & local storage',
    paragraphs: [
      'We use browser local storage, IndexedDB, and service worker caches to keep you signed in, store encrypted vault data offline, and deliver push reminders.',
      'No third-party advertising cookies are used.',
    ],
  },
  {
    id: 'aadhaar',
    title: '12. Aadhaar & sensitive documents',
    paragraphs: [
      'If you store Aadhaar or other identity documents, numbers are masked in the UI and redacted in shares by default.',
      'Do not publish Aadhaar numbers. We do not perform Aadhaar authentication or e-KYC.',
    ],
  },
  {
    id: 'grievance',
    title: '13. Grievance officer',
    paragraphs: [
      `For privacy complaints or to exercise your rights, contact our Grievance Officer:`,
      `${APP_GRIEVANCE_OFFICER} — ${APP_PRIVACY_EMAIL}.`,
      'We aim to acknowledge grievances within 7 days and resolve them within 30 days where possible.',
    ],
  },
  {
    id: 'changes',
    title: '14. Changes to this policy',
    paragraphs: [
      'We will update this policy when our practices change. Material updates will be shown in the app or emailed to your registered address.',
    ],
  },
  {
    id: 'contact',
    title: '15. Contact',
    paragraphs: [
      `Privacy: ${APP_PRIVACY_EMAIL} · Support: ${APP_SUPPORT_EMAIL} · ${APP_PUBLIC_ORIGIN}`,
      `Effective date: ${LEGAL_EFFECTIVE_DATE}. Draft — pending legal review before public launch.`,
    ],
  },
];
