import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type {
  AuthenticatedRequest,
  RequestUser,
} from '../../common/interfaces/authenticated-request.interface.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthService } from './auth.service.js';
import { TenantProvisioningService } from '../platform/services/tenant-provisioning.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import {
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/index.js';
import { ProvisionTenantDto } from '../platform/dto/index.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly provisioningService: TenantProvisioningService,
  ) {}

  // ─── 0. Register (Public Self-Service) ───────────────────
  @Post('register')
  @ApiOperation({ summary: 'Register a new business and admin account' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Conflict (email or business name exists)' })
  async register(@Body() dto: ProvisionTenantDto) {
    return this.provisioningService.createTenant(dto, 'SELF_SERVICE');
  }

  // ─── 1. Login (Super Admin + Tenant) ────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() dto: LoginDto, @Req() req: AuthenticatedRequest) {
    return this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  // ─── 2. Refresh Access Token ─────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  // ─── 3. Logout ───────────────────────────────────────────
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.userId);
  }

  // ─── 4. Change Password ──────────────────────────────────
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  // ─── 5. Forgot Password ──────────────────────────────────
  @Post('forgot-password')
  @ApiOperation({ summary: 'Forgot password' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ─── 6. Reset Password ───────────────────────────────────
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ─── 7. Get Current User Profile ─────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.userId);
  }

  // ─── 8. Validate Token ───────────────────────────────────
  @Get('validate')
  @ApiOperation({ summary: 'Validate current token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  validateToken() {
    return { valid: true };
  }

  // ─── 9. Get Current User Permissions ────────────────────
  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user permissions' })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
  })
  async getMyPermissions(@Request() req: AuthenticatedRequest) {
    return this.authService.getMyPermissions(req.user.userId);
  }
}
