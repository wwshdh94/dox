import { describe, expect, it } from 'vitest';
import { HEALTH_DOC_TYPES, isHealthDoc, hasEmergencyInfo } from './health';

describe('health', () => {
  it('identifies health doc types', () => {
    expect(isHealthDoc('health_insurance')).toBe(true);
    expect(isHealthDoc('passport')).toBe(false);
    expect(HEALTH_DOC_TYPES).toContain('lab_report');
  });

  it('detects emergency info', () => {
    expect(hasEmergencyInfo({ bloodGroup: 'O+' })).toBe(true);
    expect(hasEmergencyInfo({})).toBe(false);
  });
});
