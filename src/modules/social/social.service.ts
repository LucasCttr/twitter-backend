import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SocialService {
    constructor(private readonly prisma: PrismaService) {}

    async followUser(userId: string, targetUserId: string) {
        if (userId === targetUserId) {
            throw new Error("You cannot follow yourself");
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
            throw new Error("You are already following this user");
        }

        return this.prisma.follow.create({
            data: {
                followerId: userId,
                followingId: targetUserId,
            },
        });
    }

    async unfollowUser(userId: string, targetUserId: string) {
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
        return this.prisma.like.create({
            data: {
                userId,
                tweetId,
            },
        });
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

    async retweet(userId: string, tweetId: string) {
        return this.prisma.tweet.create({
            data: {
                authorId: userId,
                retweetOfId: tweetId,
            },
        });
    }

    async undoRetweet(userId: string, tweetId: string) {
        const retweet = await this.prisma.tweet.findFirst({
            where: {
                authorId: userId,
                retweetOfId: tweetId,
            },
        });

        if (!retweet) {
            throw new Error("Retweet not found");
        }

        return this.prisma.tweet.delete({
            where: { id: retweet.id },
        });
    }
}
