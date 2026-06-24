import { describe, expect, it } from 'vitest';
import {
  adjustRegionsForOrientation,
  formatRegionOcrText,
  getOcrRegions,
  rotateRect90CW,
  tesseractWhitelistForRegion,
  usesRegionOcr,
} from './ocrRegions';

describe('ocrRegions', () => {
  it('enables ROI OCR for Indian ID types', () => {
    expect(usesRegionOcr('pan')).toBe(true);
    expect(usesRegionOcr('aadhaar')).toBe(true);
    expect(usesRegionOcr('passport')).toBe(true);
    expect(usesRegionOcr('driving_license')).toBe(true);
    expect(usesRegionOcr('purchase_receipt')).toBe(false);
  });

  it('returns different regions for Aadhaar front vs back', () => {
    const front = getOcrRegions('aadhaar', 0).map((r) => r.id);
    const back = getOcrRegions('aadhaar', 1).map((r) => r.id);
    expect(front).toContain('name');
    expect(front).toContain('aadhaar_number');
    expect(back).toContain('address');
    expect(back).not.toContain('gender');
  });

  it('includes MRZ band for passport', () => {
    const ids = getOcrRegions('passport', 0).map((r) => r.id);
    expect(ids).toContain('mrz');
  });

  it('formats labeled region text', () => {
    const text = formatRegionOcrText({ name: 'RAHUL SHARMA', pan_number: 'ABCPP1234F' });
    expect(text).toContain('[name]');
    expect(text).toContain('RAHUL SHARMA');
    expect(text).toContain('[pan_number]');
  });

  it('rotates ROI when PAN photo is portrait', () => {
    const before = getOcrRegions('pan', 0)[0]!.rect;
    const adjusted = adjustRegionsForOrientation(getOcrRegions('pan', 0), 1080, 1920, 'pan');
    expect(adjusted[0]!.rect).not.toEqual(before);
  });

  it('keeps ROI when orientation matches card', () => {
    const regions = getOcrRegions('pan', 0);
    const adjusted = adjustRegionsForOrientation(regions, 1920, 1080, 'pan');
    expect(adjusted[0]!.rect).toEqual(regions[0]!.rect);
  });

  it('provides charset whitelist for ID number regions', () => {
    expect(tesseractWhitelistForRegion('pan_number')).toContain('A');
    expect(tesseractWhitelistForRegion('aadhaar_number')).toBe('0123456789 ');
    expect(tesseractWhitelistForRegion('name')).toBeUndefined();
  });

  it('rotateRect90CW maps unit square corner', () => {
    const r = rotateRect90CW({ x: 0, y: 0, w: 1, h: 0.5 });
    expect(r.x).toBeCloseTo(0.5, 1);
    expect(r.y).toBeCloseTo(0, 1);
  });
});
