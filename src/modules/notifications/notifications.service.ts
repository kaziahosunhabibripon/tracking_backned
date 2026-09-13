import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BadRequestException,
  NotFoundException,
} from '../../common/errors/app.exception';
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
    const broadcast = input.broadcast ?? false;
    if (!broadcast && !input.userId) {
      throw new BadRequestException(
        'A non-broadcast notification needs a userId — otherwise no one could ever see it.',
      );
    }
    this.logger.log(
      `Notification created by ${createdBy.email}: ${input.title}`,
    );
    return this.prisma.notification.create({
      data: {
        title: input.title,
        message: input.message,
        type: input.type ?? 'info',
        broadcast,
        userId: broadcast ? null : input.userId,
      },
    });
  }

  /** Notifications visible to a user: broadcast, or addressed to them. */
  private visibleTo(userId: string): Prisma.NotificationWhereInput {
    return { OR: [{ broadcast: true }, { userId }] };
  }

  async findAll(input: NotificationQueryInput) {
    const limit = input.limit ?? this.DEFAULT_LIMIT;

    let where: Prisma.NotificationWhereInput = {};
    if (input.userId) {
      where = this.visibleTo(input.userId);
      if (input.unreadOnly) {
        where = {
          AND: [
            where,
            {
              reads: {
                none: { userId: input.userId, readAt: { not: null } },
              },
            },
          ],
        };
      }
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findUnreadCount(userId: string) {
    const visible = this.visibleTo(userId);
    const [total, readCount] = await Promise.all([
      this.prisma.notification.count({ where: visible }),
      this.prisma.notification.count({
        where: {
          AND: [
            visible,
            { reads: { some: { userId, readAt: { not: null } } } },
          ],
        },
      }),
    ]);

    return { total, unread: total - readCount };
  }

  async markRead(input: MarkNotificationReadInput, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: input.notificationId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

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

  /**
   * Marks every notification visible to the user as read. A NotificationRead
   * row only exists once a user has touched a notification, so a visible
   * notification with no row yet (the common case for anything unread) needs
   * one created, not just an existing row updated.
   */
  async markAllRead(userId: string): Promise<number> {
    const visibleIds = (
      await this.prisma.notification.findMany({
        where: this.visibleTo(userId),
        select: { id: true },
      })
    ).map((n) => n.id);
    if (visibleIds.length === 0) return 0;

    const existingReads = await this.prisma.notificationRead.findMany({
      where: { userId, notificationId: { in: visibleIds } },
    });
    const readByNotificationId = new Map(
      existingReads.map((r) => [r.notificationId, r]),
    );

    const now = new Date();
    const toUpdateIds = existingReads
      .filter((r) => r.readAt === null)
      .map((r) => r.id);
    const toCreateNotificationIds = visibleIds.filter(
      (id) => !readByNotificationId.has(id),
    );

    await this.prisma.$transaction([
      this.prisma.notificationRead.updateMany({
        where: { id: { in: toUpdateIds } },
        data: { readAt: now },
      }),
      this.prisma.notificationRead.createMany({
        data: toCreateNotificationIds.map((notificationId) => ({
          notificationId,
          userId,
          readAt: now,
        })),
      }),
    ]);

    return toUpdateIds.length + toCreateNotificationIds.length;
  }
}
