import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guards";
import { CurrentUser } from "../../utils/current-user.decorator";
import { JwtPayload } from "jsonwebtoken";
import { FeedQueryDto } from "./dto/feed-query.dto";
import { TweetsService } from "../tweets/tweets.service";
import { FeedGateway } from "./feed.gateway";
import { FeedService } from "./feed.service";

@Controller("feed")
export class FeedController {
  constructor(
    private readonly tweetsService: TweetsService,
    private readonly feedService: FeedService
  ) {}

  @Get("")
  @UseGuards(JwtAuthGuard)
  getFeed(@CurrentUser() user: JwtPayload, @Query() query: FeedQueryDto) {
    return this.tweetsService.getFeed(user.id, query.take, query.cursor);
  }
  
  @Post("notify")
  notify(@Body() body: { ids: string[] }) {
    const newTweets = body.ids.map(id => ({
      id,
      createdAt: new Date().toISOString()
    }));
    this.feedService.notifyNewTweets(newTweets);
    return { ok: true };
  }
}

