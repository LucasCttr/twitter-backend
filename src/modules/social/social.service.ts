import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { LikeNotifyDto } from "../notifications/dto/like-notify.dto";
import { FollowNotifyDto } from "../notifications/dto/follow-notify.dto";

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("like-notify") private readonly likeNotifyQueue: Queue,
    @InjectQueue("follow-notify") private readonly followNotifyQueue: Queue,
    @InjectQueue("retweet-notify") private readonly retweetNotifyQueue: Queue,
  ) {}

  async followUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException("You cannot follow yourself");
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      throw new BadRequestException("You are already following this user");
    }

    const created = await this.prisma.follow.create({
      data: {
        followerId: userId,
        followingId: targetUserId,
      },
    });

    const payload: FollowNotifyDto = {
      userId: targetUserId, // receptor
      followerId: userId, // quien siguió
      createdAt: new Date().toISOString(),
    };

    await this.followNotifyQueue.add("follow-notify", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
    });

    return created;
  }

  async unfollowUser(userId: string, targetUserId: string) {
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (!existingFollow) {
      throw new NotFoundException("Follow relation not found");
    }

    return this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });
  }

  async like(userId: string, tweetId: string) {
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
    if (!tweet?.authorId || tweet.authorId === userId) return like;

    const payload: LikeNotifyDto = {
      userId: tweet.authorId,
      tweetId,
      likerId: userId,
      createdAt: new Date().toISOString(),
    };

    await this.likeNotifyQueue.add("like-notify", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
    });

    return like;
  }

  async unlike(userId: string, tweetId: string) {
    return this.prisma.like.delete({
      where: {
        userId_tweetId: {
          userId,
          tweetId,
        },
      },
    });
  }
}
