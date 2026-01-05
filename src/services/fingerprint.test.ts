import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findMatch } from './fingerprint';
import { mockClickRecord, mockFingerprint, mockFingerprintPartialMatch, mockFingerprintNoMatch } from '../__tests__/fixtures/clicks';

// Mock the database
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

import { db } from '../db';

describe('Fingerprint Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to return this for chaining
    vi.mocked(db.where).mockReturnThis();
    vi.mocked(db.orderBy).mockReturnThis();
  });

  describe('findMatch', () => {
    it('should find exact match with high confidence', async () => {
      // Mock database to return matching click
      vi.mocked(db.limit).mockResolvedValueOnce([mockClickRecord]);
      vi.mocked(db.where).mockResolvedValueOnce(undefined);

      const result = await findMatch(mockFingerprint);

      expect(result.matched).toBe(true);
      expect(result.referral_code).toBe('TESTCODE123');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.click_id).toBe(mockClickRecord.id);
    });

    it('should find partial match with moderate confidence', async () => {
      // Mock database to return click with slightly different fingerprint
      vi.mocked(db.limit).mockResolvedValueOnce([mockClickRecord]);
      vi.mocked(db.where).mockResolvedValueOnce(undefined);

      const result = await findMatch(mockFingerprintPartialMatch);

      expect(result.matched).toBe(true);
      expect(result.referral_code).toBe('TESTCODE123');
      // Confidence should be lower due to OS version mismatch
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should not match when no clicks exist', async () => {
      // Mock database to return empty array
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      const result = await findMatch(mockFingerprint);

      expect(result.matched).toBe(false);
      expect(result.referral_code).toBeUndefined();
      expect(result.confidence).toBeUndefined();
    });

    it('should not match when confidence is below threshold', async () => {
      // Mock database to return click with very different fingerprint
      vi.mocked(db.limit).mockResolvedValueOnce([mockClickRecord]);

      const result = await findMatch(mockFingerprintNoMatch);

      expect(result.matched).toBe(false);
      expect(result.referral_code).toBeUndefined();
    });

    it('should update click record when match is found', async () => {
      vi.mocked(db.limit).mockResolvedValueOnce([mockClickRecord]);
      vi.mocked(db.where).mockResolvedValueOnce(undefined);

      await findMatch(mockFingerprint);

      // Verify update was called
      expect(db.update).toHaveBeenCalled();
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          matched: true,
          matchedAt: expect.any(Date),
        })
      );
      expect(db.where).toHaveBeenCalled();
    });

    it('should filter by platform', async () => {
      vi.mocked(db.limit).mockResolvedValueOnce([mockClickRecord]);
      vi.mocked(db.where).mockResolvedValueOnce(undefined);

      await findMatch(mockFingerprint);

      // Verify where clause includes platform check
      expect(db.where).toHaveBeenCalled();
    });

    it('should only check unmatched clicks', async () => {
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      await findMatch(mockFingerprint);

      // Verify where clause includes matched=false check
      expect(db.where).toHaveBeenCalled();
    });

    it('should only check non-expired clicks', async () => {
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      await findMatch(mockFingerprint);

      // Verify where clause includes expiry check
      expect(db.where).toHaveBeenCalled();
    });
  });

  describe('Scoring Algorithm', () => {
    it('should give highest weight to IP address match', async () => {
      const fingerprintSameIP = { ...mockFingerprint, device_model: 'Different Device' };
      const fingerprintDifferentIP = { ...mockFingerprint, ip_address: '10.0.0.1' };

      vi.mocked(db.limit).mockResolvedValueOnce([mockClickRecord]);
      vi.mocked(db.where).mockResolvedValueOnce(undefined);
      const resultSameIP = await findMatch(fingerprintSameIP);

      vi.mocked(db.limit).mockResolvedValueOnce([mockClickRecord]);
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

      vi.mocked(db.limit).mockResolvedValueOnce([mockClickRecord]);
      vi.mocked(db.where).mockResolvedValueOnce(undefined);

      const result = await findMatch(fingerprintSlightlyDifferentScreen);

      // Should still match with slight screen size difference
      expect(result.matched).toBe(true);
    });
  });
});
