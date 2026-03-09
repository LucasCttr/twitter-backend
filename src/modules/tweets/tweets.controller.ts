import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guards.js";
import { JwtPayload } from "jsonwebtoken";
import { CreateTweetDto } from "./dto/create-tweet.dto.js";
import { TweetsService } from "./tweets.service.js";
import { CurrentUser } from "../../utils/current-user.decorator.js";
import { CursorPaginationDto } from "../../utils/cursor-pagination.dto.js";
import { TweetFilterDto } from "./dto/tweet-filter.dto.js";

@Controller("tweets")
export class TweetsController {
  constructor(private readonly tweetsService: TweetsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  // Crear un nuevo tweet. Requiere autenticación.
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTweetDto) {
    return this.tweetsService.create(user.id, dto);
  }

  @Get("")
  @UseGuards(JwtAuthGuard)
  // Obtener tweets con paginación por cursor y filtros opcionales. Endpoint autenticado.
  getByPagination(@CurrentUser() user: JwtPayload, @Query() pagination: TweetFilterDto) {
    return this.tweetsService.getTweetsByPagination(pagination, true, user.id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  // Borrado lógico (soft-delete) de un tweet creado por el usuario actual.
  delete(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.tweetsService.delete(id, user.id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findById(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Query() pagination: CursorPaginationDto,
  ) {
    // Devolver un tweet con relaciones anidadas y página de respuestas.
    return this.tweetsService.findById(id, true, pagination, user.id);
  }

  // RETWEET
  @Post('/:tweetId/retweet')
  @UseGuards(JwtAuthGuard)
  retweet(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    // Crear un retweet para el usuario actual.
    return this.tweetsService.retweet(user.id, tweetId)
  }

  @Delete('/:tweetId/retweet')
  @UseGuards(JwtAuthGuard)
  undoRetweet(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    // Eliminar un retweet creado previamente por el usuario actual.
    return this.tweetsService.undoRetweet(user.id, tweetId)
  }

  // REPLY
  @Post(':tweetId/reply')
  @UseGuards(JwtAuthGuard)
  reply(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
    @Body() dto: CreateTweetDto,
  ) {
    // Responder a un tweet.
    return this.tweetsService.reply(user.id, tweetId, dto)
  }

  // LIKE 
  @Post(':tweetId/like')
  @UseGuards(JwtAuthGuard)
  like(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    // Dar like a un tweet como el usuario actual.
    return this.tweetsService.like(user.id, tweetId)
  }

  @Delete(':tweetId/like')
  @UseGuards(JwtAuthGuard)
  unlike(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    // Eliminar el like del usuario actual en un tweet.
    return this.tweetsService.unlike(user.id, tweetId)
  }

  @Delete(':tweetId/reply')
  @UseGuards(JwtAuthGuard)
  deleteReply(
    @CurrentUser() user: JwtPayload,
    @Param('tweetId') tweetId: string,
  ) {
    // Eliminar una respuesta (reply) creada por el usuario actual.
    return this.tweetsService.deleteReply(user.id, tweetId)
  }
}
