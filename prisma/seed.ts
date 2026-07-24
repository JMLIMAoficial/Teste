import { PrismaClient, ProfilePosition } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { encryptValue } from '../apps/api/src/common/crypto.util';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const DEMO_COMPANION_PASSWORD = 'Demo123!';
const WHATSAPP_KEY =
  process.env.WHATSAPP_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production';
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');

type DemoProfile = {
  email: string;
  slug: string;
  displayName: string;
  city: string;
  state: string;
  cep: string;
  lat: number;
  lng: number;
  birthDate: Date;
  bio: string;
  preference: string;
  position: ProfilePosition;
  penisSizeCm: number;
  isPremium: boolean;
  isFeatured: boolean;
  viewCount: number;
  whatsapp: string;
  tags: string[];
  photoSeeds: string[];
  momentCaptions?: string[];
};

async function createCredential(userId: string, password: string) {
  const existing = await prisma.credential.findUnique({ where: { userId } });
  if (existing) {
    await prisma.credential.update({
      where: { userId },
      data: { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) },
    });
    return;
  }
  await prisma.credential.create({
    data: {
      userId,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    },
  });
}

async function downloadPhoto(storagePath: string, picSeed: string) {
  const fullPath = join(UPLOAD_DIR, storagePath);
  if (existsSync(fullPath)) return statSync(fullPath).size;

  const res = await fetch(`https://picsum.photos/seed/${picSeed}/600/800`);
  if (!res.ok) {
    throw new Error(`Falha ao baixar foto (${picSeed}): ${res.status}`);
  }

  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, Buffer.from(await res.arrayBuffer()));
  return statSync(fullPath).size;
}

async function ensureProfilePhotos(profileId: string, slug: string, seeds: string[]) {
  const existingCount = await prisma.photo.count({ where: { profileId } });
  if (existingCount >= seeds.length) return;

  for (let i = 0; i < seeds.length; i++) {
    const storagePath = `photos/${profileId}/seed-${i}.jpg`;
    const already = await prisma.photo.findFirst({
      where: { profileId, mediaAsset: { storagePath } },
    });
    if (already) continue;

    const sizeBytes = await downloadPhoto(storagePath, seeds[i]);
    const asset = await prisma.mediaAsset.create({
      data: {
        ownerType: 'photo',
        storagePath,
        mimeType: 'image/jpeg',
        sizeBytes: BigInt(sizeBytes),
        status: 'ready',
      },
    });

    await prisma.photo.create({
      data: {
        profileId,
        mediaAssetId: asset.id,
        status: 'approved',
        sortOrder: i,
        isCover: i === 0,
      },
    });
  }

  console.log(`  Photos: ${slug} (${seeds.length})`);
}

async function ensureProfileMoments(profileId: string, slug: string, captions: string[]) {
  const existingCount = await prisma.moment.count({
    where: { profileId, deletedAt: null },
  });
  if (existingCount >= captions.length) return;

  for (let i = 0; i < captions.length; i++) {
    const storagePath = `moments/${profileId}/seed-${i}.jpg`;
    const already = await prisma.moment.findFirst({
      where: { profileId, mediaAsset: { storagePath } },
    });
    if (already) continue;

    const sizeBytes = await downloadPhoto(storagePath, `${slug}-moment-${i}`);
    const asset = await prisma.mediaAsset.create({
      data: {
        ownerType: 'moment',
        storagePath,
        mimeType: 'image/jpeg',
        sizeBytes: BigInt(sizeBytes),
        status: 'ready',
      },
    });

    await prisma.moment.create({
      data: {
        profileId,
        mediaAssetId: asset.id,
        mediaType: 'photo',
        caption: captions[i],
        status: 'approved',
        publishedAt: new Date(Date.now() - i * 86400000),
      },
    });
  }

  console.log(`  Moments: ${slug} (${captions.length})`);
}

