import { HttpException, HttpStatus } from '@nestjs/common';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

export function assertRateLimit(key: string, maxAttempts: number, windowMs: number): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= maxAttempts) {
    const retryMinutes = Math.ceil((entry.resetAt - now) / 60000);
    throw new HttpException(
      `Muitas tentativas. Tente novamente em ${retryMinutes} minuto(s).`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  entry.count += 1;
  store.set(key, entry);
}
