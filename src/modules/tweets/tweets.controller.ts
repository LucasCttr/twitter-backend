import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guards.js";
import { JwtPayload } from "jsonwebtoken";
import { CreateTweetDto } from "./dto/create-tweet.dto.js";
import { TweetsService } from "./tweets.service.js";
import { CurrentUser } from "../../utils/current-user.decorator.js";
import { CursorPaginationDto } from "../../utils/cursor-pagination.dto.js";
import { TweetFilterDto } from "./dto/tweet-filter.dto.js";

@Controller("tweets")
export class TweetsController {
  constructor(private readonly tweetsService: TweetsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTweetDto) {
    return this.tweetsService.create(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getByPagination(@CurrentUser() user: JwtPayload, @Query() pagination: TweetFilterDto) {
    return this.tweetsService.getTweetsByPagination(pagination, true, user.id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  delete(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.tweetsService.delete(id, user.id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findById(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Query() pagination: CursorPaginationDto,
  ) {
    return this.tweetsService.findById(id, true, pagination);
  }

  // RETWEET
  @Post('/:tweetId/retweet')
  @UseGuards(JwtAuthGuard)
  retweet(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    return this.tweetsService.retweet(user.id, tweetId)
  }

  @Delete('/:tweetId/retweet')
  @UseGuards(JwtAuthGuard)
  undoRetweet(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    return this.tweetsService.undoRetweet(user.id, tweetId)
  }

  // REPLY
  @Post(':tweetId/reply')
  @UseGuards(JwtAuthGuard)
  reply(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
    @Body() dto: CreateTweetDto,
  ) {
    return this.tweetsService.reply(user.id, tweetId, dto)
  }

  @Delete(':tweetId/reply')
  @UseGuards(JwtAuthGuard)
  deleteReply(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    return this.tweetsService.deleteReply(user.id, tweetId)
  }


}
