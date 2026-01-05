import { Hono } from 'hono';
import { findMatch } from '../services/fingerprint.js';

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
