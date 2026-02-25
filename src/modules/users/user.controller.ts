import { Controller, Get, Param, Post, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { UserFilterDto } from './dto/user-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guards';
import { TweetsService } from '../tweets/tweets.service';
import { TweetFilterDto } from '../tweets/dto/tweet-filter.dto';


@Controller('users')
export class UserController {
     constructor(private readonly userService: UserService, private readonly tweetService: TweetsService) {}

    @Get()
    getByPagination(@Query() filter: UserFilterDto) {
        return this.userService.getByPagination(filter);
    }

    @Get(':id/tweets')
    getUserTweets(@Query() filter: TweetFilterDto, @Param('id', new ParseUUIDPipe()) id: string) {
        return this.tweetService.getTweetsByPagination({...filter, authorId: id});
    }

}
