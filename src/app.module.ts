import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module.js';
import { TweetsModule } from './modules/tweets/tweets.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { UserController } from './modules/users/user.controller.js';
import { UserService } from './modules/users/user.service.js';
import { UserModule } from './modules/users/user.module.js';

@Module({
  imports: [AuthModule, TweetsModule,PrismaModule, UserModule, PrismaModule],
  controllers: [UserController],
  providers: [UserService],
})
export class AppModule {}