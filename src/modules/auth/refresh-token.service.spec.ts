/* eslint-disable @typescript-eslint/no-unsafe-assignment -- `expect.any(Date)` is `any`-typed by Jest's own types. */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaService } from 'database/prisma.service';
import { UnauthorizedException } from 'common/errors/app.exception';
import { hashToken } from 'common/utils/ids.util';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

  const mockPrisma = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: ConfigService,
          useValue: { get: () => '30d' },
        },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function lastCreateData(): Record<string, unknown> {
    const calls = mockPrisma.refreshToken.create.mock.calls as {
      data: Record<string, unknown>;
    }[][];
    return calls[calls.length - 1][0].data;
  }

  describe('issue', () => {
    it('stores only the token hash, never the raw token', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});
      const { token, family } = await service.issue('user-1');

      expect(token).toHaveLength(64); // 32 bytes hex
      expect(family).toBeDefined();
      const data = lastCreateData();
      expect(data.tokenHash).toBe(hashToken(token));
      expect(data.tokenHash).not.toBe(token);
      expect(data.userId).toBe('user-1');
    });

    it('reuses the given family on rotation instead of minting a new one', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});
      const { family } = await service.issue('user-1', 'family-abc');
      expect(family).toBe('family-abc');
    });
  });

  describe('rotate', () => {
    it('throws when the presented token has no matching record', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.rotate('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws and does NOT revoke the family for an expired-but-not-reused token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        family: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        userAgent: null,
        ipAddress: null,
      });
      await expect(service.rotate('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('reuse detection: presenting an already-rotated token revokes the WHOLE family and throws', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        family: 'family-1',
        revokedAt: new Date(), // already rotated once
        expiresAt: new Date(Date.now() + 1000 * 60),
        userAgent: null,
        ipAddress: null,
      });

      await expect(service.rotate('stolen-token')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { family: 'family-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      // The compromised path must never issue a fresh token.
      expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('happy path: revokes the presented token and issues a new one in the SAME family', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        family: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60),
        userAgent: 'ua-string',
        ipAddress: '1.2.3.4',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.rotate('valid-token');

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.userId).toBe('user-1');
      expect(result.family).toBe('family-1');

      // The new token carries the same family forward, and the original
      // session's device metadata.
      const data = lastCreateData();
      expect(data.family).toBe('family-1');
      expect(data.userAgent).toBe('ua-string');
      expect(data.ipAddress).toBe('1.2.3.4');
    });
  });

  describe('revokeByRawToken', () => {
    it('revokes the family behind the presented token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        family: 'family-1',
      });
      await service.revokeByRawToken('some-token');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { family: 'family-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('is a no-op for an unknown token (no error, nothing revoked)', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await service.revokeByRawToken('unknown-token');
      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllForUser', () => {
    it('revokes every active session for the user', async () => {
      await service.revokeAllForUser('user-1');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
