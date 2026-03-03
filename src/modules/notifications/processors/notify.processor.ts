import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable } from "@nestjs/common";
import { FollowNotifyDto } from '../dto/follow-notify.dto';
import { LikeNotifyDto } from "../dto/like-notify.dto";
import { NotificationsGateway } from "../notifications.gateway";
import { NotificationsService } from "../notifications.service";
import { Prisma } from "../../../../generated/prisma/browser";
import { PrismaService } from "../../../database/prisma.service";
// Puedes importar enums si los necesitas

// Este processor maneja las notificaciones relacionadas con acciones sociales, como likes y follows. 
// Se encarga de procesar los trabajos en la cola "social-notify" y emitir eventos a través del NotificationsGateway para notificar a los usuarios en tiempo real sobre estas interacciones.
@Processor("notifications")
export class NotificationsProcessor {
  constructor(
    private readonly notifications: NotificationsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  // Procesa las notificaciones de like, emitiendo un evento al usuario receptor para informarle que su tweet ha sido gustado por otro usuario.
  @Process("like-notify")
  async handleLikeNotify(job: Job<LikeNotifyDto>) {
    const { userId, tweetId, likerId } = job.data;
    const notification = await this.notificationsService.createNotification({
      userId,
      actorId: likerId,
      action: 'LIKED',
      targetType: 'TWEET',
      targetId: tweetId,
    });
    // Obtener el tweet original y su autor
    const tweet = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      select: {
        id: true,
        content: true,
        author: { select: { id: true, name: true } },
        retweetOf: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, name: true } },
          }
        }
      },
    });
    const originalTweet = tweet?.retweetOf || tweet;
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    this.notifications.emitToUser(userId, "notifications", {
      summary: {
        id: notification.id,
        actor: { id: likerId },
        action: 'LIKED',
        targetId: tweetId,
        tweet: originalTweet,
      },
      unreadCount,
    });
  }

  // Procesa las notificaciones de follow, emitiendo un evento al usuario receptor para informarle que ha sido seguido por otro usuario.
  @Process("follow-notify")
  async handleFollowNotify(job: Job<FollowNotifyDto>) {
    const { userId, followerId } = job.data;
    console.log('[NotificationsProcessor] Procesando follow:', { userId, followerId });
    const notification = await this.notificationsService.createNotification({
      userId,
      actorId: followerId,
      action: 'FOLLOWED',
      targetType: 'USER',
      targetId: followerId,
    });
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    console.log('[NotificationsProcessor] Emitiendo notificación de follow', {
      userId,
      notificationId: notification.id,
      unreadCount,
    });
    this.notifications.emitToUser(userId, "notifications", {
      summary: {
        id: notification.id,
        actor: { id: followerId },
        action: 'FOLLOWED',
        targetId: followerId,
      },
      unreadCount,
    });
  }

  @Process("retweet-notify")
  async handleRetweetNotify(job: any) {
    const { userId, tweetId, retweeterId } = job.data;
    console.log('[NOTIFY] Procesando retweet-notify', job.data);
    const notification = await this.notificationsService.createNotification({
      userId,
      actorId: retweeterId,
      action: 'RETWEETED',
      targetType: 'TWEET',
      targetId: tweetId,
    });
    // Obtener el tweet original y su autor
    const tweet = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      select: {
        id: true,
        content: true,
        author: { select: { id: true, name: true } },
        retweetOf: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, name: true } },
          }
        }
      },
    });
    const originalTweet = tweet?.retweetOf || tweet;
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    this.notifications.emitToUser(userId, "notifications", {
      summary: {
        id: notification.id,
        actor: { id: retweeterId },
        action: 'RETWEETED',
        targetId: tweetId,
        tweet: originalTweet,
      },
      unreadCount,
    });
  }

  @Process("reply-notify")
  async handleReplyNotify(job: any) {
    const { userId, tweetId, replierId } = job.data;
    console.log('[NOTIFY] Procesando reply-notify', job.data);
    const notification = await this.notificationsService.createNotification({
      userId,
      actorId: replierId,
      action: 'REPLIED',
      targetType: 'TWEET',
      targetId: tweetId,
    });
    // Obtener el tweet original y su autor
    const reply = await this.prisma.tweet.findUnique({
      where: { id: tweetId },
      select: {
        parent: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, name: true } },
          }
        }
      },
    });
    const originalTweet = reply?.parent;
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    this.notifications.emitToUser(userId, "notifications", {
      summary: {
        id: notification.id,
        actor: { id: replierId },
        action: 'REPLIED',
        targetId: tweetId,
        tweet: originalTweet,
      },
      unreadCount,
    });
  }
}
