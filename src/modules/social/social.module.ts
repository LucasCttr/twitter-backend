import { Module } from '@nestjs/common';
import { UserService } from '../users/user.service';
import { UserController } from '../users/user.controller';

@Module({
    providers: [UserService],
    controllers: [UserController],
})
export class SocialModule {
}
