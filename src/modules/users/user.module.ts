import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

@Module({
    providers: [UserService],
    controllers: [UserController],
    imports: []
})
export class UserModule {}
