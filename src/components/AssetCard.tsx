import { AssetClassIcon } from '@/components/AssetClassIcon';
import { ExpiryChip } from '@/components/ExpiryChip';
import { ASSET_VISUAL_LABELS, resolveAssetVisualClass } from '@/lib/assetClass';
import type { Asset } from '@/types';

export function AssetCard({
  asset,
  title,
  subtitle,
  status,
  expiryDate,
  onClick,
}: {
  asset: Asset;
  title: string;
  subtitle?: string;
  status?: { label: string; tone: 'success' | 'warning' };
  expiryDate?: string;
  onClick: () => void;
}) {
  const visualClass = resolveAssetVisualClass(asset);

  return (
    <button
      type="button"
      onClick={onClick}
      className="surface-panel flex h-full flex-col items-center p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
        <AssetClassIcon visualClass={visualClass} className="h-8 w-8" />
      </div>
      <p className="mt-3 line-clamp-2 w-full text-sm font-semibold leading-snug tracking-tight text-text">
        {title}
      </p>
      <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted">
        {ASSET_VISUAL_LABELS[visualClass]}
      </p>
      {subtitle ? <p className="mt-2 text-xs text-muted">{subtitle}</p> : null}
      {status ? (
        <span
          className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
            status.tone === 'success' ? 'bg-success/12 text-success' : 'bg-warning/12 text-warning'
          }`}
        >
          {status.label}
        </span>
      ) : null}
      {expiryDate ? (
        <div className="mt-2">
          <ExpiryChip date={expiryDate} compact />
        </div>
      ) : null}
    </button>
  );
}
