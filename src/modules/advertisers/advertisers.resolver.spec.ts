import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AdvertisersResolver } from './advertisers.resolver';
import { AdvertisersService } from './advertisers.service';
import { PrismaService } from '../../database/prisma.service';
import {
  ForbiddenException,
  NotFoundException,
} from '../../common/errors/app.exception';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { UpdateAdvertiserInput } from './dto/update-advertiser.input';

describe('AdvertisersResolver', () => {
  let resolver: AdvertisersResolver;

  const mockAdvertisersService = {
    findById: jest.fn(),
    update: jest.fn(),
    toDto: jest.fn((a: unknown) => a),
  };

  const user = (role: UserRole, sub = 'me'): AuthenticatedUser => ({
    sub,
    email: 'x@example.com',
    role,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvertisersResolver,
        { provide: AdvertisersService, useValue: mockAdvertisersService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    resolver = module.get(AdvertisersResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update (GAP-023 scoping)', () => {
    const input = { id: 'adv-1' } as UpdateAdvertiserInput;

    it('lets SUPER_ADMIN update an advertiser managed by someone else', async () => {
      mockAdvertisersService.findById.mockResolvedValue({
        id: 'adv-1',
        managerId: 'other-manager',
      });
      mockAdvertisersService.update.mockResolvedValue({ id: 'adv-1' });

      await resolver.update(user(UserRole.SUPER_ADMIN), input);
      expect(mockAdvertisersService.update).toHaveBeenCalledWith(input);
    });

    it('lets a MANAGER update an advertiser assigned to them', async () => {
      mockAdvertisersService.findById.mockResolvedValue({
        id: 'adv-1',
        managerId: 'me',
      });
      mockAdvertisersService.update.mockResolvedValue({ id: 'adv-1' });

      await resolver.update(user(UserRole.MANAGER, 'me'), input);
      expect(mockAdvertisersService.update).toHaveBeenCalledWith(input);
    });

    it('forbids a MANAGER from updating an advertiser assigned to a different manager', async () => {
      mockAdvertisersService.findById.mockResolvedValue({
        id: 'adv-1',
        managerId: 'other-manager',
      });

      await expect(
        resolver.update(user(UserRole.MANAGER, 'me'), input),
      ).rejects.toThrow(ForbiddenException);
      expect(mockAdvertisersService.update).not.toHaveBeenCalled();
    });

    it('forbids a MANAGER from updating an unassigned advertiser', async () => {
      mockAdvertisersService.findById.mockResolvedValue({
        id: 'adv-1',
        managerId: null,
      });

      await expect(
        resolver.update(user(UserRole.MANAGER, 'me'), input),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the advertiser does not exist', async () => {
      mockAdvertisersService.findById.mockResolvedValue(null);

      await expect(
        resolver.update(user(UserRole.SUPER_ADMIN), input),
      ).rejects.toThrow(NotFoundException);
      expect(mockAdvertisersService.update).not.toHaveBeenCalled();
    });
  });
});
