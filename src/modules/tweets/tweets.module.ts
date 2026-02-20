import { Module } from '@nestjs/common';
import { TweetsService } from './tweets.service.js';
import { TweetsController } from './tweets.controller.js';

@Module({
  providers: [TweetsService],
  controllers: [TweetsController],
  exports: [TweetsService],
})
export class TweetsModule {}
