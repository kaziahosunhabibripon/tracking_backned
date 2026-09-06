import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRolePermissionInput } from './dto/role-permission.dto';

@Injectable()
export class RolePermissionsService {
  private readonly logger = new Logger(RolePermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRolePermissionInput) {
    this.logger.log(`Granting ${input.permission} to ${input.role}`);
    return this.prisma.rolePermission.create({
      data: {
        role: input.role,
        permission: input.permission,
      },
    });
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
    return this.prisma.rolePermission.delete({ where: { id } });
  }
}
