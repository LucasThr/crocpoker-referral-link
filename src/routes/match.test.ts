import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import matchRoutes from './match.js';
import { mockFingerprint } from '../__tests__/fixtures/clicks.js';

// Mock the fingerprint service
vi.mock('../services/fingerprint.js', () => ({
  findMatch: vi.fn(),
}));

import { findMatch } from '../services/fingerprint.js';

describe('Match Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', matchRoutes);
  });

  describe('POST /api/match', () => {
    it('should return match result when fingerprint matches', async () => {
      vi.mocked(findMatch).mockResolvedValue({
        matched: true,
        referral_code: 'TESTCODE123',
        confidence: 0.95,
        click_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await app.request('/api/match', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(mockFingerprint),
      });

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data.matched).toBe(true);
      expect(data.referral_code).toBe('TESTCODE123');
      expect(data.confidence).toBe(0.95);
      expect(data.click_id).toBeTruthy();
    });

    it('should return no match when fingerprint does not match', async () => {
      vi.mocked(findMatch).mockResolvedValue({
        matched: false,
      });

      const response = await app.request('/api/match', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(mockFingerprint),
      });

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data.matched).toBe(false);
      expect(data.referral_code).toBeUndefined();
    });

    it('should validate required fields - platform', async () => {
      const invalidFingerprint = { ...mockFingerprint };
      delete (invalidFingerprint as any).platform;

      const response = await app.request('/api/match', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(invalidFingerprint),
      });

      expect(response.status).toBe(400);

      const data: any = await response.json();
      expect(data.error).toBe('Missing required fields');
    });

    it('should validate required fields - ip_address', async () => {
      const invalidFingerprint = { ...mockFingerprint };
      delete (invalidFingerprint as any).ip_address;

      const response = await app.request('/api/match', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(invalidFingerprint),
      });

      expect(response.status).toBe(400);

      const data: any = await response.json();
      expect(data.error).toBe('Missing required fields');
    });

    it('should pass fingerprint to findMatch service', async () => {
      vi.mocked(findMatch).mockResolvedValue({ matched: false });

      await app.request('/api/match', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(mockFingerprint),
      });

      expect(findMatch).toHaveBeenCalledWith(mockFingerprint);
    });


    it('should handle empty request body', async () => {
      const response = await app.request('/api/match', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('should handle invalid JSON', async () => {
      const response = await app.request('/api/match', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(response.status).toBe(400);

      const data: any = await response.json();
      expect(data.error).toBe('Invalid JSON body');
    });

    it('should work with complete fingerprint data', async () => {
      vi.mocked(findMatch).mockResolvedValue({
        matched: true,
        referral_code: 'TESTCODE123',
        confidence: 0.85,
        click_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const completeFingerprint = {
        ip_address: '192.168.1.1',
        platform: 'ios',
        os_version: '15.0',
        device_model: 'iPhone 13',
        screen_width: 390,
        screen_height: 844,
        language: 'en-US',
        timezone: 'America/New_York',
      };

      const response = await app.request('/api/match', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(completeFingerprint),
      });

      expect(response.status).toBe(200);
      expect(findMatch).toHaveBeenCalledWith(completeFingerprint);
    });

    it('should work with minimal fingerprint data', async () => {
      vi.mocked(findMatch).mockResolvedValue({ matched: false });

      const minimalFingerprint = {
        ip_address: '192.168.1.1',
        platform: 'ios',
      };

      const response = await app.request('/api/match', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(minimalFingerprint),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/device-info', () => {
    it('should return device info from request headers', async () => {
      const response = await app.request('/api/device-info', {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data.device_info).toBeDefined();
      expect(data.device_info.ip_address).toBe('192.168.1.1');
      expect(data.device_info.user_agent).toBe('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
    });

    it('should handle x-real-ip header', async () => {
      const response = await app.request('/api/device-info', {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 11)',
          'x-real-ip': '10.0.0.1',
        },
      });

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data.device_info.ip_address).toBe('10.0.0.1');
    });

    it('should return unknown for missing IP', async () => {
      const response = await app.request('/api/device-info', {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      });

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data.device_info.ip_address).toBe('unknown');
    });

    it('should return empty string for missing user-agent', async () => {
      const response = await app.request('/api/device-info', {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data.device_info.user_agent).toBe('');
    });
  });
});
