import { useRef, useState, type TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { WelcomeStepVisual } from '@/features/welcome/WelcomeStepVisual';
import { WELCOME_STEPS } from '@/features/welcome/welcomeSteps';
import { useVaultStore } from '@/store/useVaultStore';

const SWIPE_THRESHOLD_PX = 48;

export function WelcomeFlowPage() {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const navigate = useNavigate();
  const completeWelcome = useVaultStore((s) => s.completeWelcome);
  const enterGuestExplore = useVaultStore((s) => s.enterGuestExplore);

  const step = WELCOME_STEPS[index];
  const isLast = index === WELCOME_STEPS.length - 1;

  const skipToLogin = () => {
    completeWelcome();
    navigate('/login', { replace: true });
  };

  const exploreApp = () => {
    enterGuestExplore();
    navigate('/', { replace: true });
  };

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(WELCOME_STEPS.length - 1, next)));
    setDragOffset(0);
  };

  const onSwipeStart = (clientX: number) => {
    pointerStartX.current = clientX;
    setDragOffset(0);
  };

  const onSwipeMove = (clientX: number) => {
    if (pointerStartX.current === null) return;
    let delta = clientX - pointerStartX.current;
    if (index === 0 && delta > 0) delta *= 0.35;
    if (index === WELCOME_STEPS.length - 1 && delta < 0) delta *= 0.35;
    setDragOffset(delta);
  };

  const onSwipeEnd = () => {
    if (pointerStartX.current === null) return;
    if (dragOffset <= -SWIPE_THRESHOLD_PX) goTo(index + 1);
    else if (dragOffset >= SWIPE_THRESHOLD_PX) goTo(index - 1);
    else setDragOffset(0);
    pointerStartX.current = null;
  };

  const onTouchStart = (e: TouchEvent) => onSwipeStart(e.touches[0].clientX);
  const onTouchMove = (e: TouchEvent) => onSwipeMove(e.touches[0].clientX);
  const onTouchEnd = () => onSwipeEnd();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="safe-top flex items-center justify-between px-4 py-2">
        <Logo variant="mark" size="sm" />
        <button
          type="button"
          onClick={skipToLogin}
          className="text-xs font-semibold text-muted underline-offset-2 hover:text-accent-ink hover:underline"
        >
          Skip
        </button>
      </header>

      <main className="flex flex-1 flex-col px-4 pb-5 pt-1">
        <div className="mb-3 flex justify-center gap-1.5" aria-label={`Step ${index + 1} of ${WELCOME_STEPS.length}`}>
          {WELCOME_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? 'step' : undefined}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-7 bg-accent' : i < index ? 'w-2 bg-gold' : 'w-2 bg-border'
              }`}
            />
          ))}
        </div>

        <div
          className="welcome-swipe-area flex min-h-0 flex-1 flex-col select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse') onSwipeStart(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'mouse' && pointerStartX.current !== null) onSwipeMove(e.clientX);
          }}
          onPointerUp={(e) => {
            if (e.pointerType === 'mouse') onSwipeEnd();
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse' && pointerStartX.current !== null) onSwipeEnd();
          }}
        >
          <p
            className="welcome-title-enter text-center font-display text-xl text-text"
            style={{
              transform: `translateX(${dragOffset * 0.15}px)`,
              transition: pointerStartX.current === null ? 'transform 0.25s ease-out' : 'none',
            }}
          >
            {step.title}
          </p>

          <div
            key={step.id}
            className="welcome-visual-enter my-4 flex flex-1 items-center justify-center py-2"
            style={{
              transform: `translateX(${dragOffset}px)`,
              transition: pointerStartX.current === null ? 'transform 0.25s ease-out' : 'none',
            }}
          >
            <WelcomeStepVisual step={step} />
          </div>

          {!isLast && (
            <p className="welcome-swipe-hint pb-2 text-center text-xs font-medium text-muted">
              Swipe to continue →
            </p>
          )}
        </div>

        {isLast && (
          <div className="space-y-2.5">
            <Button className="w-full" onClick={skipToLogin}>
              Google sign in
            </Button>
            <Button variant="secondary" className="w-full" onClick={exploreApp}>
              Explore first
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
