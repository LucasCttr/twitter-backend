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
    return this.socialService.followUser(user.id, userId)
  }

  @Delete('follow/:userId')
  unfollow(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.socialService.unfollowUser(user.id, userId)
  }

  // LIKE
  // LIKE endpoints moved to TweetsController
}