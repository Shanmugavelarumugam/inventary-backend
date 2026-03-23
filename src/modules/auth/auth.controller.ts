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
import type {
  AuthenticatedRequest,
  RequestUser,
} from '../../common/interfaces/authenticated-request.interface.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import {
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/index.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── 1. Login (Super Admin + Tenant) ────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: AuthenticatedRequest) {
    return this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  // ─── 2. Refresh Access Token ─────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  // ─── 3. Logout ───────────────────────────────────────────
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.userId);
  }

  // ─── 4. Change Password ──────────────────────────────────
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  // ─── 5. Forgot Password ──────────────────────────────────
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ─── 6. Reset Password ───────────────────────────────────
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ─── 7. Get Current User Profile ─────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.userId);
  }

  // ─── 8. Validate Token ───────────────────────────────────
  @Get('validate')
  validateToken() {
    return { valid: true };
  }

  // ─── 9. Get Current User Permissions ────────────────────
  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  async getMyPermissions(@Request() req: AuthenticatedRequest) {
    return this.authService.getMyPermissions(req.user.userId);
  }
}
