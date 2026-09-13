import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '../../common/errors/app.exception';
import { UserRole } from './enums/user-role.enum';

export interface UserSearchInput {
  search?: string;
  role?: UserRole;
}

const PASSWORD_SALT_ROUNDS = 12;

export interface EnsureUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, PASSWORD_SALT_ROUNDS);
  }

  /**
   * Verifies email + password and returns the user. Deliberately the SAME
   * error for "no such email" and "wrong password" — a different message
   * would let a caller enumerate registered emails.
   */
  async validateLocalCredentials(
    email: string,
    password: string,
  ): Promise<PrismaUser> {
    const invalid = () =>
      new UnauthorizedException('Invalid email or password.');

    const user = await this.findByEmail(email);
    if (!user) {
      throw invalid();
    }
    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      throw invalid();
    }
    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated.');
    }
    return user;
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Idempotent create-if-missing — used by the seed script (e.g. the
   * super-admin). Never touches an existing account, so re-running the seed
   * can't silently reset a password or role someone changed afterwards.
   */
  async ensureUser(input: EnsureUserInput): Promise<PrismaUser> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      return existing;
    }

    const hashedPassword = await this.hashPassword(input.password);
    return this.prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        isActive: true,
      },
    });
  }

  findAll(input: UserSearchInput = {}): Promise<PrismaUser[]> {
    const where: Prisma.UserWhereInput = {};
    if (input.role) where.role = input.role;
    if (input.search && input.search.trim().length > 0) {
      const q = input.search.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async setActive(userId: string, isActive: boolean): Promise<PrismaUser> {
    return this.updateOrNotFound(userId, { isActive });
  }

  async changeRole(userId: string, role: UserRole): Promise<PrismaUser> {
    return this.updateOrNotFound(userId, { role });
  }

  private async updateOrNotFound(
    userId: string,
    data: Prisma.UserUpdateInput,
  ): Promise<PrismaUser> {
    try {
      return await this.prisma.user.update({ where: { id: userId }, data });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('User not found.');
      }
      throw err;
    }
  }
}
