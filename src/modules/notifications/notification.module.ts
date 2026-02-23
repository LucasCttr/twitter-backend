import { Module } from "@nestjs/common";
import { BullModule } from '@nestjs/bull';
import { TweetsModule } from '../tweets/tweets.module';
import { FeedModule } from '../feed/feed.module';
import { LikeNotifyProcessor } from "./processors/like-notify.processor";
import { QueueDebugService } from './test/queue-debug.service';
import { FollowNotifyProcessor } from "./processors/follow-notify.processor";

@Module({
  imports: [
    TweetsModule,
    BullModule.registerQueue({ name: 'like-notify' }),
    BullModule.registerQueue({ name: 'follow-notify' }),
    FeedModule,
  ],
  controllers: [],
  providers: [ LikeNotifyProcessor, FollowNotifyProcessor],
})
export class NotificationsModule {}