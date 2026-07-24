import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  site_name: { value: 'Acompanhante', description: 'Nome do site' },
  hero_title_prefix: { value: 'Encontre acompanhantes', description: 'Título do hero (parte 1)' },
  hero_title_highlight: { value: 'exclusivas', description: 'Título do hero (destaque)' },
  hero_subtitle: {
    value: 'Descubra perfis premium com confiança, sofisticação e facilidade de navegação.',
    description: 'Subtítulo do hero',
  },
  maintenance_mode: { value: 'false', description: 'Modo manutenção (true/false)' },
  registration_open: { value: 'true', description: 'Cadastro aberto (true/false)' },
  'public.home.premium.limit': { value: '6', description: 'Máximo de perfis na seção Premium da home' },
  'hotscore.weights.premium_bonus': { value: '12', description: 'Bônus de hot score para Premium' },
  'hotscore.weights.featured_bonus': { value: '8', description: 'Bônus de hot score para Destaque' },
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic() {
    const rows = await this.prisma.siteSetting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));

    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      if (!map.has(key)) map.set(key, def.value);
    }

    return {
      siteName: map.get('site_name') ?? DEFAULT_SETTINGS.site_name.value,
      heroTitlePrefix: map.get('hero_title_prefix') ?? DEFAULT_SETTINGS.hero_title_prefix.value,
      heroTitleHighlight: map.get('hero_title_highlight') ?? DEFAULT_SETTINGS.hero_title_highlight.value,
      heroSubtitle: map.get('hero_subtitle') ?? DEFAULT_SETTINGS.hero_subtitle.value,
      maintenanceMode: map.get('maintenance_mode') === 'true',
      registrationOpen: map.get('registration_open') !== 'false',
      premiumHomeLimit: parseInt(map.get('public.home.premium.limit') ?? '6', 10) || 6,
    };
  }

  async getAll() {
    const rows = await this.prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
    const existing = new Map(rows.map((r) => [r.key, r]));

    const data = Object.entries(DEFAULT_SETTINGS).map(([key, def]) => {
      const row = existing.get(key);
      return {
        key,
        value: row?.value ?? def.value,
        description: def.description,
        updatedAt: row?.updatedAt ?? null,
      };
    });

    return { data };
  }

  async updateMany(
    updates: Array<{ key: string; value: string }>,
    actorId: string,
  ) {
    const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
    const results: Array<{ key: string; value: string }> = [];

    for (const { key, value } of updates) {
      if (!allowed.has(key)) continue;
      await this.prisma.siteSetting.upsert({
        where: { key },
        create: { key, value, updatedBy: actorId },
        update: { value, updatedBy: actorId },
      });
      results.push({ key, value });
    }

    return { updated: results };
  }

  async getHotScoreWeights() {
    const rows = await this.prisma.siteSetting.findMany({
      where: {
        key: {
          in: ['hotscore.weights.premium_bonus', 'hotscore.weights.featured_bonus'],
        },
      },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));

    return {
      premiumBonus:
        parseInt(map.get('hotscore.weights.premium_bonus') ?? DEFAULT_SETTINGS['hotscore.weights.premium_bonus'].value, 10) || 12,
      featuredBonus:
        parseInt(map.get('hotscore.weights.featured_bonus') ?? DEFAULT_SETTINGS['hotscore.weights.featured_bonus'].value, 10) || 8,
    };
  }
}
