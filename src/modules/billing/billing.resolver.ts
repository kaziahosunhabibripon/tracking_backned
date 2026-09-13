import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { BillingService } from './billing.service';
import {
  Plan,
  Subscription,
  PaymentMethod,
  Invoice,
  StripeRedirect,
} from './entities/billing.entity';
import { CreatePlanInput, UpdatePlanInput } from './dto/plan.dto';
import {
  CreateBillingPortalSessionInput,
  CreateCheckoutSessionInput,
} from './dto/checkout.dto';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => Plan)
export class BillingResolver {
  constructor(private readonly billingService: BillingService) {}

  /** Public pricing page — must be reachable without a JWT. */
  @Public()
  @Query(() => [Plan])
  async plans() {
    return this.billingService.findPlans();
  }

  @Public()
  @Query(() => Plan, { nullable: true })
  async plan(@Args('id') id: string) {
    return this.billingService.findPlan(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => Subscription, { nullable: true })
  async mySubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.currentSubscription(user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [Invoice])
  async myInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.invoices(user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [PaymentMethod])
  async myPaymentMethods(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.paymentMethods(user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => StripeRedirect, {
    description:
      'Starts a new subscription via a Stripe-hosted Checkout page. Rejects if the user already has one — use createBillingPortalSession to change plans instead.',
  })
  async createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateCheckoutSessionInput,
  ) {
    return this.billingService.createCheckoutSession(user, input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => StripeRedirect, {
    description:
      "Opens Stripe's hosted Billing Portal — change plan, cancel, manage payment methods, view invoice history all in one place.",
  })
  async createBillingPortalSession(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateBillingPortalSessionInput,
  ) {
    return this.billingService.createBillingPortalSession(user, input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @Mutation(() => Plan)
  async createPlan(@Args('input') input: CreatePlanInput) {
    return this.billingService.createPlan(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @Mutation(() => Plan)
  async updatePlan(
    @Args('id') id: string,
    @Args('input') input: UpdatePlanInput,
  ) {
    return this.billingService.updatePlan(id, input);
  }
}
