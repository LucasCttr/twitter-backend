import { Controller, Post, Body, Res, UseGuards, Req, Get, HttpStatus, HttpCode } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { LocalAuthGuard } from "./local-auth.guards.js";
import { JwtAuthGuard } from "./jwt-auth.guards.js";
import { signJwt } from "../../utils/jwt.js";
import { RegisterDto } from "./dto/register.dto.js";
import { LoginDto } from "./dto/login.dto.js";

import { RefreshDto } from "./dto/refresh.dto.js";


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    // Si authService lanza un error, deja que suba
    // NestJS lo captura y responde 500 automáticamente
    // O lanza BadRequestException desde el service
    return this.authService.registerUser(body);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const user = req.user;
    const token = signJwt({ sub: user.id, email: user.email });
    const refreshToken = await this.authService.createRefreshToken(user.id);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { token, user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@Req() req: any) {
    return { user: req.user };
  }

  @Post('refresh')
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const tokenFromCookie = req.cookies?.refreshToken;
    if (!tokenFromCookie) {
      return { error: 'Missing refresh token' };
    }
    const userId = await this.authService.validateRefreshToken(tokenFromCookie);
    if (!userId) {
      return { error: 'Invalid or expired refresh token' };
    }
    const user = await this.authService.findUserById(userId);
    if (!user) {
      return { error: 'User not found' };
    }
    await this.authService.revokeRefreshToken(tokenFromCookie);
    const newRefreshToken = await this.authService.createRefreshToken(user.id);
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    const token = signJwt({ sub: user.id, email: user.email });
    return { token, user };
  }
}