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
    private readonly feedService: FeedService,
  ) {}

  @Get("")
  @UseGuards(JwtAuthGuard)
  getFeed(@CurrentUser() user: JwtPayload, @Query() query: FeedQueryDto) {
    // includeRelated = true to return nested parent/retweet relations in the feed
    return this.tweetsService.getFeed(user.id, query.take, query.cursor, true);
  }
  // Endpoint para contar tweets nuevos
  @Get("new-count")
  @UseGuards(JwtAuthGuard)
  async getNewTweetsCount(
    @CurrentUser() user: JwtPayload,
    @Query("lastSeen") lastSeen: string,
  ) {
    // lastSeen puede ser una fecha ISO o un tweetId
    // Aquí asumimos fecha ISO
    const count = await this.tweetsService.countNewTweets(user.id, lastSeen);
    return { newTweetsCount: count };
  }
}
