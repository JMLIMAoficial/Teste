import { BadRequestException } from '@nestjs/common';

export const SOCIAL_LINK_PLATFORMS = ['privacy', 'onlyfans', 'x', 'instagram'] as const;

export type SocialLinkPlatform = (typeof SOCIAL_LINK_PLATFORMS)[number];
export type SocialLinks = Partial<Record<SocialLinkPlatform, string>>;

const ALLOWED_HOSTS: Record<SocialLinkPlatform, string[]> = {
  privacy: ['privacy.com.br', 'www.privacy.com.br'],
  onlyfans: ['onlyfans.com', 'www.onlyfans.com'],
  x: ['x.com', 'www.x.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
};

const PLATFORM_LABELS: Record<SocialLinkPlatform, string> = {
  privacy: 'Privacy',
  onlyfans: 'OnlyFans',
  x: 'X',
  instagram: 'Instagram',
};

function validatedUrl(platform: SocialLinkPlatform, value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;

  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== 'https:' ||
      !ALLOWED_HOSTS[platform].includes(url.hostname.toLowerCase()) ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function parseSocialLinks(value: unknown): SocialLinks {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return SOCIAL_LINK_PLATFORMS.reduce<SocialLinks>((links, platform) => {
    const url = validatedUrl(platform, (value as Record<string, unknown>)[platform]);
    if (url) links[platform] = url;
    return links;
  }, {});
}

export function normalizeSocialLinks(value: Record<string, unknown>): SocialLinks {
  return SOCIAL_LINK_PLATFORMS.reduce<SocialLinks>((links, platform) => {
    const raw = value[platform];
    if (raw === undefined || raw === null || raw === '') return links;

    const url = validatedUrl(platform, raw);
    if (!url) {
      throw new BadRequestException(
        `Use um link HTTPS válido do ${PLATFORM_LABELS[platform]}`,
      );
    }
    links[platform] = url;
    return links;
  }, {});
}
