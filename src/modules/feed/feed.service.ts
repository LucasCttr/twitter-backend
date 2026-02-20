import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { FeedResponseDto } from "./dto/feed-query.dto";

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}
}
