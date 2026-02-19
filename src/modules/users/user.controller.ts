import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UserFilterDto } from './dto/user-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guards';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
     constructor(private readonly userService: UserService) {}

    @Get()
    getByPagination(@Query() filter: UserFilterDto) {
        return this.userService.getByPagination(filter);
    }

}
