import { Injectable, Post } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { UserFilterDto } from "./dto/user-filter.dto.js";
import { PaginatedResponse } from "../../utils/pagination-respone.dto.js";

@Injectable()
export class UserService {
  constructor( private readonly prisma: PrismaService) {}

 async getByPagination(filter: UserFilterDto) {
   const limit = filter.limit ?? 20;
   const where: any = {};

    if (filter.name) {
      where.name = { contains: filter.name, mode: "insensitive" };
    }

    if (filter.email) {
      where.email = { contains: filter.email, mode: "insensitive" };
    }
    where.deletedAt = null; // Solo usuarios no eliminados

    const findOptions: any = {
      where,
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    };

    if (filter.cursor) {
      findOptions.cursor = { id: filter.cursor };
      findOptions.skip = 1;
    }

    const users = await this.prisma.user.findMany(findOptions);

    let nextCursor: string | null = null;
    let returned = users;
    if (users.length > limit) {
      nextCursor = users[limit].id;
      returned = users.slice(0, limit);
    }

    return new PaginatedResponse(returned, limit, nextCursor);
 }
}
