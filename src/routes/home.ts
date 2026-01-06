import { Hono } from 'hono';

const app = new Hono();

// Homepage
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="description" content="Téléchargez l'application Croc'Poker gratuite sur iOS et Android. Jouez au poker où vous voulez, quand vous voulez.">
      <meta name="theme-color" content="#0e172e">
      <title>Application Poker Gratuite - Croc'Poker</title>
      <link rel="icon" type="image/x-icon" href="/favicon.ico">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #0a0f1e 0%, #0e172e 50%, #1a2847 100%);
          background-attachment: fixed;
          color: white;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-x: hidden;
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

        body::after {
          content: '';
          position: fixed;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.01) 2px,
            rgba(255, 255, 255, 0.01) 4px
          );
          pointer-events: none;
          z-index: 1;
        }

        .hero-logo {
          max-width: 240px;
          height: auto;
          margin-bottom: 30px;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
          transition: transform 0.3s ease;
        }

        .hero-logo:hover {
          transform: scale(1.05);
        }

        .hero {
          flex: 1;
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;
          padding: 40px 40px;
          gap: 80px;
          min-height: 500px;
          position: relative;
          z-index: 10;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .hero-content {
          flex: 1;
          max-width: 600px;
          text-align: left;
          animation: fadeInLeft 0.8s ease-out;
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .hero-image {
          flex: 1;
          max-width: 500px;
          display: flex;
          justify-content: center;
          align-items: center;
          animation: fadeInRight 0.8s ease-out;
        }

        .hero-image img {
          width: 100%;
          max-width: 350px;
          height: auto;
          filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.5));
          animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(1deg); }
        }

        .hero h1 {
          font-size: 56px;
          font-weight: 700;
          margin-bottom: 24px;
          line-height: 1.1;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .hero h1 .highlight {
          color: #e1a52d;
          background: linear-gradient(135deg, #e1a52d 0%, #f5b73d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero p {
          font-size: 20px;
          margin-bottom: 40px;
          opacity: 0.95;
          max-width: 600px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
        }

        .download-buttons {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          align-items: center;
          animation: fadeIn 1s ease-out 0.3s both;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .store-badge {
          height: 65px;
          display: flex;
          align-items: center;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          position: relative;
        }

        .store-badge::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 10%;
          right: 10%;
          height: 8px;
          background: rgba(225, 165, 45, 0);
          filter: blur(8px);
          transition: all 0.4s ease;
        }

        .store-badge:hover {
          transform: translateY(-8px) scale(1.05);
        }

        .store-badge:hover::after {
          background: rgba(225, 165, 45, 0.4);
          bottom: -12px;
        }

        .store-badge img {
          height: 65px;
          width: auto;
          display: block;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }

        .footer {
          padding: 30px 20px;
          text-align: center;
          font-size: 14px;
          opacity: 0.7;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
          position: relative;
          z-index: 10;
        }

        .footer p {
          margin: 5px 0;
        }

        .footer a {
          color: #e1a52d;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .footer a:hover {
          color: #f5b73d;
        }

        @media (max-width: 1024px) {
          .hero {
            gap: 60px;
            padding: 40px 30px;
          }

          .hero h1 {
            font-size: 48px;
          }
        }

        @media (max-width: 768px) {
          .hero {
            flex-direction: column-reverse;
            gap: 40px;
            padding: 30px 20px;
            min-height: auto;
          }

          .hero-logo {
            max-width: 180px;
            margin-bottom: 25px;
          }

          .hero-content {
            text-align: center;
          }

          .hero h1 {
            font-size: 40px;
            margin-bottom: 20px;
          }

          .hero p {
            font-size: 18px;
            margin-bottom: 35px;
          }

          .hero-image img {
            max-width: 280px;
          }

          .download-buttons {
            flex-direction: column;
            align-items: center;
            gap: 20px;
            justify-content: center;
          }

          .store-badge {
            height: 55px;
          }

          .store-badge img {
            height: 55px;
          }

          .footer {
            padding: 25px 15px;
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .hero {
            padding: 20px 15px;
          }

          .hero-logo {
            max-width: 150px;
            margin-bottom: 20px;
          }

          .hero h1 {
            font-size: 32px;
          }

          .hero p {
            font-size: 16px;
            margin-bottom: 30px;
          }

          .hero-image img {
            max-width: 240px;
          }

          .store-badge {
            height: 50px;
          }

          .store-badge img {
            height: 50px;
          }
        }
      </style>
    </head>
    <body>
      <div class="hero">
        <div class="hero-content">
          <img src="https://images.crpkr.com/images/crocpoker_full_logo.png" alt="Croc'Poker" class="hero-logo" />
          <h1>
            Application Poker <span class="highlight">Gratuite</span>
          </h1>
          <p>
            Téléchargez notre application et profitez d'une expérience de poker exceptionnelle sur iOS et Android. Jouez où vous voulez, quand vous voulez.
          </p>
          <div class="download-buttons">
            <a href="https://apps.apple.com/app/your-app" class="store-badge">
              <img src="https://images.crpkr.com/documents/Download_on_the_App_Store_Badge_FR_RGB_blk_100517.svg" alt="Download on the App Store" />
            </a>
            <a href="https://play.google.com/store/apps/details?id=your.app" class="store-badge">
              <img src="https://images.crpkr.com/documents/GetItOnGooglePlay_Badge_Web_color_French.webp" alt="Get it on Google Play" />
            </a>
          </div>
        </div>
        <div class="hero-image">
          <img src="https://images.crpkr.com/documents/crocpoker-app-scaled.webp" alt="Poker App" />
        </div>
      </div>
      <div class="footer">
        <p>© 2026 Croc'Poker. Tous droits réservés.</p>
        <p style="margin-top: 10px; font-size: 12px; opacity: 0.6;">
          Jouez de manière responsable. 18+
        </p>
      </div>
    </body>
    </html>
  `);
});

export default app;
