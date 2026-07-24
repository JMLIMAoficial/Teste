import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { cityToSlug } from '../common/profile.mapper';

@Injectable()
export class SeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getMeta(pageType: string, params?: { slug?: string; name?: string; city?: string }) {
    const siteName = this.config.get('SEO_SITE_NAME', 'Acompanhante');

    const templates: Record<string, { title: string; description: string; robots?: string }> = {
      home: {
        title: `${siteName} — Acompanhantes Premium`,
        description:
          'Descubra acompanhantes premium com confiança, sofisticação e facilidade de navegação.',
      },
      profile: {
        title: params?.name
          ? `${params.name} — ${params.city ?? 'Brasil'} | ${siteName}`
          : `Perfil | ${siteName}`,
        description: `Conheça ${params?.name ?? 'este perfil'}, acompanhante em ${params?.city ?? 'Brasil'}.`,
      },
      search: {
        title: `Buscar acompanhantes — ${siteName}`,
        description: 'Encontre acompanhantes por nome, cidade ou categoria.',
        robots: 'noindex, follow',
      },
      rankings: {
        title: `Rankings — ${siteName}`,
        description: 'Perfis mais populares e em alta na plataforma.',
      },
      city: {
        title: `Acompanhantes em ${params?.name ?? params?.slug} — ${siteName}`,
        description: `Encontre acompanhantes premium em ${params?.name ?? params?.slug}.`,
      },
      category: {
        title: `${params?.name ?? params?.slug} — Acompanhantes | ${siteName}`,
        description: `Perfis com a categoria ${params?.name ?? params?.slug}.`,
      },
    };

    const t = templates[pageType] ?? templates.home;
    const domain = this.config.get('SITE_URL', 'http://localhost:3000');

    return {
      title: t.title,
      description: t.description,
      robots: t.robots ?? 'index, follow',
      ogType: pageType === 'profile' ? 'profile' : 'website',
      canonical:
        pageType === 'profile' && params?.slug
          ? `${domain}/perfil/${params.slug}`
          : pageType === 'city' && params?.slug
            ? `${domain}/cidade/${params.slug}`
            : pageType === 'category' && params?.slug
              ? `${domain}/categoria/${params.slug}`
              : domain,
    };
  }

  getSchema(
    pageType: string,
    params?: {
      slug?: string;
      name?: string;
      city?: string;
      description?: string;
      imageUrl?: string;
    },
  ) {
    const siteName = this.config.get('SEO_SITE_NAME', 'Acompanhante');
    const domain = this.config.get('SITE_URL', 'http://localhost:3000');

    if (pageType === 'home') {
      return {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            name: siteName,
            url: domain,
            description: 'Plataforma premium para descoberta de acompanhantes.',
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${domain}/busca?q={search_term_string}`,
              },
              'query-input': 'required name=search_term_string',
            },
          },
          {
            '@type': 'Organization',
            name: siteName,
            url: domain,
          },
        ],
      };
    }

    if (pageType === 'profile' && params?.slug && params?.name) {
      const profileUrl = `${domain}/perfil/${params.slug}`;
      return {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Person',
            name: params.name,
            url: profileUrl,
            description: params.description,
            image: params.imageUrl,
            ...(params.city
              ? {
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: params.city,
                    addressCountry: 'BR',
                  },
                }
              : {}),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Início',
                item: domain,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: params.name,
                item: profileUrl,
              },
            ],
          },
        ],
      };
    }

    return null;
  }

  async generateSitemap(): Promise<string> {
    const domain = this.config.get('SITE_URL', 'http://localhost:3000');
    const now = new Date().toISOString().split('T')[0];

    const profiles = await this.prisma.profile.findMany({
      where: { status: 'approved', isPublic: true, seoIndexable: true, deletedAt: null },
      select: { slug: true, updatedAt: true },
    });

    const tags = await this.prisma.tag.findMany({
      where: { isActive: true },
      select: { slug: true },
    });

    const cities = await this.prisma.profileLocation.findMany({
      where: { profile: { status: 'approved', isPublic: true } },
      select: { city: true },
      distinct: ['city'],
    });

    const urls: Array<{ loc: string; priority: string; changefreq: string }> = [
      { loc: domain, priority: '1.0', changefreq: 'daily' },
      { loc: `${domain}/rankings`, priority: '0.8', changefreq: 'daily' },
      { loc: `${domain}/busca`, priority: '0.5', changefreq: 'weekly' },
    ];

    for (const p of profiles) {
      urls.push({
        loc: `${domain}/perfil/${p.slug}`,
        priority: '0.8',
        changefreq: 'daily',
      });
    }

    for (const t of tags) {
      urls.push({
        loc: `${domain}/categoria/${t.slug}`,
        priority: '0.6',
        changefreq: 'weekly',
      });
    }

    const citySlugs = new Set<string>();
    for (const c of cities) {
      const slug = cityToSlug(c.city);
      if (!citySlugs.has(slug)) {
        citySlugs.add(slug);
        urls.push({
          loc: `${domain}/cidade/${slug}`,
          priority: '0.7',
          changefreq: 'weekly',
        });
      }
    }

    const body = urls
      .map(
        (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
  }

  getRobotsTxt(): string {
    const domain = this.config.get('SITE_URL', 'http://localhost:3000');
    return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /painel/
Disallow: /api/
Disallow: /login
Disallow: /cadastro

Sitemap: ${domain}/sitemap.xml`;
  }
}
