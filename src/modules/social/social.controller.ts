import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common'
import { SocialService } from './social.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guards'
import { JwtPayload } from 'jsonwebtoken'
import { CurrentUser } from '../../utils/current-user.decorator'

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // FOLLOW
  @Post('follow/:userId')
  follow(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.socialService.follow(user.id, userId)
  }

  @Delete('follow/:userId')
  unfollow(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.socialService.unfollow(user.id, userId)
  }

  // LIKE
  @Post('like/:tweetId')
  like(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    return this.socialService.like(user.id, tweetId)
  }

  @Delete('like/:tweetId')
  unlike(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    return this.socialService.unlike(user.id, tweetId)
  }

  // RETWEET
  @Post('retweet/:tweetId')
  retweet(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    return this.socialService.retweet(user.id, tweetId)
  }

  @Delete('retweet/:tweetId')
  undoRetweet(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    return this.socialService.undoRetweet(user.id, tweetId)
  }
}