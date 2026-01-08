import { Hono } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { findMatch } from '../services/fingerprint.js';

const app = new Hono();

// Called by the app on first launch (iOS only)
app.post('/api/match', async (c) => {
  let fingerprintData;

  try {
    fingerprintData = await c.req.json();
  } catch (error) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // Extract IP and User Agent from headers (server-side for security)
  const ip = c.req.header('x-forwarded-for')?.split(',')[0] ||
             c.req.header('x-real-ip') ||
             'unknown';
  const userAgent = c.req.header('user-agent') || '';

  // Validate required fields
  if (!fingerprintData.platform) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  // Combine client data with server-extracted data
  const fingerprint = {
    ...fingerprintData,
    ip_address: ip,
    user_agent: userAgent,
  };

  const result = await findMatch(fingerprint);
  return c.json(result);
});

// Called by the device to retrieve its own info from request headers
app.get('/api/device-info', async (c) => {
  const userAgent = c.req.header('user-agent') || '';

  // Get IP from proxy headers (production) or connection info (development)
  let ip = c.req.header('x-forwarded-for')?.split(',')[0] ||
           c.req.header('x-real-ip');

  if (!ip) {
    try {
      const connInfo = getConnInfo(c);
      ip = connInfo.remote.address || 'unknown';
    } catch (e) {
      ip = 'unknown';
    }
  }

  // Return the device info extracted from request
  return c.json({
    device_info: {
      ip_address: ip,
      user_agent: userAgent,
    }
  });
});

export default app;
