import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import 'dotenv/config';

import clickRoutes from './routes/click.js';
import matchRoutes from './routes/match.js';
import referralRoutes from './routes/referral.js';
import homeRoutes from './routes/home.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*', // Adjust for production
}));

// Favicon
app.get('/favicon.ico', serveStatic({ path: './favicon.ico' }));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Routes
app.route('/', clickRoutes);
app.route('/', matchRoutes);
app.route('/', referralRoutes);
app.route('/', homeRoutes);

// Start server
const port = parseInt(process.env.PORT || '3000');

serve({
  fetch: app.fetch,
  port,
});


console.log(`\n🚀 Server running at http://localhost:${port}`);
console.log(`📊 Health check: http://localhost:${port}/health\n`);

