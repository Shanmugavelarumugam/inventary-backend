import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestUser } from '../../../common/interfaces/authenticated-request.interface.js';
import { PlatformRole } from '../../../common/enums/platform-role.enum.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: {
    sub: string;
    email: string;
    businessId?: string;
    platformRole?: PlatformRole;
    roleId?: string;
    role?: string;
  }): RequestUser {
    return {
      userId: payload.sub,
      email: payload.email,
      businessId: payload.businessId,
      platformRole: payload.platformRole || undefined,
      roleId: payload.roleId,
      role: payload.role,
    };
  }
}
