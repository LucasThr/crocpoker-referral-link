import { Hono } from 'hono';
import { db } from '../db/index.js';
import { referrals } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const app = new Hono();

const REFERRER_BONUS = 100;  // Points for the person who shared
const REFERRED_BONUS = 50;   // Points for the new user

// Apply referral reward
// Your Supabase app should call this after verifying the referral code and user IDs
app.post('/api/referral/apply', async (c) => {
  const { referral_code, referrer_user_id, referred_user_id } = await c.req.json();

  if (!referral_code || !referrer_user_id || !referred_user_id) {
    return c.json({ error: 'Missing required fields: referral_code, referrer_user_id, referred_user_id' }, 400);
  }

  // Prevent self-referral
  if (referrer_user_id === referred_user_id) {
    return c.json({ error: 'Cannot refer yourself' }, 400);
  }

  // Check if this referral already exists
  const existingReferral = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referredUserId, referred_user_id),
        eq(referrals.referralCode, referral_code)
      )
    )
    .limit(1);

  if (existingReferral.length > 0) {
    return c.json({ error: 'Referral already applied' }, 409);
  }

  // Create referral record
  await db.insert(referrals).values({
    referrerUserId: referrer_user_id,
    referredUserId: referred_user_id,
    referralCode: referral_code,
    bonusApplied: true,
  });

  // Return success - your Supabase app should update bonus points there
  return c.json({
    success: true,
    referrer_bonus: REFERRER_BONUS,
    referred_bonus: REFERRED_BONUS,
    message: 'Referral recorded successfully. Update bonus points in your main database.',
  });
});

// Get referral stats for a user
app.get('/api/referral/stats/:userId', async (c) => {
  const userId = c.req.param('userId');

  // Get referrals where user is the referrer
  const referredUsers = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerUserId, userId));

  // Get referral where user was referred by someone
  const referredBy = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredUserId, userId))
    .limit(1);

  return c.json({
    total_referrals: referredUsers.length,
    referrals: referredUsers,
    referred_by: referredBy.length > 0 ? referredBy[0] : null,
  });
});

export default app;
