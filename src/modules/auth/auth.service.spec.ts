import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'database/prisma.service';
import { UsersService } from 'modules/users/users.service';
import { RefreshTokenService } from './refresh-token.service';
import { LoginLogsService } from 'modules/login-logs/login-logs.service';
import { UnauthorizedException } from 'common/errors/app.exception';
import { User, UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let refreshTokenService: RefreshTokenService;
  let loginLogsService: LoginLogsService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.AFFILIATE,
    isActive: true,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: { get: () => '15m' } },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn(() => 'token') },
        },
        {
          provide: PrismaService,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
          useValue: { $transaction: jest.fn((cb: any) => cb({})) },
        },
        {
          provide: UsersService,
          useValue: {
            assertEmailAvailable: jest.fn(),
            hashPassword: jest.fn(() => 'hashed'),
            validateLocalCredentials: jest.fn(),
            touchLastLogin: jest.fn(),
            findById: jest.fn(() => mockUser),
            findByEmail: jest.fn(() => mockUser),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            issue: jest.fn(() => ({ token: 'refresh', userId: mockUser.id })),
            rotate: jest.fn(() => ({ token: 'rotated', userId: mockUser.id })),
            revokeByRawToken: jest.fn(),
          },
        },
        {
          provide: LoginLogsService,
          useValue: {
            record: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    refreshTokenService = module.get(RefreshTokenService);
    loginLogsService = module.get(LoginLogsService);
  });

  it('signIn should return payload with tokens', async () => {
    jest
      .spyOn(usersService, 'validateLocalCredentials')
      .mockResolvedValue(mockUser);
    const result = await service.signIn({
      email: 'test@example.com',
      password: 'pass',
    });
    expect(result.accessToken).toBe('token');
    expect(result.refreshToken).toBe('refresh');
    expect(result.user.email).toBe('test@example.com');
  });

  it('signIn should record a successful login', async () => {
    jest
      .spyOn(usersService, 'validateLocalCredentials')
      .mockResolvedValue(mockUser);
    await service.signIn(
      { email: 'test@example.com', password: 'pass' },
      { ipAddress: '1.2.3.4', userAgent: 'jest' },
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(loginLogsService.record).toHaveBeenCalledWith({
      userId: mockUser.id,
      ip: '1.2.3.4',
      userAgent: 'jest',
      success: true,
    });
  });

  it('signIn should record a failed login for a known email and rethrow', async () => {
    jest
      .spyOn(usersService, 'validateLocalCredentials')
      .mockRejectedValue(
        new UnauthorizedException('Invalid email or password.'),
      );
    jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);

    await expect(
      service.signIn({ email: 'test@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(loginLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: mockUser.id, success: false }),
    );
  });

  it('signIn should NOT log when the email does not match any account', async () => {
    jest
      .spyOn(usersService, 'validateLocalCredentials')
      .mockRejectedValue(
        new UnauthorizedException('Invalid email or password.'),
      );
    jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

    await expect(
      service.signIn({ email: 'nobody@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(loginLogsService.record).not.toHaveBeenCalled();
  });

  it('refreshSession should rotate token and return new payload', async () => {
    jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser);
    const result = await service.refreshSession('raw-token');
    expect(result.accessToken).toBe('token');
    expect(result.refreshToken).toBe('rotated');
  });

  it('refreshSession should throw when user is inactive', async () => {
    jest
      .spyOn(usersService, 'findById')
      .mockResolvedValue({ ...mockUser, isActive: false });
    await expect(service.refreshSession('raw-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('logout should revoke refresh token', async () => {
    await service.logout('raw-token');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(refreshTokenService.revokeByRawToken).toHaveBeenCalledWith(
      'raw-token',
    );
  });
});
