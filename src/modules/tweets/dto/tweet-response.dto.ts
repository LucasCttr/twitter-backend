import { Tweet } from "@prisma/client";

export class TweetResponseDto {
  id!: string;
  content!: string;
  author: {
    id: string;
    name: string;
  };
  parentId?: string;
  retweetOfId?: string;
  createdAt!: Date;

  constructor(tweet: any) {
    this.id = tweet.id;
    this.content = tweet.content ?? "";
    this.author = tweet.author ?? undefined;
    this.author.id = tweet.author?.id ?? undefined;
    this.author.name = tweet.author?.name ?? undefined;
    this.parentId = tweet.parentId ?? undefined;
    this.retweetOfId = tweet.retweetOfId ?? undefined;
    this.createdAt = tweet.createdAt;
  }
}
