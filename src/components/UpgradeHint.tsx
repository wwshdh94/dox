import { Link } from 'react-router-dom';

export function UpgradeHint({ message }: { message: string }) {
  return (
    <p className="rounded-xl bg-accent-soft/50 px-3 py-2 text-xs text-muted">
      {message}{' '}
      <Link to="/profile/plan" className="font-medium text-accent-ink">
        Upgrade to Pro
      </Link>
    </p>
  );
}
