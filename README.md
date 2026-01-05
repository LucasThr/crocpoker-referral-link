# Referral Backend

A deferred deep linking and referral tracking system for mobile apps with Supabase integration.

## Overview

This backend handles:
- **Click Tracking**: Records referral link clicks with device fingerprints
- **Deep Linking**: Redirects users to app stores (iOS/Android)
- **Fingerprint Matching**: Matches app installs to referral clicks (for iOS)
- **Referral Tracking**: Records successful referrals

**Note:** This works alongside your Supabase database. User management and bonus points are handled in Supabase.

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│  Supabase   │      │ Referral Backend │      │  Mobile App │
│  (Users &   │◄────►│ (Clicks & Match) │◄────►│             │
│   Points)   │      │                  │      │             │
└─────────────┘      └──────────────────┘      └─────────────┘
```

## Database Setup

### Supabase Database (Your Main App)

Add these columns to your `users` table:

```sql
ALTER TABLE users
ADD COLUMN referral_code TEXT UNIQUE,
ADD COLUMN bonus_points INTEGER DEFAULT 0,
ADD COLUMN referred_by TEXT REFERENCES users(id);
```

Generate unique referral codes for each user:

```sql
UPDATE users
SET referral_code = encode(gen_random_bytes(6), 'hex')
WHERE referral_code IS NULL;
```

### Referral Backend Database

This backend has its own small database with just 2 tables:
- `click_records` - Device fingerprints from web clicks
- `referrals` - Successful referral relationships

Setup:

```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Add your PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/referral_db
BASE_URL=https://yourapp.com

# 3. Generate migrations
npm run db:generate

# 4. Run migrations
npm run db:migrate
```

## API Endpoints

### 1. `/r/:code` - Referral Landing Page

User clicks referral link → Collects device fingerprint → Redirects to app store

```
https://yourapp.com/r/abc123
```

### 2. `/api/match` - Match Fingerprint (iOS Only)

Called by your iOS app on first launch to match the install with a click.

**Request:**
```json
POST /api/match
{
  "ip_address": "192.168.1.1",
  "platform": "ios",
  "os_version": "16.0",
  "device_model": "iPhone 14",
  "screen_width": 390,
  "screen_height": 844,
  "language": "en-US",
  "timezone": "America/New_York"
}
```

**Response:**
```json
{
  "matched": true,
  "referral_code": "abc123",
  "confidence": 0.95,
  "click_id": "..."
}
```

### 3. `/api/referral/apply` - Record Referral

Called by your app after verifying the referral code in Supabase.

**Request:**
```json
POST /api/referral/apply
{
  "referral_code": "abc123",
  "referrer_user_id": "user-123",  // From Supabase
  "referred_user_id": "user-456"   // From Supabase
}
```

**Response:**
```json
{
  "success": true,
  "referrer_bonus": 100,
  "referred_bonus": 50,
  "message": "Referral recorded successfully. Update bonus points in your main database."
}
```

**Important:** After this succeeds, update bonus points in Supabase:

```typescript
// In your Supabase edge function or app
await supabase
  .from('users')
  .update({ bonus_points: currentPoints + 100 })
  .eq('id', referrer_user_id);
```

### 4. `/api/referral/stats/:userId` - Get User Stats

Get referral statistics for a user.

**Response:**
```json
{
  "total_referrals": 5,
  "referrals": [...],
  "referred_by": {...}
}
```

## Integration Flow

### iOS App Flow

1. User clicks referral link `https://yourapp.com/r/abc123`
2. Backend collects fingerprint and redirects to App Store
3. User installs app
4. On first launch, app collects fingerprint and calls `/api/match`
5. Backend returns `referral_code: "abc123"`
6. App looks up referrer in Supabase by referral code
7. App calls `/api/referral/apply` with both user IDs
8. App updates bonus points in Supabase

### Android App Flow

1. User clicks referral link with Play Store referrer parameter
2. User installs app
3. App reads referral code from install referrer
4. App looks up referrer in Supabase
5. App calls `/api/referral/apply`
6. App updates bonus points in Supabase

## Running the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Tests
npm test
npm run test:coverage
```

## Environment Variables

```bash
DATABASE_URL=postgresql://...     # Referral backend database
BASE_URL=https://yourapp.com      # Your domain
PORT=3000                          # Server port
```

## Example: Supabase Edge Function

```typescript
// supabase/functions/apply-referral/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { referral_code, new_user_id } = await req.json();

  const supabase = createClient(...);

  // 1. Find referrer by code
  const { data: referrer } = await supabase
    .from('users')
    .select('id')
    .eq('referral_code', referral_code)
    .single();

  if (!referrer) return new Response('Invalid code', { status: 404 });

  // 2. Record in referral backend
  const response = await fetch('https://referral-api.yourapp.com/api/referral/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      referral_code,
      referrer_user_id: referrer.id,
      referred_user_id: new_user_id,
    }),
  });

  if (!response.ok) return new Response('Already applied', { status: 409 });

  // 3. Update bonus points in Supabase
  await supabase.rpc('add_referral_bonus', {
    referrer_id: referrer.id,
    referred_id: new_user_id,
  });

  return new Response('Success');
});
```

## Security Notes

- This backend doesn't authenticate users (your Supabase does that)
- Validate user IDs in your app before calling `/api/referral/apply`
- Consider rate limiting referral applications
- The backend prevents self-referrals

## Testing

```bash
npm test              # Watch mode
npm run test:run      # Run once
npm run test:ui       # Interactive UI
npm run test:coverage # Coverage report
```

See `TESTING.md` for details.

## License

MIT
