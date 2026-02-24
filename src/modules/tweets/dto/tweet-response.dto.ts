import { Tweet } from "@prisma/client";

export class TweetResponseDto {
  id!: string;
  content: string | null;
  createdAt!: Date;
  author?: {
    id?: string;
    name?: string;
  };
  retweetOfId: string | null;
  parentId: string | null;
  parent?: TweetResponseDto;
  retweetOf?: TweetResponseDto;

  // El constructor acepta un objeto de tweet con relaciones anidadas y opciones para controlar su inclusión
  constructor(
    tweet: any,
    opts?: { includeParent?: boolean; includeRetweet?: boolean },
  ) {
    // Opciones para controlar la inclusión de relaciones anidadas
    const includeParent = opts?.includeParent ?? true;
    const includeRetweet = opts?.includeRetweet ?? true;

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
        }
      : undefined;

    // Relaciones completas opcionales
    if (includeParent && tweet.parent) {
      this.parent = new TweetResponseDto(tweet.parent, opts);
    }
    if (includeRetweet && tweet.retweetOf) {
      this.retweetOf = new TweetResponseDto(tweet.retweetOf, opts);
    }

    this.createdAt = tweet.createdAt;
  }
}
