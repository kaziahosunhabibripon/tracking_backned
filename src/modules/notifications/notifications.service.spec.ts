/* eslint-disable @typescript-eslint/no-unsafe-assignment -- `expect.any(Date)`/`expect.objectContaining` are `any`-typed by Jest's own types. */
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '../../common/errors/app.exception';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/enums/user-role.enum';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    notificationRead: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const createdBy: AuthenticatedUser = {
    email: 'staff@example.com',
    sub: 'staff-1',
    role: UserRole.STAFF,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('rejects a non-broadcast notification with no recipient', async () => {
      await expect(
        service.create(
          { title: 't', message: 'm', broadcast: false },
          createdBy,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('stores the recipient for a personal notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({});
      await service.create(
        { title: 't', message: 'm', broadcast: false, userId: 'user-1' },
        createdBy,
      );
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ broadcast: false, userId: 'user-1' }),
      });
    });

    it('ignores a stray userId on a broadcast notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({});
      await service.create(
        { title: 't', message: 'm', broadcast: true, userId: 'user-1' },
        createdBy,
      );
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ broadcast: true, userId: null }),
      });
    });
  });

  describe('findAll', () => {
    it('scopes to broadcast + own notifications for a given user', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      await service.findAll({ userId: 'user-1' });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ broadcast: true }, { userId: 'user-1' }] },
        }),
      );
    });
  });

  describe('findUnreadCount', () => {
    it('subtracts read notifications from the visible total', async () => {
      mockPrisma.notification.count
        .mockResolvedValueOnce(5) // total visible
        .mockResolvedValueOnce(2); // already read
      const result = await service.findUnreadCount('user-1');
      expect(result).toEqual({ total: 5, unread: 3 });
    });
  });

  describe('markAllRead', () => {
    it('creates rows for never-touched notifications and updates stale ones', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: 'n1' },
        { id: 'n2' },
        { id: 'n3' },
      ]);
      mockPrisma.notificationRead.findMany.mockResolvedValue([
        { id: 'r1', notificationId: 'n1', readAt: null },
      ]);
      mockPrisma.$transaction.mockResolvedValue([]);

      const count = await service.markAllRead('user-1');

      expect(mockPrisma.notificationRead.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['r1'] } },
        data: { readAt: expect.any(Date) },
      });
      expect(mockPrisma.notificationRead.createMany).toHaveBeenCalledWith({
        data: [
          { notificationId: 'n2', userId: 'user-1', readAt: expect.any(Date) },
          { notificationId: 'n3', userId: 'user-1', readAt: expect.any(Date) },
        ],
      });
      expect(count).toBe(3);
    });

    it('returns 0 when nothing is visible to the user', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      const count = await service.markAllRead('user-1');
      expect(count).toBe(0);
      expect(mockPrisma.notificationRead.findMany).not.toHaveBeenCalled();
    });
  });
});
