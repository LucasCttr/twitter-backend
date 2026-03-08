import { Controller, Get, Post, Delete, UseGuards, Query, Param } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guards.js";
import { TweetsService } from "./tweets.service.js";
import { CurrentUser } from "../../utils/current-user.decorator.js";
import { JwtPayload } from "jsonwebtoken";
import { CursorPaginationDto } from "../../utils/cursor-pagination.dto.js";

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly tweetsService: TweetsService) {}

  @Get("")
  @UseGuards(JwtAuthGuard)
  getBookmarks(@CurrentUser() user: JwtPayload, @Query() pagination: CursorPaginationDto) {
    const limit = pagination.limit ?? 20;
    return this.tweetsService.getBookmarkedTweets(user.id, limit, pagination.cursor);
  }

  @Post(':tweetId')
  @UseGuards(JwtAuthGuard)
  bookmark(@CurrentUser() user: JwtPayload, @Param('tweetId') tweetId: string) {
    return this.tweetsService.bookmarkTweet(user.id, tweetId);
  }

  @Delete(':tweetId')
  @UseGuards(JwtAuthGuard)
  unbookmark(@CurrentUser() user: JwtPayload, @Param('tweetId') tweetId: string) {
    return this.tweetsService.unbookmarkTweet(user.id, tweetId);
  }
}
