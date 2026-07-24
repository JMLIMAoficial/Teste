import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthUser, JwtPayload } from '../auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return {
      id: request.user.sub,
      email: request.user.email,
      roles: request.user.roles,
      permissions: request.user.permissions ?? [],
    };
  },
);
