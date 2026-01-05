import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import referralRoutes from './referral';

// Mock the database with proper query builder chain
const mockQueryBuilder = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};

const mockInsertBuilder = {
  values: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../db', () => ({
  db: {
    select: vi.fn(() => mockQueryBuilder),
    insert: vi.fn(() => mockInsertBuilder),
  },
}));

import { db } from '../db';

describe('Referral Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', referralRoutes);
    // Reset mock query builder for chaining
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.from.mockReturnThis();
  });

  describe('POST /api/referral/apply', () => {
    it('should apply referral bonus successfully', async () => {
      // Mock checking for existing referral (should return empty)
      mockQueryBuilder.limit.mockResolvedValueOnce([]);

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

      const data: any = await response.json();
      expect(data.success).toBe(true);
      expect(data.referrer_bonus).toBe(100);
      expect(data.referred_bonus).toBe(50);
    });

    it('should create referral record', async () => {
      mockQueryBuilder.limit.mockResolvedValueOnce([]);

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
      expect(mockInsertBuilder.values).toHaveBeenCalledWith(
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
      mockQueryBuilder.limit.mockResolvedValueOnce([{ id: 'existing-referral' }]);

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

      const data: any = await response.json();
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

      const data: any = await response.json();
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

      const data: any = await response.json();
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

      const data: any = await response.json();
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

      const data: any = await response.json();
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
      mockQueryBuilder.where.mockResolvedValueOnce(mockReferrals);

      // Mock referral where user was referred
      mockQueryBuilder.limit.mockResolvedValueOnce([]);

      const response = await app.request('/api/referral/stats/user-123');

      expect(response.status).toBe(200);

      const data: any = await response.json();
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
      mockQueryBuilder.where.mockResolvedValueOnce([]);

      // Mock referral where user was referred
      mockQueryBuilder.limit.mockResolvedValueOnce([mockReferredBy]);

      const response = await app.request('/api/referral/stats/user-123');

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data.total_referrals).toBe(0);
      expect(data.referred_by).toEqual(mockReferredBy);
    });

    it('should return zero referrals for new user', async () => {
      // Mock empty referrals
      mockQueryBuilder.where.mockResolvedValueOnce([]);
      mockQueryBuilder.limit.mockResolvedValueOnce([]);

      const response = await app.request('/api/referral/stats/new-user-123');

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data.total_referrals).toBe(0);
      expect(data.referrals).toHaveLength(0);
      expect(data.referred_by).toBeNull();
    });
  });
});
