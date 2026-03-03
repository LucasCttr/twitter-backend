import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { SocialService } from "./social.service";
import { SocialController } from "./social.controller";

@Module({
  imports: [
    BullModule.registerQueue({ name: "notifications" }),
  ],
  providers: [SocialService],
  controllers: [SocialController],
  exports: [SocialService],
})
export class SocialModule {}