async function upsertCompanion(companionRoleId: string, demo: DemoProfile) {
  let profile = await prisma.profile.findUnique({ where: { slug: demo.slug } });

  if (profile) {
    await createCredential(profile.userId, DEMO_COMPANION_PASSWORD);
    profile = await prisma.profile.update({
      where: { slug: demo.slug },
      data: {
        displayName: demo.displayName,
        birthDate: demo.birthDate,
        bio: demo.bio,
        sexualPreference: demo.preference,
        position: demo.position,
        penisSizeCm: demo.penisSizeCm,
        status: 'approved',
        isPublic: true,
        isPremium: demo.isPremium,
        isFeatured: demo.isFeatured,
        viewCount: demo.viewCount,
        whatsapp: encryptValue(demo.whatsapp, WHATSAPP_KEY),
      },
    });
    console.log(`  Updated: ${demo.slug}`);
  } else {
    const user = await prisma.user.create({
      data: {
        email: demo.email,
        emailVerified: true,
        status: 'active',
        displayName: demo.displayName,
        roles: { create: { roleId: companionRoleId } },
        settings: { create: {} },
      },
    });

    profile = await prisma.profile.create({
      data: {
        userId: user.id,
        slug: demo.slug,
        displayName: demo.displayName,
        birthDate: demo.birthDate,
        bio: demo.bio,
        sexualPreference: demo.preference,
        position: demo.position,
        status: 'approved',
        isPublic: true,
        isPremium: demo.isPremium,
        isFeatured: demo.isFeatured,
        penisSizeCm: demo.penisSizeCm,
        viewCount: demo.viewCount,
        whatsapp: encryptValue(demo.whatsapp, WHATSAPP_KEY),
        location: {
          create: {
            city: demo.city,
            state: demo.state,
            cep: demo.cep,
            latitude: demo.lat,
            longitude: demo.lng,
          },
        },
      },
    });

    await createCredential(user.id, DEMO_COMPANION_PASSWORD);
    console.log(`  Created: ${demo.slug} (${demo.email} / ${DEMO_COMPANION_PASSWORD})`);
  }

  await prisma.profileLocation.upsert({
    where: { profileId: profile.id },
    create: {
      profileId: profile.id,
      cep: demo.cep,
      city: demo.city,
      state: demo.state,
      latitude: demo.lat,
      longitude: demo.lng,
    },
    update: {
      cep: demo.cep,
      city: demo.city,
      state: demo.state,
      latitude: demo.lat,
      longitude: demo.lng,
    },
  });

  return profile;
}

