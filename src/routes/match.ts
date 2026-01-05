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

// Called by the device to retrieve its own info from request headers
app.get('/api/device-info', async (c) => {
  const userAgent = c.req.header('user-agent') || '';
  const ip = c.req.header('x-forwarded-for')?.split(',')[0] ||
             c.req.header('x-real-ip') ||
             'unknown';

  // Return the device info extracted from request
  return c.json({
    device_info: {
      ip_address: ip,
      user_agent: userAgent,
    }
  });
});

export default app;
