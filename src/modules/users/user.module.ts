import { Module } from "@nestjs/common";
import { UserController } from "./user.controller.js";
import { UserService } from "./user.service.js";
import { TweetsModule } from "../tweets/tweets.module.js";
import { BullModule } from "@nestjs/bull";

@Module({
  providers: [UserService],
  controllers: [UserController],
  imports: [TweetsModule, BullModule.registerQueue({ name: "notifications" })],
})
export class UserModule {}
