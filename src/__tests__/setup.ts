import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import 'dotenv/config';

// Mock environment variables for tests
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.BASE_URL = 'https://test.com';
process.env.PORT = '3001';

beforeAll(() => {
  // Setup before all tests
});

afterAll(() => {
  // Cleanup after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});
