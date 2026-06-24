import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CORNERS,
  clampCorner,
  cssFilterForSettings,
  DEFAULT_IMAGE_EDIT_SETTINGS,
  isEditableCameraImage,
  outputSizeForCorners,
} from './imageEdit';

describe('imageEdit', () => {
  it('detects editable camera images', () => {
    expect(isEditableCameraImage(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(isEditableCameraImage(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe(false);
  });

  it('clamps corner drag to image bounds', () => {
    expect(clampCorner({ x: -1, y: 2 })).toEqual({ x: 0, y: 1 });
  });

  it('computes output size from corner quad', () => {
    const size = outputSizeForCorners(DEFAULT_CORNERS, 1000, 800);
    expect(size.width).toBeGreaterThan(800);
    expect(size.height).toBeGreaterThan(600);
  });

  it('builds css filter string for preview', () => {
    expect(cssFilterForSettings(DEFAULT_IMAGE_EDIT_SETTINGS)).toContain('brightness(1)');
    expect(cssFilterForSettings({ ...DEFAULT_IMAGE_EDIT_SETTINGS, hdr: true })).toContain('contrast');
  });
});
