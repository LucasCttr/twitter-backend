import { Controller, Post, Body, Res, UseGuards, Req, Get, HttpStatus, HttpCode } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { LocalAuthGuard } from "./local-auth.guards.js";
import { JwtAuthGuard } from "./jwt-auth.guards.js";
import { signJwt } from "../../utils/jwt.js";
import { RegisterDto } from "./dto/register.dto.js";
import { LoginDto } from "./dto/login.dto.js";


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
  async login(@Req() req: any) {
    const user = req.user;
    const token = signJwt({ sub: user.id, email: user.email });
    return { token, user };   // NestJS serializa y responde 200 solo
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@Req() req: any) {
    return { user: req.user };
  }
}