import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { assertMinimumAge } from '../common/age.util';
import { assertRateLimit } from '../common/rate-limit.util';
import { mergeRolePermissions } from '../common/permissions';
import { generateRefreshToken, hashToken, uniqueSlug } from '../common/utils';
import { DomainEvents } from '../events/domain-events';
import { LoginDto, RegisterDto } from './auth.dto';
import { JwtPayload } from '../common/auth.types';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  async register(dto: RegisterDto, meta?: { ip?: string; userAgent?: string }) {
    assertRateLimit(`register:${meta?.ip ?? 'unknown'}`, 5, 60 * 60 * 1000);

    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    assertMinimumAge(dto.birthDate);

    const companionRole = await this.prisma.role.findUnique({
      where: { name: 'companion' },
    });
    if (!companionRole) {
      throw new ConflictException('Role companion não configurada. Execute o seed.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const slug = await uniqueSlug(dto.displayName, async (s) => {
      const found = await this.prisma.profile.findUnique({ where: { slug: s } });
      return !!found;
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          emailVerified: true,
          status: 'active',
          displayName: dto.displayName,
          roles: { create: { roleId: companionRole.id } },
          settings: { create: {} },
        },
      });

      await tx.credential.create({
        data: { userId: created.id, passwordHash },
      });

      const profile = await tx.profile.create({
        data: {
          userId: created.id,
          slug,
          displayName: dto.displayName,
          birthDate: new Date(dto.birthDate),
          bio: dto.bio.trim(),
          sexualPreference: dto.sexualPreference?.trim() || null,
          position: dto.position ?? null,
          penisSizeCm: dto.penisSizeCm ?? null,
          status: 'pending',
          isPublic: false,
          location: {
            create: {
              city: dto.city,
              state: dto.state.toUpperCase(),
            },
          },
        },
      });

      return { user: created, profile };
    });

    this.events.emit(DomainEvents.UserRegistered, {
      userId: result.user.id,
      email: result.user.email,
      displayName: dto.displayName,
    });

    this.events.emit(DomainEvents.ProfileCreated, {
      profileId: result.profile.id,
      slug: result.profile.slug,
      displayName: result.profile.displayName,
    });

    return this.issueTokens(result.user.id, result.user.email, ['companion'], meta);
  }

  async login(dto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    assertRateLimit(`login:${meta?.ip ?? 'unknown'}`, 10, 15 * 60 * 1000);

    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.status === 'blocked') {
      throw new UnauthorizedException('Conta bloqueada');
    }

    const credential = await this.prisma.credential.findUnique({
      where: { userId: user.id },
    });

    if (!credential) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (credential.lockedUntil && credential.lockedUntil > new Date()) {
      throw new UnauthorizedException('Conta temporariamente bloqueada. Tente mais tarde.');
    }

    const valid = await bcrypt.compare(dto.password, credential.passwordHash);
    if (!valid) {
      const failed = credential.failedAttempts + 1;
      await this.prisma.credential.update({
        where: { userId: user.id },
        data: {
          failedAttempts: failed,
          lockedUntil:
            failed >= MAX_FAILED_ATTEMPTS
              ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
              : credential.lockedUntil,
        },
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.prisma.credential.update({
      where: { userId: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), status: 'active' },
    });

    const roles = user.roles.map((r) => r.role.name);
    return this.issueTokens(user.id, user.email, roles, meta);
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Sessão inválida');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null, status: 'active' },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário inválido');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const roles = user.roles.map((r) => r.role.name);
    return this.issueTokens(user.id, user.email, roles);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return { success: true };
    const tokenHash = hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { location: true },
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles.map((r) => r.role.name),
      profile: profile
        ? {
            id: profile.id,
            slug: profile.slug,
            displayName: profile.displayName,
            status: profile.status,
            bio: profile.bio,
            city: profile.location?.city,
            state: profile.location?.state,
          }
        : null,
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    roles: string[],
    meta?: { ip?: string; userAgent?: string },
  ) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const permissions = mergeRolePermissions(userRoles.map((ur) => ur.role));
    const payload: JwtPayload = { sub: userId, email, roles, permissions };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET', 'dev-secret'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });

    const refreshToken = generateRefreshToken();
    const refreshDays = parseInt(this.config.get('JWT_REFRESH_DAYS', '7'), 10);

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hashToken(refreshToken),
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent?.slice(0, 500),
        expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: userId, email, roles },
    };
  }
}
