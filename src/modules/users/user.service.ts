import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { UserFilterDto } from "./dto/user-filter.dto.js";
import { UserResponseDto } from "./dto/user-response.dto.js";
import { UserSummaryDto } from "./dto/user-summary.dto.js";
import { PaginatedResponse } from "../../utils/pagination-respone.dto.js";
import { CursorPaginationDto } from '../../utils/cursor-pagination.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import * as bcrypt from 'bcrypt';
import { FollowNotifyDto } from "../notifications/dto/follow-notify.dto.js";
import { Queue } from "bull";
import { InjectQueue } from "@nestjs/bull";

@Injectable()
export class UserService {
  // Servicio de usuarios: búsqueda, perfiles, follow/unfollow y operaciones relacionadas
  // - Mantener la lógica existente; añadir comentarios para facilitar mantenimiento
  // - No cambiar comportamiento de retorno ni tipos de error salvo corrección crítica

  private toFollowStatus(isFollowing: boolean, isFollowedBy: boolean) {
    if (isFollowing && isFollowedBy) return 'mutual' as const;
    if (isFollowing) return 'following' as const;
    if (isFollowedBy) return 'follow_back' as const;
    return 'none' as const;
  }
  constructor( private readonly prisma: PrismaService, @InjectQueue("notifications") private readonly notificationsQueue: Queue) {}

 async getByPagination(filter: UserFilterDto, currentUserId?: string) {

   const limit = filter.limit ?? 20;
   const where: any = {};
   where.deletedAt = null; // Solo usuarios no eliminados

   let postFilter: ((u: any) => boolean) | null = null;
   if (filter.q) {
     const q = filter.q.toLowerCase();
     if (q.includes('@')) {
       // Si contiene @, buscar solo por la parte local del email en el email
       const emailLocal = q.split('@')[0];
       where.email = { contains: emailLocal, mode: 'insensitive' };
       postFilter = (u) => u.email && u.email.toLowerCase().split('@')[0].includes(emailLocal);
     } else {
       // Si no contiene @, buscar por name o por la parte local del email (antes del @)
       where.OR = [
         { name: { contains: q, mode: 'insensitive' } },
         { email: { contains: q, mode: 'insensitive' } },
       ];
       postFilter = (u) => {
         const nameMatch = u.name && u.name.toLowerCase().includes(q);
         const emailLocal = u.email ? u.email.toLowerCase().split('@')[0] : '';
         return nameMatch || emailLocal.includes(q);
       };
     }
   }

    // Exclude the authenticated user from search results when provided
    if (currentUserId) {
      where.id = { not: currentUserId };
      // Optionally exclude users the current user already follows
      if ((filter as any)?.excludeFollowed) {
        where.NOT = {
          followers: {
            some: { followerId: currentUserId },
          },
        };
      }
    }

    const findOptions: any = {
      where,
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        createdAt: true,
        _count: { select: { followers: true, following: true } },
      },
      orderBy: filter.sort === 'followers' ? undefined : { createdAt: 'desc' },
      take: limit + 1,
    };

    if (filter.cursor) {
      findOptions.cursor = { id: filter.cursor };
      findOptions.skip = 1;
    }

