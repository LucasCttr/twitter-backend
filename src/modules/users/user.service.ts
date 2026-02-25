import { Injectable, Post } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { UserFilterDto } from "./dto/user-filter.dto.js";
import { UserResponseDto } from "./dto/user-response.dto.js";
import { UserSummaryDto } from "./dto/user-summary.dto.js";
import { PaginatedResponse } from "../../utils/pagination-respone.dto.js";
import { CursorPaginationDto } from '../../utils/cursor-pagination.dto.js';

@Injectable()
export class UserService {
  private toFollowStatus(isFollowing: boolean, isFollowedBy: boolean) {
    if (isFollowing && isFollowedBy) return 'mutual' as const;
    if (isFollowing) return 'following' as const;
    if (isFollowedBy) return 'follow_back' as const;
    return 'none' as const;
  }
  constructor( private readonly prisma: PrismaService) {}

 async getByPagination(filter: UserFilterDto, currentUserId?: string) {
   const limit = filter.limit ?? 20;
   const where: any = {};

    if (filter.name) {
      where.name = { contains: filter.name, mode: "insensitive" };
    }

    if (filter.email) {
      where.email = { contains: filter.email, mode: "insensitive" };
    }
    where.deletedAt = null; // Solo usuarios no eliminados

    // Exclude the authenticated user from search results when provided
    if (currentUserId) {
      where.id = { not: currentUserId };
    }

    const findOptions: any = {
      where,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: { select: { followers: true, following: true } },
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

    // return lightweight summary for lists
    if (currentUserId && returned.length > 0) {
      const ids = returned.map(u => u.id);
      const iFollow = await this.prisma.follow.findMany({ where: { followerId: currentUserId, followingId: { in: ids } } });
      const theyFollowMe = await this.prisma.follow.findMany({ where: { followerId: { in: ids }, followingId: currentUserId } });
      const iFollowSet = new Set(iFollow.map(f => f.followingId));
      const theyFollowMeSet = new Set(theyFollowMe.map(f => f.followerId));

      const summary = returned.map(u => ({
        id: u.id,
        name: u.name,
        isFollowing: iFollowSet.has(u.id),
        isFollowedBy: theyFollowMeSet.has(u.id),
        followStatus: this.toFollowStatus(iFollowSet.has(u.id), theyFollowMeSet.has(u.id)),
      } as UserSummaryDto));

      return new PaginatedResponse(summary, limit, nextCursor);
    }

    const summary = returned.map(u => ({
      id: u.id,
      name: u.name,
      isFollowing: false,
      isFollowedBy: false,
      followStatus: this.toFollowStatus(false, false),
    } as UserSummaryDto));

    return new PaginatedResponse(summary, limit, nextCursor);
 }

 async getProfile(id: string, currentUserId?: string) {
   const user = await this.prisma.user.findUnique({
     where: { id },
     select: {
       id: true,
       name: true,
       email: true,
       createdAt: true,
       deletedAt: true,
       _count: {
         select: {
           followers: true,
           following: true,
         },
       },
     },
   });

  if (!user || user.deletedAt) {
    throw new Error('User not found');
  }

  // If the requester is viewing their own profile, return explicit 'self' status
  if (currentUserId && currentUserId === id) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      followersCount: user._count?.followers ?? 0,
      followingCount: user._count?.following ?? 0,
      isFollowing: false,
      isFollowedBy: false,
      followStatus: 'self' as const,
    };
  }

  const isFollowing = currentUserId
    ? !!(await this.prisma.follow.findFirst({ where: { followerId: currentUserId, followingId: id } }))
    : false;

