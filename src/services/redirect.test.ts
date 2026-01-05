import { describe, it, expect } from 'vitest';
import { getRedirectInfo } from './redirect.js';

describe('Redirect Service', () => {
  const referralCode = 'TESTCODE123';

  describe('iOS Detection', () => {
    it('should detect iPhone and redirect to App Store', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.platform).toBe('ios');
      expect(result.redirectUrl).toContain('apps.apple.com');
      expect(result.osVersion).toBeTruthy();
    });

    it('should detect iPad and redirect to App Store', () => {
      const userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.platform).toBe('ios');
      expect(result.redirectUrl).toContain('apps.apple.com');
    });

    it('should extract iOS version', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X)';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.osVersion).toBeTruthy();
      expect(result.platform).toBe('ios');
    });

    it('should not treat macOS desktop as iOS', () => {
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.platform).not.toBe('ios');
      expect(result.platform).toBe('desktop');
    });
  });

  describe('Android Detection', () => {
    it('should detect Android and redirect to Play Store', () => {
      const userAgent = 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.platform).toBe('android');
      expect(result.redirectUrl).toContain('play.google.com');
    });

    it('should include referral code in Play Store URL', () => {
      const userAgent = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.redirectUrl).toContain('referrer=');
      expect(result.redirectUrl).toContain(encodeURIComponent(`referral_code=${referralCode}`));
    });

    it('should extract Android version', () => {
      const userAgent = 'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.osVersion).toBeTruthy();
      expect(result.platform).toBe('android');
    });

    it('should extract device model', () => {
      const userAgent = 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.deviceModel).toBeTruthy();
    });
  });

  describe('Desktop/Fallback', () => {
    it('should redirect Windows to web fallback', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.platform).toBe('desktop');
      expect(result.redirectUrl).toContain('yourapp.com');
    });

    it('should redirect Linux to web fallback', () => {
      const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.platform).toBe('desktop');
      expect(result.redirectUrl).toContain('yourapp.com');
    });

    it('should redirect macOS desktop to web fallback', () => {
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.platform).toBe('desktop');
      expect(result.redirectUrl).toContain('yourapp.com');
    });

    it('should handle unknown user agents', () => {
      const userAgent = 'UnknownBot/1.0';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.platform).toBe('desktop');
      expect(result.redirectUrl).toContain('yourapp.com');
    });

    it('should handle empty user agent', () => {
      const userAgent = '';
      const result = getRedirectInfo(userAgent, referralCode);

      expect(result.platform).toBe('desktop');
      expect(result.redirectUrl).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tablet devices correctly', () => {
      const iPadUA = 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)';
      const androidTabletUA = 'Mozilla/5.0 (Linux; Android 11; Tab S7) AppleWebKit/537.36';

      const iPadResult = getRedirectInfo(iPadUA, referralCode);
      const androidTabletResult = getRedirectInfo(androidTabletUA, referralCode);

      expect(iPadResult.platform).toBe('ios');
      expect(androidTabletResult.platform).toBe('android');
    });

    it('should handle special characters in referral code', () => {
      const specialCode = 'TEST-CODE_123!';
      const userAgent = 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36';

      const result = getRedirectInfo(userAgent, specialCode);

      expect(result.redirectUrl).toContain('referrer=');
      // Should contain encoded version
      expect(result.redirectUrl).toContain(encodeURIComponent(`referral_code=${specialCode}`));
    });
  });
});