async function wipeAllProfiles(adminUserId?: string) {
  console.log('Removing all profiles and companion accounts...');

  const allProfiles = await prisma.profile.findMany({
    select: { id: true, userId: true },
  });
  const profileIds = allProfiles.map((p) => p.id);

  if (profileIds.length === 0) {
    console.log('  No profiles to remove.');
    return;
  }

  const momentIds = (
    await prisma.moment.findMany({
      where: { profileId: { in: profileIds } },
      select: { id: true },
    })
  ).map((m) => m.id);

  const videoIds = (
    await prisma.video.findMany({
      where: { profileId: { in: profileIds } },
      select: { id: true },
    })
  ).map((v) => v.id);

  await prisma.comment.deleteMany({
    where: {
      OR: [
        { profileId: { in: profileIds } },
        { targetType: 'profile', targetId: { in: profileIds } },
        ...(momentIds.length ? [{ targetType: 'moment' as const, targetId: { in: momentIds } }] : []),
        ...(videoIds.length ? [{ targetType: 'video' as const, targetId: { in: videoIds } }] : []),
      ],
    },
  });

  await prisma.like.deleteMany({
    where: {
      OR: [
        { profileId: { in: profileIds } },
        ...(momentIds.length ? [{ targetType: 'moment' as const, targetId: { in: momentIds } }] : []),
        ...(videoIds.length ? [{ targetType: 'video' as const, targetId: { in: videoIds } }] : []),
      ],
    },
  });

  await prisma.reviewSummary.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.hotScore.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.analyticsEvent.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.verificationRequest.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.report.deleteMany({
    where: {
      OR: [
        { profileId: { in: profileIds } },
        { targetType: 'profile', targetId: { in: profileIds } },
        ...(momentIds.length ? [{ targetType: 'moment' as const, targetId: { in: momentIds } }] : []),
      ],
    },
  });

  const conversationIds = (
    await prisma.conversation.findMany({
      where: { profileId: { in: profileIds } },
      select: { id: true },
    })
  ).map((c) => c.id);

  if (conversationIds.length) {
    await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
    await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  }

  await prisma.seoMetadata.deleteMany({
    where: { entityType: 'profile', entityId: { in: profileIds } },
  });

  await prisma.profile.deleteMany({ where: { id: { in: profileIds } } });

  const userIds = [...new Set(allProfiles.map((p) => p.userId))].filter((id) => id !== adminUserId);

  if (userIds.length) {
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.credential.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userSettings.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  await prisma.tag.updateMany({ data: { profileCount: 0 } });

  console.log(`  Removed ${profileIds.length} profile(s) and ${userIds.length} user account(s).`);
}

async function main() {
  const shouldReset = process.argv.includes('--reset') || process.env.RESET_PROFILES === '1';
  console.log('Seeding database...');

  const companionRole = await prisma.role.upsert({
    where: { name: 'companion' },
    update: {},
    create: {
      name: 'companion',
      displayName: 'Acompanhante',
      permissions: [
        'profiles:own:read',
        'profiles:own:write',
        'photos:own:write',
        'dashboard:own:read',
      ],
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      displayName: 'Administrador',
      permissions: ['*'],
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: 'moderator' },
    update: {
      permissions: [
        'profiles:moderate',
        'photos:moderate',
        'reports:manage',
        'hotscore:manage',
      ],
    },
    create: {
      name: 'moderator',
      displayName: 'Moderador',
      permissions: [
        'profiles:moderate',
        'photos:moderate',
        'reports:manage',
        'hotscore:manage',
      ],
      isSystem: true,
    },
  });

  const adminEmail = 'admin@demo.local';
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        emailVerified: true,
        status: 'active',
        displayName: 'Administrador',
        roles: { create: { roleId: adminRole.id } },
        settings: { create: {} },
      },
    });
    await createCredential(adminUser.id, 'Admin123!');
    console.log('  Created admin: admin@demo.local / Admin123!');
  } else {
    await createCredential(adminUser.id, 'Admin123!');
  }

  if (shouldReset) {
    await wipeAllProfiles(adminUser.id);
  }

  const demoProfiles: DemoProfile[] = [
    {
      email: 'maria@demo.local',
      slug: 'maria-santos',
      displayName: 'Lucas Santos',
      city: 'São Paulo',
      state: 'SP',
      cep: '01310-100',
      lat: -23.5613,
      lng: -46.6565,
      birthDate: new Date('1999-03-15'),
      bio: 'Garoto de programa em São Paulo. Discrição, corpo definido e ótima conversa.',
      preference: 'Homens',
      position: 'active',
      penisSizeCm: 18,
      isPremium: true,
      isFeatured: true,
      viewCount: 420,
      whatsapp: '5511999887766',
      tags: ['massagem', 'jantar', 'viagem'],
      photoSeeds: ['lucas-sp-1', 'lucas-sp-2', 'lucas-sp-3'],
      momentCaptions: ['Treino feito!', 'Noite em SP'],
    },
    {
      email: 'ana@demo.local',
      slug: 'ana-oliveira',
      displayName: 'Rafael Oliveira',
      city: 'Rio de Janeiro',
      state: 'RJ',
      cep: '22041-001',
      lat: -22.9711,
      lng: -43.1822,
      birthDate: new Date('1996-07-22'),
      bio: 'Companhia para eventos, praia e viagens no Rio. Versátil e carismático.',
      preference: 'Homens e mulheres',
      position: 'versatile',
      penisSizeCm: 16,
      isPremium: true,
      isFeatured: false,
      viewCount: 310,
      whatsapp: '5521999887766',
      tags: ['eventos', 'companhia', 'premium'],
      photoSeeds: ['rafael-rj-1', 'rafael-rj-2'],
      momentCaptions: ['Pôr do sol no Arpoador'],
    },
    {
      email: 'julia@demo.local',
      slug: 'julia-costa',
      displayName: 'Bruno Costa',
      city: 'Belo Horizonte',
      state: 'MG',
      cep: '30130-100',
      lat: -19.9245,
      lng: -43.9352,
      birthDate: new Date('2001-11-08'),
      bio: 'Perfil em destaque em BH. Fitness, gastronomia e boa energia.',
      preference: 'Homens',
      position: 'active',
      penisSizeCm: 20,
      isPremium: false,
      isFeatured: true,
      viewCount: 280,
      whatsapp: '5531999887766',
      tags: ['fitness', 'gastronomia', 'arte'],
      photoSeeds: ['bruno-bh-1', 'bruno-bh-2', 'bruno-bh-3'],
    },
    {
      email: 'camila@demo.local',
      slug: 'camila-ferreira',
      displayName: 'Diego Ferreira',
      city: 'Curitiba',
      state: 'PR',
      cep: '80010-000',
      lat: -25.4284,
      lng: -49.2733,
      birthDate: new Date('1997-05-30'),
      bio: 'Garoto verificado em Curitiba. Viagens, cultura e momentos memoráveis.',
      preference: 'Homens',
      position: 'passive',
      penisSizeCm: 17,
      isPremium: false,
      isFeatured: false,
      viewCount: 190,
      whatsapp: '5541999887766',
      tags: ['viagem', 'cultura', 'musica'],
      photoSeeds: ['diego-cwb-1', 'diego-cwb-2'],
    },
    {
      email: 'thiago@demo.local',
      slug: 'thiago-rocha',
      displayName: 'Thiago Rocha',
      city: 'Porto Alegre',
      state: 'RS',
      cep: '90010-000',
      lat: -30.0346,
      lng: -51.2177,
      birthDate: new Date('1998-02-14'),
      bio: 'POA · versátil · tatuado. Atendo hotel e domicílio com discrição.',
      preference: 'Homens',
      position: 'versatile',
      penisSizeCm: 16,
      isPremium: false,
      isFeatured: true,
      viewCount: 155,
      whatsapp: '5551999887766',
      tags: ['companhia', 'eventos', 'exclusivo'],
      photoSeeds: ['thiago-poa-1', 'thiago-poa-2', 'thiago-poa-3'],
      momentCaptions: ['Sexta liberada'],
    },
    {
      email: 'gabriel@demo.local',
      slug: 'gabriel-nunes',
      displayName: 'Gabriel Nunes',
      city: 'Salvador',
      state: 'BA',
      cep: '40020-000',
      lat: -12.9777,
      lng: -38.5016,
      birthDate: new Date('1995-09-03'),
      bio: 'Premium em Salvador. Praia, festa e companhia de alto padrão.',
      preference: 'Homens',
      position: 'active',
      penisSizeCm: 19,
      isPremium: true,
      isFeatured: true,
      viewCount: 360,
      whatsapp: '5571999887766',
      tags: ['premium', 'viagem', 'eventos'],
      photoSeeds: ['gabriel-ssa-1', 'gabriel-ssa-2'],
      momentCaptions: ['Salvador linda hoje', 'Pronto pro findi'],
    },
    {
      email: 'pedro@demo.local',
      slug: 'pedro-martins',
      displayName: 'Pedro Martins',
      city: 'Fortaleza',
      state: 'CE',
      cep: '60165-121',
      lat: -3.7319,
      lng: -38.5267,
      birthDate: new Date('2000-06-18'),
      bio: 'Garoto do Nordeste, sorriso fácil e conversa boa. Ativo.',
      preference: 'Homens',
      position: 'active',
      penisSizeCm: 18,
      isPremium: false,
      isFeatured: false,
      viewCount: 120,
      whatsapp: '5585999887766',
      tags: ['massagem', 'companhia', 'fitness'],
      photoSeeds: ['pedro-for-1', 'pedro-for-2'],
    },
    {
      email: 'mateus@demo.local',
      slug: 'mateus-cardoso',
      displayName: 'Mateus Cardoso',
      city: 'Florianópolis',
      state: 'SC',
      cep: '88015-100',
      lat: -27.5954,
      lng: -48.548,
      birthDate: new Date('1999-12-01'),
      bio: 'Ilha da magia · surfer vibe · versátil. Vamos curtir Floripa?',
      preference: 'Homens e mulheres',
      position: 'versatile',
      penisSizeCm: 17,
      isPremium: true,
      isFeatured: false,
      viewCount: 240,
      whatsapp: '5548999887766',
      tags: ['viagem', 'gastronomia', 'musica'],
      photoSeeds: ['mateus-fln-1', 'mateus-fln-2', 'mateus-fln-3'],
      momentCaptions: ['Mar na terça'],
    },
    {
      email: 'vinicius@demo.local',
      slug: 'vinicius-almeida',
      displayName: 'Vinícius Almeida',
      city: 'Brasília',
      state: 'DF',
      cep: '70040-010',
      lat: -15.7942,
      lng: -47.8822,
      birthDate: new Date('1994-04-25'),
      bio: 'Executivo discreto em Brasília. Jantares, viagens e eventos corporativos.',
      preference: 'Homens',
      position: 'active',
      penisSizeCm: 20,
      isPremium: true,
      isFeatured: true,
      viewCount: 390,
      whatsapp: '5561999887766',
      tags: ['jantar', 'eventos', 'exclusivo'],
      photoSeeds: ['vini-bsb-1', 'vini-bsb-2'],
      momentCaptions: ['Esq. da 114'],
    },
    {
      email: 'leo@demo.local',
      slug: 'leo-barbosa',
      displayName: 'Leo Barbosa',
      city: 'Recife',
      state: 'PE',
      cep: '50030-230',
      lat: -8.0476,
      lng: -34.877,
      birthDate: new Date('2002-08-11'),
      bio: 'Novinho de Recife, passivo, muito carinhoso. Primeira vez? Sem pressa.',
      preference: 'Homens',
      position: 'passive',
      penisSizeCm: 15,
      isPremium: false,
      isFeatured: false,
      viewCount: 95,
      whatsapp: '5581999887766',
      tags: ['companhia', 'massagem', 'cultura'],
      photoSeeds: ['leo-rec-1', 'leo-rec-2'],
    },
    {
      email: 'caio@demo.local',
      slug: 'caio-pires',
      displayName: 'Caio Pires',
      city: 'Campinas',
      state: 'SP',
      cep: '13015-000',
      lat: -22.9099,
      lng: -47.0626,
      birthDate: new Date('1997-01-07'),
      bio: 'Interior paulista, corpo malhado e agenda flexível. Hotel ou motel.',
      preference: 'Homens',
      position: 'active',
      penisSizeCm: 19,
      isPremium: false,
      isFeatured: true,
      viewCount: 175,
      whatsapp: '5519999887766',
      tags: ['fitness', 'premium', 'companhia'],
      photoSeeds: ['caio-cps-1', 'caio-cps-2', 'caio-cps-3'],
      momentCaptions: ['Leg day'],
    },
    {
      email: 'renan@demo.local',
      slug: 'renan-dias',
      displayName: 'Renan Dias',
      city: 'Goiânia',
      state: 'GO',
      cep: '74015-010',
      lat: -16.6869,
      lng: -49.2648,
      birthDate: new Date('1996-10-30'),
      bio: 'Goiano alto, barba e tatuagem. Festa, bar e companhia sem frescura.',
      preference: 'Homens e mulheres',
      position: 'versatile',
      penisSizeCm: 18,
      isPremium: false,
      isFeatured: false,
      viewCount: 130,
      whatsapp: '5562999887766',
      tags: ['eventos', 'musica', 'gastronomia'],
      photoSeeds: ['renan-gyn-1', 'renan-gyn-2'],
    },
  ];

  for (const demo of demoProfiles) {
    const profile = await upsertCompanion(companionRole.id, demo);
    await ensureProfilePhotos(profile.id, demo.slug, demo.photoSeeds);
    if (demo.momentCaptions?.length) {
      await ensureProfileMoments(profile.id, demo.slug, demo.momentCaptions);
    }
  }

  const category = await prisma.tagCategory.upsert({
    where: { slug: 'servicos' },
    update: {},
    create: { name: 'Serviços', slug: 'servicos', sortOrder: 1 },
  });

  const tagDefs = [
    { slug: 'massagem', name: 'Massagem' },
    { slug: 'jantar', name: 'Jantar' },
    { slug: 'viagem', name: 'Viagem' },
    { slug: 'eventos', name: 'Eventos' },
    { slug: 'fitness', name: 'Fitness' },
    { slug: 'gastronomia', name: 'Gastronomia' },
    { slug: 'companhia', name: 'Companhia' },
    { slug: 'arte', name: 'Arte' },
    { slug: 'musica', name: 'Música' },
    { slug: 'cultura', name: 'Cultura' },
    { slug: 'premium', name: 'Premium' },
    { slug: 'exclusivo', name: 'Exclusivo' },
  ];

  const tagMap = new Map<string, string>();
  for (const t of tagDefs) {
    const tag = await prisma.tag.upsert({
      where: { slug: t.slug },
      update: { name: t.name, isActive: true },
      create: { slug: t.slug, name: t.name, categoryId: category.id },
    });
    tagMap.set(t.slug, tag.id);
  }

  for (const demo of demoProfiles) {
    const profile = await prisma.profile.findUnique({ where: { slug: demo.slug } });
    if (!profile) continue;

    for (let i = 0; i < demo.tags.length; i++) {
      const tagId = tagMap.get(demo.tags[i]);
      if (!tagId) continue;

      await prisma.profileTag.upsert({
        where: { profileId_tagId: { profileId: profile.id, tagId } },
        update: { sortOrder: i },
        create: { profileId: profile.id, tagId, sortOrder: i },
      });
    }
  }

  const approved = await prisma.profile.findMany({
    where: { status: 'approved', isPublic: true },
  });

  for (const p of approved) {
    let score =
      15 + Math.min(50, p.viewCount * 0.6) + (p.isPremium ? 12 : 0) + (p.isFeatured ? 8 : 0);
    score = Math.min(100, Math.round(score * 100) / 100);

    const level = score >= 76 ? 'blazing' : score >= 51 ? 'hot' : score >= 26 ? 'warm' : 'cold';

    await prisma.hotScore.upsert({
      where: { profileId: p.id },
      create: { profileId: p.id, score, level },
      update: { score, level },
    });
  }

  for (const [, tagId] of tagMap) {
    const count = await prisma.profileTag.count({ where: { tagId } });
    await prisma.tag.update({ where: { id: tagId }, data: { profileCount: count } });
  }

  const maria = await prisma.profile.findUnique({ where: { slug: 'maria-santos' } });
  if (maria) {
    const reviewData = [
      { authorName: 'Carlos M.', rating: 5, comment: 'Excelente companhia, muito discreto e atencioso.' },
      { authorName: 'Pedro R.', rating: 4, comment: 'Ótima experiência, recomendo.' },
      { authorName: 'Lucas F.', rating: 5, comment: 'Superou expectativas.' },
    ];

    for (const r of reviewData) {
      const fp = `demo-${r.authorName.toLowerCase().replace(/\s/g, '-')}`;
      const exists = await prisma.review.findFirst({
        where: { profileId: maria.id, authorFingerprint: fp },
      });
      if (exists) continue;

      await prisma.review.create({
        data: {
          profileId: maria.id,
          authorName: r.authorName,
          authorFingerprint: fp,
          rating: r.rating,
          comment: r.comment,
          status: 'approved',
        },
      });
    }

    const dist = { '1': 0, '2': 0, '3': 0, '4': 1, '5': 2 };
    await prisma.reviewSummary.upsert({
      where: { profileId: maria.id },
      create: {
        profileId: maria.id,
        averageRating: 4.67,
        reviewCount: 3,
        distribution: dist,
      },
      update: { averageRating: 4.67, reviewCount: 3, distribution: dist },
    });

    const comments = [
      { authorName: 'Visitante', content: 'Perfil incrível, muito profissional!' },
      { authorName: 'João', content: 'Adorei as fotos e a descrição.' },
    ];

    for (const c of comments) {
      const exists = await prisma.comment.findFirst({
        where: {
          targetType: 'profile',
          targetId: maria.id,
          authorName: c.authorName,
          content: c.content,
        },
      });
      if (exists) continue;

      await prisma.comment.create({
        data: {
          targetType: 'profile',
          targetId: maria.id,
          profileId: maria.id,
          authorName: c.authorName,
          content: c.content,
          status: 'approved',
        },
      });
    }

    console.log('  Demo reviews/comments for maria-santos (Lucas Santos)');
  }

  const siteDefaults: Record<string, string> = {
    site_name: 'Acompanhante',
    hero_title_prefix: 'Encontre acompanhantes',
    hero_title_highlight: 'exclusivas',
    hero_subtitle: 'Descubra perfis premium com confiança, sofisticação e facilidade de navegação.',
    maintenance_mode: 'false',
    registration_open: 'true',
    'public.home.premium.limit': '6',
    'hotscore.weights.premium_bonus': '12',
    'hotscore.weights.featured_bonus': '8',
  };
  for (const [key, value] of Object.entries(siteDefaults)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  const approvedPhotos = await prisma.photo.updateMany({
    where: { status: 'pending' },
    data: { status: 'approved' },
  });
  if (approvedPhotos.count > 0) {
    console.log(`  Approved ${approvedPhotos.count} pending photo(s)`);
  }

  const approvedMoments = await prisma.moment.updateMany({
    where: { status: 'pending', deletedAt: null },
    data: { status: 'approved', publishedAt: new Date() },
  });
  if (approvedMoments.count > 0) {
    console.log(`  Approved ${approvedMoments.count} pending moment(s)`);
  }

  console.log('');
  console.log('Contas fake (senha de todas: Demo123!):');
  for (const demo of demoProfiles) {
    console.log(`  ${demo.email.padEnd(22)} → /perfil/${demo.slug}`);
  }
  console.log('  admin@demo.local         → Admin123! (painel admin)');
  console.log('');
  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
