interface MessagePageOptions {
  title: string;
  heading: string;
  message: string;
  linkHref?: string;
  linkLabel?: string;
}

// Branded full-page message (used for 404s and unexpected errors).
export function messagePage(opts: MessagePageOptions): string {
  const linkHref = opts.linkHref ?? '/';
  const linkLabel = opts.linkLabel ?? "Retour à l'accueil";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(opts.title)} — Croc'Poker</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0e172e">
  <meta name="robots" content="noindex">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    body {
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; padding: 20px;
      background: linear-gradient(135deg, #0a0f1e 0%, #0e172e 50%, #1a2847 100%);
      background-attachment: fixed; color: white; position: relative; overflow-x: hidden;
    }
    body::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(circle at 20% 50%, rgba(225, 165, 45, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(225, 165, 45, 0.08) 0%, transparent 50%);
      pointer-events: none; z-index: 1;
    }
    .container {
      text-align: center; padding: 40px 24px; position: relative; z-index: 10;
      max-width: 480px; animation: fadeIn 0.6s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .logo { width: 180px; height: auto; margin-bottom: 32px; filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3)); }
    h1 {
      font-size: 28px; font-weight: 700; margin-bottom: 16px;
      background: linear-gradient(135deg, #e1a52d 0%, #f5b73d 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    p { font-size: 16px; line-height: 1.6; color: rgba(255, 255, 255, 0.8); margin-bottom: 28px; }
    .home-link {
      display: inline-block; padding: 12px 28px;
      background: linear-gradient(135deg, #e1a52d 0%, #f5b73d 100%);
      color: #0e172e; text-decoration: none; font-weight: 500; border-radius: 8px;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 4px 12px rgba(225, 165, 45, 0.3);
    }
    .home-link:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(225, 165, 45, 0.4); }
    @media (max-width: 480px) {
      .logo { width: 140px; margin-bottom: 24px; }
      h1 { font-size: 24px; }
      p { font-size: 15px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="/crocpoker_full_logo.png" alt="Croc'Poker" class="logo" />
    <h1>${escapeHtml(opts.heading)}</h1>
    <p>${escapeHtml(opts.message)}</p>
    <a href="${escapeHtml(linkHref)}" class="home-link">${escapeHtml(linkLabel)}</a>
  </div>
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
