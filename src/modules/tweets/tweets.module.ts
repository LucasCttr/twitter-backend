import { Module } from "@nestjs/common";
import { TweetsService } from "./tweets.service.js";
import { TweetsController } from "./tweets.controller.js";
import { BullModule } from "@nestjs/bull";
import { SocialModule } from "../social/social.module.js";

@Module({
  imports: [
    BullModule.registerQueue({ name: "tweet-notify" }),
    BullModule.registerQueue({ name: "social-notify" }),
    SocialModule,
  ],
  providers: [TweetsService],
  controllers: [TweetsController],
  exports: [TweetsService],
})
export class TweetsModule {}
