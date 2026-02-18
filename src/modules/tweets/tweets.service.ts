import { BadRequestException, Get, Injectable, Post } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { CreateTweetDto } from "./dto/create-tweet.dto.js";
import { TweetResponseDto } from "./dto/tweet-response.dto.js";

@Injectable()
export class TweetsService {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
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

    return new TweetResponseDto(tweet);
  }

  @Get(":id")
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
}
