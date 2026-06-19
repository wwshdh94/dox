import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { useVaultStore } from '@/store/useVaultStore';
import { debug, debugError } from '@/lib/debug';

const steps = [
  {
    title: 'Your security',
    body: [
      'Documents encrypted before storage',
      'On-device OCR by default — cloud AI is opt-in',
      'You verify every field before we save',
    ],
  },
  {
    title: 'Install Dox',
    body: ['Add to Home Screen for Share-to-Dox from WhatsApp and Gallery (Android Chrome).'],
  },
  {
    title: 'Share to Dox',
    body: ['Share any PDF or photo → pick Dox → assign to family or asset → done.'],
  },
];

export function OnboardingPage() {
  const finishOnboarding = useVaultStore((s) => s.finishOnboarding);
  const navigate = useNavigate();

  const finish = () => {
    try {
      debug('onboarding', 'finish started');
      finishOnboarding();
      debug('onboarding', 'finish complete → navigate /');
      navigate('/', { replace: true });
    } catch (err) {
      debugError('onboarding', 'finish failed', err);
      throw err;
    }
  };

  return (
    <div className="page-main animate-fade-up mx-auto max-w-lg space-y-6 py-8">
      <div>
        <h1 className="font-display text-3xl text-text">Welcome to Dox</h1>
        <p className="mt-2 text-sm text-muted">A calm place for your family&apos;s important papers.</p>
      </div>

      {steps.map((step, i) => (
        <section key={step.title} className="surface-panel p-5 text-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-ink">
              {i + 1}
            </span>
            <p className="font-semibold">{step.title}</p>
          </div>
          <ul className="space-y-1.5 text-muted">
            {step.body.map((line) => (
              <li key={line} className="leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Button className="w-full" onClick={finish}>
        Get started
      </Button>
    </div>
  );
}
