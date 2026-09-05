import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateNotificationInput,
  MarkNotificationReadInput,
} from './dto/notification.dto';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

export interface NotificationQueryInput {
  userId?: string;
  unreadOnly?: boolean;
  limit?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly DEFAULT_LIMIT = 50;

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput, createdBy: AuthenticatedUser) {
    this.logger.log(
      `Notification created by ${createdBy.email}: ${input.title}`,
    );
    return this.prisma.notification.create({
      data: {
        title: input.title,
        message: input.message,
        type: input.type ?? 'info',
        broadcast: input.broadcast ?? false,
      },
    });
  }

  async findAll(input: NotificationQueryInput) {
    const limit = input.limit ?? this.DEFAULT_LIMIT;

    const where: Prisma.NotificationWhereInput = {};
    if (input.userId && !input.unreadOnly) {
      where.OR = [
        { broadcast: true },
        { reads: { some: { userId: input.userId } } },
      ];
    } else if (input.userId && input.unreadOnly) {
      where.AND = [
        { broadcast: true },
        { reads: { none: { userId: input.userId, readAt: { not: null } } } },
      ];
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findUnreadCount(userId: string) {
    const [broadcastUnread, personalUnread] = await Promise.all([
      this.prisma.notificationRead.count({
        where: {
          userId,
          notification: { broadcast: true },
          readAt: null,
        },
      }),
      this.prisma.notificationRead.count({
        where: {
          userId,
          notification: { broadcast: false },
          readAt: null,
        },
      }),
    ]);

    return {
      total: broadcastUnread + personalUnread,
      unread: broadcastUnread + personalUnread,
    };
  }

  async markRead(input: MarkNotificationReadInput, userId: string) {
    const existing = await this.prisma.notificationRead.findUnique({
      where: {
        notificationId_userId: {
          notificationId: input.notificationId,
          userId,
        },
      },
    });

    if (existing?.readAt) {
      return existing;
    }

    if (existing) {
      return this.prisma.notificationRead.update({
        where: { id: existing.id },
        data: { readAt: new Date() },
      });
    }

    return this.prisma.notificationRead.create({
      data: {
        notificationId: input.notificationId,
        userId,
        readAt: new Date(),
      },
    });
  }

  async markAllRead(userId: string) {
    const unread = await this.prisma.notificationRead.findMany({
      where: { userId, readAt: null },
      include: { notification: true },
    });

    const now = new Date();
    await this.prisma.notificationRead.updateMany({
      where: { userId, readAt: null },
      data: { readAt: now },
    });

    return unread.length;
  }
}
