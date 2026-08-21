import { ConfigService } from '@nestjs/config';

const WEAK_SECRETS = new Set([
  '',
  'dev-secret',
  'dev-jwt-secret-change-in-production',
  'change-me',
  'secret',
]);

/** Resolve JWT signing secret; fails closed in production. */
export function resolveJwtSecret(config: ConfigService): string {
  const secret = (config.get<string>('JWT_SECRET') ?? '').trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (!secret || WEAK_SECRETS.has(secret)) {
    if (isProd) {
      throw new Error(
        'JWT_SECRET must be set to a strong unique value in production (min 32 chars).',
      );
    }
    return secret || 'dev-secret';
  }

  if (isProd && secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }

  return secret;
}
