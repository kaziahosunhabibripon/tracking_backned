import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationCount,
  NotificationRead,
} from './entities/notification.entity';
import {
  CreateNotificationInput,
  MarkNotificationReadInput,
} from './dto/notification.dto';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => Notification)
export class NotificationsResolver {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [Notification])
  async notifications(
    @CurrentUser() user: AuthenticatedUser,
    @Args('unreadOnly', { type: () => Boolean, nullable: true })
    unreadOnly?: boolean,
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
  ): Promise<Notification[]> {
    return this.notificationsService.findAll({
      userId: user.sub,
      unreadOnly,
      limit,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => NotificationCount)
  async notificationCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationCount> {
    return this.notificationsService.findUnreadCount(user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => NotificationRead)
  async markNotificationRead(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: MarkNotificationReadInput,
  ): Promise<NotificationRead> {
    return this.notificationsService.markRead(input, user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Number)
  async markAllNotificationsRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<number> {
    return this.notificationsService.markAllRead(user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => Notification)
  async createNotification(
    @CurrentUser() _user: AuthenticatedUser,
    @Args('input') input: CreateNotificationInput,
  ): Promise<Notification> {
    return this.notificationsService.create(input, _user);
  }
}
