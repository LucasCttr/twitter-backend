import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { TweetsModule } from '../tweets/tweets.module.js';

@Module({
    providers: [UserService],
    controllers: [UserController],
    imports: [TweetsModule]
})
export class UserModule {}
