import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { FollowNotifyDto } from "../notifications/dto/follow-notify.dto";

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("social-notify") private readonly socialNotifyQueue: Queue,
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

    await this.socialNotifyQueue.add("follow-notify", payload, {
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

  // like/unlike moved to TweetsService
}
