import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: { role: role as any },
    });
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
