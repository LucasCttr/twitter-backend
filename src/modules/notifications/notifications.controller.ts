import { Controller, Get, Req, UseGuards, Query, Post, Body } from '@nestjs/common';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guards';
import { MarkReadDto } from './dto/mark-read.dto';
import { NotificationListResponseDto, UnreadCountResponseDto, MarkReadResponseDto } from './dto/notification-response.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('unread')
  async getUnreadCount(@Req() req: Request): Promise<UnreadCountResponseDto> {
    const userId = (req.user as any)?.id || (req.user as any)?.sub;
    const unread = await this.notifications.getUnreadCount(userId);
    return { unread };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getNotifications(@Req() req: Request, @Query('limit') limit = '20', @Query('cursor') cursor?: string): Promise<NotificationListResponseDto> {
    const userId = (req.user as any)?.id || (req.user as any)?.sub;
    const { items, nextCursor } = await this.notifications.getNotifications(userId, parseInt(limit), cursor);
    const mappedItems = items.map((item: any) => ({
      ...item,
      targetId: item.targetId === null ? undefined : item.targetId,
    }));
    return { items: mappedItems, nextCursor: nextCursor ?? undefined };
  } 

  @UseGuards(JwtAuthGuard)
  @Post('mark-read')
  async markRead(@Req() req: Request, @Body() body: MarkReadDto): Promise<MarkReadResponseDto> {
    const userId = (req.user as any)?.id || (req.user as any)?.sub;
    const unread = await this.notifications.markRead(userId, body.ids);
    return { success: true, unread };
  }
}
