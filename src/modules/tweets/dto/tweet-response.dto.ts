import { Tweet } from "@prisma/client";

export class TweetResponseDto {
  id!: string;
  content: string | null;
  author?: {
    id?: string;
    name?: string;
  };
  parentId?: string;
  retweetOf?: TweetResponseDto;
  createdAt!: Date;

  constructor(tweet: any) {
    this.id = tweet.id;
    this.content = tweet.content ?? null;
    this.author = tweet.author
      ? {
          id: tweet.author.id ?? undefined,
          name: tweet.author.name ?? undefined,
        }
      : undefined;
    this.parentId = tweet.parentId ?? undefined;
    this.createdAt = tweet.createdAt;
    if (tweet.retweetOf) {
      this.retweetOf = new TweetResponseDto(tweet.retweetOf);
    }
  }
}
