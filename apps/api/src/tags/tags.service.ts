import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { cityToSlug } from '../common/profile.mapper';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
  ) {}

  async listTags() {
    const tags = await this.prisma.tag.findMany({
      where: { isActive: true },
      orderBy: { profileCount: 'desc' },
    });
    return { data: tags };
  }

  async getBySlug(slug: string) {
    const tag = await this.prisma.tag.findUnique({ where: { slug } });
    if (!tag || !tag.isActive) {
      throw new NotFoundException('Categoria não encontrada');
    }

    const result = await this.search.search('', { tag: tag.name, limit: 48 });
    return { tag, ...result };
  }

  async listCities() {
    const locations = await this.prisma.profileLocation.findMany({
      where: { profile: { status: 'approved', isPublic: true } },
      select: { city: true, state: true },
    });

    const map = new Map<string, { city: string; state: string; count: number; slug: string }>();
    for (const loc of locations) {
      const slug = cityToSlug(loc.city);
      const existing = map.get(slug);
      if (existing) {
        existing.count++;
      } else {
        map.set(slug, { city: loc.city, state: loc.state, count: 1, slug });
      }
    }

    return {
      data: [...map.values()].sort((a, b) => b.count - a.count),
    };
  }

  async getCityBySlug(slug: string) {
    const cities = await this.listCities();
    const match = cities.data.find((c) => c.slug === slug);
    if (!match) {
      throw new NotFoundException('Cidade não encontrada');
    }

    const result = await this.search.search('', {
      city: match.city,
      state: match.state,
      limit: 48,
    });

    return { city: match.city, slug, state: match.state, ...result };
  }
}
