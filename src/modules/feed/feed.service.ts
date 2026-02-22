import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { FeedResponseDto } from "./dto/feed-query.dto";
import { FeedGateway } from "./feed.gateway";

@Injectable()
export class FeedService {
  private gateway: FeedGateway | null = null;

  setGateway(gateway: FeedGateway) {
    this.gateway = gateway;
  }

  notifyNewTweets(newTweets: { id: string; createdAt: string }[]) {
    if (this.gateway) {
      this.gateway.notifyNewTweets(newTweets);
    }
  }
}