    let users = await this.prisma.user.findMany(findOptions);
    if (postFilter) {
      users = users.filter(postFilter);
    }
    if (filter.sort === 'followers') {
      users = users.sort((a, b) => {
        const aFollowers = (a as any)._count?.followers ?? 0;
        const bFollowers = (b as any)._count?.followers ?? 0;
        if (bFollowers !== aFollowers) return bFollowers - aFollowers;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    let nextCursor: string | null = null;
    let returned = users;
    if (users.length > limit) {
      nextCursor = users[limit].id;
      returned = users.slice(0, limit);
    }

    // Devolver resumen ligero para listados (UserSummaryDto)
    // Se evita exponer datos sensibles en las listas públicas
    if (currentUserId && returned.length > 0) {
      const ids = returned.map(u => u.id);
      const iFollow = await this.prisma.follow.findMany({ where: { followerId: currentUserId, followingId: { in: ids } } });
      const theyFollowMe = await this.prisma.follow.findMany({ where: { followerId: { in: ids }, followingId: currentUserId } });
      const iFollowSet = new Set(iFollow.map(f => f.followingId));
      const theyFollowMeSet = new Set(theyFollowMe.map(f => f.followerId));

      const summary = returned.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        profileImage: u.profileImage,
        isFollowing: iFollowSet.has(u.id),
        isFollowedBy: theyFollowMeSet.has(u.id),
        followStatus: this.toFollowStatus(iFollowSet.has(u.id), theyFollowMeSet.has(u.id)),
      } as UserSummaryDto));

      return new PaginatedResponse(summary, limit, nextCursor);
    }

    const summary = returned.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      profileImage: u.profileImage,
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
       profileImage: true,
       _count: {
         select: {
           followers: true,
           following: true,
         },
       },
     },
   });

  // Validar existencia y estado del usuario
  // - Rechazar usuarios marcados como eliminados (soft-delete)
  if (!user || user.deletedAt) {
    throw new Error('User not found');
  }

  // Si el solicitante consulta su propio perfil, devolver estado 'self'
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
      profileImage: user.profileImage,
    };
  }

  // Comprobar relaciones de follow entre el solicitante y el perfil consultado.
  // Estas comprobaciones permiten presentar un estado de relación (`followStatus`) útil para la UI.
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
    profileImage: user.profileImage,
  };
 }
  
  async getFollowers(userId: string, pagination: CursorPaginationDto | undefined, currentUserId: string) {
   const limit = pagination?.limit ?? 20;
   const findOptions: any = {
     where: { following: { some: { followingId: userId } }, deletedAt: null },
     select: {
       id: true,
       name: true,
       _count: { select: { followers: true, following: true } },
     },
     orderBy: { createdAt: 'desc' },
     take: limit + 1,
   };

   

   if (pagination?.cursor) {
     findOptions.cursor = { id: pagination.cursor };
     findOptions.skip = 1;
   }

  // Obtener usuarios que siguen al userId (paginado)
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
        // followersCount: u._count?.followers ?? undefined, // Si necesitas exponerlo
      } as UserSummaryDto);
     }
   }

   return new PaginatedResponse(mapped, limit, nextCursor);
 }

  async update(userId: string, dto: UpdateUserDto) {
    // Actualizar campos del usuario autenticado
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    if (dto.profileImage !== undefined) data.profileImage = dto.profileImage;

    if (Object.keys(data).length === 0) {
      return { id: user.id, name: user.name, email: user.email, profileImage: user.profileImage };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, profileImage: true },
    });

    return updated;
  }

  async getFollowing(userId: string, pagination: CursorPaginationDto | undefined, currentUserId: string) {
   const limit = pagination?.limit ?? 20;
   const findOptions: any = {
     where: { followers: { some: { followerId: userId } }, deletedAt: null },
     select: {
       id: true,
       name: true,
       _count: { select: { followers: true, following: true } },
     },
     orderBy: { createdAt: 'desc' },
     take: limit + 1,
   };

   

   if (pagination?.cursor) {
     findOptions.cursor = { id: pagination.cursor };
     findOptions.skip = 1;
   }
  // Obtener usuarios a los que sigue userId (paginado)
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
        // followersCount: u._count?.followers ?? undefined, // Si necesitas exponerlo
      } as UserSummaryDto);
     }
   }

   return new PaginatedResponse(mapped, limit, nextCursor);
 }

 // FOLLOW/UNFOLLOW
  async followUser(userId: string, targetUserId: string) {
    // Crear relación de follow entre usuarios
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

    await this.notificationsQueue.add("follow-notify", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
    });

    return created;
  }

  async unfollowUser(userId: string, targetUserId: string) {
    // Eliminar relación de follow si existe
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
}