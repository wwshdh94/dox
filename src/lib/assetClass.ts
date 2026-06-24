import type { Asset } from '@/types';

export type AssetVisualClass = 'car' | 'laptop' | 'fridge' | 'home' | 'subscription' | 'purchase';

const APPLIANCE =
  /\b(fridge|refrigerator|freezer|washing|washer|microwave|oven|dishwasher|geyser|heater|purifier|air\s*conditioner|a\.?c\.?|cooler|mixer|grinder|chimney|dryer|vacuum)\b/i;

const ELECTRONICS =
  /\b(laptop|macbook|computer|notebook|pc|phone|mobile|iphone|android|ipad|tablet|tv|television|monitor|camera|headphone|earphone|speaker|watch|smartwatch|console|playstation|xbox)\b/i;

function purchaseHaystack(asset: Asset): string {
  const pf = asset.purchaseFields;
  return [asset.label, pf?.productName, pf?.brand].filter(Boolean).join(' ');
}

export function resolveAssetVisualClass(asset: Asset): AssetVisualClass {
  switch (asset.type) {
    case 'vehicle':
      return 'car';
    case 'property':
      return 'home';
    case 'subscription':
      return 'subscription';
    case 'purchase': {
      const haystack = purchaseHaystack(asset);
      if (APPLIANCE.test(haystack)) return 'fridge';
      if (ELECTRONICS.test(haystack)) return 'laptop';
      return 'purchase';
    }
    default:
      return 'purchase';
  }
}

export const ASSET_VISUAL_LABELS: Record<AssetVisualClass, string> = {
  car: 'Vehicle',
  laptop: 'Electronics',
  fridge: 'Appliance',
  home: 'Property',
  subscription: 'Subscription',
  purchase: 'Purchase',
};
