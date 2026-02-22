import { Module } from '@nestjs/common';
import { TweetsService } from './tweets.service.js';
import { TweetsController } from './tweets.controller.js';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'tweet-notify' }),
  ],
  providers: [TweetsService],
  controllers: [TweetsController],
  exports: [TweetsService],
})
export class TweetsModule {}
