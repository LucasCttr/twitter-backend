import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service.js'
import * as bcrypt from 'bcrypt'
import { RegisterDto } from './dto/register.dto.js'

@Injectable()
export class AuthService {
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
}
