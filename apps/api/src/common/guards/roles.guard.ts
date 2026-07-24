import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth.types';
import { JwtPayload } from '../auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user?.roles?.length) {
      throw new ForbiddenException('Acesso negado');
    }

    const hasRole = requiredRoles.some(
      (role) => user.roles.includes(role) || user.roles.includes('admin'),
    );

    if (!hasRole) {
      throw new ForbiddenException('Permissão insuficiente');
    }

    return true;
  }
}
