export const mockClickRecord = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  referralCode: 'TESTCODE123',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
  platform: 'ios',
  osVersion: '15.0',
  deviceModel: 'iPhone 13',
  screenWidth: 390,
  screenHeight: 844,
  language: 'en-US',
  timezone: 'America/New_York',
  matched: false,
  matchedAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  expiresAt: new Date('2024-01-03T00:00:00Z'),
};

export const mockFingerprint = {
  ip_address: '192.168.1.1',
  platform: 'ios',
  os_version: '15.0',
  device_model: 'iPhone 13',
  screen_width: 390,
  screen_height: 844,
  language: 'en-US',
  timezone: 'America/New_York',
};

export const mockFingerprintPartialMatch = {
  ip_address: '192.168.1.1',
  platform: 'ios',
  os_version: '15.1', // Different OS version
  device_model: 'iPhone 13',
  screen_width: 390,
  screen_height: 844,
  language: 'en-US',
  timezone: 'America/New_York',
};

export const mockFingerprintNoMatch = {
  ip_address: '10.0.0.1', // Different IP
  platform: 'ios',
  os_version: '14.0',
  device_model: 'iPhone 12',
  screen_width: 375,
  screen_height: 812,
  language: 'fr-FR',
  timezone: 'Europe/Paris',
};
