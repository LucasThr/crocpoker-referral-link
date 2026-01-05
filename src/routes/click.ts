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
