import { serve } from '@hono/node-server';
import 'dotenv/config';

import app from './app.js';

// Start server
const port = parseInt(process.env.PORT || '3000');

serve({
  fetch: app.fetch,
  port,
});

console.log(`\n🚀 Server running at http://localhost:${port}`);
console.log(`📊 Health check: http://localhost:${port}/health\n`);
