import { Notification, User } from '../../../../generated/prisma/client';

export class NotificationActorDto {
  id!: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
}

export class NotificationSummaryDto {
  id!: string;
  actor!: NotificationActorDto;
  action!: string;
  targetType!: string;
  targetId?: string;
  textPreview?: string;
  createdAt!: Date;
  read!: boolean;
}

export class NotificationListResponseDto {
  items!: NotificationSummaryDto[];
  nextCursor?: string;
  unread?: number;
}

export class UnreadCountResponseDto {
  unread!: number;
}

export class MarkReadResponseDto {
  success!: boolean;
  unread!: number;
}
