import { Injectable } from '@nestjs/common';
import { NotificationAction, NotificationTarget } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';


@Injectable()
export class NotificationsService {
constructor(private readonly prisma: PrismaService) {}

  async createNotification({
    userId,
    actorId,
    action,
    targetType,
    targetId,
    textPreview,
    url,
  }: {
    userId: string;
    actorId: string;
    action: NotificationAction;
    targetType: NotificationTarget;
    targetId?: string;
    textPreview?: string;
    url?: string;
  }) {
    // Crear una notificación ligada al usuario receptor (`userId`).
    // `actorId` es quien provoca la acción (ej. quien sigue, likea, retweetea),
    // `action` y `targetType` describen el tipo y objetivo de la notificación.
    return this.prisma.notification.create({ data: { userId, actorId, action, targetType, targetId, textPreview } });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async getNotifications(userId: string, limit = 20, cursor?: string) {
    // Obtener notificaciones del usuario ordenadas por fecha
    const where = { userId };
    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        actor: true,
        tweet: true,
      },
    });
    const items = notifications.slice(0, limit);
    const nextCursor = notifications.length > limit ? notifications[limit].id : null;
    return { items, nextCursor };
  }

  async markRead(userId: string, ids?: string[]) {
    // Marcar notificaciones como leídas. Si `ids` se pasa, marcar solo esos ids;
    // si no, marcar todas las no leídas del usuario.
    const where = ids && ids.length > 0 ? { userId, id: { in: ids } } : { userId, read: false };
    await this.prisma.notification.updateMany({ where, data: { read: true } });
    return this.getUnreadCount(userId);
  }
}
