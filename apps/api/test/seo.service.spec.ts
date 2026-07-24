import { ConfigService } from '@nestjs/config';
import { SeoService } from '../src/seo/seo.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('SeoService', () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'SITE_URL') return 'https://example.com';
      if (key === 'SEO_SITE_NAME') return 'Acompanhante';
      return fallback;
    }),
  };

  const service = new SeoService({} as PrismaService, config as unknown as ConfigService);

  it('builds WebSite schema for home', () => {
    const schema = service.getSchema('home');

    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@graph': expect.arrayContaining([
        expect.objectContaining({
          '@type': 'WebSite',
          url: 'https://example.com',
        }),
      ]),
    });
  });

  it('builds Person schema for profile pages', () => {
    const schema = service.getSchema('profile', {
      slug: 'maria',
      name: 'Maria',
      city: 'São Paulo',
      description: 'Perfil premium',
    });

    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@graph': expect.arrayContaining([
        expect.objectContaining({
          '@type': 'Person',
          name: 'Maria',
          url: 'https://example.com/perfil/maria',
        }),
      ]),
    });
  });
});
