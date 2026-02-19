import { Controller, Get, Param, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { UserFilterDto } from './dto/user-filter.dto';

@Controller('users')
export class UserController {
     constructor(private readonly userService: UserService) {}

    @Get()
    getByPagination(@Param() filter: UserFilterDto) {
        return this.userService.getByPagination(filter);
    }

}
