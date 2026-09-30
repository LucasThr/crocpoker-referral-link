import { Hono } from 'hono';
import { db } from '../db/index.js';
import { clickRecords } from '../db/schema.js';
import { getRedirectInfo } from '../services/redirect.js';
import { isValidReferralCode, recoverReferralCode } from '../services/referral-code.js';
import { messagePage } from '../views/message-page.js';

const app = new Hono();

// How long the redirect may wait for the click record to be stored.
// Past this, the redirect goes out and the insert finishes in the background.
export const STORE_CLICK_TIMEOUT_MS = 1500;

// Landing page that collects fingerprint via JS
app.get('/r/:code', (c) => {
  const rawCode = c.req.param('code');

  // The code is inlined in HTML and JS below: only accept a safe charset.
  if (!isValidReferralCode(rawCode)) {
    const recovered = recoverReferralCode(rawCode);
    if (recovered) {
      return c.redirect(`/r/${recovered}`);
    }
    return c.html(
      messagePage({
        title: 'Lien invalide',
        heading: 'Ce lien ne semble pas valide',
        message: "Vérifiez le lien de parrainage qui vous a été envoyé, ou téléchargez l'application depuis notre site.",
      }),
      404,
    );
  }
  const code = rawCode;

  // Return HTML page that collects more fingerprint data
  return c.html(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Ouverture de Croc'Poker...</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#0e172e">

      <!-- Open Graph / Facebook / LinkedIn -->
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://croc.poker/r/${code}">
      <meta property="og:title" content="Croc'Poker - Poker  Gratuit dans les bars près de chez toi !">
      <meta property="og:description" content="Téléchargez l'application Croc'Poker gratuite et jouez au poker dans les bars près de chez vous. Disponible sur iOS et Android.">
      <meta property="og:image" content="https://images.crpkr.com/images/crocpoker-social-preview.png">
      <meta property="og:image:width" content="1200">
      <meta property="og:image:height" content="630">
      <meta property="og:locale" content="fr_FR">
      <meta property="og:site_name" content="Croc'Poker">

      <!-- Twitter Card -->
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:url" content="https://croc.poker/r/${code}">
      <meta name="twitter:title" content="Croc'Poker - Poker  Gratuit dans les bars près de chez toi !">
      <meta name="twitter:description" content="Téléchargez l'application Croc'Poker gratuite et jouez au poker dans les bars près de chez vous. Disponible sur iOS et Android.">
      <meta name="twitter:image" content="https://images.crpkr.com/images/crocpoker-social-preview.png">

      <!-- iOS App Links -->
      <meta property="al:ios:url" content="crocpoker://referral/${code}">
      <meta property="al:ios:app_store_id" content="6741067848">
      <meta property="al:ios:app_name" content="Croc'Poker">

      <!-- Android App Links -->
      <meta property="al:android:url" content="crocpoker://referral/${code}">
      <meta property="al:android:package" content="com.crocpoker">
      <meta property="al:android:app_name" content="Croc'Poker">

      <!-- Loaded without blocking rendering or the redirect script below -->
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
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

        .fallback {
          display: none;
          margin-top: 28px;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.7);
        }

        .fallback a {
          color: #f5b73d;
          font-weight: 500;
          text-decoration: underline;
        }

        body.show-fallback .fallback,
        noscript .fallback {
          display: block;
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
        <img src="/crocpoker_full_logo.png" alt="Croc'Poker" class="logo" />
        <div class="spinner-container">
          <div class="spinner"></div>
          <div class="spinner-inner"></div>
          <div class="spinner-outer"></div>
        </div>
        <p class="message">Ouverture en cours<span class="dots"></span></p>
        <p class="submessage">Vous allez être redirigé vers l'application</p>
        <p class="fallback">
          Rien ne se passe ?
          <a id="manual-link" href="/api/process-click?code=${code}">Ouvrir manuellement</a>
        </p>
        <noscript>
          <meta http-equiv="refresh" content="0;url=/api/process-click?code=${code}">
          <p class="fallback">
            <a href="/api/process-click?code=${code}">Ouvrir l'application</a>
          </p>
        </noscript>
      </div>
      <script>
        (function () {
          var code = '${code}';
          var target = '/api/process-click?code=' + encodeURIComponent(code);

          // Fingerprint collection is best-effort: any failure still redirects.
          try {
            var tz = '';
            try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
            var params = new URLSearchParams();
            params.set('code', code);
            params.set('sw', String(screen.width || 0));
            params.set('sh', String(screen.height || 0));
            params.set('tz', tz);
            params.set('lang', navigator.language || '');
            params.set('touch', navigator.maxTouchPoints > 1 ? '1' : '0');
            target = '/api/process-click?' + params.toString();
          } catch (e) {}

          var link = document.getElementById('manual-link');
          if (link) link.href = target;

          // If the navigation is blocked or slow, give the user a manual way out.
          setTimeout(function () {
            document.body.className += ' show-fallback';
          }, 3000);

          // replace(): the back button should not land on this spinner page.
          window.location.replace(target);
        })();
      </script>
    </body>
    </html>
  `);
});

// Process the click and redirect
app.get('/api/process-click', async (c) => {
  // An invalid code still gets the user to the store, just without tracking.
  const code = recoverReferralCode(c.req.query('code') || '') ?? '';
  const screenWidth = parseFloat(c.req.query('sw') || '0') || 0;
  const screenHeight = parseFloat(c.req.query('sh') || '0') || 0;
  const timezone = c.req.query('tz') || '';
  const language = c.req.query('lang') || '';
  const touch = c.req.query('touch') === '1';

  const userAgent = c.req.header('user-agent') || '';
  const ip = c.req.header('x-forwarded-for')?.split(',')[0] ||
             c.req.header('x-real-ip') ||
             'unknown';

  // Get platform-specific redirect info
  const redirectInfo = getRedirectInfo(userAgent, code, { touch });

  // Only store fingerprint for iOS (Android uses Install Referrer).
  // Best-effort: a DB failure or a slow DB must not block the redirect to the store.
  if (redirectInfo.platform === 'ios' && code) {
    const store = Promise.resolve(
      db.insert(clickRecords).values({
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
      }),
    ).then(
      () => true,
      (error) => {
        console.error('[process-click] Failed to store click record:', error);
        return false;
      },
    );

    const stored = await waitAtMost(store, STORE_CLICK_TIMEOUT_MS);
    if (stored === undefined) {
      console.warn(`[process-click] Click record not stored within ${STORE_CLICK_TIMEOUT_MS}ms, redirecting anyway`);
    }
  }

  return c.redirect(redirectInfo.redirectUrl);
});

// Resolves with the promise's value, or undefined once `ms` has elapsed.
// The underlying promise keeps running in the background.
function waitAtMost<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export default app;
