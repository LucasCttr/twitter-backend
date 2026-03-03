import { Module } from "@nestjs/common";
import { BullModule } from '@nestjs/bull';
import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";
import { TweetsModule } from '../tweets/tweets.module';
import { NotificationsGateway } from "../notifications/notifications.gateway";

@Module({
  imports: [TweetsModule],
  controllers: [FeedController],
  providers: [NotificationsGateway, FeedService],
  exports: [NotificationsGateway],
})
export class FeedModule {}