  const isFollowedBy = currentUserId
    ? !!(await this.prisma.follow.findFirst({ where: { followerId: id, followingId: currentUserId } }))
    : false;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    followersCount: user._count?.followers ?? 0,
    followingCount: user._count?.following ?? 0,
    isFollowing,
    isFollowedBy,
    followStatus: this.toFollowStatus(isFollowing, isFollowedBy),
  };
 }
  
  async getFollowers(userId: string, pagination: CursorPaginationDto | undefined, currentUserId: string) {
   const limit = pagination?.limit ?? 20;
   const findOptions: any = {
     where: { following: { some: { followingId: userId } }, deletedAt: null },
     select: { id: true, name: true },
     orderBy: { createdAt: 'desc' },
     take: limit + 1,
   };

   

   if (pagination?.cursor) {
     findOptions.cursor = { id: pagination.cursor };
     findOptions.skip = 1;
   }

   const users = await this.prisma.user.findMany(findOptions);
   let nextCursor: string | null = null;
   let returned = users;
   if (users.length > limit) {
     nextCursor = users[limit].id;
     returned = users.slice(0, limit);
   }

   const mapped: UserSummaryDto[] = [];
   if (returned.length > 0) {
     const ids = returned.map(u => u.id);
     const iFollow = await this.prisma.follow.findMany({ where: { followerId: currentUserId, followingId: { in: ids } } });
     const theyFollowMe = await this.prisma.follow.findMany({ where: { followerId: { in: ids }, followingId: currentUserId } });
     const iFollowSet = new Set(iFollow.map(f => f.followingId));
     const theyFollowMeSet = new Set(theyFollowMe.map(f => f.followerId));

     for (const u of returned) {
      if (u.id === currentUserId) {
        mapped.push({
          id: u.id,
          name: u.name,
          isFollowing: false,
          isFollowedBy: false,
          followStatus: 'self',
        } as UserSummaryDto);
        continue;
      }

      const isFollowing = iFollowSet.has(u.id);
      const isFollowedBy = theyFollowMeSet.has(u.id);
      mapped.push({
        id: u.id,
        name: u.name,
        isFollowing,
        isFollowedBy,
        followStatus: this.toFollowStatus(isFollowing, isFollowedBy),
      } as UserSummaryDto);
     }
   }

   return new PaginatedResponse(mapped, limit, nextCursor);
 }

  async getFollowing(userId: string, pagination: CursorPaginationDto | undefined, currentUserId: string) {
   const limit = pagination?.limit ?? 20;
   const findOptions: any = {
     where: { followers: { some: { followerId: userId } }, deletedAt: null },
     select: { id: true, name: true },
     orderBy: { createdAt: 'desc' },
     take: limit + 1,
   };

   

   if (pagination?.cursor) {
     findOptions.cursor = { id: pagination.cursor };
     findOptions.skip = 1;
   }

   const users = await this.prisma.user.findMany(findOptions);
   let nextCursor: string | null = null;
   let returned = users;
   if (users.length > limit) {
     nextCursor = users[limit].id;
     returned = users.slice(0, limit);
   }

   const mapped: UserSummaryDto[] = [];
   if (returned.length > 0) {
     const ids = returned.map(u => u.id);
     const iFollow = await this.prisma.follow.findMany({ where: { followerId: currentUserId, followingId: { in: ids } } });
     const theyFollowMe = await this.prisma.follow.findMany({ where: { followerId: { in: ids }, followingId: currentUserId } });
     const iFollowSet = new Set(iFollow.map(f => f.followingId));
     const theyFollowMeSet = new Set(theyFollowMe.map(f => f.followerId));

     for (const u of returned) {
      if (u.id === currentUserId) {
        mapped.push({
          id: u.id,
          name: u.name,
          isFollowing: false,
          isFollowedBy: false,
          followStatus: 'self',
        } as UserSummaryDto);
        continue;
      }

      const isFollowing = iFollowSet.has(u.id);
      const isFollowedBy = theyFollowMeSet.has(u.id);
      mapped.push({
        id: u.id,
        name: u.name,
        isFollowing,
        isFollowedBy,
        followStatus: this.toFollowStatus(isFollowing, isFollowedBy),
      } as UserSummaryDto);
     }
   }

   return new PaginatedResponse(mapped, limit, nextCursor);
 }
}