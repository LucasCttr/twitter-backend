import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guards.js";
import { JwtPayload } from "jsonwebtoken";
import { CreateTweetDto } from "./dto/create-tweet.dto.js";
import { TweetsService } from "./tweets.service.js";
import { CurrentUser } from "../../utils/current-user.decorator.js";
import { PaginationDto } from "../../utils/pagination.dto.js";
import { TweetFilterDto } from "./dto/tweet-filter.dto.js";

@Controller("tweet")
export class TweetsController {
  constructor(private readonly tweetsService: TweetsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTweetDto) {
    return this.tweetsService.create(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getByPagination(@Query() pagination: TweetFilterDto) {
    return this.tweetsService.getByPagination(pagination);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  delete(@Param("id") id: string) {
    return this.tweetsService.delete(id);
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
