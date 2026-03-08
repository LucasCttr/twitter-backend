import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module.js';
import { TweetsModule } from './modules/tweets/tweets.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { UserController } from './modules/users/user.controller.js';
import { UserService } from './modules/users/user.service.js';
import { UserModule } from './modules/users/user.module.js';
import { FeedModule } from './modules/feed/feed.module';
import { NotificationsModule } from './modules/notifications/notification.module.js';
import { MessagesModule } from './modules/messages/messages.module';
import { TrendingController } from './modules/trending/trending.controller';
import { TrendingService } from './modules/trending/trending.service';
import { TrendingModule } from './modules/trending/trending.module';

@Module({
  imports: [
    AuthModule,
    TweetsModule,
    PrismaModule,
    UserModule,
    FeedModule,
    NotificationsModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT) ?? 6379,
      },
    }),
    MessagesModule,
    TrendingModule,
  ],
  // controllers: [UserController, SocialController],
  // providers: [UserService],
  controllers: [TrendingController],
  providers: [TrendingService],
})
export class AppModule {}