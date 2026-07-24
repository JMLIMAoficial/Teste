import { assertRateLimit } from '../src/common/rate-limit.util';
import { HttpException } from '@nestjs/common';

describe('assertRateLimit', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests within the limit', () => {
    expect(() => assertRateLimit('test-key', 3, 60_000)).not.toThrow();
    expect(() => assertRateLimit('test-key', 3, 60_000)).not.toThrow();
    expect(() => assertRateLimit('test-key', 3, 60_000)).not.toThrow();
  });

  it('blocks requests above the limit', () => {
    assertRateLimit('blocked-key', 2, 60_000);
    assertRateLimit('blocked-key', 2, 60_000);

    expect(() => assertRateLimit('blocked-key', 2, 60_000)).toThrow(HttpException);
  });

  it('resets after the window expires', () => {
    assertRateLimit('reset-key', 1, 1_000);
    expect(() => assertRateLimit('reset-key', 1, 1_000)).toThrow(HttpException);

    jest.advanceTimersByTime(1_001);
    expect(() => assertRateLimit('reset-key', 1, 1_000)).not.toThrow();
  });
});
