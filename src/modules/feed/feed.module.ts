import { Module } from "@nestjs/common";
import { BullModule } from '@nestjs/bull';
import { FeedController } from "./feed.controller";
import { FeedGateway } from "./feed.gateway";
import { FeedService } from "./feed.service";
import { NotifyProcessor } from "./notify.processor";
import { TweetsModule } from '../tweets/tweets.module';

@Module({
  imports: [
    TweetsModule,
    BullModule.registerQueue({ name: 'tweet-notify' }),
  ],
  controllers: [FeedController],
  providers: [FeedGateway, FeedService, NotifyProcessor],
})
export class FeedModule {}