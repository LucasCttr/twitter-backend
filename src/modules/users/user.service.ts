import { Injectable, Post } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { UserFilterDto } from "./dto/user-filter.dto.js";

@Injectable()
export class UserService {
  constructor( private readonly prisma: PrismaService) {}

 async getByPagination(filter: UserFilterDto) {
    const page = filter.page;
    const limit = filter.limit;
    const where: any = {};

    if (filter.name) {
      where.name = { contains: filter.name, mode: "insensitive" };
    }

    if (filter.email) {
      where.email = { contains: filter.email, mode: "insensitive" };
    }
    where.deletedAt = null; // Solo usuarios no eliminados

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
    };
 }
}
