import { describe, it, expect, vi } from 'vitest';

vi.mock('./db/index.js', () => ({
  db: {
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    execute: vi.fn().mockResolvedValue([]),
  },
}));

import app from './app.js';

// Routes must be registered before the first request builds the router.
app.get('/__boom', () => {
  throw new Error('boom');
});

describe('App routing robustness', () => {
  it('should serve the landing page with a trailing slash', async () => {
    const response = await app.request('/r/TESTCODE123/');

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('/api/process-click?code=TESTCODE123');
  });

  it('should redirect an upper-cased referral path to the canonical one', async () => {
    const response = await app.request('/R/TESTCODE123');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/r/TESTCODE123');
  });

  it('should keep query strings added by social apps', async () => {
    const response = await app.request('/r/TESTCODE123?fbclid=abc');

    expect(response.status).toBe(200);
  });

  it('should return a branded 404 page for unknown paths', async () => {
    const response = await app.request('/nope');

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(await response.text()).toContain('Page introuvable');
  });

  it('should return JSON 404 for unknown API paths', async () => {
    const response = await app.request('/api/nope');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it('should return a branded error page on unexpected errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await app.request('/__boom');

    expect(response.status).toBe(500);
    expect(await response.text()).toContain('Oups, une erreur est survenue');
    errorSpy.mockRestore();
  });
});
