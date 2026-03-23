import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, FindOperator } from 'typeorm';
import { randomBytes } from 'crypto';
import { User } from '../../database/entities/user.entity.js';
import { Business } from '../../database/entities/business.entity.js';
import { HashUtil } from '../../common/utils/hash.util.js';
import { PlatformRole } from '../../common/enums/platform-role.enum.js';
import { AuditLogService } from '../platform/services/audit-log.service.js';
import { AuditAction } from '../../common/enums/audit-action.enum.js';

import {
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/index.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly auditLogService: AuditLogService,
    private readonly jwtService: JwtService,
  ) {}

  // ─────────────────────── helpers ───────────────────────

  private buildPayload(user: User) {
    return {
      sub: user.id,
      userId: user.id,
      email: user.email,
      type: user.platformRole ? 'PLATFORM' : 'TENANT',
      businessId: user.businessId,
      platformRole: user.platformRole || null,
      roleId: user.roleId,
      role: user.role?.name || null,
    };
  }

  private generateAccessToken(user: User) {
    return this.jwtService.sign(this.buildPayload(user), { expiresIn: 3600 });
  }

  /** Refresh tokens are long-lived JWTs (7 days) with type:'refresh' */
  private generateRefreshToken(user: User) {
    return this.jwtService.sign(
      { ...this.buildPayload(user), type: 'refresh' },
      { expiresIn: '7d' },
    );
  }

  // ─────────────────────── 1. LOGIN ──────────────────────

  async login(
    dto: LoginDto,
    metadata?: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = metadata || {};

    let user: User | null;

    if (dto.companyCode) {
      // Tenant Login
      const business = await this.businessRepository.findOne({
        where: { companyCode: dto.companyCode },
      });

      if (
        !business ||
        (business.status as string) === 'SUSPENDED' ||
        (business.status as string) === 'CANCELLED'
      ) {
        throw new UnauthorizedException(
          'Invalid business or business is inactive',
        );
      }
      user = await this.userRepository.findOne({
        where: { email: dto.email, businessId: business.id },
        relations: ['role', 'role.permissions'],
        select: [
          'id',
          'email',
          'name',
          'password',
          'platformRole',
          'businessId',
          'roleId',
          'isActive',
        ],
      });
    } else {
      // Platform Login (ROOT / PLATFORM_ADMIN / SUPPORT_ADMIN)
      user = await this.userRepository.findOne({
        where: {
          email: dto.email,
          platformRole: Not(IsNull()) as unknown as PlatformRole,
        },
        relations: ['role', 'role.permissions'],
        select: [
          'id',
          'email',
          'name',
          'password',
          'platformRole',
          'businessId',
          'roleId',
          'isActive',
        ],
      });
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await HashUtil.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const loginPayload = {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      businessId: user.businessId,
    };
    const accessToken = await this.jwtService.signAsync(loginPayload);
    const refreshToken = await this.jwtService.signAsync(loginPayload, {
      expiresIn: '7d',
    });

    await this.userRepository.update(user.id, {
      refreshToken: refreshToken,
      lastLogin: new Date(),
    });

    // Audit Log for Platform Users
    if (user.platformRole) {
      await this.auditLogService.logAction({
        userId: user.id,
        userEmail: user.email,
        userRole: user.platformRole,
        action: AuditAction.LOGIN,
        entityType: 'user',
        entityId: user.id,
        ipAddress,
        userAgent,
      });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.platformRole ? 'PLATFORM' : 'TENANT',
        ...(user.platformRole && { platformRole: user.platformRole }),
        ...(user.businessId && { businessId: user.businessId }),
        ...(user.role?.name && { role: user.role.name }),
      },
    };
  }

  // ─────────────────────── 2. REFRESH TOKEN ──────────────

  async refreshToken(dto: RefreshTokenDto) {
    let payload: { userId: string; type: string };
    try {
      payload = this.jwtService.verify(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    const newAccessToken = this.generateAccessToken(user);
    return { accessToken: newAccessToken, expiresIn: 3600 };
  }

  // ─────────────────────── 3. LOGOUT ─────────────────────

  async logout(userId: string) {
    await this.userRepository.update(userId, {
      refreshToken: null,
    });
    return { message: 'Logged out successfully' };
  }

  // ─────────────────────── 4. CHANGE PASSWORD ────────────

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await HashUtil.compare(dto.currentPassword, user.password);
    if (!isValid)
      throw new BadRequestException('Current password is incorrect');

    const hashed = await HashUtil.hash(dto.newPassword);
    await this.userRepository.update(userId, {
      password: hashed,
      refreshToken: null,
    });

    return { message: 'Password updated successfully' };
  }

  // ─────────────────────── 5. FORGOT PASSWORD ────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    let user: User | null;

    if (dto.companyCode) {
      const business = await this.businessRepository.findOne({
        where: { companyCode: dto.companyCode },
      });
      if (!business) throw new NotFoundException('Business not found');

      user = await this.userRepository.findOne({
        where: { email: dto.email, businessId: business.id },
      });
    } else {
      user = await this.userRepository.findOne({
        where: {
          email: dto.email,
          platformRole: Not(IsNull()) as unknown as FindOperator<PlatformRole>,
        },
      });
    }

    // Always return success (security: don't reveal if email exists)
    if (!user) return { message: 'Password reset link sent to email' };

    const resetToken = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.userRepository.update(user.id, {
      resetToken,
      resetTokenExpiry: expiry,
    });

    // In a real app: send email with resetToken
    // For dev/testing, return the token directly
    return {
      message: 'Password reset link sent to email',
      resetToken, // Remove this in production
    };
  }

  // ─────────────────────── 6. RESET PASSWORD ─────────────

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { resetToken: dto.resetToken },
      select: ['id', 'resetToken', 'resetTokenExpiry'],
    });

    if (!user || !user.resetTokenExpiry) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (new Date() > user.resetTokenExpiry) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashed = await HashUtil.hash(dto.newPassword);
    await this.userRepository.update(user.id, {
      password: hashed,
      resetToken: null,
      resetTokenExpiry: null,
      refreshToken: null, // Invalidate all sessions
    });

    return { message: 'Password reset successful' };
  }

  // ─────────────────────── 7. GET PROFILE ────────────────

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.platformRole ? 'PLATFORM' : 'TENANT',
      ...(user.platformRole && { platformRole: user.platformRole }),
      ...(user.businessId && { businessId: user.businessId }),
      ...(user.role?.name && { role: user.role.name }),
      permissions: user.role?.permissions?.map((p) => p.key) || [],
    };
  }

  // ─────────────────────── 8. VALIDATE TOKEN ─────────────

  validateToken() {
    // If we reach here, JwtAuthGuard has already validated the token
    return { valid: true };
  }

  // ─────────────────────── 9. GET MY PERMISSIONS ─────────

  async getMyPermissions(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      role: user.role?.name || null,
      permissions: user.role?.permissions?.map((p) => p.key) || [],
    };
  }
}
