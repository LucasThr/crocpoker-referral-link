import { describe, it, expect } from 'vitest';
import { clickRecords, referrals } from './schema.js';

describe('Database Schema', () => {
  describe('clickRecords table', () => {
    it('should have correct table name', () => {
      expect(clickRecords).toBeDefined();
      // @ts-ignore - accessing internal property for testing
      expect(clickRecords[Symbol.for('drizzle:Name')]).toBe('click_records');
    });

    it('should have all required columns', () => {
      const record = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        referralCode: 'TEST123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        platform: 'ios',
        osVersion: '15.0',
        deviceModel: 'iPhone 13',
        screenWidth: 390,
        screenHeight: 844,
        language: 'en-US',
        timezone: 'America/New_York',
        matched: false,
        matchedAt: null,
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      // This verifies the type structure matches our expectations
      const testRecord: typeof clickRecords.$inferSelect = record;
      expect(testRecord).toBeDefined();
    });

    it('should allow inserting valid click record', () => {
      const validInsert: typeof clickRecords.$inferInsert = {
        referralCode: 'TEST123',
        ipAddress: '192.168.1.1',
        platform: 'ios',
        expiresAt: new Date(),
      };

      expect(validInsert).toBeDefined();
    });

    it('should support platform types', () => {
      const iosRecord: typeof clickRecords.$inferInsert = {
        referralCode: 'TEST',
        ipAddress: '1.1.1.1',
        platform: 'ios',
        expiresAt: new Date(),
      };

      const androidRecord: typeof clickRecords.$inferInsert = {
        referralCode: 'TEST',
        ipAddress: '1.1.1.1',
        platform: 'android',
        expiresAt: new Date(),
      };

      expect(iosRecord.platform).toBe('ios');
      expect(androidRecord.platform).toBe('android');
    });

    it('should have optional fingerprint fields', () => {
      const minimalRecord: typeof clickRecords.$inferInsert = {
        referralCode: 'TEST',
        ipAddress: '1.1.1.1',
        platform: 'ios',
        expiresAt: new Date(),
        // All other fields are optional
      };

      expect(minimalRecord).toBeDefined();
    });

    it('should support matched status tracking', () => {
      const unmatchedRecord: typeof clickRecords.$inferInsert = {
        referralCode: 'TEST',
        ipAddress: '1.1.1.1',
        platform: 'ios',
        expiresAt: new Date(),
        matched: false,
        matchedAt: null,
      };

      const matchedRecord: typeof clickRecords.$inferInsert = {
        referralCode: 'TEST',
        ipAddress: '1.1.1.1',
        platform: 'ios',
        expiresAt: new Date(),
        matched: true,
        matchedAt: new Date(),
      };

      expect(unmatchedRecord.matched).toBe(false);
      expect(matchedRecord.matched).toBe(true);
    });
  });

  describe('referrals table', () => {
    it('should have correct table name', () => {
      expect(referrals).toBeDefined();
      // @ts-ignore - accessing internal property for testing
      expect(referrals[Symbol.for('drizzle:Name')]).toBe('referrals');
    });

    it('should have all required columns', () => {
      const referral = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        referrerUserId: 'user-1',
        referredUserId: 'user-2',
        referralCode: 'CODE123',
        bonusApplied: true,
        createdAt: new Date(),
      };

      const testReferral: typeof referrals.$inferSelect = referral;
      expect(testReferral).toBeDefined();
    });

    it('should allow inserting valid referral', () => {
      const validInsert: typeof referrals.$inferInsert = {
        referrerUserId: 'user-1',
        referredUserId: 'user-2',
        referralCode: 'CODE123',
      };

      expect(validInsert).toBeDefined();
    });

    it('should track bonus application status', () => {
      const pendingBonus: typeof referrals.$inferInsert = {
        referrerUserId: 'user-1',
        referredUserId: 'user-2',
        referralCode: 'CODE123',
        bonusApplied: false,
      };

      const appliedBonus: typeof referrals.$inferInsert = {
        referrerUserId: 'user-1',
        referredUserId: 'user-2',
        referralCode: 'CODE123',
        bonusApplied: true,
      };

      expect(pendingBonus.bonusApplied).toBe(false);
      expect(appliedBonus.bonusApplied).toBe(true);
    });
  });

  describe('Schema Relationships', () => {
    it('should link referrals via referralCode', () => {
      const referral: typeof referrals.$inferInsert = {
        referrerUserId: 'user-id-123', // References external Supabase user
        referredUserId: 'user-id-456', // References external Supabase user
        referralCode: 'USER123',
      };

      const click: typeof clickRecords.$inferInsert = {
        referralCode: 'USER123', // Same referral code
        ipAddress: '1.1.1.1',
        platform: 'ios',
        expiresAt: new Date(),
      };

      expect(referral.referralCode).toBe(click.referralCode);
    });

    it('should store external user IDs', () => {
      const referral: typeof referrals.$inferInsert = {
        referrerUserId: 'supabase-user-123',
        referredUserId: 'supabase-user-456',
        referralCode: 'CODE123',
      };

      // User IDs are just strings that reference external database
      expect(typeof referral.referrerUserId).toBe('string');
      expect(typeof referral.referredUserId).toBe('string');
    });
  });

  describe('Type Safety', () => {
    it('should enforce required fields on insert', () => {
      // These should compile
      const validClick: typeof clickRecords.$inferInsert = {
        referralCode: 'TEST',
        ipAddress: '1.1.1.1',
        platform: 'ios',
        expiresAt: new Date(),
      };

      const validReferral: typeof referrals.$inferInsert = {
        referrerUserId: 'user-1',
        referredUserId: 'user-2',
        referralCode: 'CODE',
      };

      expect(validClick).toBeDefined();
      expect(validReferral).toBeDefined();
    });

    it('should infer select types correctly', () => {
      const selectedClick: typeof clickRecords.$inferSelect = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        referralCode: 'TEST',
        ipAddress: '1.1.1.1',
        userAgent: null,
        platform: 'ios',
        osVersion: null,
        deviceModel: null,
        screenWidth: null,
        screenHeight: null,
        language: null,
        timezone: null,
        matched: false,
        matchedAt: null,
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      expect(selectedClick.id).toBeDefined();
      expect(selectedClick.createdAt).toBeInstanceOf(Date);
    });
  });
});
