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
    const siteName = this.config.get('SEO_SITE_NAME', 'Clube dos Garotos');

    const templates: Record<string, { title: string; description: string; robots?: string }> = {
      home: {
        title: `Garotos de programa — ${siteName}`,
        description:
          'Garotos de programa no Clube dos Garotos: perfis com fotos, momentos e contato perto de você. Encontre garoto de programa em São Paulo, Rio e outras cidades do Brasil.',
      },
      profile: {
        title: params?.name
          ? `${params.name} — garoto de programa em ${params.city ?? 'Brasil'} | ${siteName}`
          : `Perfil | ${siteName}`,
        description: params?.name
          ? `${params.name} é garoto de programa em ${params.city ?? 'Brasil'}. Veja fotos, momentos e entre em contato no ${siteName}.`
          : `Perfil de garoto de programa no ${siteName}.`,
      },
      search: {
        title: `Buscar garotos de programa — ${siteName}`,
        description: 'Busque garoto de programa por cidade, bairro, posição ou categoria.',
        robots: 'noindex, follow',
      },
      rankings: {
        title: `Rankings de garotos de programa — ${siteName}`,
        description: 'Os garotos de programa mais populares e em alta na plataforma.',
      },
      city: {
        title: `Garotos de programa em ${params?.name ?? params?.slug} — ${siteName}`,
        description: `Encontre garoto de programa em ${params?.name ?? params?.slug}. Perfis com fotos, momentos e contato no ${siteName}.`,
      },
      category: {
        title: `${params?.name ?? params?.slug} — garotos de programa | ${siteName}`,
        description: `Garotos de programa com a categoria ${params?.name ?? params?.slug} no ${siteName}.`,
      },
      moments: {
        title: `Momentos de garotos de programa — ${siteName}`,
        description: 'Veja momentos e stories publicados por garotos de programa no Clube dos Garotos.',
      },
      videos: {
        title: `Vídeos de garotos de programa — ${siteName}`,
        description: 'Galeria de vídeos de garotos de programa no Clube dos Garotos.',
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
              : pageType === 'moments'
                ? `${domain}/momentos`
                : pageType === 'videos'
                  ? `${domain}/videos`
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
    const siteName = this.config.get('SEO_SITE_NAME', 'Clube dos Garotos');
    const domain = this.config.get('SITE_URL', 'http://localhost:3000');

    if (pageType === 'home') {
      return {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            name: siteName,
            alternateName: ['Clube dos Garotos', 'Garotos de programa'],
            url: domain,
            description:
              'Clube dos Garotos — anúncios de garotos de programa com fotos, momentos e contato em cidades do Brasil.',
            inLanguage: 'pt-BR',
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
            description:
              'Plataforma para encontrar garoto de programa com perfis verificados e moderados.',
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
            description:
              params.description ??
              `${params.name} — garoto de programa em ${params.city ?? 'Brasil'} no ${siteName}.`,
            image: params.imageUrl,
            jobTitle: 'Garoto de programa',
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
                name: 'Garotos de programa',
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

    if (pageType === 'city' && (params?.name || params?.slug)) {
      const cityName = params.name ?? params.slug!;
      const cityUrl = `${domain}/cidade/${params.slug ?? cityToSlug(cityName)}`;
      return {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: `Garotos de programa em ${cityName}`,
            description: `Anúncios de garoto de programa em ${cityName} no ${siteName}.`,
            url: cityUrl,
            isPartOf: { '@type': 'WebSite', name: siteName, url: domain },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Garotos de programa',
                item: domain,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: cityName,
                item: cityUrl,
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
      { loc: `${domain}/momentos`, priority: '0.8', changefreq: 'daily' },
      { loc: `${domain}/videos`, priority: '0.7', changefreq: 'daily' },
      { loc: `${domain}/rankings`, priority: '0.8', changefreq: 'daily' },
      { loc: `${domain}/busca`, priority: '0.4', changefreq: 'weekly' },
      { loc: `${domain}/sobre`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${domain}/contato`, priority: '0.4', changefreq: 'monthly' },
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
