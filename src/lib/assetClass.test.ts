import { describe, expect, it } from 'vitest';
import { resolveAssetVisualClass } from '@/lib/assetClass';
import type { Asset } from '@/types';

function asset(partial: Partial<Asset> & Pick<Asset, 'type' | 'label'>): Asset {
  return {
    id: 'a1',
    ...partial,
  };
}

describe('resolveAssetVisualClass', () => {
  it('maps vehicles to car', () => {
    expect(resolveAssetVisualClass(asset({ type: 'vehicle', label: 'Swift' }))).toBe('car');
  });

  it('maps electronics purchases to laptop', () => {
    expect(
      resolveAssetVisualClass(
        asset({
          type: 'purchase',
          label: 'MacBook Pro 14',
          purchaseFields: {
            productName: 'MacBook Pro 14" M3',
            amount: 1,
            currency: 'INR',
            purchaseDate: '2025-01-01',
            storeName: 'Store',
          },
        }),
      ),
    ).toBe('laptop');
  });

  it('maps appliance purchases to fridge', () => {
    expect(
      resolveAssetVisualClass(
        asset({
          type: 'purchase',
          label: 'Samsung Fridge',
          purchaseFields: {
            productName: 'Double door refrigerator',
            amount: 1,
            currency: 'INR',
            purchaseDate: '2025-01-01',
            storeName: 'Store',
          },
        }),
      ),
    ).toBe('fridge');
  });
});
