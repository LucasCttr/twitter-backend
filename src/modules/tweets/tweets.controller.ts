import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guards.js";
import { JwtPayload } from "jsonwebtoken";
import { CreateTweetDto } from "./dto/create-tweet.dto.js";
import { TweetsService } from "./tweets.service.js";
import { CurrentUser } from "../../utils/current-user.decorator.js";

@Controller("tweets")
export class TweetsController {
  constructor(private readonly tweetsService: TweetsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTweetDto) {
    return this.tweetsService.create(user.id, dto);
  }
}



