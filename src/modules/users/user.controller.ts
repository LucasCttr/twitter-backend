import {
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { UserFilterDto } from "./dto/user-filter.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guards";
import { TweetsService } from "../tweets/tweets.service";
import { TweetFilterDto } from "../tweets/dto/tweet-filter.dto";
import { CursorPaginationDto } from "../../utils/cursor-pagination.dto";
import { CurrentUser } from "../../utils/current-user.decorator";
import { JwtPayload } from "jsonwebtoken";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly tweetService: TweetsService,
  ) {}

  @Get()
  getByPagination(@Query() filter: UserFilterDto, @CurrentUser() user: JwtPayload) {
    return this.userService.getByPagination(filter, user?.id);
  }

  @Patch('me')
  updateMe(@Body() dto: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    return this.userService.update(user.id, dto);
  }

  @Get(":id/tweets")
  getUserTweets(
    @Query() filter: TweetFilterDto,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.tweetService.getTweetsByPagination({ ...filter, authorId: id });
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  getProfile(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userService.getProfile(id, user?.id);
  }

  @Get(":id/followers")
  @UseGuards(JwtAuthGuard)
  getFollowers(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() pagination: CursorPaginationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userService.getFollowers(id, pagination, user?.id);
  }

  @Get(":id/following")
  @UseGuards(JwtAuthGuard)
  getFollowing(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() pagination: CursorPaginationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userService.getFollowing(id, pagination, user?.id);
  }
}
