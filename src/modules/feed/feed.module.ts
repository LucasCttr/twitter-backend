import { Module } from "@nestjs/common";
import { TweetsService } from "../tweets/tweets.service";
import { FeedController } from "./feed.controller";
import { TweetsModule } from '../tweets/tweets.module';
import { FeedGateway } from "./feed.gateway";
import { FeedService } from "./feed.service";

@Module({
  imports: [TweetsModule],
  controllers: [FeedController],
  providers: [FeedGateway, FeedService],
})
export class FeedModule {}