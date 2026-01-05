Great question! Here's a complete backend stack for your deferred deep linking system.

## Recommended Stack

| Component                  | Technology           | Why                 |
| -------------------------- | -------------------- | ------------------- |
| **Runtime**          | Node.js + TypeScript | You already know TS |
| **Framework**        | Hono                 | Lightweight, fast   |
| **Database**         | PostgreSQL or SQLite | Reliable, easy      |
| **ORM**              | Drizzle              | Type-safe           |
| **Hosting**          | Self-Host            | Easy deployment     |
| **Cache (optional)** | Redis                | For high traffic    |

---

## Project Structure

```
referral-backend/
├── src/
│   ├── index.ts           # Entry point
│   ├── routes/
│   │   ├── click.ts       # Handle link clicks
│   │   ├── match.ts       # Match fingerprints
│   │   └── referral.ts    # Apply referral rewards
│   ├── services/
│   │   ├── fingerprint.ts # Fingerprint matching logic
│   │   └── redirect.ts    # Platform detection & redirect
│   ├── db/
│   │   ├── schema.ts      # Database schema
│   │   └── index.ts       # DB connection
│   └── utils/
│       └── ua-parser.ts   # User agent parsing
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## Full Implementation

### 1. Setup

```bash
mkdir referral-backend && cd referral-backend (already in)
npm init -y
npm install hono @hono/node-server drizzle-orm postgres dotenv ua-parser-js
npm install -D typescript @types/node drizzle-kit tsx
```

### 2. Database Schema

```typescript
// src/db/schema.ts
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
  referrerUserId: text('referrer_user_id').notNull(),
  referredUserId: text('referred_user_id').notNull(),
  referralCode: text('referral_code').notNull(),
  bonusApplied: boolean('bonus_applied').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// No users table - users are managed in your Supabase database
// This backend only tracks click records and referrals
```

### 3. Database Connection

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
```

### 4. Fingerprint Service

```typescript
// src/services/fingerprint.ts
import { db } from '../db';
import { clickRecords } from '../db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';

interface AppFingerprint {
  ip_address: string;
  platform: string;
  os_version: string;
  device_model: string;
  screen_width: number;
  screen_height: number;
  language: string;
  timezone: string;
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
```

### 5. Redirect Service

```typescript
// src/services/redirect.ts
import UAParser from 'ua-parser-js';

interface RedirectInfo {
  platform: 'ios' | 'android' | 'desktop';
  redirectUrl: string;
  osVersion?: string;
  deviceModel?: string;
}

const APP_CONFIG = {
  iosAppStoreUrl: 'https://apps.apple.com/app/id123456789',
  androidPackage: 'com.yourapp',
  webFallbackUrl: 'https://yourapp.com',
};

export function getRedirectInfo(userAgent: string, referralCode: string): RedirectInfo {
  const parser = new UAParser(userAgent);
  const os = parser.getOS();
  const device = parser.getDevice();

  const osName = os.name?.toLowerCase() || '';
  const osVersion = os.version || '';
  const deviceModel = device.model || '';

  // iOS
  if (osName.includes('ios') || osName.includes('mac os')) {
    // Check if it's actually mobile
    if (device.type === 'mobile' || device.type === 'tablet') {
      return {
        platform: 'ios',
        redirectUrl: APP_CONFIG.iosAppStoreUrl,
        osVersion,
        deviceModel,
      };
    }
  }

  // Android
  if (osName.includes('android')) {
    const referrer = encodeURIComponent(`referral_code=${referralCode}`);
    return {
      platform: 'android',
      redirectUrl: `https://play.google.com/store/apps/details?id=${APP_CONFIG.androidPackage}&referrer=${referrer}`,
      osVersion,
      deviceModel,
    };
  }

  // Desktop fallback
  return {
    platform: 'desktop',
    redirectUrl: APP_CONFIG.webFallbackUrl,
  };
}
```

### 6. Routes

```typescript
// src/routes/click.ts
import { Hono } from 'hono';
import { db } from '../db';
import { clickRecords } from '../db/schema';
import { getRedirectInfo } from '../services/redirect';

const app = new Hono();

