import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import referralRoutes from './referral';

// Mock the database
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
  },
}));

import { db } from '../db';

describe('Referral Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', referralRoutes);
    // Reset mock to return this for chaining
    vi.mocked(db.where).mockReturnThis();
  });

  describe('POST /api/referral/apply', () => {
    it('should apply referral bonus successfully', async () => {
      // Mock checking for existing referral (should return empty)
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      const response = await app.request('/api/referral/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: 'REFCODE456',
          referrer_user_id: 'referrer-123',
          referred_user_id: 'referred-456',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.referrer_bonus).toBe(100);
      expect(data.referred_bonus).toBe(50);
    });

    it('should create referral record', async () => {
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      await app.request('/api/referral/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: 'REFCODE456',
          referrer_user_id: 'referrer-123',
          referred_user_id: 'referred-456',
        }),
      });

      expect(db.insert).toHaveBeenCalled();
      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          referrerUserId: 'referrer-123',
          referredUserId: 'referred-456',
          referralCode: 'REFCODE456',
          bonusApplied: true,
        })
      );
    });

    it('should return error for duplicate referral', async () => {
      // Mock finding existing referral
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.limit).mockResolvedValueOnce([{ id: 'existing-referral' }]);

      const response = await app.request('/api/referral/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: 'REFCODE456',
          referrer_user_id: 'referrer-123',
          referred_user_id: 'referred-456',
        }),
      });

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toBe('Referral already applied');
    });

    it('should validate required fields - referral_code', async () => {
      const response = await app.request('/api/referral/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          referrer_user_id: 'referrer-123',
          referred_user_id: 'referred-456',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should validate required fields - referrer_user_id', async () => {
      const response = await app.request('/api/referral/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: 'REFCODE456',
          referred_user_id: 'referred-456',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should validate required fields - referred_user_id', async () => {
      const response = await app.request('/api/referral/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: 'REFCODE456',
          referrer_user_id: 'referrer-123',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should prevent self-referral', async () => {
      const response = await app.request('/api/referral/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: 'REFCODE456',
          referrer_user_id: 'same-user-123',
          referred_user_id: 'same-user-123',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Cannot refer yourself');
    });

    it('should handle empty request body', async () => {
      const response = await app.request('/api/referral/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/referral/stats/:userId', () => {
    it('should return referral stats for user', async () => {
      const mockReferrals = [
        { id: '1', referrerUserId: 'user-123', referredUserId: 'user-456' },
        { id: '2', referrerUserId: 'user-123', referredUserId: 'user-789' },
      ];

      // Mock referrals where user is referrer
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.select).mockResolvedValueOnce(mockReferrals);

      // Mock referral where user was referred
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      const response = await app.request('/api/referral/stats/user-123');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.total_referrals).toBe(2);
      expect(data.referrals).toHaveLength(2);
      expect(data.referred_by).toBeNull();
    });

    it('should return referred_by info if user was referred', async () => {
      const mockReferredBy = {
        id: '1',
        referrerUserId: 'referrer-999',
        referredUserId: 'user-123',
      };

      // Mock referrals where user is referrer (empty)
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.select).mockResolvedValueOnce([]);

      // Mock referral where user was referred
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.limit).mockResolvedValueOnce([mockReferredBy]);

      const response = await app.request('/api/referral/stats/user-123');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.total_referrals).toBe(0);
      expect(data.referred_by).toEqual(mockReferredBy);
    });

    it('should return zero referrals for new user', async () => {
      // Mock empty referrals
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.select).mockResolvedValueOnce([]);
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      const response = await app.request('/api/referral/stats/new-user-123');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.total_referrals).toBe(0);
      expect(data.referrals).toHaveLength(0);
      expect(data.referred_by).toBeNull();
    });
  });
});
