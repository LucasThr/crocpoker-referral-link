import { pgTable, text, timestamp, boolean, real, uuid } from 'drizzle-orm/pg-core';

export const clickRecords = pgTable('click_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  referralCode: text('referral_code').notNull(),

  // Fingerprint data
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent'),
  platform: text('platform').notNull(), // 'ios' | 'android'
  osVersion: text('os_version'),
  deviceModel: text('device_model'),
  screenWidth: real('screen_width'),
  screenHeight: real('screen_height'),
  language: text('language'),
  timezone: text('timezone'),

  // Status
  matched: boolean('matched').default(false),
  matchedAt: timestamp('matched_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const referrals = pgTable('referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerUserId: text('referrer_user_id').notNull(), // References Supabase user
  referredUserId: text('referred_user_id').notNull(), // References Supabase user
  referralCode: text('referral_code').notNull(),
  bonusApplied: boolean('bonus_applied').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
