import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import {
  ForbiddenException,
  NotFoundException,
} from '../../common/errors/app.exception';
import { PaymentStatus, UserRole } from '@prisma/client';
import { AffiliatePaymentsService } from './affiliate-payments.service';
import { AffiliatesService } from '../affiliates/affiliates.service';
import {
  PaymentTerm,
  AffiliatePayment,
} from './entities/affiliate-payment.entity';
import {
  CreatePaymentTermInput,
  UpdatePaymentTermInput,
  CreateAffiliatePaymentInput,
  UpdatePaymentStatusInput,
} from './dto/affiliate-payment.dto';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => PaymentTerm)
export class AffiliatePaymentsResolver {
  constructor(
    private readonly affiliatePaymentsService: AffiliatePaymentsService,
    private readonly affiliatesService: AffiliatesService,
  ) {}

  private async resolveAffiliateId(
    user: AuthenticatedUser,
    affiliateId?: string,
  ): Promise<string> {
    const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'].includes(
      user.role,
    );
    if (isStaff) {
      if (!affiliateId) {
        throw new NotFoundException(
          'affiliateId is required for staff queries.',
        );
      }
      return affiliateId;
    }
    const own = await this.affiliatesService.findByUserId(user.sub);
    if (!own) {
      throw new ForbiddenException('No affiliate profile on this account.');
    }
    if (affiliateId && affiliateId !== own.id) {
      throw new ForbiddenException('You can only view your own payment data.');
    }
    return own.id;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [PaymentTerm])
  async paymentTerms(
    @CurrentUser() user: AuthenticatedUser,
    @Args('affiliateId', { type: () => String, nullable: true })
    affiliateId?: string,
  ) {
    const targetId = await this.resolveAffiliateId(user, affiliateId);
    return this.affiliatePaymentsService.findPaymentTerms(targetId);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [AffiliatePayment])
  async payments(
    @CurrentUser() user: AuthenticatedUser,
    @Args('affiliateId', { type: () => String, nullable: true })
    affiliateId?: string,
    @Args('status', { type: () => String, nullable: true }) status?: string,
  ) {
    const targetId = await this.resolveAffiliateId(user, affiliateId);
    return this.affiliatePaymentsService.findPayments(
      targetId,
      status as PaymentStatus | undefined,
    );
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => PaymentTerm)
  async createPaymentTerm(@Args('input') input: CreatePaymentTermInput) {
    return this.affiliatePaymentsService.createPaymentTerm(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => PaymentTerm)
  async updatePaymentTerm(
    @Args('id') id: string,
    @Args('input') input: UpdatePaymentTermInput,
  ) {
    return this.affiliatePaymentsService.updatePaymentTerm(id, input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => AffiliatePayment)
  async createAffiliatePayment(
    @Args('input') input: CreateAffiliatePaymentInput,
  ) {
    return this.affiliatePaymentsService.createPayment(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => AffiliatePayment)
  async updatePaymentStatus(@Args('input') input: UpdatePaymentStatusInput) {
    return this.affiliatePaymentsService.updatePaymentStatus(input);
  }
}
