import { Module } from "@nestjs/common";
import { TweetsService } from "../tweets/tweets.service";
import { FeedController } from "./feed.controller";
import { TweetsModule } from '../tweets/tweets.module';

@Module({ controllers: [FeedController], providers: [TweetsService] })
@Module({
	imports: [TweetsModule],
	controllers: [FeedController],
	providers: [TweetsService],
})
export class FeedModule {}
