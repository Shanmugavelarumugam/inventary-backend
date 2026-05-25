import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, FindOperator, DataSource } from 'typeorm';
import { randomBytes } from 'crypto';
import { User } from '../../database/entities/user.entity.js';
import { Business } from '../../database/entities/business.entity.js';
import { Subscription } from '../../database/entities/subscription.entity.js';
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
  UpdateProfileDto,
} from './dto/index.js';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    type: 'PLATFORM' | 'TENANT';
    platformRole?: PlatformRole;
    role?: string;
    businessId: string | null;
  };
  business?: {
    id: string;
    name: string;
    companyCode: string;
  };
  subscription?: {
    plan: string;
    daysLeft: number;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly auditLogService: AuditLogService,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
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

  // ─────────────────────── 1. REGISTER ───────────────────
  // DEPRECATED: Use TenantProvisioningService.createTenant via AuthController

  // ─────────────────────── 2. LOGIN ──────────────────────

  async login(
    dto: LoginDto,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponse> {
    try {
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
          relations: ['role'],
          select: [
            'id',
            'email',
            'name',
            'password',
            'platformRole',
            'businessId',
            'roleId',
            'isActive',
            'lastLogin',
            'refreshToken',
          ],
        });
      }

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await HashUtil.compare(
        dto.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const loginPayload = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        type: user.platformRole ? 'PLATFORM' : 'TENANT',
        businessId: user.businessId,
        platformRole: user.platformRole || null,
        roleId: user.roleId,
        role: user.role?.name || null,
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

      let business: Business | null = null;
      let subscription: Subscription | null = null;

      if (user.businessId) {
        business = await this.businessRepository.findOne({
          where: { id: user.businessId },
        });

        if (business) {
          subscription = await this.subscriptionRepository.findOne({
            where: { businessId: business.id },
            order: { endDate: 'DESC' },
          });
        }
      }

      const response: LoginResponse = {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          type: user.platformRole ? 'PLATFORM' : 'TENANT',
          businessId: user.businessId || null,
          ...(user.platformRole && { platformRole: user.platformRole }),
          ...(user.role?.name && { role: user.role.name }),
        },
      };

      if (business) {
        response.business = {
          id: business.id,
          name: business.name,
          companyCode: business.companyCode,
        };
      }

      if (subscription) {
        const now = new Date();
        const end = new Date(subscription.endDate);
        const diff = end.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

        response.subscription = {
          plan: subscription.plan,
          daysLeft,
        };
      }

      return response;
    } catch (error) {
      console.error('AUTH LOGIN ERROR', error);
      throw error;
    }
  }

  // ─────────────────────── 3. REFRESH TOKEN ──────────────

  async refreshToken(dto: RefreshTokenDto) {
    let payload: { userId: string; type: string };
    try {
      payload = this.jwtService.verify(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
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

  // ─────────────────────── 4. LOGOUT ─────────────────────

  async logout(userId: string) {
    await this.userRepository.update(userId, {
      refreshToken: null,
    });
    return { message: 'Logged out successfully' };
  }

  // ─────────────────────── 5. CHANGE PASSWORD ────────────

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

  // ─────────────────────── 6. FORGOT PASSWORD ────────────

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

  // ─────────────────────── 7. RESET PASSWORD ─────────────

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

  // ─────────────────────── 8. GET PROFILE ────────────────
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
      settings: user.settings || {},
    };
  }

  // ─────────────────────── 9. VALIDATE TOKEN ─────────────

  validateToken() {
    // If we reach here, JwtAuthGuard has already validated the token
    return { valid: true };
  }

  // ─────────────────────── 10. GET MY PERMISSIONS ────────

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

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.userRepository.update(userId, {
      name: dto.name,
      ...(dto.settings && { settings: dto.settings }),
    });
    return this.getProfile(userId);
  }

  async discoverWorkspaces(email: string) {
    // 1. Fetch all active user records matching this email, bringing in the business relation
    const userAccounts = await this.userRepository.find({
      where: { email, isActive: true, businessId: Not(IsNull()) },
      relations: ['business'],
    });

    // 2. Deduplicate and map back only valid businesses
    const workspacesMap = new Map();

    for (const u of userAccounts) {
      if (u.business) {
        workspacesMap.set(u.business.id, {
          businessId: u.business.id,
          name: u.business.name,
          companyCode: u.business.companyCode,
          // placeholder logo link for client parity if dynamic images aren't setup yet
          logo: null,
        });
      }
    }

    return {
      workspaces: Array.from(workspacesMap.values()),
    };
  }

  async generateLoginResponseForUser(user: User): Promise<LoginResponse> {
    const loginPayload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      type: user.platformRole ? 'PLATFORM' : 'TENANT',
      businessId: user.businessId,
      platformRole: user.platformRole || null,
      roleId: user.roleId,
      role: user.role?.name || null,
    };
    const accessToken = await this.jwtService.signAsync(loginPayload);
    const refreshToken = await this.jwtService.signAsync(loginPayload, {
      expiresIn: '7d',
    });

    await this.userRepository.update(user.id, {
      refreshToken: refreshToken,
      lastLogin: new Date(),
    });

    let business: Business | null = null;
    let subscription: Subscription | null = null;

    if (user.businessId) {
      business = await this.businessRepository.findOne({
        where: { id: user.businessId },
      });

      if (business) {
        subscription = await this.subscriptionRepository.findOne({
          where: { businessId: business.id },
          order: { endDate: 'DESC' },
        });
      }
    }

    const response: LoginResponse = {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.platformRole ? 'PLATFORM' : 'TENANT',
        businessId: user.businessId || null,
        ...(user.platformRole && { platformRole: user.platformRole }),
        ...(user.role?.name && { role: user.role.name }),
      },
    };

    if (business) {
      response.business = {
        id: business.id,
        name: business.name,
        companyCode: business.companyCode,
      };
    }

    if (subscription) {
      const now = new Date();
      const end = new Date(subscription.endDate);
      const diff = end.getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

      response.subscription = {
        plan: subscription.plan,
        daysLeft,
      };
    }

    return response;
  }

  async verifyGoogleToken(token: string): Promise<{ email: string; name: string }> {
    try {
      const { OAuth2Client } = await import('google-auth-library');
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new BadRequestException('Google Client ID is not configured on the server');
      }
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google ID Token payload');
      }
      return {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
      };
    } catch (error) {
      console.error('Google token verification failed', error);
      throw new UnauthorizedException('Google ID Token verification failed');
    }
  }

  async googleLogin(email: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
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

    if (!user) {
      return { onboardingRequired: true };
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const loginResponse = await this.generateLoginResponseForUser(user);
    return {
      onboardingRequired: false,
      ...loginResponse,
    };
  }

  async googleOnboard(dto: any, provisioningService: any): Promise<any> {
    const decoded = await this.verifyGoogleToken(dto.token);

    const randomPassword = randomBytes(16).toString('hex');

    const provisionDto = {
      businessName: dto.businessName,
      domainType: dto.domainType as any,
      phone: dto.phone,
      address: dto.address,
      adminName: decoded.name,
      adminEmail: decoded.email,
      adminPassword: randomPassword,
      businessEmail: decoded.email,
    };

    const provisionResult = await provisioningService.createTenant(provisionDto, 'SELF_SERVICE');

    const user = await this.userRepository.findOne({
      where: { id: provisionResult.adminUser.id },
      relations: ['role'],
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

    if (!user) {
      throw new BadRequestException('Failed to retrieve provisioned user');
    }

    const loginResponse = await this.generateLoginResponseForUser(user);
    return loginResponse;
  }
}
