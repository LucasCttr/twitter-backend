import { Module } from "@nestjs/common";
import { TweetsService } from "./tweets.service.js";
import { TweetsController } from "./tweets.controller.js";
import { BookmarksController } from "./bookmarks.controller.js";
import { BullModule } from "@nestjs/bull";

@Module({
  imports: [
    BullModule.registerQueue({ name: "notifications" }),
  ],
  providers: [TweetsService],
  controllers: [TweetsController, BookmarksController],
  exports: [TweetsService],
})
export class TweetsModule {}
