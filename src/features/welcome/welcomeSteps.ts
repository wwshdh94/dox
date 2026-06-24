export interface WelcomeStep {
  id: string;
  title: string;
  visual: 'hero' | 'upload' | 'family' | 'expiry' | 'security';
}

export const WELCOME_STEPS: WelcomeStep[] = [
  {
    id: 'hero',
    title: 'Encrypted cloud vault',
    visual: 'hero',
  },
  {
    id: 'upload',
    title: 'Share → verify → save',
    visual: 'upload',
  },
  {
    id: 'family',
    title: 'Family sharing',
    visual: 'family',
  },
  {
    id: 'expiry',
    title: 'Expiry reminders',
    visual: 'expiry',
  },
  {
    id: 'security',
    title: 'Your keys. Your data.',
    visual: 'security',
  },
];
