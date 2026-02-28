import {
  BadRequestException,
  Get,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Post,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { CreateTweetDto } from "./dto/create-tweet.dto.js";
import { TweetResponseDto } from "./dto/tweet-response.dto.js";
import { TweetFilterDto } from "./dto/tweet-filter.dto.js";
import { CursorPaginationDto } from "../../utils/cursor-pagination.dto.js";
import { PaginatedResponse } from "../../utils/pagination-respone.dto.js";
import { FeedResponseDto } from "../feed/dto/feed-query.dto.js";
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
  export class TweetsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("tweet-notify") private readonly tweetNotifyQueue: Queue,
    @InjectQueue("social-notify") private readonly socialNotifyQueue: Queue,
  ) {}

    // Contador de tweets nuevos desde lastSeen
    async countNewTweets(userId: string, lastSeen: string): Promise<number> {
      // Obtener los seguidos
      const following = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const ids = following.map(f => f.followingId);
      ids.push(userId);
      // Contar tweets creados después de lastSeen
      const count = await this.prisma.tweet.count({
        where: {
          authorId: { in: ids },
          createdAt: { gt: new Date(lastSeen) },
          deletedAt: null,
        },
      });
      return count;
    }

  async create(
    authorId: string,
    data: CreateTweetDto,
  ): Promise<TweetResponseDto> {
    const created = await this.createTweet(authorId, {
      content: data.content,
    });

    return new TweetResponseDto(created);
  }

  // Método central que crea tweets (normal, reply o retweet) y devuelve el DTO con relaciones anidadas opcionales
  private async createTweet(
    authorId: string,
    data: { content?: string; parentId?: string; retweetOfId?: string },
  ) {
    if (data.parentId && data.retweetOfId) {
      throw new BadRequestException("Cannot reply and retweet at the same time");
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
            email: true,
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
            retweets: true,
          },
        },
        retweetOf: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                likes: true,
                replies: true,
                retweets: true,
              },
            },
          },
        },
        parent: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                likes: true,
                replies: true,
                retweets: true,
              },
            },
          },
        },
      },
    });

    return tweet;
  }

  // Obtiene un tweet por id, con opciones para incluir relaciones anidadas y paginar replies 
  async findById(
    id: string,
    includeRelated = true,
    repliesPagination?: CursorPaginationDto,
  ): Promise<TweetResponseDto> {
    const tweet = await this.prisma.tweet.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
            retweets: true,
          },
        },
        retweetOf: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                likes: true,
                replies: true,
                retweets: true,
              },
            },
          },
        },
        parent: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                likes: true,
                replies: true,
                retweets: true,
              },
            },
          },
        },
      },
    });

    if (!tweet) {
      throw new BadRequestException("Tweet not found");
    }

    const dto = new TweetResponseDto(tweet, { includeParent: includeRelated, includeRetweet: includeRelated });
    // Usa Prisma `_count` (incluye soft-deleted items) — DTO lee `_count` directamente

    // Fetch level-1 replies con pagination
    const limit = repliesPagination?.limit ?? 20;
    const take = limit + 1;
    const replyFindOptions: any = {
      where: { parentId: id, deletedAt: null },
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { likes: true, replies: true, retweets: true } },
        retweetOf: { include: { author: { select: { id: true, name: true, email: true } }, _count: { select: { likes: true, replies: true, retweets: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    };

    if (repliesPagination?.cursor) {
      replyFindOptions.cursor = { id: repliesPagination.cursor };
      replyFindOptions.skip = 1;
    }

    const replies = await this.prisma.tweet.findMany(replyFindOptions);
    let nextCursor: string | null = null;
    let returned = replies;
    if (replies.length > limit) {
      nextCursor = replies[limit].id;
      returned = replies.slice(0, limit);
    }

    dto.replies = returned.map((r) => new TweetResponseDto(r, { includeParent: false, includeRetweet: includeRelated }));
    dto.repliesNextCursor = nextCursor;
    dto.repliesLimit = limit;

    return dto;
  }

  // Cursor-based pagination (no offset) con filtros opcionales
  async getTweetsByPagination(pagination: TweetFilterDto, includeRelated = true, currentUserId?: string) {
    // Cursor-based pagination (no offset)
    const limit = pagination.limit ?? 20;
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

    const include: any = {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
          retweets: true,
        },
      },
      retweetOf: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      parent: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    };

    // If currentUserId is provided, include filtered `likes` and `retweets` to compute flags
    if (currentUserId) {
      include.likes = { where: { userId: currentUserId }, select: { userId: true } };
      include.retweets = { where: { authorId: currentUserId }, select: { id: true } };
      // also include for nested relations
      include.retweetOf.include._count = include.retweetOf.include._count ?? { select: { likes: true, replies: true, retweets: true } };
      include.retweetOf.include.likes = { where: { userId: currentUserId }, select: { userId: true } };
      include.retweetOf.include.retweets = { where: { authorId: currentUserId }, select: { id: true } };
      include.parent.include._count = include.parent.include._count ?? { select: { likes: true, replies: true, retweets: true } };
      include.parent.include.likes = { where: { userId: currentUserId }, select: { userId: true } };
      include.parent.include.retweets = { where: { authorId: currentUserId }, select: { id: true } };
    }

    const findOptions: any = {
      where,
      include,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    };

    if (pagination.cursor) {
      findOptions.cursor = { id: pagination.cursor };
      findOptions.skip = 1;
    }

    const tweets = await this.prisma.tweet.findMany(findOptions);

    let nextCursor: string | null = null;
    let returned = tweets;
    if (tweets.length > limit) {
      nextCursor = tweets[limit].id;
      returned = tweets.slice(0, limit);
    }

    return new PaginatedResponse(
      returned.map((t) => new TweetResponseDto(t, { includeParent: includeRelated, includeRetweet: includeRelated })),
      limit,
      nextCursor,
    );
  }

  // Soft delete: marca el tweet como eliminado sin borrarlo de la base de datos
  async delete(id: string, authorId: string) {
    const tweet = await this.prisma.tweet.findUnique({ where: { id } });
    if (!tweet) {
      throw new NotFoundException("Tweet not found");
    }
    if (tweet.deletedAt) {
      throw new BadRequestException("Tweet already deleted");
    }
    if (tweet.authorId !== authorId) {
      throw new ForbiddenException("You are not allowed to delete this tweet");
    }
    await this.prisma.tweet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Tweet deleted successfully" };
  }

  // borra un retweet (que es un tweet con retweetOfId) donde `retweetOfId` es el id del tweet original y `userId` es el autor del retweet
  async undoRetweet(userId: string, tweetId: string) {
    const retweet = await this.prisma.tweet.findFirst({
      where: {
        authorId: userId,
        retweetOfId: tweetId,
        deletedAt: null,
      },
    });

    if (!retweet) {
      throw new NotFoundException("Retweet not found");
    }

    // Hard-delete the retweet (only for retweets we remove the row)
    await this.prisma.tweet.delete({ where: { id: retweet.id } });

    // Return a simple success message for the client to update state
    return { message: 'Retweet removed successfully' };
  }

  // borra un comentario (child tweet) donde `parentId` es el id del tweet padre y `userId` es el autor del comentario
  async deleteReply(userId: string, parentId: string) {
    const reply = await this.prisma.tweet.findFirst({
      where: {
        authorId: userId,
        parentId,
      },
    });

    if (!reply) {
      throw new NotFoundException("Reply not found");
    }

    return this.delete(reply.id, userId);
  }
  // RETWEET
  async retweet(userId: string, tweetId: string) {
    // Verificar si ya existe un retweet activo del mismo usuario sobre el tweet
    const existing = await this.prisma.tweet.findFirst({
      where: { authorId: userId, retweetOfId: tweetId, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Tweet already retweeted');
    }

    const created = await this.createTweet(userId, { retweetOfId: tweetId });

    // Notificar al autor del tweet original
    const original = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      select: { authorId: true },
    });

    if (original && original.authorId !== userId) {
      const payload = {
        userId: original.authorId,
        tweetId,
        likerId: userId,
        createdAt: new Date().toISOString(),
      };

      await this.tweetNotifyQueue.add("retweet-notify", payload, {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
      });
    }

    // Fetch the created retweet with includes so the DTO contains flags for current user
    const createdFull = await this.prisma.tweet.findUnique({
      where: { id: created.id },
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { likes: true, replies: true, retweets: true } },
        likes: { where: { userId }, select: { userId: true } },
        retweets: { where: { authorId: userId, deletedAt: null }, select: { id: true } },
        retweetOf: { include: { author: { select: { id: true, name: true, email: true } }, _count: { select: { likes: true, replies: true, retweets: true } } } },
        parent: { include: { author: { select: { id: true, name: true, email: true } }, _count: { select: { likes: true, replies: true, retweets: true } } } },
      },
    });

    return new TweetResponseDto(createdFull, { includeParent: true, includeRetweet: true });
  }

  // LIKE / UNLIKE moved from SocialService
  async like(userId: string, tweetId: string) {
    // Prevent duplicate likes
    const existing = await this.prisma.like.findUnique({
      where: { userId_tweetId: { userId, tweetId } },
    });

    if (existing) {
      throw new BadRequestException('Tweet already liked');
    }

    const like = await this.prisma.like.create({
      data: {
        userId,
        tweetId,
      },
    });

    // Obtener el autor del tweet para notificar
    const tweet = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      select: { authorId: true },
    });

    // evita notificarte a ti mismo o si no hay autor
    if (!tweet?.authorId || tweet.authorId === userId) {
      // Return updated tweet DTO even if no notification is sent
      const updated = await this.prisma.tweet.findUnique({
        where: { id: tweetId },
        include: {
          author: { select: { id: true, name: true, email: true } },
          _count: { select: { likes: true, replies: true, retweets: true } },
          likes: { where: { userId }, select: { userId: true } },
          retweets: { where: { authorId: userId }, select: { id: true } },
          retweetOf: { include: { author: { select: { id: true, name: true, email: true } }, _count: { select: { likes: true, replies: true, retweets: true } } } },
          parent: { include: { author: { select: { id: true, name: true, email: true } }, _count: { select: { likes: true, replies: true, retweets: true } } } },
        },
      });

      return new TweetResponseDto(updated);
    }

    const payload = {
      userId: tweet.authorId,
      tweetId,
      likerId: userId,
      createdAt: new Date().toISOString(),
    };

    await this.socialNotifyQueue.add("like-notify", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
    });

    const updated = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { likes: true, replies: true, retweets: true } },
        likes: { where: { userId }, select: { userId: true } },
        retweets: { where: { authorId: userId }, select: { id: true } },
        retweetOf: { include: { author: { select: { id: true, name: true, email: true } }, _count: { select: { likes: true, replies: true, retweets: true } } } },
        parent: { include: { author: { select: { id: true, name: true, email: true } }, _count: { select: { likes: true, replies: true, retweets: true } } } },
      },
    });

    return new TweetResponseDto(updated);
  }

  async unlike(userId: string, tweetId: string) {
    await this.prisma.like.delete({
      where: {
        userId_tweetId: {
          userId,
          tweetId,
        },
      },
    });

    const updated = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { likes: true, replies: true, retweets: true } },
        likes: { where: { userId }, select: { userId: true } },
        retweets: { where: { authorId: userId }, select: { id: true } },
        retweetOf: { include: { author: { select: { id: true, name: true, email: true } }, _count: { select: { likes: true, replies: true, retweets: true } } } },
        parent: { include: { author: { select: { id: true, name: true, email: true } }, _count: { select: { likes: true, replies: true, retweets: true } } } },
      },
    });

    return new TweetResponseDto(updated);
  }


  // REPLY
  async reply(userId: string, parentId: string, dto: CreateTweetDto) {
    const created = await this.createTweet(userId, {
      content: dto.content,
      parentId,
    });

    // Notificar al autor del tweet original
    const original = await this.prisma.tweet.findUnique({
      where: { id: parentId },
      select: { authorId: true },
    });

    if (original && original.authorId !== userId) {
      const payload = {
        userId: original.authorId,
        tweetId: parentId,
        likerId: userId,
        createdAt: new Date().toISOString(),
      };

      await this.tweetNotifyQueue.add("reply-notify", payload, {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
      });
    }

    return new TweetResponseDto(created);
  }

  // Obtiene tweets de un usuario y sus seguidos (feed)
  async getFeed(userId: string, take = 20, cursor?: string, includeRelated = false) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const authorIds = following.map((f) => f.followingId);
    authorIds.push(userId);

    const where: any = {
      authorId: { in: authorIds },
      deletedAt: null,
    };

    const tweets = await this.prisma.tweet.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // include likes/retweets for current user to compute flags
        likes: { where: { userId }, select: { userId: true } },
        retweets: { where: { authorId: userId }, select: { id: true } },
        _count: {
          select: {
            likes: true,
            replies: true,
            retweets: true,
          },
        },
        retweetOf: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            likes: { where: { userId }, select: { userId: true } },
            retweets: { where: { authorId: userId }, select: { id: true } },
            _count: {
              select: {
                likes: true,
                replies: true,
                retweets: true,
              },
            },
            // incluir un nivel adicional de retweetOf para devolver retweets anidados
            retweetOf: {
              include: {
                author: {
                  select: { id: true, name: true, email: true },
                },
                _count: { select: { likes: true, replies: true, retweets: true } },
              },
            },
            parent: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                likes: { where: { userId }, select: { userId: true } },
                retweets: { where: { authorId: userId }, select: { id: true } },
                _count: { select: { likes: true, replies: true, retweets: true } },
              },
            },
          },
        },
        parent: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            likes: { where: { userId }, select: { userId: true } },
            retweets: { where: { authorId: userId }, select: { id: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
          },
        },
      },
      // orden determinista: primero por fecha, luego por id para evitar ambigüedades con timestamps iguales
      orderBy: [ { createdAt: "desc" }, { id: "desc" } ],
      take: take + 1, // 👈 importante
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    // Mapeo a TweetResponseDto y construcción de FeedResponseDto
    return new FeedResponseDto(tweets.map((t) => new TweetResponseDto(t, { includeParent: includeRelated, includeRetweet: includeRelated })), take);
  }
}
