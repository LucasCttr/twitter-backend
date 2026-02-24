import { Module } from "@nestjs/common";
import { BullModule } from '@nestjs/bull';
import { TweetsModule } from '../tweets/tweets.module';
import { FeedModule } from '../feed/feed.module';
import { SocialNotifyProcessor } from "./processors/social-notify.processor";
import { TweetNotifyProcessor } from "./processors/tweet-notify.processor";

@Module({
  imports: [
    TweetsModule,
    FeedModule,
  ],
  controllers: [],
  providers: [ SocialNotifyProcessor, TweetNotifyProcessor],
})
export class NotificationsModule {}