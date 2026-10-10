import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import clickRoutes, { STORE_CLICK_TIMEOUT_MS } from './click.js';

// Mock the database and services
const mockInsertBuilder = {
  values: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn(() => mockInsertBuilder),
  },
}));

vi.mock('../services/redirect.js', () => ({
  getRedirectInfo: vi.fn(),
}));

import { db } from '../db/index.js';
import { getRedirectInfo } from '../services/redirect.js';

describe('Click Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', clickRoutes);
  });

  describe('GET /r/:code', () => {
    it('should return HTML landing page', async () => {
      const response = await app.request('/r/TESTCODE123');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');

      const html = await response.text();
      expect(html).toContain('TESTCODE123');
      expect(html).toContain('Ouverture');
      expect(html).toContain('/api/process-click');
    });

    it('should include fingerprint collection JavaScript', async () => {
      const response = await app.request('/r/TESTCODE123');
      const html = await response.text();

      expect(html).toContain('screen.width');
      expect(html).toContain('screen.height');
      expect(html).toContain('navigator.language');
      expect(html).toContain('Intl.DateTimeFormat');
    });

    it('should reject an unsafe code instead of inlining it', async () => {
      const response = await app.request("/r/x';alert(1);%2F%2F");

      expect(response.status).toBe(404);
      const html = await response.text();
      expect(html).not.toContain('alert(1)');
      expect(html).toContain('Ce lien ne semble pas valide');
    });

    it('should redirect a code with trailing punctuation to the clean code', async () => {
      const response = await app.request('/r/TESTCODE123.');

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/r/TESTCODE123');
    });

    it('should expose a manual fallback link and a touch hint', async () => {
      const response = await app.request('/r/TESTCODE123');
      const html = await response.text();

      expect(html).toContain('id="manual-link"');
      expect(html).toContain('/api/process-click?code=TESTCODE123');
      expect(html).toContain('maxTouchPoints');
      expect(html).toContain('location.replace');
    });

    it('should not block the redirect script on the web font', async () => {
      const response = await app.request('/r/TESTCODE123');
      const html = await response.text();

      const fontLink = html.match(/<link[^>]*fonts\.googleapis\.com[^>]*>/)?.[0] ?? '';
      expect(fontLink).toContain('media="print"');
      expect(fontLink).toContain("onload=\"this.media='all'\"");
    });

    it('should have noscript fallback', async () => {
      const response = await app.request('/r/TESTCODE123');
      const html = await response.text();

      expect(html).toContain('<noscript>');
      expect(html).toContain('meta http-equiv="refresh"');
    });
  });

  describe('GET /api/process-click', () => {
    it('should redirect to iOS App Store for iPhone', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'ios',
        redirectUrl: 'https://apps.apple.com/app/id123456789',
        osVersion: '15.0',
        deviceModel: 'iPhone 13',
      });

      const response = await app.request('/api/process-click?code=TESTCODE123', {
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('apps.apple.com');
    });

    it('should redirect to Play Store for Android', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'android',
        redirectUrl: 'https://play.google.com/store/apps/details?id=com.yourapp',
        osVersion: '11',
        deviceModel: 'Pixel 6',
      });

      const response = await app.request('/api/process-click?code=TESTCODE123', {
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 6)',
        },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('play.google.com');
    });

    it('should store fingerprint for iOS', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'ios',
        redirectUrl: 'https://apps.apple.com/app/id123456789',
        osVersion: '15.0',
        deviceModel: 'iPhone 13',
      });

      await app.request(
        '/api/process-click?code=TESTCODE123&sw=390&sh=844&tz=America/New_York&lang=en-US',
        {
          headers: {
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
            'x-forwarded-for': '192.168.1.1',
          },
        }
      );

      expect(db.insert).toHaveBeenCalled();
      expect(mockInsertBuilder.values).toHaveBeenCalledWith(
        expect.objectContaining({
          referralCode: 'TESTCODE123',
          platform: 'ios',
          ipAddress: '192.168.1.1',
          screenWidth: 390,
          screenHeight: 844,
          timezone: 'America/New_York',
          language: 'en-US',
        })
      );
    });

    it('should NOT store fingerprint for Android', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'android',
        redirectUrl: 'https://play.google.com/store/apps/details?id=com.yourapp',
      });

      await app.request('/api/process-click?code=TESTCODE123', {
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 11)',
        },
      });

      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should extract IP from x-forwarded-for header', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'ios',
        redirectUrl: 'https://apps.apple.com/app/id123456789',
      });

      await app.request('/api/process-click?code=TESTCODE123', {
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone)',
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      expect(mockInsertBuilder.values).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
        })
      );
    });

    it('should handle missing query parameters', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'ios',
        redirectUrl: 'https://apps.apple.com/app/id123456789',
      });

      const response = await app.request('/api/process-click?code=TESTCODE123', {
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone)',
        },
      });

      expect(response.status).toBe(302);
      expect(mockInsertBuilder.values).toHaveBeenCalledWith(
        expect.objectContaining({
          screenWidth: 0,
          screenHeight: 0,
          timezone: '',
          language: '',
        })
      );
    });

    it('should pass the touch hint to the redirect service', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'desktop',
        redirectUrl: 'https://croc.poker/application-poker',
      });

      await app.request('/api/process-click?code=TESTCODE123&touch=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      });

      expect(getRedirectInfo).toHaveBeenCalledWith(
        expect.any(String),
        'TESTCODE123',
        { touch: true },
      );
    });

    it('should redirect without storing when the code is invalid', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'ios',
        redirectUrl: 'https://apps.apple.com/app/id123456789',
      });

      const response = await app.request("/api/process-click?code=%3Cscript%3E", {
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone)' },
      });

      expect(response.status).toBe(302);
      expect(getRedirectInfo).toHaveBeenCalledWith(expect.any(String), '', expect.anything());
      expect(mockInsertBuilder.values).not.toHaveBeenCalled();
    });

    it('should still redirect when storing the click fails', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'ios',
        redirectUrl: 'https://apps.apple.com/app/id123456789',
      });
      mockInsertBuilder.values.mockRejectedValueOnce(new Error('db down'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await app.request('/api/process-click?code=TESTCODE123', {
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone)' },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('apps.apple.com');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should redirect within the timeout when the database hangs', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'ios',
        redirectUrl: 'https://apps.apple.com/app/id123456789',
      });
      // Never resolves: simulates an unreachable database
      mockInsertBuilder.values.mockReturnValueOnce(new Promise(() => {}));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const started = Date.now();
      const response = await app.request('/api/process-click?code=TESTCODE123', {
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone)' },
      });
      const elapsed = Date.now() - started;

      expect(response.status).toBe(302);
      expect(elapsed).toBeGreaterThanOrEqual(STORE_CLICK_TIMEOUT_MS - 50);
      expect(elapsed).toBeLessThan(STORE_CLICK_TIMEOUT_MS + 1000);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should set expiry to 48 hours', async () => {
      vi.mocked(getRedirectInfo).mockReturnValue({
        platform: 'ios',
        redirectUrl: 'https://apps.apple.com/app/id123456789',
      });

      const now = Date.now();

      await app.request('/api/process-click?code=TESTCODE123', {
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone)',
        },
      });

      expect(mockInsertBuilder.values).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.any(Date),
        })
      );

      const callArgs = vi.mocked(mockInsertBuilder.values).mock.calls[0][0];
      const expiresAt = callArgs.expiresAt.getTime();
      const expectedExpiry = now + 48 * 60 * 60 * 1000;

      // Allow 1 second tolerance
      expect(expiresAt).toBeGreaterThan(expectedExpiry - 1000);
      expect(expiresAt).toBeLessThan(expectedExpiry + 1000);
    });
  });
});
