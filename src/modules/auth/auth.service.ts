import bcrypt from "bcrypt";
import { PrismaClient } from '../../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { type OnModuleInit, type OnModuleDestroy, Injectable } from '@nestjs/common';
import type { RegisterDto } from "./dto/register.dto.js";

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private adapter: PrismaPg;
  private logger = console; // Use console as logger for now

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
    this.adapter = adapter;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connectated to the database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from the database');
  }


  async registerUser(dto: RegisterDto) {
    const existing = await this.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new Error("Email already in use");
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.user.create({ data: { name: dto.name, email: dto.email, password: hash } });
    return { id: user.id, name: user.name, email: user.email };
  }

  async validateUser(email: string, password: string) {
    const user = await this.user.findUnique({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return null;
    return { id: user.id, email: user.email, name: user.name };
  }

  async findUserById(id: string) {
    const user = await this.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
    return user;
  }
}


