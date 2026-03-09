import {
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Delete,
} from "@nestjs/common";
import { UserService } from "./user.service";

import { UserFilterDto } from "./dto/user-filter.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guards";
import { TweetsService } from "../tweets/tweets.service";
import { TweetFilterDto } from "../tweets/dto/tweet-filter.dto";
import { CursorPaginationDto } from "../../utils/cursor-pagination.dto";
import { CurrentUser } from "../../utils/current-user.decorator";
import { JwtPayload } from "jsonwebtoken";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly tweetService: TweetsService,

  ) {}
  // Controlador: operaciones relacionadas con usuarios
  // - Endpoints de seguimiento (follow/unfollow)
  // - Perfil y listados paginados

  // FOLLOW endpoints (migrados de SocialController)
  @Post(':userId/follow')
  // Seguir a un usuario
  follow(
    @CurrentUser() user: JwtPayload,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.userService.followUser(user.id, userId);
  }

  @Delete(':userId/follow')
  // Dejar de seguir a un usuario
  unfollow(
    @CurrentUser() user: JwtPayload,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.userService.unfollowUser(user.id, userId);
  }

  @Get()
  // Listado de usuarios con filtros y paginación
  getByPagination(@Query() filter: UserFilterDto, @CurrentUser() user: JwtPayload) {
    return this.userService.getByPagination(filter, user?.id);
  }

  @Patch('me')
  // Actualizar perfil del usuario autenticado
  updateMe(@Body() dto: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    return this.userService.update(user.id, dto);
  }

  @Get(":id/tweets")
  getUserTweets(
    @Query() filter: TweetFilterDto,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    // Obtener tweets de un usuario específico (paginado)
    return this.tweetService.getTweetsByPagination({ ...filter, authorId: id });
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  getProfile(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    // Obtener perfil público del usuario, incluyendo flags relacionados al usuario actual
    return this.userService.getProfile(id, user?.id);
  }

  @Get(":id/followers")
  @UseGuards(JwtAuthGuard)
  getFollowers(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() pagination: CursorPaginationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // Listar seguidores del usuario (paginado)
    return this.userService.getFollowers(id, pagination, user?.id);
  }

  @Get(":id/following")
  @UseGuards(JwtAuthGuard)
  getFollowing(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() pagination: CursorPaginationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // Listar usuarios a los que sigue (paginado)
    return this.userService.getFollowing(id, pagination, user?.id);
  }
}
