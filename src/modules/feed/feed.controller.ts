import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guards";
import { CurrentUser } from "../../utils/current-user.decorator";
import { JwtPayload } from "jsonwebtoken";
import { FeedQueryDto } from "./dto/feed-query.dto";
import { TweetsService } from "../tweets/tweets.service";

@Controller("feed")
export class FeedController {
  constructor(private readonly tweetsService: TweetsService) {}

  @Get("")
  @UseGuards(JwtAuthGuard)
  getFeed(@CurrentUser() user: JwtPayload, @Query() query: FeedQueryDto) {
    return this.tweetsService.getFeed(user.id, query.take, query.cursor);
  }
}
