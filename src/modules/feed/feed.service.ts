import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { FeedResponseDto } from "./dto/feed-query.dto";
import { FeedGateway } from "./feed.gateway";

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}
  private gateway: FeedGateway | null = null;

  setGateway(gateway: FeedGateway) {
    this.gateway = gateway;
  }

  notifyNewTweets(newTweets: { id: string; createdAt: string }[]) {
    if (this.gateway) {
      this.gateway.notifyNewTweets(newTweets);
    }
  }

  async getUnreadCount(userId: string, lastSeen: Date): Promise<number> {
    return await this.prisma.tweet.count({
      where: {
        authorId: { not: userId },
        createdAt: { gt: lastSeen }, // Usa la última fecha de recarga del feed
      },
    });
  }

  notifyUnreadCount(userId: string, count: number) {
    if (!userId) {
      console.log("notifyUnreadCount: userId es undefined");
      return;
    }
    if (this.gateway) {
      this.gateway.emitToUser(userId, "unread_count", { count });
    }
  }
}
