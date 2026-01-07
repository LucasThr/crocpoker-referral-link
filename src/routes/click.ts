import { Hono } from 'hono';
import { db } from '../db/index.js';
import { clickRecords } from '../db/schema.js';
import { getRedirectInfo } from '../services/redirect.js';

const app = new Hono();

// Landing page that collects fingerprint via JS
app.get('/r/:code', (c) => {
  const code = c.req.param('code');

  // Return HTML page that collects more fingerprint data
  return c.html(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Ouverture de Croc'Poker...</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#0e172e">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #0a0f1e 0%, #0e172e 50%, #1a2847 100%);
          background-attachment: fixed;
          color: white;
          overflow: hidden;
          position: relative;
        }

        body::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 50%, rgba(225, 165, 45, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(225, 165, 45, 0.08) 0%, transparent 50%);
          pointer-events: none;
          z-index: 1;
        }

        .container {
          text-align: center;
          padding: 40px 20px;
          position: relative;
          z-index: 10;
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .logo {
          width: 180px;
          height: auto;
          margin-bottom: 40px;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .spinner-container {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 30px;
        }

        .spinner {
          position: absolute;
          width: 80px;
          height: 80px;
          border: 3px solid rgba(225, 165, 45, 0.1);
          border-radius: 50%;
        }

        .spinner-inner {
          position: absolute;
          width: 80px;
          height: 80px;
          border: 3px solid transparent;
          border-top-color: #e1a52d;
          border-right-color: #e1a52d;
          border-radius: 50%;
          animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
          filter: drop-shadow(0 0 8px rgba(225, 165, 45, 0.5));
        }

        .spinner-outer {
          position: absolute;
          width: 80px;
          height: 80px;
          border: 2px solid transparent;
          border-bottom-color: #f5b73d;
          border-left-color: #f5b73d;
          border-radius: 50%;
          animation: spin 1.8s cubic-bezier(0.5, 0, 0.5, 1) infinite reverse;
          filter: drop-shadow(0 0 6px rgba(245, 183, 61, 0.4));
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .message {
          font-size: 20px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 12px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .submessage {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 400;
        }

        .dots {
          display: inline-block;
          animation: ellipsis 1.5s infinite;
        }

        @keyframes ellipsis {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }

        .dots::after {
          content: '...';
          animation: ellipsis 1.5s infinite;
        }

        @keyframes ellipsis {
          0% { content: '.'; }
          33% { content: '..'; }
          66%, 100% { content: '...'; }
        }

        @media (max-width: 480px) {
          .logo {
            width: 140px;
            margin-bottom: 35px;
          }

          .spinner-container {
            width: 60px;
            height: 60px;
            margin-bottom: 25px;
          }

          .spinner,
          .spinner-inner,
          .spinner-outer {
            width: 60px;
            height: 60px;
          }

          .message {
            font-size: 18px;
          }

          .submessage {
            font-size: 14px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="https://images.crpkr.com/images/crocpoker_full_logo.png" alt="Croc'Poker" class="logo" />
        <div class="spinner-container">
          <div class="spinner"></div>
          <div class="spinner-inner"></div>
          <div class="spinner-outer"></div>
        </div>
        <p class="message">Ouverture en cours<span class="dots"></span></p>
        <p class="submessage">Vous allez être redirigé vers l'application</p>
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
