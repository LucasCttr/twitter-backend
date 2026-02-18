import { Tweet } from "../../../../generated/prisma/client.js";

export class TweetResponseDto {
  id!: string;
  content!: string;
  authorId!: string;
  parentId?: string;
  retweetOfId?: string;
  createdAt!: Date;


    constructor(tweet: any) {
    this.id = tweet.id;
    this.content = tweet.content ?? "";
    this.authorId = tweet.authorId;
    this.parentId = tweet.parentId ?? undefined;
    this.retweetOfId = tweet.retweetOfId ?? undefined;
    this.createdAt = tweet.createdAt;
    }
}
