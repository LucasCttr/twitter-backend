import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { FeedResponseDto } from "./dto/feed-query.dto";
import { NotificationsGateway } from "../notifications/notifications.gateway";

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}
  private gateway: NotificationsGateway | null = null;

  setGateway(gateway: NotificationsGateway) {
    this.gateway = gateway;
  }

}
