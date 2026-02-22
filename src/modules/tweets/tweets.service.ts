import {
  BadRequestException,
  Get,
  Injectable,
  NotFoundException,
  Post,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { CreateTweetDto } from "./dto/create-tweet.dto.js";
import { TweetResponseDto } from "./dto/tweet-response.dto.js";
import { TweetFilterDto } from "./dto/tweet-filter.dto.js";
import { PaginatedResult } from "../../utils/pagination.dto.js";
import { FeedResponseDto } from "../feed/dto/feed-query.dto.js";
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class TweetsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('tweet-notify') private readonly notifyQueue: Queue,
  ) {}

  async create(
    authorId: string,
    data: CreateTweetDto,
  ): Promise<TweetResponseDto> {
    if (data.parentId && data.retweetOfId) {
      throw new BadRequestException(
        "Cannot reply and retweet at the same time",
      );
    }

    const tweet = await this.prisma.tweet.create({
      data: {
        content: data.content,
        authorId,
        parentId: data.parentId,
        retweetOfId: data.retweetOfId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // enqueue durable job for notification/fan-out
    await this.notifyQueue.add('notify', { 
      tweet: { id: tweet.id, createdAt: tweet.createdAt },
      userId: authorId,
      lastSeen:lastSeenDate, // <-- Agrega aquí la fecha de última recarga del feed    SEGUIR
    });
    return new TweetResponseDto(tweet);
  }

  async findById(id: string): Promise<TweetResponseDto> {
    const tweet = await this.prisma.tweet.findUnique({
      where: { id },
      include: {},
    });

    if (!tweet) {
      throw new BadRequestException("Tweet not found");
    }

    return new TweetResponseDto(tweet);
  }

  async getByPagination(pagination: TweetFilterDto) {
    // Asegura que page y limit sean números
    const page = pagination.page;
    const limit = pagination.limit;
    const deletedAt = null; // Solo tweets no eliminados

    // Construye el objeto where solo con filtros válidos
    const where: any = {};
    if (pagination.content) {
      where.content = { contains: pagination.content };
    }
    if (pagination.authorId) {
      where.authorId = pagination.authorId;
    }
    if (pagination.parentId) {
      where.parentId = pagination.parentId;
    }
    if (pagination.retweetOfId) {
      where.retweetOfId = pagination.retweetOfId;
    }
    where.deletedAt = deletedAt;

    const [tweets, total] = await this.prisma.$transaction([
      this.prisma.tweet.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tweet.count({ where }),
    ]);

    return new PaginatedResult(
      tweets.map((t) => new TweetResponseDto(t)),
      total,
      page,
      limit,
    );
  }

  async delete(id: string) {
    const tweet = await this.prisma.tweet.findUnique({ where: { id } });
    if (!tweet) {
      throw new NotFoundException("Tweet not found");
    }
    if (tweet.deletedAt) {
      throw new BadRequestException("Tweet already deleted");
    }
    await this.prisma.tweet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Tweet deleted successfully" };
  }

  async getFeed(userId: string, take = 20, cursor?: string) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const ids = following.map((f) => f.followingId);
    ids.push(userId);

    const tweets = await this.prisma.tweet.findMany({
      where: {
        authorId: { in: ids },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: take + 1, // 👈 importante
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    // Mapeo a TweetResponseDto y construcción de FeedResponseDto
    return new FeedResponseDto(tweets.map(t => new TweetResponseDto(t)), take);
  }
}
