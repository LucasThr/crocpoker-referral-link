# Testing Guide

This project uses Vitest for comprehensive testing coverage.

## Test Structure

```
src/
├── __tests__/
│   ├── setup.ts              # Test environment setup
│   ├── fixtures/             # Mock data
│   │   ├── clicks.ts
│   │   ├── users.ts
│   │   └── referrals.ts
│   └── utils/                # Test utilities
│       └── db-mock.ts
├── services/
│   ├── fingerprint.ts
│   ├── fingerprint.test.ts   # Unit tests
│   ├── redirect.ts
│   └── redirect.test.ts      # Unit tests
├── routes/
│   ├── click.ts
│   ├── click.test.ts         # Integration tests
│   ├── match.ts
│   ├── match.test.ts         # Integration tests
│   ├── referral.ts
│   └── referral.test.ts      # Integration tests
└── db/
    ├── schema.ts
    └── schema.test.ts        # Database schema tests
```

## Running Tests

### Watch Mode (Development)
```bash
npm test
```
Runs tests in watch mode. Tests automatically re-run when files change.

### Run Once
```bash
npm run test:run
```
Runs all tests once and exits. Useful for CI/CD.

### UI Mode
```bash
npm run test:ui
```
Opens an interactive UI in the browser to explore and run tests.

### Coverage Report
```bash
npm run test:coverage
```
Generates a code coverage report in `coverage/` directory.

## Test Categories

### Unit Tests
Test individual functions and services in isolation:
- **Fingerprint Service** (`src/services/fingerprint.test.ts`)
  - Matching algorithm
  - Scoring calculations
  - Database interactions

- **Redirect Service** (`src/services/redirect.test.ts`)
  - Platform detection
  - URL generation
  - User agent parsing

### Integration Tests
Test API endpoints and route handlers:
- **Click Routes** (`src/routes/click.test.ts`)
  - Landing page rendering
  - Fingerprint collection
  - Redirect logic

- **Match Routes** (`src/routes/match.test.ts`)
  - Fingerprint matching endpoint
  - Validation
  - Response format

- **Referral Routes** (`src/routes/referral.test.ts`)
  - Bonus application
  - Link generation
  - Error handling

### Database Tests
Test schema definitions and type safety:
- **Schema Tests** (`src/db/schema.test.ts`)
  - Table structure
  - Type inference
  - Relationships

## Test Coverage

Current test coverage includes:
- ✅ Fingerprint matching algorithm with various confidence levels
- ✅ Platform detection for iOS, Android, and desktop
- ✅ Click recording and expiration
- ✅ Referral bonus application and validation
- ✅ Duplicate referral prevention
- ✅ Error handling and edge cases
- ✅ Database schema validation

## Mocking

The tests use Vitest's mocking capabilities to:
- Mock database connections
- Mock service dependencies
- Avoid hitting real databases during tests
- Test error scenarios

## Fixtures

Test fixtures provide consistent mock data:
- `mockClickRecord` - Sample click record
- `mockFingerprint` - Sample device fingerprint
- `mockUser` - Sample user data
- `mockReferral` - Sample referral record

## Writing New Tests

1. Create a `.test.ts` file next to the file you're testing
2. Import test utilities from `vitest`
3. Use fixtures from `src/__tests__/fixtures/`
4. Mock external dependencies
5. Follow the existing test patterns

Example:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from './my-module';

describe('My Module', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

## CI/CD Integration

Add this to your CI pipeline:
```bash
npm run test:run
npm run test:coverage
```

## Coverage Goals

- Aim for >80% code coverage
- Focus on critical paths (fingerprint matching, referral logic)
- Test error cases and edge scenarios
- Ensure all API endpoints are tested
