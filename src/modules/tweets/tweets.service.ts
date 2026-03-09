import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../database/prisma.service.js";
import { CreateTweetDto } from "./dto/create-tweet.dto.js";
import { TweetResponseDto } from "./dto/tweet-response.dto.js";
import { TweetFilterDto } from "./dto/tweet-filter.dto.js";
import { CursorPaginationDto } from "../../utils/cursor-pagination.dto.js";
import { PaginatedResponse } from "../../utils/pagination-respone.dto.js";
import { FeedResponseDto } from "../feed/dto/feed-query.dto.js";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

// Servicio: manejo central de tweets y acciones sociales (likes, retweets, bookmarks, feed)
// - Mantener las consultas optimizadas y devolver DTOs listos para la capa de controlador
@Injectable()
export class TweetsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("notifications") private readonly notificationsQueue: Queue,
  ) {}

  // Contador de tweets nuevos desde lastSeen
  async countNewTweets(userId: string, lastSeen: string): Promise<number> {
    // Obtener los seguidos
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const ids = following.map((f) => f.followingId);
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
    // Validaciones simples: un tweet no puede ser reply y retweet a la vez.
    // - `parentId` indica que es reply (respuesta a otro tweet)
    // - `retweetOfId` indica que es un retweet (reenvío de otro tweet)
    if (data.parentId && data.retweetOfId) {
      throw new BadRequestException("Cannot reply and retweet at the same time");
    }

    // Crear el tweet en la base de datos. Incluimos relaciones útiles para devolver
    // un objeto completo al cliente sin pedir llamadas adicionales:
    // - `author`: datos mínimos del autor
    // - `_count`: contadores para likes/replies/retweets (útiles para orden y UI)
    // - `retweetOf` y `parent`: relaciones anidadas con su propio autor y contadores
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
    currentUserId?: string,
  ): Promise<TweetResponseDto> {
    // Construir el objeto `include` para la consulta Prisma.
    // - Aquí se prepara qué relaciones se van a traer (author, counts, retweetOf, parent)
    // - Si `currentUserId` está presente, añadimos filtros para likes/retweets/bookmarks del usuario
    // Esto permite que el DTO pueda calcular flags como `likedByCurrentUser` o `bookmarked`.
    // Construir include para likes/retweets del usuario actual
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
    };
    if (currentUserId) {
      include.likes = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.bookmarks = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.retweets = {
        where: { authorId: currentUserId },
        select: { id: true },
      };
      include.retweetOf.include.likes = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.retweetOf.include.bookmarks = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.retweetOf.include.retweets = {
        where: { authorId: currentUserId },
        select: { id: true },
      };
      include.parent.include.likes = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.parent.include.bookmarks = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.parent.include.retweets = {
        where: { authorId: currentUserId },
        select: { id: true },
      };
    }
    const tweet = await this.prisma.tweet.findUnique({
      where: { id },
      include,
    });

    if (!tweet) {
      throw new BadRequestException("Tweet not found");
    }

    // Construir el DTO principal a partir del resultado de la consulta.
    // El constructor de `TweetResponseDto` se encarga de extraer counters y flags.
    const dto = new TweetResponseDto(tweet, {
      includeParent: includeRelated,
      includeRetweet: includeRelated,
    });
    // Fetch level-1 replies con likes/retweets del usuario actual
    const limit = repliesPagination?.limit ?? 20;
    const take = limit + 1;
    const replyInclude: any = {
      author: { select: { id: true, name: true, email: true } },
      _count: { select: { likes: true, replies: true, retweets: true } },
      retweetOf: {
        include: {
          author: { select: { id: true, name: true, email: true } },
          _count: { select: { likes: true, replies: true, retweets: true } },
        },
      },
      parent: {
        include: {
          author: { select: { id: true, name: true, email: true } },
          _count: { select: { likes: true, replies: true, retweets: true } },
        },
      },
    };
    // Para replies aplicamos paginación cursor-based de primer nivel:
    // - `take = limit + 1` nos permite detectar si existe una página siguiente
    // - No incluimos `parent` completo en las replies mapeadas al DTO para evitar recursión profunda
    // - Los includes filtrados por `currentUserId` permitirán que cada reply tenga flags booleanos
    if (currentUserId) {
      replyInclude.likes = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      replyInclude.bookmarks = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      replyInclude.retweets = {
        where: { authorId: currentUserId },
        select: { id: true },
      };
      replyInclude.retweetOf.include.likes = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      replyInclude.retweetOf.include.bookmarks = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      replyInclude.retweetOf.include.retweets = {
        where: { authorId: currentUserId },
        select: { id: true },
      };
      replyInclude.parent.include.likes = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      replyInclude.parent.include.bookmarks = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      replyInclude.parent.include.retweets = {
        where: { authorId: currentUserId },
        select: { id: true },
      };
    }
    const replyFindOptions: any = {
      where: { parentId: id, deletedAt: null },
      include: replyInclude,
      orderBy: { createdAt: "desc" },
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
    // Mapear las replies al DTO (nivel 1). Se evita incluir `parent` en estas replies para no recursar mucho.
    dto.replies = returned.map(
      (r) =>
        new TweetResponseDto(r, {
          includeParent: false,
          includeRetweet: includeRelated,
        }),
    );
    dto.repliesNextCursor = nextCursor;
    dto.repliesLimit = limit;
    return dto;
  }

  // Cursor-based pagination (no offset) con filtros opcionales
  async getTweetsByPagination(
    pagination: TweetFilterDto,
    includeRelated = true,
    currentUserId?: string,
  ) {
    // Construir filtros `where` según los parámetros recibidos.
    // - `q`, `authorId`, `parentId`, `retweetOfId` y `type` influyen en la condición
    // - `deletedAt` se fija a null para excluir tweets eliminados
    const limit = pagination.limit ?? 20;
    const deletedAt = null; // Solo tweets no eliminados

    // Construye el objeto where solo con filtros válidos
    const where: any = {};
    if (pagination.q) {
      where.content = { contains: pagination.q };
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

    // Filtrado por tipo: ajustar `where` según si se piden tweets, replies, retweets o likes
    if (pagination.type) {
      switch (pagination.type) {
        case 'tweet':
          // Solo tweets originales (sin parentId ni retweetOfId)
          where.parentId = null;
          where.retweetOfId = null;
          break;
        case 'reply':
          // Solo replies (tienen parentId)
          where.parentId = { not: null };
          break;
        case 'retweet':
          // Solo retweets (tienen retweetOfId)
          where.retweetOfId = { not: null };
          break;
        case 'like':
          // Tweets que un usuario ha marcado con like.
          // Comportamiento: si el cliente pasa `authorId` en la query junto con `type=like`,
          // lo interpretamos como el id del usuario que hizo el like (para mantener compatibilidad
          // sin cambiar el DTO). Si no se pasa `authorId`, caerá en `currentUserId`.
          const likerId = (pagination as any).authorId ?? currentUserId;
          if (likerId) {
            where.likes = { some: { userId: likerId } };
            // Evitar filtrar por authorId en los tweets (porque lo hemos usado como likerId)
            delete where.authorId;
          }
          break;
      }
    }

    // Preparar `include` para traer relaciones necesarias (author, counters y relaciones anidadas).
    // Si `currentUserId` está presente, añadimos includes filtrados para calcular flags por usuario
    // (`likedByCurrentUser`, `bookmarked`, `retweetedByCurrentUser`) sin consultas adicionales.
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
    };

    // Si hay `currentUserId`, incluir likes/retweets/bookmarks filtrados por ese usuario
    if (currentUserId) {
      include.likes = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.bookmarks = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.retweets = {
        where: { authorId: currentUserId },
        select: { id: true },
      };
      // also include for nested relations
      include.retweetOf.include._count = include.retweetOf.include._count ?? {
        select: { likes: true, replies: true, retweets: true },
      };
      include.retweetOf.include.likes = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.retweetOf.include.bookmarks = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.retweetOf.include.retweets = {
        where: { authorId: currentUserId },
        select: { id: true },
      };
      include.parent.include._count = include.parent.include._count ?? {
        select: { likes: true, replies: true, retweets: true },
      };
      include.parent.include.likes = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.parent.include.bookmarks = {
        where: { userId: currentUserId },
        select: { userId: true },
      };
      include.parent.include.retweets = {
        where: { authorId: currentUserId },
        select: { id: true },
      };
    }

    const findOptions: any = {
      where,
      include: {
        ...include,
      },
      // Siempre ordenar por recientes en la query, el orden por relevancia es solo en JS
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit + 1,
    };

    if (pagination.cursor) {
      findOptions.cursor = { id: pagination.cursor };
      findOptions.skip = 1;
    }

    // Ejecutar la consulta principal con los filtros e includes construidos.
    // Usamos `take = limit + 1` para detectar si hay una página siguiente (nextCursor).
    let tweets = await this.prisma.tweet.findMany(findOptions);

    // Si algún tweet no tiene `_count` (fallback), hacemos una consulta adicional por ese tweet
    // para obtener los contadores. Esto protege contra drivers/versión de Prisma que no rellenen `_count`.
    tweets = await Promise.all(
      tweets.map(async (t) => {
        const tweetWithCount = t as typeof t & { _count?: { likes: number; replies: number; retweets: number } };
        if (typeof tweetWithCount._count === 'undefined') {
          const counts = await this.prisma.tweet.findUnique({
            where: { id: t.id },
            select: { _count: { select: { likes: true, replies: true, retweets: true } } },
          });
          return { ...t, _count: counts?._count ?? { likes: 0, replies: 0, retweets: 0 } };
        }
        return tweetWithCount;
      })
    );

    // Si se solicitó orden por relevancia, ordenar en memoria usando los contadores
    // La puntuación es la suma simple de likes + retweets + replies. En caso de empate, usar fecha.
    if (pagination.sort === 'relevant') {
      tweets = tweets
        .map(
          (t) =>
            t as typeof t & { _count: { likes: number; replies: number; retweets: number } }
        )
        .sort((a, b) => {
          const aScore = (a._count?.likes ?? 0) + (a._count?.retweets ?? 0) + (a._count?.replies ?? 0);
          const bScore = (b._count?.likes ?? 0) + (b._count?.retweets ?? 0) + (b._count?.replies ?? 0);
          if (bScore !== aScore) return bScore - aScore;
          // Si hay empate, usar fecha de creación
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }

    // Aplicar lógica de paginación cursor-based para cortar el conjunto y determinar `nextCursor`.
    // Observación: la paginación se calcula sobre el resultado ordenado; cuando `sort==='relevant'`
    // se hace el ordenamiento en memoria (no en SQL) y luego se corta a `limit`.
    let nextCursor: string | null = null;
    let returned = tweets;
    if (tweets.length > limit) {
      returned = tweets.slice(0, limit);
      nextCursor = returned[returned.length - 1].id;
    }

    // Mapear los tweets a DTOs. `TweetResponseDto` lee los includes (likes, bookmarks, retweets)
    // para establecer flags booleanos por usuario.
    return new PaginatedResponse(
      returned.map(
        (t) =>
          new TweetResponseDto(t, {
            includeParent: includeRelated,
            includeRetweet: includeRelated,
          }),
      ),
      limit,
      nextCursor,
    );
  }

  // Soft delete: marca el tweet como eliminado sin borrarlo de la base de datos
  async delete(id: string, authorId: string) {
    // Validar existencia y permisos antes de marcar como eliminado
    // Esta función realiza un borrado lógico (soft-delete) estableciendo `deletedAt`.
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
    // Buscar el retweet creado por el usuario sobre el tweet original
    // Si existe, eliminamos esa fila (hard-delete) ya que los retweets se representan como tweets independientes
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

    // Eliminar físicamente el retweet del usuario
    await this.prisma.tweet.delete({ where: { id: retweet.id } });
    // Recuperar el tweet original actualizado con includes para reconstruir el DTO con flags
    const updated = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { likes: true, replies: true, retweets: true } },
        likes: { where: { userId }, select: { userId: true } },
        bookmarks: { where: { userId }, select: { userId: true } },
        retweets: {
          where: { authorId: userId, deletedAt: null },
          select: { id: true },
        },
        retweetOf: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
            bookmarks: { where: { userId }, select: { userId: true } },
          },
        },
        parent: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
            bookmarks: { where: { userId }, select: { userId: true } },
          },
        },
      },
    });

    return new TweetResponseDto(updated, {
      includeParent: true,
      includeRetweet: true,
    });
  }

  // borra un comentario (child tweet) donde `parentId` es el id del tweet padre y `userId` es el autor del comentario
  async deleteReply(userId: string, parentId: string) {
    // Buscar el reply creado por el usuario y delegar al método `delete` para aplicar borrado lógico
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
      throw new BadRequestException("Tweet already retweeted");
    }

    // Crear el retweet como un tweet independiente con `retweetOfId` apuntando al original
    const created = await this.createTweet(userId, { retweetOfId: tweetId });

    // Notificar al autor del tweet original (si procede). Evitar notificar cuando el autor sea el mismo usuario.
    const original = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      select: { authorId: true },
    });

    if (original && original.authorId !== userId) {
      const payload = {
        userId: original.authorId,
        tweetId,
        retweeterId: userId,
        createdAt: new Date().toISOString(),
      };

      await this.notificationsQueue.add("retweet-notify", payload, {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
      });
    }

    // Recuperar el retweet creado con los includes necesarios para construir el DTO.
    // Incluimos likes/bookmarks filtrados por `userId` para que el DTO marque `bookmarked`/`liked`.
    const createdFull = await this.prisma.tweet.findUnique({
      where: { id: created.id },
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { likes: true, replies: true, retweets: true } },
        likes: { where: { userId }, select: { userId: true } },
        bookmarks: { where: { userId }, select: { userId: true } },
        retweets: {
          where: { authorId: userId, deletedAt: null },
          select: { id: true },
        },
        retweetOf: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
            bookmarks: { where: { userId }, select: { userId: true } },
          },
        },
        parent: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
            bookmarks: { where: { userId }, select: { userId: true } },
          },
        },
      },
    });

    return new TweetResponseDto(createdFull, {
      includeParent: true,
      includeRetweet: true,
    });
  }

  // LIKE / UNLIKE moved from SocialService
  async like(userId: string, tweetId: string) {
    // Evitar likes duplicados
    const existing = await this.prisma.like.findUnique({
      where: { userId_tweetId: { userId, tweetId } },
    });

    if (existing) {
      throw new BadRequestException("Tweet already liked");
    }

    // Crear el like en la tabla. Esto es una operación simple insert en la tabla `Like`.
    const like = await this.prisma.like.create({
      data: {
        userId,
        tweetId,
      },
    });

    // Obtener el autor del tweet para decidir si enviar notificación.
    const tweet = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      select: { authorId: true },
    });

    // Si no hay autor o el autor es el mismo usuario que hizo el like, no enviar notificación.
    // En ambos casos debemos devolver el tweet actualizado con includes para que el cliente
    // reciba los flags actualizados (ej. likedByCurrentUser=true).
    if (!tweet?.authorId || tweet.authorId === userId) {
      const updated = await this.prisma.tweet.findUnique({
        where: { id: tweetId },
        include: {
          author: { select: { id: true, name: true, email: true } },
          _count: { select: { likes: true, replies: true, retweets: true } },
          likes: { where: { userId }, select: { userId: true } },
          bookmarks: { where: { userId }, select: { userId: true } },
          retweets: { where: { authorId: userId }, select: { id: true } },
          retweetOf: {
            include: {
              author: { select: { id: true, name: true, email: true } },
              _count: {
                select: { likes: true, replies: true, retweets: true },
              },
              bookmarks: { where: { userId }, select: { userId: true } },
            },
          },
          parent: {
            include: {
              author: { select: { id: true, name: true, email: true } },
              _count: {
                select: { likes: true, replies: true, retweets: true },
              },
              bookmarks: { where: { userId }, select: { userId: true } },
            },
          },
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

    // Encolar notificación para el autor del tweet. La cola maneja reintentos y backoff.
    await this.notificationsQueue.add("like-notify", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
    });

    // Si corresponde, encolar notificación y retornar tweet actualizado
    const updated = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { likes: true, replies: true, retweets: true } },
        likes: { where: { userId }, select: { userId: true } },
        bookmarks: { where: { userId }, select: { userId: true } },
        retweets: { where: { authorId: userId }, select: { id: true } },
        retweetOf: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
          },
        },
        parent: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
          },
        },
      },
    });

    return new TweetResponseDto(updated);
  }

  async unlike(userId: string, tweetId: string) {
    // Quitar el registro de `Like` para este usuario/tweet. Prisma lanzará si no existe.
    await this.prisma.like.delete({
      where: {
        userId_tweetId: {
          userId,
          tweetId,
        },
      },
    });

    // Tras eliminar el like, recuperamos el tweet con includes filtrados por `userId`
    // para que el `TweetResponseDto` pueda devolver flags actualizados (`likedByCurrentUser=false`).
    const updated = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { likes: true, replies: true, retweets: true } },
        likes: { where: { userId }, select: { userId: true } },
        bookmarks: { where: { userId }, select: { userId: true } },
        retweets: { where: { authorId: userId }, select: { id: true } },
        retweetOf: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
            bookmarks: { where: { userId }, select: { userId: true } },
          },
        },
        parent: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
            bookmarks: { where: { userId }, select: { userId: true } },
          },
        },
      },
    });

    return new TweetResponseDto(updated);
  }

  // REPLY
  async reply(userId: string, parentId: string, dto: CreateTweetDto) {
    // Crear una respuesta (reply) asociada al tweet `parentId` y notificar al autor original si procede
    const created = await this.createTweet(userId, {
      content: dto.content,
      parentId,
    });

    const original = await this.prisma.tweet.findUnique({
      where: { id: parentId },
      select: { authorId: true },
    });

    if (original && original.authorId !== userId) {
      const payload = {
        userId: original.authorId,
        tweetId: parentId,
        replierId: userId,
        createdAt: new Date().toISOString(),
      };

      await this.notificationsQueue.add("reply-notify", payload, {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
      });
    }

    return new TweetResponseDto(created);
  }

  // BOOKMARK
  async bookmarkTweet(userId: string, tweetId: string) {
    // Guardar marca (bookmark) para el usuario sobre el tweet indicado
    // La tabla `Bookmark` tiene una restricción única (userId, tweetId)
    return this.prisma.bookmark.create({
      data: { userId, tweetId },
    });
  }

  async unbookmarkTweet(userId: string, tweetId: string) {
    // Quitar bookmark del usuario sobre el tweet indicado
    return this.prisma.bookmark.delete({
      where: {
        userId_tweetId: {
          userId,
          tweetId,
        },
      },
    });
  }

  // Obtiene tweets guardados (bookmarks) del usuario, paginados por Bookmark.createdAt
  async getBookmarkedTweets(userId: string, take = 20, cursor?: string) {
    const limit = take;

    // Buscar bookmarks del usuario y extraer los tweets relacionados
    // La paginación se realiza sobre la entidad Bookmark (orden por Bookmark.createdAt)
    const findOptions: any = {
      where: { userId },
      include: {
        tweet: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
            retweetOf: {
              include: {
                author: { select: { id: true, name: true, email: true } },
                _count: { select: { likes: true, replies: true, retweets: true } },
              },
            },
            parent: {
              include: {
                author: { select: { id: true, name: true, email: true } },
                _count: { select: { likes: true, replies: true, retweets: true } },
              },
            },
            likes: { where: { userId }, select: { userId: true } },
            bookmarks: { where: { userId }, select: { userId: true } },
            retweets: { where: { authorId: userId }, select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    };

    if (cursor) {
      findOptions.cursor = { id: cursor };
      findOptions.skip = 1;
    }

    const bookmarks = await this.prisma.bookmark.findMany(findOptions);

    let nextCursor: string | null = null;
    let returned = bookmarks;
    if (bookmarks.length > limit) {
      nextCursor = bookmarks[limit].id;
      returned = bookmarks.slice(0, limit);
    }

    // Extraer la entidad `tweet` desde cada Bookmark y mapear a DTO.
    // Observación: `Bookmark.createdAt` es la base de la paginación, pero devolvemos los tweets asociados.
    const tweets = returned.map((b: any) => b.tweet);

    return new PaginatedResponse(
      tweets.map((t) => new TweetResponseDto(t, { includeParent: true, includeRetweet: true })),
      limit,
      nextCursor,
    );
  }

  // Obtiene tweets de un usuario y sus seguidos (feed)
  async getFeed(
    userId: string,
    take = 20,
    cursor?: string,
    includeRelated = false,
  ) {
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

    // La consulta del feed incluye flags prefiltrados (likes, bookmarks, retweets)
    // para que el DTO pueda producir `likedByCurrentUser` y `bookmarked` sin llamadas extra.
    // Se incluye además un nivel adicional de `retweetOf` para devolver retweets anidados.
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
        bookmarks: { where: { userId }, select: { userId: true } },
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
            bookmarks: { where: { userId }, select: { userId: true } },
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
                _count: {
                  select: { likes: true, replies: true, retweets: true },
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
                  bookmarks: { where: { userId }, select: { userId: true } },
                retweets: { where: { authorId: userId }, select: { id: true } },
                _count: {
                  select: { likes: true, replies: true, retweets: true },
                },
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
              bookmarks: { where: { userId }, select: { userId: true } },
            retweets: { where: { authorId: userId }, select: { id: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
          },
        },
      },
      // orden determinista: primero por fecha, luego por id para evitar ambigüedades con timestamps iguales
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1, // 👈 importante
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    // Mapeo a `TweetResponseDto`. El DTO leerá los includes filtrados para establecer flags.
    return new FeedResponseDto(
      tweets.map(
        (t) =>
          new TweetResponseDto(t, {
            includeParent: includeRelated,
            includeRetweet: includeRelated,
          }),
      ),
      take,
    );
  }
}