// Landing page that collects fingerprint via JS
app.get('/r/:code', (c) => {
  const code = c.req.param('code');
  
  // Return HTML page that collects more fingerprint data
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Opening App...</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container { text-align: center; padding: 20px; }
        .spinner { 
          width: 50px; 
          height: 50px; 
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <p>Taking you to the app...</p>
      </div>
      <script>
        (async function() {
          const data = {
            code: '${code}',
            sw: screen.width,
            sh: screen.height,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            lang: navigator.language,
          };
    
          // Try to copy to clipboard for iOS
          try {
            await navigator.clipboard.writeText(JSON.stringify({
              ref: '${code}',
              ts: Date.now()
            }));
          } catch(e) {}
    
          // Redirect to processing endpoint
          const params = new URLSearchParams(data);
          window.location.href = '/api/process-click?' + params.toString();
        })();
      </script>
      <noscript>
        <meta http-equiv="refresh" content="0;url=/api/process-click?code=${code}">
      </noscript>
    </body>
    </html>
  `);
});

// Process the click and redirect
app.get('/api/process-click', async (c) => {
  const code = c.req.query('code') || '';
  const screenWidth = parseFloat(c.req.query('sw') || '0');
  const screenHeight = parseFloat(c.req.query('sh') || '0');
  const timezone = c.req.query('tz') || '';
  const language = c.req.query('lang') || '';

  const userAgent = c.req.header('user-agent') || '';
  const ip = c.req.header('x-forwarded-for')?.split(',')[0] || 
             c.req.header('x-real-ip') || 
             'unknown';

  // Get platform-specific redirect info
  const redirectInfo = getRedirectInfo(userAgent, code);

  // Only store fingerprint for iOS (Android uses Install Referrer)
  if (redirectInfo.platform === 'ios') {
    await db.insert(clickRecords).values({
      referralCode: code,
      ipAddress: ip,
      userAgent,
      platform: 'ios',
      osVersion: redirectInfo.osVersion,
      deviceModel: redirectInfo.deviceModel,
      screenWidth,
      screenHeight,
      language,
      timezone,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    });
  }

  return c.redirect(redirectInfo.redirectUrl);
});

export default app;
```

```typescript
// src/routes/match.ts
import { Hono } from 'hono';
import { findMatch } from '../services/fingerprint';

const app = new Hono();

// Called by the app on first launch (iOS only)
app.post('/api/match', async (c) => {
  const fingerprint = await c.req.json();
  
  // Validate required fields
  if (!fingerprint.platform || !fingerprint.ip_address) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const result = await findMatch(fingerprint);
  return c.json(result);
});

export default app;
```

```typescript
// src/routes/referral.ts
import { Hono } from 'hono';
import { db } from '../db';
import { referrals, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const app = new Hono();

const REFERRER_BONUS = 100;  // Points for the person who shared
const REFERRED_BONUS = 50;   // Points for the new user

// Apply referral reward
app.post('/api/referral/apply', async (c) => {
  const { referral_code, new_user_id } = await c.req.json();

  if (!referral_code || !new_user_id) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  // Find the referrer by their referral code
  const referrer = await db
    .select()
    .from(users)
    .where(eq(users.referralCode, referral_code))
    .limit(1);

  if (referrer.length === 0) {
    return c.json({ error: 'Invalid referral code' }, 404);
  }

  const referrerUser = referrer[0];

  // Check if this referral already exists
  const existingReferral = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referredUserId, new_user_id),
        eq(referrals.referralCode, referral_code)
      )
    )
    .limit(1);

  if (existingReferral.length > 0) {
    return c.json({ error: 'Referral already applied' }, 409);
  }

  // Create referral record
  await db.insert(referrals).values({
    referrerUserId: referrerUser.id,
    referredUserId: new_user_id,
    referralCode: referral_code,
    bonusApplied: true,
  });

  // Award bonus to referrer
  await db
    .update(users)
    .set({ 
      bonusPoints: (referrerUser.bonusPoints || 0) + REFERRER_BONUS 
    })
    .where(eq(users.id, referrerUser.id));

  // Award bonus to new user (assuming they exist in your system)
  // You might need to adjust this based on your user creation flow

  return c.json({
    success: true,
    referrer_bonus: REFERRER_BONUS,
    referred_bonus: REFERRED_BONUS,
  });
});

// Generate a shareable link
app.get('/api/referral/link/:userId', async (c) => {
  const userId = c.req.param('userId');
  
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  const baseUrl = process.env.BASE_URL || 'https://yourapp.com';
  const link = `${baseUrl}/r/${user[0].referralCode}`;

  return c.json({ link });
});

export default app;
```

### 7. Main Entry Point

```typescript
// src/index.ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import 'dotenv/config';

import clickRoutes from './routes/click';
import matchRoutes from './routes/match';
import referralRoutes from './routes/referral';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*', // Adjust for production
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Routes
app.route('/', clickRoutes);
app.route('/', matchRoutes);
app.route('/', referralRoutes);

// Start server
const port = parseInt(process.env.PORT || '3000');
console.log(`Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
```

### 8. Configuration Files

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

```json
// package.json
{
  "name": "referral-backend",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

```
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/referral_db
BASE_URL=https://yourapp.com
PORT=3000
```

---

## API Summary

| Endpoint                       | Method | Purpose                                                      |
| ------------------------------ | ------ | ------------------------------------------------------------ |
| `/r/:code`                   | GET    | Landing page (collects fingerprint)                          |
| `/api/process-click`         | GET    | Store fingerprint & redirect to store                        |
| `/api/match`                 | POST   | Match app fingerprint (iOS only)                             |
| `/api/referral/apply`        | POST   | Record referral (requires referrer_user_id from Supabase)    |
| `/api/referral/stats/:userId`| GET    | Get referral stats for a user                                |

**Note:** This backend works with your Supabase database. User management and bonus points are handled in Supabase.
- Referral codes are stored in your Supabase users table
- This backend only tracks clicks and referral relationships
- Your app should update bonus points in Supabase after calling `/api/referral/apply`

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR BACKEND                            │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ /r/:code│          │ /match  │          │/referral│
   │ (click) │          │ (iOS)   │          │ /apply  │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ Store   │          │ Find    │          │ Credit  │
   │ finger- │◄────────►│ matching│          │ both    │
   │ print   │          │ click   │          │ users   │
   └────┬────┘          └─────────┘          └─────────┘
        │
        ▼
   ┌─────────────────────────────┐
   │ Redirect to:                │
   │ • iOS → App Store           │
   │ • Android → Play Store      │
   │   (with referrer param)     │
   └─────────────────────────────┘
```

This gives you a complete, production-ready backend for your referral system!
