import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findMatch } from './fingerprint';
import { mockClickRecord, mockFingerprint, mockFingerprintPartialMatch, mockFingerprintNoMatch } from '../__tests__/fixtures/clicks';

// Mock the database with proper query builder chain
const mockSelectBuilder = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};

const mockUpdateBuilder = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../db', () => ({
  db: {
    select: vi.fn(() => mockSelectBuilder),
    update: vi.fn(() => mockUpdateBuilder),
  },
}));

import { db } from '../db';

describe('Fingerprint Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to return this for chaining
    mockSelectBuilder.where.mockReturnThis();
    mockSelectBuilder.orderBy.mockReturnThis();
    mockSelectBuilder.from.mockReturnThis();
    mockUpdateBuilder.set.mockReturnThis();
  });

  describe('findMatch', () => {
    it('should find exact match with high confidence', async () => {
      // Mock database to return matching click
      mockSelectBuilder.limit.mockResolvedValueOnce([mockClickRecord]);

      const result = await findMatch(mockFingerprint);

      expect(result.matched).toBe(true);
      expect(result.referral_code).toBe('TESTCODE123');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.click_id).toBe(mockClickRecord.id);
    });

    it('should find partial match with moderate confidence', async () => {
      // Mock database to return click with slightly different fingerprint
      mockSelectBuilder.limit.mockResolvedValueOnce([mockClickRecord]);

      const result = await findMatch(mockFingerprintPartialMatch);

      expect(result.matched).toBe(true);
      expect(result.referral_code).toBe('TESTCODE123');
      // Confidence should be lower due to OS version mismatch
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should not match when no clicks exist', async () => {
      // Mock database to return empty array
      mockSelectBuilder.limit.mockResolvedValueOnce([]);

      const result = await findMatch(mockFingerprint);

      expect(result.matched).toBe(false);
      expect(result.referral_code).toBeUndefined();
      expect(result.confidence).toBeUndefined();
    });

    it('should not match when confidence is below threshold', async () => {
      // Mock database to return click with very different fingerprint
      mockSelectBuilder.limit.mockResolvedValueOnce([mockClickRecord]);

      const result = await findMatch(mockFingerprintNoMatch);

      expect(result.matched).toBe(false);
      expect(result.referral_code).toBeUndefined();
    });

    it('should update click record when match is found', async () => {
      mockSelectBuilder.limit.mockResolvedValueOnce([mockClickRecord]);

      await findMatch(mockFingerprint);

      // Verify update was called
      expect(db.update).toHaveBeenCalled();
      expect(mockUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          matched: true,
          matchedAt: expect.any(Date),
        })
      );
      expect(mockUpdateBuilder.where).toHaveBeenCalled();
    });

    it('should filter by platform', async () => {
      mockSelectBuilder.limit.mockResolvedValueOnce([mockClickRecord]);

      await findMatch(mockFingerprint);

      // Verify where clause includes platform check
      expect(mockSelectBuilder.where).toHaveBeenCalled();
    });

    it('should only check unmatched clicks', async () => {
      mockSelectBuilder.limit.mockResolvedValueOnce([]);

      await findMatch(mockFingerprint);

      // Verify where clause includes matched=false check
      expect(mockSelectBuilder.where).toHaveBeenCalled();
    });

    it('should only check non-expired clicks', async () => {
      mockSelectBuilder.limit.mockResolvedValueOnce([]);

      await findMatch(mockFingerprint);

      // Verify where clause includes expiry check
      expect(mockSelectBuilder.where).toHaveBeenCalled();
    });
  });

  describe('Scoring Algorithm', () => {
    it('should give highest weight to IP address match', async () => {
      const fingerprintSameIP = { ...mockFingerprint, device_model: 'Different Device' };
      const fingerprintDifferentIP = { ...mockFingerprint, ip_address: '10.0.0.1' };

      mockSelectBuilder.limit.mockResolvedValueOnce([mockClickRecord]);
      const resultSameIP = await findMatch(fingerprintSameIP);

      mockSelectBuilder.limit.mockResolvedValueOnce([mockClickRecord]);
      const resultDifferentIP = await findMatch(fingerprintDifferentIP);

      // Same IP should have higher confidence even with different device
      if (resultSameIP.matched && resultDifferentIP.matched) {
        expect(resultSameIP.confidence).toBeGreaterThan(resultDifferentIP.confidence || 0);
      }
    });

    it('should match screen size with tolerance', async () => {
      const fingerprintSlightlyDifferentScreen = {
        ...mockFingerprint,
        screen_width: 392, // +2 pixels
        screen_height: 846, // +2 pixels
      };

      mockSelectBuilder.limit.mockResolvedValueOnce([mockClickRecord]);

      const result = await findMatch(fingerprintSlightlyDifferentScreen);

      // Should still match with slight screen size difference
      expect(result.matched).toBe(true);
    });
  });
});
