import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, JwtPayload } from '../auth.types';
import { hasPermission } from '../permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user?.permissions?.length) {
      throw new ForbiddenException('Permissão insuficiente');
    }

    const allowed = required.some((perm) => hasPermission(user.permissions, perm));
    if (!allowed) {
      throw new ForbiddenException('Permissão insuficiente');
    }

    return true;
  }
}
