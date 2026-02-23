import { Module } from "@nestjs/common";
import { BullModule } from '@nestjs/bull';
import { FeedController } from "./feed.controller";
import { FeedGateway } from "./feed.gateway";
import { FeedService } from "./feed.service";
import { TweetsModule } from '../tweets/tweets.module';

@Module({
  imports: [TweetsModule],
  controllers: [FeedController],
  providers: [FeedGateway, FeedService],
  exports: [FeedGateway],
})
export class FeedModule {}