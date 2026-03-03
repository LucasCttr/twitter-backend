import { Module } from "@nestjs/common";
import { BullModule } from '@nestjs/bull';
import { TweetsModule } from '../tweets/tweets.module';
import { FeedModule } from '../feed/feed.module';
import { NotificationsProcessor } from "./processors/notify.processor";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    TweetsModule,
    FeedModule,
  ],
  controllers: [NotificationsController],
  providers: [ NotificationsProcessor, NotificationsService],
})
export class NotificationsModule {}