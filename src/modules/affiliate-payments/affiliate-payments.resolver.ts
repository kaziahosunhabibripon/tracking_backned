import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { PaymentStatus, UserRole } from '@prisma/client';
import { AffiliatePaymentsService } from './affiliate-payments.service';
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

@Resolver(() => PaymentTerm)
export class AffiliatePaymentsResolver {
  constructor(
    private readonly affiliatePaymentsService: AffiliatePaymentsService,
  ) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [PaymentTerm])
  async paymentTerms(
    @Args('affiliateId', { type: () => String, nullable: true })
    affiliateId?: string,
  ) {
    return this.affiliatePaymentsService.findPaymentTerms(affiliateId);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [AffiliatePayment])
  async payments(
    @Args('affiliateId', { type: () => String, nullable: true })
    affiliateId?: string,
    @Args('status', { type: () => String, nullable: true }) status?: string,
  ) {
    return this.affiliatePaymentsService.findPayments(
      affiliateId,
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
