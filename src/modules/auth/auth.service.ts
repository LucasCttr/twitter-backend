import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service.js'
import * as bcrypt from 'bcrypt'
import { RegisterDto } from './dto/register.dto.js'

import { signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { addMinutes } from 'date-fns';

@Injectable()
export class AuthService {
  // Servicio de autenticación: registro, validación y manejo de refresh tokens
  constructor(private readonly prisma: PrismaService) {}

  async registerUser(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (existing) {
      throw new BadRequestException('Email already in use')
    }

    const hash = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hash,
      },
    })

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) return null

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })
  }

  async createRefreshToken(userId: string) {
    const payload = { sub: userId };
    const token = signRefreshToken(payload);
    // Decodificar para obtener expiración
    const decoded: any = verifyRefreshToken(token);
    const expiresAt = new Date(decoded.exp * 1000);
    // Al crear un nuevo refresh token, invalidamos (borramos) los previos del usuario
    // para mantener una única sesión válida por usuario en este flujo.
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
    return token;
  }

  async validateRefreshToken(token: string) {
    let payload: any;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return null;
    }
    // Verificar que el token exista en la base de datos y no esté revocado ni expirado
    const dbToken = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!dbToken || dbToken.revoked || dbToken.expiresAt < new Date()) {
      return null;
    }
    return dbToken.userId;
  }

  async revokeRefreshToken(token: string) {
    // Marcar como revocado el refresh token en la base de datos.
    // Esto evita que se pueda usar nuevamente para obtener JWTs.
    await this.prisma.refreshToken.update({ where: { token }, data: { revoked: true } });
  }
}
