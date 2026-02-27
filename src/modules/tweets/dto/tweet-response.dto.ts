import { Tweet } from "@prisma/client";

export class TweetResponseDto {
  id!: string;
  content: string | null;
  createdAt!: Date;
  author?: {
    id?: string;
    name?: string;
    email?: string;
  };
  likesCount?: number;
  retweetsCount?: number;
  repliesCount?: number;
  retweetOfId: string | null;
  parentId: string | null;
  parent?: TweetResponseDto;
  retweetOf?: TweetResponseDto;
  replies?: TweetResponseDto[];
  repliesNextCursor?: string | null;
  repliesLimit?: number | null;

  // El constructor acepta un objeto de tweet con relaciones anidadas y opciones para controlar su inclusión
  constructor(
    tweet: any,
    opts?: { includeParent?: boolean; includeRetweet?: boolean; retweetDepth?: number },
  ) {
    // Opciones para controlar la inclusión de relaciones anidadas
    const includeParent = opts?.includeParent ?? true;
    const includeRetweet = opts?.includeRetweet ?? true;
    // retweetDepth controls how many levels of `retweetOf` to include (prevents infinite nesting)
    const retweetDepth = opts?.retweetDepth ?? 1;

    // Asignación de campos básicos
    this.id = tweet.id;
    // Colocar ids de relaciones justo después del id
    this.parentId = tweet.parentId ?? null;
    this.retweetOfId = tweet.retweetOfId ?? null;

    // Campos principales
    this.content = tweet.content ?? null;
    this.author = tweet.author
      ? {
          id: tweet.author.id ?? undefined,
          name: tweet.author.name ?? undefined,
          email: tweet.author.email ?? undefined,
        }
      : undefined;

    // Relaciones completas opcionales
    if (includeParent && tweet.parent) {
      this.parent = new TweetResponseDto(tweet.parent, opts);
    }
    if (includeRetweet && tweet.retweetOf && retweetDepth > 0) {
      this.retweetOf = new TweetResponseDto(tweet.retweetOf, { ...opts, retweetDepth: retweetDepth - 1 });
    }

    // Counters from Prisma `_count` if available
    this.likesCount = tweet._count?.likes ?? undefined;
    this.retweetsCount = tweet._count?.retweets ?? undefined;
    this.repliesCount = tweet._count?.replies ?? undefined;

    this.createdAt = tweet.createdAt;
    this.replies = tweet.replies ? tweet.replies.map((r: any) => new TweetResponseDto(r, opts)) : undefined;
    this.repliesNextCursor = tweet.repliesNextCursor ?? undefined;
    this.repliesLimit = tweet.repliesLimit ?? undefined;
  }
}
