import { db } from '../db/index.js';
import { clickRecords } from '../db/schema.js';
import { eq, and, gt, desc } from 'drizzle-orm';

interface AppFingerprint {
  platform: string;
  os_version: string;
  device_model: string;
  screen_width: number;
  screen_height: number;
  language: string;
  timezone: string;
  // Server-side fields (added from headers)
  ip_address: string;
  user_agent?: string;
}

interface MatchResult {
  matched: boolean;
  referral_code?: string;
  confidence?: number;
  click_id?: string;
}

export async function findMatch(fingerprint: AppFingerprint): Promise<MatchResult> {
  // Get unmatched clicks from last 48 hours for same platform
  const recentClicks = await db
    .select()
    .from(clickRecords)
    .where(
      and(
        eq(clickRecords.matched, false),
        eq(clickRecords.platform, fingerprint.platform),
        gt(clickRecords.expiresAt, new Date())
      )
    )
    .orderBy(desc(clickRecords.createdAt))
    .limit(100);

  if (recentClicks.length === 0) {
    return { matched: false };
  }

  // Score each click
  const scored = recentClicks.map(click => ({
    click,
    score: calculateScore(click, fingerprint),
  }));

  // Find best match above threshold
  const bestMatch = scored
    .filter(s => s.score >= 0.6) // 60% minimum confidence
    .sort((a, b) => b.score - a.score)[0];

  if (!bestMatch) {
    return { matched: false };
  }

  // Mark as matched
  await db
    .update(clickRecords)
    .set({
      matched: true,
      matchedAt: new Date()
    })
    .where(eq(clickRecords.id, bestMatch.click.id));

  return {
    matched: true,
    referral_code: bestMatch.click.referralCode,
    confidence: bestMatch.score,
    click_id: bestMatch.click.id,
  };
}

function calculateScore(click: typeof clickRecords.$inferSelect, app: AppFingerprint): number {
  let score = 0;
  let totalWeight = 0;

  // IP Address (highest weight - 40%)
  const ipWeight = 0.4;
  if (click.ipAddress === app.ip_address) {
    score += ipWeight;
  }
  totalWeight += ipWeight;

  // Device Model (20%)
  const deviceWeight = 0.2;
  if (click.deviceModel && click.deviceModel === app.device_model) {
    score += deviceWeight;
  }
  totalWeight += deviceWeight;

  // OS Version (15%)
  const osWeight = 0.15;
  if (click.osVersion && click.osVersion === app.os_version) {
    score += osWeight;
  }
  totalWeight += osWeight;

  // Screen Size (10%)
  const screenWeight = 0.1;
  if (
    click.screenWidth &&
    click.screenHeight &&
    Math.abs(click.screenWidth - app.screen_width) < 10 &&
    Math.abs(click.screenHeight - app.screen_height) < 10
  ) {
    score += screenWeight;
  }
  totalWeight += screenWeight;

  // Language (7.5%)
  const langWeight = 0.075;
  if (click.language && click.language === app.language) {
    score += langWeight;
  }
  totalWeight += langWeight;

  // Timezone (7.5%)
  const tzWeight = 0.075;
  if (click.timezone && click.timezone === app.timezone) {
    score += tzWeight;
  }
  totalWeight += tzWeight;

  return score / totalWeight;
}
