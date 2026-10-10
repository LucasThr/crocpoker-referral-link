import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { sql } from 'drizzle-orm';

import { db } from './db/index.js';
import clickRoutes from './routes/click.js';
import matchRoutes from './routes/match.js';
import referralRoutes from './routes/referral.js';
import homeRoutes from './routes/home.js';
import { messagePage } from './views/message-page.js';

// strict: false → "/r/abc/" routes like "/r/abc" (messaging apps often add a trailing slash).
const app = new Hono({ strict: false });

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*', // Adjust for production
}));

// Static files
app.get('/favicon.ico', serveStatic({ path: './public/favicon.ico' }));
app.get('/crocpoker_full_logo.png', serveStatic({ path: './public/crocpoker_full_logo.png' }));

// Health check
app.get('/health', async (c) => {
  let database: 'ok' | 'error' = 'ok';
  try {
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    console.error('[health] database check failed', err);
    database = 'error';
  }

  const status = database === 'ok' ? 'ok' : 'error';
  return c.json({ status, database }, status === 'ok' ? 200 : 503);
});

// Routes
app.route('/', clickRoutes);
app.route('/', matchRoutes);
app.route('/', referralRoutes);
app.route('/', homeRoutes);

// 404: recover mis-cased referral links ("/R/abc"), JSON for /api/*, branded page otherwise.
app.notFound((c) => {
  const path = c.req.path;

  const referral = path.match(/^\/r\/([^/]+)\/?$/i);
  if (referral && !path.startsWith('/r/')) {
    return c.redirect(`/r/${referral[1]}`);
  }

  if (path.startsWith('/api/')) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.html(
    messagePage({
      title: 'Page introuvable',
      heading: 'Page introuvable',
      message: "Cette page n'existe pas ou le lien est incomplet. Vous pouvez télécharger l'application depuis l'accueil.",
    }),
    404,
  );
});

// Global error handler: JSON for /api/*, branded HTML page otherwise.
app.onError((err, c) => {
  console.error('[unhandled]', c.req.method, c.req.path, err);

  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Internal server error' }, 500);
  }

  return c.html(
    messagePage({
      title: 'Oups',
      heading: 'Oups, une erreur est survenue',
      message: "Quelque chose s'est mal passé de notre côté. Merci de réessayer dans quelques instants.",
    }),
    500,
  );
});

export default app;
