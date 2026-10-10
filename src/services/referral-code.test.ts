import { describe, it, expect } from 'vitest';
import { isValidReferralCode, recoverReferralCode } from './referral-code.js';

describe('Referral code validation', () => {
  it('accepts alphanumeric codes with dashes and underscores', () => {
    expect(isValidReferralCode('abc123')).toBe(true);
    expect(isValidReferralCode('ABC-123_x')).toBe(true);
    expect(isValidReferralCode('a1b2c3d4e5f6')).toBe(true);
  });

  it('rejects empty, too long or unsafe codes', () => {
    expect(isValidReferralCode('')).toBe(false);
    expect(isValidReferralCode('a'.repeat(65))).toBe(false);
    expect(isValidReferralCode("x';alert(1);//")).toBe(false);
    expect(isValidReferralCode('<script>')).toBe(false);
    expect(isValidReferralCode('abc def')).toBe(false);
  });

  it('recovers codes with trailing punctuation from messaging apps', () => {
    expect(recoverReferralCode('abc123.')).toBe('abc123');
    expect(recoverReferralCode('abc123)')).toBe('abc123');
    expect(recoverReferralCode("abc123'")).toBe('abc123');
    expect(recoverReferralCode('abc123?!')).toBe('abc123');
    expect(recoverReferralCode(' abc123 ')).toBe('abc123');
  });

  it('returns the code unchanged when already valid', () => {
    expect(recoverReferralCode('abc123')).toBe('abc123');
  });

  it('returns null when nothing valid can be recovered', () => {
    expect(recoverReferralCode('')).toBeNull();
    expect(recoverReferralCode('.')).toBeNull();
    expect(recoverReferralCode("x';alert(1);//")).toBeNull();
    expect(recoverReferralCode('<script>alert(1)</script>')).toBeNull();
  });
});
