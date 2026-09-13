import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { BillingService } from './billing.service';
import { PrismaService } from '../../database/prisma.service';
import { StripeClientService } from './stripe-client.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '../../common/errors/app.exception';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/enums/user-role.enum';

const ALLOWED_ORIGIN = 'http://localhost:3000';

describe('BillingService', () => {
  let service: BillingService;

  const mockPrisma = {
    plan: { findUnique: jest.fn() },
    subscription: { findFirst: jest.fn() },
  };

  const mockStripe = {
    checkout: { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
  };

  const mockStripeClient = { client: mockStripe as unknown };

  const mockConfigService = {
    get: jest.fn((key: string) =>
      key === 'app.corsOrigins' ? [ALLOWED_ORIGIN] : undefined,
    ),
  };

  const user: AuthenticatedUser = {
    sub: 'user-1',
    email: 'user@example.com',
    role: UserRole.ADVERTISER,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StripeClientService, useValue: mockStripeClient },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockStripeClient.client = mockStripe;
  });

  describe('createCheckoutSession', () => {
    const input = {
      planId: 'plan-1',
      successUrl: `${ALLOWED_ORIGIN}/billing/success`,
      cancelUrl: `${ALLOWED_ORIGIN}/billing/cancel`,
    };

    it('rejects a redirect URL that is not an allowed origin', async () => {
      await expect(
        service.createCheckoutSession(user, {
          ...input,
          successUrl: 'https://evil.example.com/steal',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for a missing or inactive plan', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue(null);
      await expect(service.createCheckoutSession(user, input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a plan with no Stripe price attached', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue({
        id: 'plan-1',
        isActive: true,
        stripePriceId: null,
      });
      await expect(service.createCheckoutSession(user, input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects checkout when the user already has a live subscription', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue({
        id: 'plan-1',
        isActive: true,
        stripePriceId: 'price_1',
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: 'cus_1',
      });
      await expect(service.createCheckoutSession(user, input)).rejects.toThrow(
        ConflictException,
      );
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('creates a session, reusing the existing Stripe customer and tagging userId on both the session and the subscription', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue({
        id: 'plan-1',
        isActive: true,
        stripePriceId: 'price_1',
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        status: SubscriptionStatus.CANCELED,
        stripeCustomerId: 'cus_1',
      });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session-1',
      });

      const result = await service.createCheckoutSession(user, input);

      expect(result).toEqual({ url: 'https://checkout.stripe.com/session-1' });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [{ price: 'price_1', quantity: 1 }],
          customer: 'cus_1',
          customer_email: undefined,
          metadata: { userId: 'user-1' },
          subscription_data: { metadata: { userId: 'user-1' } },
        }),
      );
    });

    it('falls back to customer_email when the user has no Stripe customer yet', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue({
        id: 'plan-1',
        isActive: true,
        stripePriceId: 'price_1',
      });
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session-2',
      });

      await service.createCheckoutSession(user, input);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: undefined,
          customer_email: 'user@example.com',
        }),
      );
    });

    it('throws ServiceUnavailableException when Stripe is not configured', async () => {
      mockStripeClient.client = null;
      await expect(service.createCheckoutSession(user, input)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('createBillingPortalSession', () => {
    const input = { returnUrl: `${ALLOWED_ORIGIN}/billing` };

    it('rejects a return URL that is not an allowed origin', async () => {
      await expect(
        service.createBillingPortalSession(user, {
          returnUrl: 'https://evil.example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a user with no Stripe customer yet', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      await expect(
        service.createBillingPortalSession(user, input),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates a portal session for the user's Stripe customer", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        stripeCustomerId: 'cus_1',
      });
      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal-1',
      });

      const result = await service.createBillingPortalSession(user, input);

      expect(result).toEqual({ url: 'https://billing.stripe.com/portal-1' });
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_1',
        return_url: input.returnUrl,
      });
    });
  });
});
