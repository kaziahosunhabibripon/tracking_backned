import { Injectable, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ConflictException,
  NotFoundException,
} from '../../common/errors/app.exception';
import { CreateRolePermissionInput } from './dto/role-permission.dto';

@Injectable()
export class RolePermissionsService {
  private readonly logger = new Logger(RolePermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRolePermissionInput) {
    this.logger.log(`Granting ${input.permission} to ${input.role}`);
    try {
      return await this.prisma.rolePermission.create({
        data: {
          role: input.role,
          permission: input.permission,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('This role already has that permission.');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.rolePermission.findMany({
      orderBy: { role: 'asc' },
    });
  }

  async findByRole(role: string) {
    return this.prisma.rolePermission.findMany({
      where: { role: role as UserRole },
    });
  }

  /**
   * Check if a role has a specific permission.
   * Returns true if the role has the permission, false otherwise.
   */
  async roleHasPermission(role: string, permission: string): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: { role: role as UserRole, permission },
    });
    return count > 0;
  }

  /**
   * Check if a role has ANY of the listed permissions.
   * Returns true if the role has at least one of the permissions.
   */
  async roleHasAnyPermission(
    role: string,
    permissions: string[],
  ): Promise<boolean> {
    if (permissions.length === 0) return true;
    const count = await this.prisma.rolePermission.count({
      where: {
        role: role as UserRole,
        permission: { in: permissions },
      },
    });
    return count > 0;
  }

  async remove(id: string) {
    try {
      return await this.prisma.rolePermission.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Role permission not found.');
      }
      throw err;
    }
  }
}
