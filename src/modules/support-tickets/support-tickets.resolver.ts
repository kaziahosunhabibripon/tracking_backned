import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { SupportTicketsService } from './support-tickets.service';
import { SupportTicket } from './entities/support-ticket.entity';
import {
  CreateSupportTicketInput,
  UpdateSupportTicketInput,
} from './dto/support-ticket.dto';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => SupportTicket)
export class SupportTicketsResolver {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [SupportTicket])
  async mySupportTickets(@CurrentUser() user: AuthenticatedUser) {
    return this.supportTicketsService.findMyTickets(user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Query(() => [SupportTicket])
  async supportTickets() {
    return this.supportTicketsService.findAll();
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => SupportTicket)
  async createSupportTicket(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateSupportTicketInput,
  ) {
    return this.supportTicketsService.create(input, user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => SupportTicket)
  async updateSupportTicket(
    @Args('id') id: string,
    @Args('input') input: UpdateSupportTicketInput,
  ) {
    return this.supportTicketsService.update(id, input);
  }
}
